
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, RAGStatus, TaskStatus } from '../types';
import { calculateDuration, getEndDateFromDuration } from '../utils/ganttLogic';

interface TaskRowProps {
  task: Task;
  index: number;
  isSelected: boolean;
  allTasks: Task[];
  onSelect: () => void;
  onToggle: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onAIDecompose: () => void;
  onAddSubtask: () => void;
  onRemoveTask: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragging?: boolean;
  isDragTarget?: boolean;
}

const STATUS_CONFIG = {
  [TaskStatus.NOT_STARTED]: { icon: 'fa-clock', color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
  [TaskStatus.IN_PROGRESS]: { icon: 'fa-spinner fa-spin', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  [TaskStatus.COMPLETED]: { icon: 'fa-check-circle', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  [TaskStatus.ON_HOLD]: { icon: 'fa-pause-circle', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  [TaskStatus.BLOCKED]: { icon: 'fa-ban', color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
};

const TaskRow: React.FC<TaskRowProps> = ({ 
  task, 
  index, 
  isSelected, 
  allTasks,
  onSelect, 
  onToggle, 
  onUpdate, 
  onAIDecompose,
  onAddSubtask,
  onRemoveTask,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragTarget
}) => {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDepth = (t: Task): number => {
    let depth = 0;
    let current = t;
    while (current.parentId) {
      const parent = allTasks.find(p => p.id === current.parentId);
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  };

  const depth = getDepth(task);
  const hasChildren = allTasks.some(t => t.parentId === task.id);
  const isParentRow = hasChildren;
  const isEven = index % 2 === 0;

  const handleDateChange = (field: 'startDate' | 'endDate', val: string) => {
    if (!val || isParentRow) return;
    
    const updates: Partial<Task> = { [field]: val };
    if (field === 'startDate') {
      updates.endDate = getEndDateFromDuration(val, task.duration);
    } else {
      updates.duration = calculateDuration(task.startDate, val);
    }
    onUpdate(updates);
  };

  const handleDurationChange = (val: string) => {
    if (isParentRow) return;
    const dur = parseInt(val) || 1;
    onUpdate({
      duration: dur,
      endDate: getEndDateFromDuration(task.startDate, dur)
    });
  };

  const cycleRAG = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isParentRow) return; 

    const currentRAG = task.rag;
    let nextRAG = RAGStatus.GREEN;
    if (currentRAG === RAGStatus.GREEN) nextRAG = RAGStatus.AMBER;
    else if (currentRAG === RAGStatus.AMBER) nextRAG = RAGStatus.RED;
    else if (currentRAG === RAGStatus.RED) nextRAG = RAGStatus.GRAY;
    else if (currentRAG === RAGStatus.GRAY) nextRAG = RAGStatus.GREEN;

    onUpdate({ rag: nextRAG });
  };

  const rollUpSummary = useMemo(() => {
    if (!isParentRow) return null;
    
    const getChildrenRecursive = (parentId: string): Task[] => {
      let results: Task[] = [];
      const children = allTasks.filter(t => t.parentId === parentId);
      children.forEach(child => {
        const grandChildren = allTasks.filter(t => t.parentId === child.id);
        if (grandChildren.length === 0) {
          results.push(child);
        } else {
          results = results.concat(getChildrenRecursive(child.id));
        }
      });
      return results;
    };

    const leaves = getChildrenRecursive(task.id);
    const counts = {
      [RAGStatus.RED]: leaves.filter(l => l.rag === RAGStatus.RED).length,
      [RAGStatus.AMBER]: leaves.filter(l => l.rag === RAGStatus.AMBER).length,
      [RAGStatus.GREEN]: leaves.filter(l => l.rag === RAGStatus.GREEN).length,
      [RAGStatus.GRAY]: leaves.filter(l => l.rag === RAGStatus.GRAY).length,
    };

    let reason = "All subtasks on track.";
    if (counts[RAGStatus.RED] > 0) reason = `Red – Blocked because ${counts[RAGStatus.RED]} subtasks are Red.`;
    else if (counts[RAGStatus.AMBER] > 0) reason = `Amber – At risk because ${counts[RAGStatus.AMBER]} subtasks are Amber.`;
    else if (counts[RAGStatus.GRAY] > 0 && counts[RAGStatus.GREEN] === 0) reason = "Gray – All subtasks are not started.";

    return { counts, reason };
  }, [isParentRow, task.id, allTasks]);

  const getRAGInfo = (rag: RAGStatus) => {
    switch (rag) {
      case RAGStatus.GREEN: 
        return { 
          color: 'bg-green-500', 
          label: 'Green', 
          desc: isParentRow ? (rollUpSummary?.reason || 'On Track') : 'Green – Healthy progress' 
        };
      case RAGStatus.AMBER: 
        return { 
          color: 'bg-amber-500', 
          label: 'Amber', 
          desc: isParentRow ? (rollUpSummary?.reason || 'At Risk') : 'Amber – At risk of schedule slip' 
        };
      case RAGStatus.RED: 
        return { 
          color: 'bg-rose-600', 
          label: 'Red', 
          desc: isParentRow ? (rollUpSummary?.reason || 'Blocked') : 'Red – Blocked due to dependency' 
        };
      case RAGStatus.GRAY:
        return {
          color: 'bg-gray-400 dark:bg-slate-600',
          label: 'Gray',
          desc: isParentRow ? (rollUpSummary?.reason || 'Not Started') : 'Gray – Not started'
        };
    }
  };

  const ragInfo = getRAGInfo(task.rag);

  const getJiraBadge = (type: string | undefined) => {
    switch (type) {
      case 'PF': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'EPIC': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div 
      onClick={onSelect}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={(e) => onDragOver(e, task.id)}
      onDrop={(e) => onDrop(e, task.id)}
      className={`group flex border-b items-center text-xs transition-colors cursor-default h-[36px] dark:border-slate-800/80 relative
        ${isSelected ? 'bg-blue-100/60 dark:bg-blue-900/40 z-[5]' : (isEven ? 'bg-gray-50/80 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-950')}
        ${isParentRow ? 'font-semibold' : ''}
        ${isDragging ? 'opacity-30' : 'opacity-100'}
        ${isDragTarget ? 'border-t-2 border-t-blue-500' : ''}`}
    >
      <div className="w-8 flex items-center justify-center text-gray-300 dark:text-slate-600 cursor-grab active:cursor-grabbing hover:text-gray-500 dark:hover:text-slate-400 transition-colors">
        <i className="fas fa-grip-vertical text-[10px]"></i>
      </div>

      <div className="w-8 p-2 text-center text-gray-400 dark:text-slate-500 font-mono text-[10px] shrink-0">
        {index}
      </div>
      
      <div className="flex-1 p-1.5 flex items-center min-w-0" style={{ paddingLeft: `${depth * 20 + 4}px` }}>
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(); }} 
            className={`w-4 h-4 flex items-center justify-center transition-opacity ${!hasChildren ? 'opacity-0 cursor-default' : 'text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300'}`}
          >
            <i className={`fas ${task.isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-[9px]`}></i>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!isParentRow && (
            <div className="flex items-center gap-1.5 shrink-0 mr-1">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate({ status: task.status === TaskStatus.IN_PROGRESS ? TaskStatus.ON_HOLD : TaskStatus.IN_PROGRESS }); }}
                title={task.status === TaskStatus.IN_PROGRESS ? "Pause Task" : "Resume Task"}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  task.status === TaskStatus.IN_PROGRESS 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-blue-500'
                }`}
              >
                <i className={`fas ${task.status === TaskStatus.IN_PROGRESS ? 'fa-pause' : 'fa-play'} text-[7px]`}></i>
              </button>
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsStatusOpen(!isStatusOpen); }}
                  className={`w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors ${isStatusOpen ? 'bg-gray-200 dark:bg-slate-700' : ''}`}
                >
                  <i className={`fas ${STATUS_CONFIG[task.status].icon} ${STATUS_CONFIG[task.status].color} text-[10px]`}></i>
                </button>

                {isStatusOpen && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-xl z-[100] overflow-hidden py-1">
                    {Object.values(TaskStatus).map((status) => (
                      <button
                        key={status}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({ status });
                          setIsStatusOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-medium transition-colors text-left
                          ${task.status === status ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                      >
                        <i className={`fas ${STATUS_CONFIG[status].icon} ${STATUS_CONFIG[status].color} w-4 text-center`}></i>
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 w-full min-w-0">
             {task.jiraType && (
               <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border tracking-tighter shrink-0 ${getJiraBadge(task.jiraType)}`}>
                 {task.jiraType}
               </span>
             )}
             {task.jiraId && (
               <span className="text-[9px] font-mono text-gray-400 dark:text-slate-500 shrink-0">[{task.jiraId}]</span>
             )}
             <input 
              value={task.name} 
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className={`bg-transparent border-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-700 rounded px-1 w-full truncate text-[11px] placeholder-gray-300 dark:placeholder-slate-700 dark:text-slate-200 ${isParentRow ? 'font-bold' : 'font-medium'}`}
              placeholder="New Jira Task..."
            />
          </div>
        </div>
        
        <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onAddSubtask(); }}
            className="text-green-600 dark:text-green-500 hover:text-green-700 p-1 rounded hover:bg-green-100/50 dark:hover:bg-green-900/20"
            title={!task.parentId ? "Add Epic" : "Add Subtask"}
          >
            <i className="fas fa-plus-circle text-[10px]"></i>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemoveTask(); }}
            className="text-red-500 dark:text-red-400 hover:text-red-700 p-1 rounded hover:bg-red-100/50 dark:hover:bg-red-900/20"
            title="Delete Task"
          >
            <i className="fas fa-minus-circle text-[10px]"></i>
          </button>
        </div>
      </div>

      <div className="w-32 p-1 border-l border-gray-100 dark:border-slate-800/80 shrink-0 relative group/date">
        <input 
          type="date"
          value={task.startDate}
          disabled={isParentRow}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleDateChange('startDate', e.target.value)}
          className={`w-full bg-transparent border-none text-[10px] py-1 px-1 focus:ring-0 cursor-pointer text-gray-800 dark:text-slate-200 dark:[color-scheme:dark] ${isParentRow ? 'opacity-50 cursor-not-allowed font-bold' : ''}`}
        />
        <i className="fas fa-calendar-days absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-[10px] pointer-events-none transition-colors group-hover/date:text-blue-500"></i>
      </div>

      <div className="w-32 p-1 border-l border-gray-100 dark:border-slate-800/80 shrink-0 relative group/date">
        <input 
          type="date"
          value={task.endDate}
          disabled={isParentRow}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleDateChange('endDate', e.target.value)}
          className={`w-full bg-transparent border-none text-[10px] py-1 px-1 focus:ring-0 cursor-pointer text-gray-800 dark:text-slate-200 dark:[color-scheme:dark] ${isParentRow ? 'opacity-50 cursor-not-allowed font-bold' : ''}`}
        />
        <i className="fas fa-calendar-days absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-[10px] pointer-events-none transition-colors group-hover/date:text-blue-500"></i>
      </div>

      <div className="w-16 p-1 border-l border-gray-100 dark:border-slate-800/80 shrink-0">
        <input 
          type="number"
          min="1"
          value={task.duration}
          disabled={isParentRow}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleDurationChange(e.target.value)}
          className={`w-full bg-transparent border-none text-[10px] p-1 focus:ring-0 text-center text-gray-800 dark:text-slate-200 font-mono ${isParentRow ? 'opacity-50 font-bold' : ''}`}
        />
      </div>

      <div className="w-20 p-1 border-l border-gray-100 dark:border-slate-800/80 shrink-0">
        <input 
          value={task.owner} 
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdate({ owner: e.target.value })}
          className="bg-transparent border-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-700 rounded px-1 w-full truncate text-[10px] placeholder-gray-300 dark:placeholder-slate-700 dark:text-slate-400 font-medium"
          placeholder="Owner..."
        />
      </div>

      <div className="w-14 p-2 border-l border-gray-100 dark:border-slate-800/80 text-right text-gray-400 dark:text-slate-500 font-mono text-[10px] shrink-0">
        <input 
          type="number"
          min="0"
          max="100"
          value={task.progress}
          disabled={isParentRow}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdate({ progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
          className={`w-full bg-transparent border-none text-right text-[10px] p-0 focus:ring-0 text-gray-400 dark:text-slate-500 font-mono ${isParentRow ? 'opacity-50 font-bold' : ''}`}
        />
      </div>

      <div className="w-10 p-2 border-l border-gray-100 dark:border-slate-800/80 flex justify-center shrink-0 relative group/rag overflow-visible">
        <div 
          onClick={cycleRAG}
          className={`w-3.5 h-3.5 rounded-full ${ragInfo.color} shadow-sm transition-transform ${!isParentRow ? 'cursor-pointer hover:scale-125' : 'cursor-help'}`}
        ></div>
        
        {/* Hover Tooltip - Repositioned to the LEFT of the dot to avoid all clipping issues */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 hidden group-hover/rag:flex z-[9999] pointer-events-none items-center">
          <div className="bg-slate-900 text-white text-[11px] px-3 py-2 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.6)] whitespace-nowrap flex flex-col items-center border border-white/10 ring-1 ring-black/50">
            <span className="font-black text-[10px] uppercase tracking-widest border-b border-white/10 w-full text-center pb-1.5 mb-1.5 flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${ragInfo.color}`}></div>
              {ragInfo.label} Status
            </span>
            <div className="flex flex-col gap-1 w-full text-center px-1">
              <span className="font-medium whitespace-normal max-w-[200px] leading-tight text-white/90">
                {ragInfo.desc}
              </span>
              {isParentRow && rollUpSummary && (
                <div className="mt-2 flex items-center justify-center gap-2 border-t border-white/10 pt-1.5 text-[10px] font-bold">
                  <span className="text-rose-400">{rollUpSummary.counts[RAGStatus.RED]} Red</span>
                  <span className="text-amber-400">{rollUpSummary.counts[RAGStatus.AMBER]} Amb</span>
                  <span className="text-emerald-400">{rollUpSummary.counts[RAGStatus.GREEN]} Grn</span>
                  <span className="text-gray-400">{rollUpSummary.counts[RAGStatus.GRAY]} Gry</span>
                </div>
              )}
            </div>
          </div>
          {/* Tooltip arrow pointing RIGHT towards the RAG dot */}
          <div className="border-[6px] border-transparent border-l-slate-900 translate-x-[-1px]"></div>
        </div>
      </div>
    </div>
  );
};

export default TaskRow;