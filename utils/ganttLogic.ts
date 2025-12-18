
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
    rag: RAGStatus.GREEN,
    owner: "Unassigned",
    role: "Contributor",
    dependencies: [],
    isMilestone: false,
    isExpanded: true
  };
};

/**
 * Recalculates parent dates bottom-up.
 * Parent start = min(children start)
 * Parent end = max(children end)
 */
export const rollupHierarchy = (tasks: Task[]): Task[] => {
  const updatedTasks = [...tasks];
  const taskMap = new Map<string, Task>();
  updatedTasks.forEach(t => taskMap.set(t.id, t));

  const processNode = (taskId: string) => {
    const children = updatedTasks.filter(t => t.parentId === taskId);
    if (children.length === 0) return;

    // Process children first
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

    const parentIdx = updatedTasks.findIndex(t => t.id === taskId);
    updatedTasks[parentIdx] = {
      ...updatedTasks[parentIdx],
      startDate: minStart,
      endDate: maxEnd,
      duration: calculateDuration(minStart, maxEnd),
      progress: Math.round(avgProgress)
    };
    taskMap.set(taskId, updatedTasks[parentIdx]);
  };

  const rootParents = updatedTasks.filter(t => t.parentId === null);
  rootParents.forEach(root => processNode(root.id));

  return updatedTasks;
};

/**
 * Propagates date changes to successors.
 * Strict rule: Parent tasks do not participate in dependency chains.
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

    // Rule: Parent tasks cannot push successors. If current task is a parent, it shouldn't push.
    // However, rollup handles parent movement. Subtasks are the units that push other subtasks.
    const isParent = newTasks.some(t => t.parentId === currentId);
    if (isParent) continue;

    const successors = newTasks.filter(t => t.dependencies.some(d => d.predecessorId === currentId));

    successors.forEach(succ => {
      // Rule: Ignore dependencies if the successor is a parent (summary task)
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

export const identifyCriticalPath = (tasks: Task[]): Task[] => {
  if (tasks.length === 0) return [];
  const projectEnd = new Date(Math.max(...tasks.map(t => new Date(t.endDate + 'T00:00:00').getTime()))).toISOString().split('T')[0];
  return tasks.map(t => ({
    ...t,
    isCritical: t.endDate === projectEnd && (tasks.filter(child => child.parentId === t.id).length === 0)
  }));
};
