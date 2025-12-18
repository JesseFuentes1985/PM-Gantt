
import { Task, DependencyType, TaskStatus, RAGStatus, Dependency, ZoomLevel } from "../types";

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

/**
 * Formats YYYY-MM-DD to MM/DD/YYYY for professional display
 */
export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
};

export const getProjectBounds = (tasks: Task[], zoomLevel: ZoomLevel) => {
  if (tasks.length === 0) return { start: new Date(), end: new Date() };
  const starts = tasks.map(t => new Date(t.startDate + 'T00:00:00').getTime());
  const ends = tasks.map(t => new Date(t.endDate + 'T00:00:00').getTime());
  const min = new Date(Math.min(...starts));
  const max = new Date(Math.max(...ends));
  
  const buffer = zoomLevel === ZoomLevel.DAYS ? 10 : zoomLevel === ZoomLevel.WEEKS ? 30 : 90;
  min.setDate(min.getDate() - buffer); 
  max.setDate(max.getDate() + buffer * 2); 
  return { start: min, end: max };
};

export const createNewTask = (parentId: string | null, startDate: string, type: 'PF' | 'EPIC' | 'TASK' | 'STORY' = 'TASK'): Task => {
  const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  let defaultName = "New Task";
  if (type === 'PF') defaultName = "New Feature (PF)";
  else if (type === 'EPIC') defaultName = "New Epic";
  else if (type === 'STORY') defaultName = "New Story";
  else if (type === 'TASK') defaultName = "New Task";

  return {
    id,
    parentId,
    name: defaultName,
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
    isExpanded: true,
    isAtRisk: false,
    totalFloat: 0,
    jiraType: type
  };
};

export const parseDependencyString = (str: string, hierarchyMap: Map<string, string>): Dependency | null => {
  const trimmed = str.trim().toUpperCase();
  if (!trimmed) return null;
  const regex = /^([\d.]+)(FS|SS|FF|SF)?(?:([+-]\d+))?$/;
  const match = trimmed.match(regex);
  if (!match) return null;
  const hId = match[1];
  const typeStr = match[2] || 'FS';
  const lagStr = match[3] || '0';
  const predecessorId = hierarchyMap.get(hId);
  if (!predecessorId) return null;
  const type = typeStr === 'SS' ? DependencyType.SS :
               typeStr === 'FF' ? DependencyType.FF :
               typeStr === 'SF' ? DependencyType.SF : DependencyType.FS;
  return { predecessorId, type, lagDays: parseInt(lagStr, 10) || 0 };
};

export const formatDependencyString = (deps: Dependency[], taskIdToHierarchy: Map<string, string>): string => {
  return deps.map(d => {
    const hId = taskIdToHierarchy.get(d.predecessorId);
    if (!hId) return '';
    const typeStr = d.type === DependencyType.FS ? '' : d.type;
    const lagStr = d.lagDays === 0 ? '' : (d.lagDays > 0 ? `+${d.lagDays}` : `${d.lagDays}`);
    return `${hId}${typeStr}${lagStr}`;
  }).filter(Boolean).join(', ');
};

export const rollupHierarchy = (tasks: Task[]): Task[] => {
  const updatedTasks = [...tasks];
  const taskMap = new Map<string, Task>();
  updatedTasks.forEach(t => taskMap.set(t.id, t));

  updatedTasks.forEach((task, idx) => {
    const hasChildren = updatedTasks.some(t => t.parentId === task.id);
    if (!hasChildren) {
      let forcedRAG = task.rag;
      if (task.status === TaskStatus.BLOCKED) {
        forcedRAG = RAGStatus.RED;
      } else if (task.status === TaskStatus.ON_HOLD || task.isAtRisk) {
        forcedRAG = RAGStatus.AMBER;
      } else if (task.status === TaskStatus.COMPLETED) {
        forcedRAG = RAGStatus.GREEN;
      } else if (task.status === TaskStatus.NOT_STARTED) {
        forcedRAG = RAGStatus.GRAY;
      } else if (task.status === TaskStatus.IN_PROGRESS) {
        forcedRAG = (task.rag === RAGStatus.RED || task.rag === RAGStatus.AMBER || task.isAtRisk) ? RAGStatus.AMBER : RAGStatus.GREEN;
        if (task.rag === RAGStatus.RED) forcedRAG = RAGStatus.RED;
      }
      updatedTasks[idx] = { ...task, rag: forcedRAG };
    }
  });

  const processNode = (taskId: string) => {
    const children = updatedTasks.filter(t => t.parentId === taskId);
    if (children.length === 0) return;
    children.forEach(child => processNode(child.id));
    
    const childStatuses = children.map(c => c.status);
    const childRAGs = children.map(c => c.rag);

    let parentStatus = TaskStatus.NOT_STARTED;
    if (childStatuses.includes(TaskStatus.BLOCKED)) {
      parentStatus = TaskStatus.BLOCKED;
    } else if (childStatuses.every(s => s === TaskStatus.COMPLETED)) {
      parentStatus = TaskStatus.COMPLETED;
    } else if (childStatuses.some(s => s === TaskStatus.IN_PROGRESS || s === TaskStatus.COMPLETED || s === TaskStatus.ON_HOLD)) {
      parentStatus = TaskStatus.IN_PROGRESS;
    }

    let parentRAG = RAGStatus.GRAY;
    if (childRAGs.includes(RAGStatus.RED)) {
      parentRAG = RAGStatus.RED;
    } else if (childRAGs.includes(RAGStatus.AMBER)) {
      parentRAG = RAGStatus.AMBER;
    } else if (childRAGs.some(r => r === RAGStatus.GREEN)) {
      parentRAG = RAGStatus.GREEN;
    } else if (childRAGs.every(r => r === RAGStatus.GRAY)) {
      parentRAG = RAGStatus.GRAY;
    }

    const childDates = children.map(c => new Date(c.startDate + 'T00:00:00').getTime());
    const childEndDates = children.map(c => new Date(c.endDate + 'T00:00:00').getTime());
    const minStart = new Date(Math.min(...childDates)).toISOString().split('T')[0];
    const maxEnd = new Date(Math.max(...childEndDates)).toISOString().split('T')[0];
    
    const totalDuration = children.reduce((acc, c) => acc + c.duration, 0);
    const avgProgress = totalDuration > 0 
      ? children.reduce((acc, c) => acc + (c.progress * c.duration), 0) / totalDuration 
      : 0;

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
  
  const rootIds = updatedTasks.filter(t => t.parentId === null).map(t => t.id);
  rootIds.forEach(id => processNode(id));
  return updatedTasks;
};

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
    const successors = newTasks.filter(t => {
      const isLeaf = !newTasks.some(child => child.parentId === t.id);
      return isLeaf && t.dependencies.some(d => d.predecessorId === currentId);
    });
    successors.forEach(succ => {
      const deps = succ.dependencies.filter(d => d.predecessorId === currentId);
      let earliestPossibleStart = new Date(succ.startDate + 'T00:00:00').getTime();
      let earliestPossibleEnd = new Date(succ.endDate + 'T00:00:00').getTime();
      let modified = false;
      deps.forEach(dep => {
        if (dep.type === DependencyType.FS) {
          const reqStart = new Date(addDays(currentTask.endDate, 1 + dep.lagDays) + 'T00:00:00').getTime();
          if (reqStart > earliestPossibleStart) {
            earliestPossibleStart = reqStart;
            earliestPossibleEnd = new Date(getEndDateFromDuration(new Date(reqStart).toISOString().split('T')[0], succ.duration) + 'T00:00:00').getTime();
            modified = true;
          }
        }
      });
      if (modified) {
        const idx = newTasks.findIndex(t => t.id === succ.id);
        newTasks[idx] = { 
          ...succ, 
          startDate: new Date(earliestPossibleStart).toISOString().split('T')[0],
          endDate: new Date(earliestPossibleEnd).toISOString().split('T')[0]
        };
        queue.push(succ.id);
      }
    });
  }
  return rollupHierarchy(newTasks);
};

export interface VisibleTaskWithHierarchy {
  task: Task;
  hierarchyId: string;
}

export const getVisibleTasks = (tasks: Task[]): VisibleTaskWithHierarchy[] => {
  const visible: VisibleTaskWithHierarchy[] = [];
  const traverse = (parentId: string | null, prefix: string) => {
    const children = tasks.filter(t => t.parentId === parentId);
    children.forEach((child, index) => {
      const hierarchyId = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      visible.push({ task: child, hierarchyId });
      if (child.isExpanded) traverse(child.id, hierarchyId);
    });
  };
  traverse(null, "");
  return visible;
};

export const identifyCriticalPath = (tasks: Task[]): Task[] => {
  if (tasks.length === 0) return [];
  const updatedTasks = tasks.map(t => ({ ...t, isCritical: false, totalFloat: 0 }));
  const isParent = (id: string) => updatedTasks.some(t => t.parentId === id);
  const leafTasks = updatedTasks.filter(t => !isParent(t.id));
  if (leafTasks.length === 0) return updatedTasks;
  const endDates = leafTasks.map(t => new Date(t.endDate + 'T00:00:00').getTime());
  const maxEndTimestamp = Math.max(...endDates);
  const taskMap = new Map<string, Task>();
  updatedTasks.forEach(t => taskMap.set(t.id, t));
  const lateFinishMap = new Map<string, number>();
  const getLateFinish = (taskId: string): number => {
    if (lateFinishMap.has(taskId)) return lateFinishMap.get(taskId)!;
    const task = taskMap.get(taskId);
    if (!task) return maxEndTimestamp;
    const successors = updatedTasks.filter(t => 
      !isParent(t.id) && 
      t.dependencies.some(d => d.predecessorId === taskId)
    );
    let lf: number;
    if (successors.length === 0) {
      lf = maxEndTimestamp;
    } else {
      const successorLateStarts = successors.map(s => {
        const sLF = getLateFinish(s.id);
        const sLS = sLF - (s.duration - 1) * 24 * 60 * 60 * 1000;
        return sLS - 1 * 24 * 60 * 60 * 1000;
      });
      lf = Math.min(...successorLateStarts);
    }
    lateFinishMap.set(taskId, lf);
    return lf;
  };
  const criticalLeafIds = new Set<string>();
  const floatMap = new Map<string, number>();
  leafTasks.forEach(task => {
    const ef = new Date(task.endDate + 'T00:00:00').getTime();
    const lf = getLateFinish(task.id);
    const floatDays = Math.round((lf - ef) / (1000 * 60 * 60 * 24));
    floatMap.set(task.id, Math.max(0, floatDays));
    if (floatDays <= 0) {
      criticalLeafIds.add(task.id);
    }
  });
  const finalTasks = updatedTasks.map(t => {
    let isCritical = false;
    let totalFloat = 0;
    if (criticalLeafIds.has(t.id)) {
      isCritical = true;
      totalFloat = 0;
    } else if (isParent(t.id)) {
      const descendants = updatedTasks.filter(c => {
         let curr = c;
         while(curr.parentId) {
            if(curr.parentId === t.id) return true;
            const next = updatedTasks.find(p => p.id === curr.parentId);
            if(!next) break;
            curr = next;
         }
         return false;
      });
      const leafDescendants = descendants.filter(d => !isParent(d.id));
      isCritical = leafDescendants.some(d => criticalLeafIds.has(d.id));
      totalFloat = leafDescendants.length > 0 ? Math.min(...leafDescendants.map(d => floatMap.get(d.id) || 0)) : 0;
    } else {
      totalFloat = floatMap.get(t.id) || 0;
    }
    return { ...t, isCritical, totalFloat };
  });
  return finalTasks;
};
