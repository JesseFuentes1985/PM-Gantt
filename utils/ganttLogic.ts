
import { Task, DependencyType, TaskStatus, RAGStatus } from "../types";

export const calculateDuration = (start: string, end: string): number => {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const diffTime = e.getTime() - s.getTime();
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
};

export const getEndDateFromDuration = (start: string, duration: number): string => {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(s.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
  return e.toISOString().split('T')[0];
};

export const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const createNewTask = (parentId: string | null, startDate: string): Task => {
  const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  return {
    id,
    parentId,
    name: "New Task",
    startDate,
    endDate: getEndDateFromDuration(startDate, 5),
    duration: 5,
    progress: 0,
    status: TaskStatus.NOT_STARTED,
    rag: RAGStatus.GRAY,
    owner: "Unassigned",
    role: "Contributor",
    dependencies: [],
    isMilestone: false,
    isExpanded: true
  };
};

/**
 * Recalculates parent dates and statuses bottom-up.
 * Parent start = min(children start)
 * Parent end = max(children end)
 * Parent RAG = max criticality of children (Red > Amber > Green > Gray)
 */
export const rollupHierarchy = (tasks: Task[]): Task[] => {
  const updatedTasks = [...tasks];
  const taskMap = new Map<string, Task>();
  updatedTasks.forEach(t => taskMap.set(t.id, t));

  // Step 1: Enforce status-based RAG on leaf nodes
  updatedTasks.forEach((task, idx) => {
    const hasChildren = updatedTasks.some(t => t.parentId === task.id);
    if (!hasChildren) {
      let forcedRAG = task.rag;
      if (task.status === TaskStatus.BLOCKED) forcedRAG = RAGStatus.RED;
      else if (task.status === TaskStatus.ON_HOLD) forcedRAG = RAGStatus.AMBER;
      else if (task.status === TaskStatus.NOT_STARTED) forcedRAG = RAGStatus.GRAY;
      else if (task.status === TaskStatus.COMPLETED) forcedRAG = RAGStatus.GREEN;
      // In Progress allows manual RAG but defaults to Green if it was Gray
      else if (task.status === TaskStatus.IN_PROGRESS && forcedRAG === RAGStatus.GRAY) forcedRAG = RAGStatus.GREEN;
      
      updatedTasks[idx] = { ...task, rag: forcedRAG };
    }
  });

  const processNode = (taskId: string) => {
    const children = updatedTasks.filter(t => t.parentId === taskId);
    if (children.length === 0) return;

    // Process children first (bottom-up)
    children.forEach(child => processNode(child.id));

    const parent = taskMap.get(taskId);
    if (!parent) return;

    const childDates = children.map(c => new Date(c.startDate + 'T00:00:00').getTime());
    const childEndDates = children.map(c => new Date(c.endDate + 'T00:00:00').getTime());
    
    const minStart = new Date(Math.min(...childDates)).toISOString().split('T')[0];
    const maxEnd = new Date(Math.max(...childEndDates)).toISOString().split('T')[0];
    
    const totalDuration = children.reduce((acc, c) => acc + c.duration, 0);
    const avgProgress = totalDuration > 0 
      ? children.reduce((acc, c) => acc + (c.progress * c.duration), 0) / totalDuration 
      : 0;

    // RAG Roll-up Logic: Red > Amber > Green > Gray
    let parentRAG = RAGStatus.GRAY;
    if (children.some(c => c.rag === RAGStatus.RED)) {
      parentRAG = RAGStatus.RED;
    } else if (children.some(c => c.rag === RAGStatus.AMBER)) {
      parentRAG = RAGStatus.AMBER;
    } else if (children.some(c => c.rag === RAGStatus.GREEN)) {
      parentRAG = RAGStatus.GREEN;
    }

    // Status Roll-up Logic
    let parentStatus = TaskStatus.NOT_STARTED;
    if (children.every(c => c.status === TaskStatus.COMPLETED)) {
      parentStatus = TaskStatus.COMPLETED;
    } else if (children.some(c => c.status === TaskStatus.BLOCKED)) {
      parentStatus = TaskStatus.BLOCKED;
    } else if (children.some(c => c.status === TaskStatus.IN_PROGRESS || c.status === TaskStatus.COMPLETED)) {
      parentStatus = TaskStatus.IN_PROGRESS;
    } else if (children.some(c => c.status === TaskStatus.ON_HOLD)) {
      parentStatus = TaskStatus.ON_HOLD;
    }

    const parentIdx = updatedTasks.findIndex(t => t.id === taskId);
    updatedTasks[parentIdx] = {
      ...updatedTasks[parentIdx],
      startDate: minStart,
      endDate: maxEnd,
      duration: calculateDuration(minStart, maxEnd),
      progress: Math.round(avgProgress),
      rag: parentRAG,
      status: parentStatus
    };
    taskMap.set(taskId, updatedTasks[parentIdx]);
  };

  // Find root level tasks and trigger roll-up
  const rootIds = new Set(updatedTasks.filter(t => t.parentId === null).map(t => t.id));
  rootIds.forEach(id => processNode(id));

  return updatedTasks;
};

/**
 * Propagates date changes to successors.
 */
export const propagateChanges = (tasks: Task[], updatedTaskId: string): Task[] => {
  let newTasks = [...tasks];
  const queue = [updatedTaskId];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (processed.has(currentId)) continue;
    processed.add(currentId);

    const currentTask = newTasks.find(t => t.id === currentId);
    if (!currentTask) continue;

    const isParent = newTasks.some(t => t.parentId === currentId);
    if (isParent) continue;

    const successors = newTasks.filter(t => t.dependencies.some(d => d.predecessorId === currentId));

    successors.forEach(succ => {
      const isSuccParent = newTasks.some(t => t.parentId === succ.id);
      if (isSuccParent) return;

      const dep = succ.dependencies.find(d => d.predecessorId === currentId)!;
      let newStart = succ.startDate;
      let newEnd = succ.endDate;

      if (dep.type === DependencyType.FS) {
        const minStart = addDays(currentTask.endDate, 1 + dep.lagDays);
        if (new Date(succ.startDate + 'T00:00:00') < new Date(minStart + 'T00:00:00')) {
          newStart = minStart;
          newEnd = getEndDateFromDuration(newStart, succ.duration);
        }
      } else if (dep.type === DependencyType.SS) {
        const minStart = addDays(currentTask.startDate, dep.lagDays);
        if (new Date(succ.startDate + 'T00:00:00') < new Date(minStart + 'T00:00:00')) {
          newStart = minStart;
          newEnd = getEndDateFromDuration(newStart, succ.duration);
        }
      }

      if (newStart !== succ.startDate || newEnd !== succ.endDate) {
        const idx = newTasks.findIndex(t => t.id === succ.id);
        newTasks[idx] = { ...succ, startDate: newStart, endDate: newEnd };
        queue.push(succ.id);
      }
    });
  }

  return rollupHierarchy(newTasks);
};

export const getVisibleTasks = (tasks: Task[]): Task[] => {
  const visible: Task[] = [];
  const addVisible = (parentId: string | null) => {
    const children = tasks.filter(t => t.parentId === parentId);
    children.forEach(child => {
      visible.push(child);
      if (child.isExpanded) {
        addVisible(child.id);
      }
    });
  };
  addVisible(null);
  return visible;
};

/**
 * Identifies tasks on the critical path.
 */
export const identifyCriticalPath = (tasks: Task[]): Task[] => {
  if (tasks.length === 0) return [];

  const updatedTasks = tasks.map(t => ({ ...t, isCritical: false }));
  
  const endDates = updatedTasks.map(t => new Date(t.endDate + 'T00:00:00').getTime());
  const projectEnd = new Date(Math.max(...endDates)).toISOString().split('T')[0];

  const criticalIds = new Set<string>();
  const isParent = (id: string) => updatedTasks.some(t => t.parentId === id);

  updatedTasks.forEach(t => {
    if (!isParent(t.id) && t.endDate === projectEnd) {
      criticalIds.add(t.id);
    }
  });

  let changed = true;
  while (changed) {
    changed = false;
    for (const t of updatedTasks) {
      if (criticalIds.has(t.id) || isParent(t.id)) continue;

      const isDriving = updatedTasks.some(succ => {
        if (!criticalIds.has(succ.id)) return false;
        
        const dep = succ.dependencies.find(d => d.predecessorId === t.id);
        if (!dep) return false;

        if (dep.type === DependencyType.FS) {
          return addDays(t.endDate, 1 + dep.lagDays) === succ.startDate;
        } else if (dep.type === DependencyType.SS) {
          return addDays(t.startDate, dep.lagDays) === succ.startDate;
        }
        return false;
      });

      if (isDriving) {
        criticalIds.add(t.id);
        changed = true;
      }
    }
  }

  const finalTasks = updatedTasks.map(t => {
    const checkCritical = (id: string): boolean => {
      if (criticalIds.has(id)) return true;
      const children = updatedTasks.filter(c => c.parentId === id);
      return children.some(c => checkCritical(c.id));
    };

    return {
      ...t,
      isCritical: checkCritical(t.id)
    };
  });

  return finalTasks;
};
