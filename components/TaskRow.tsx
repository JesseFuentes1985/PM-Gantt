
import React, { useState, useRef, useEffect } from 'react';
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
}

const STATUS_CONFIG = {
  [TaskStatus.NOT_STARTED]: { icon: 'fa-clock', color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
  [TaskStatus.IN_PROGRESS]: { icon: 'fa-spinner fa-spin', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  [TaskStatus.COMPLETED]: { icon: 'fa-check-circle', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  [TaskStatus.ON_HOLD]: { icon: 'fa-pause-circle', color: 'text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
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
  onAddSubtask
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

  const toggleInProgress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.status === TaskStatus.IN_PROGRESS) {
      onUpdate({ status: TaskStatus.ON_HOLD });
    } else {
      const updates: Partial<Task> = { status: TaskStatus.IN_PROGRESS };
      if (task.progress === 0) updates.progress = 10;
      onUpdate(updates);
    }
  };

  const getRAGColor = (rag: RAGStatus) => {
    switch (rag) {
      case RAGStatus.GREEN: return 'bg-green-500';
      case RAGStatus.AMBER: return 'bg-yellow-500';
      case RAGStatus.RED: return 'bg-red-500';
    }
  };

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
      className={`group flex border-b items-center text-xs transition-colors cursor-default h-[36px] dark:border-slate-800/80
        ${isSelected ? 'bg-blue-100/60 dark:bg-blue-900/40' : 'hover:bg-blue-50/50 dark:hover:bg-slate-800/40'} 
        ${isParentRow ? 'bg-gray-100 dark:bg-slate-800/60 font-semibold' : 'bg-white dark:bg-slate-900'}`}
    >
      <div className="w-10 p-2 text-center text-gray-400 dark:text-slate-500 font-mono text-[10px] shrink-0">
        {index}
      </div>
      
      <div className="flex-1 p-1.5 flex items-center min-w-0" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
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
                onClick={toggleInProgress}
                title={task.status === TaskStatus.IN_PROGRESS ? "Mark as On Hold" : "Start Task"}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  task.status === TaskStatus.IN_PROGRESS 
                  ? 'bg-blue-500 text-white animate-pulse' 
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-blue-500'
                }`}
              >
                <i className={`fas ${task.status === TaskStatus.IN_PROGRESS ? 'fa-pause' : 'fa-play'} text-[8px]`}></i>
              </button>
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsStatusOpen(!isStatusOpen); }}
                  className={`w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors ${isStatusOpen ? 'bg-gray-200 dark:bg-slate-700' : ''}`}
                >
                  <i className={`fas ${STATUS_CONFIG[task.status].icon} ${STATUS_CONFIG[task.status].color} text-[10px]`}></i>
                </button>

                {isStatusOpen && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden py-1 transform origin-top-left transition-all">
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
            onClick={(e) => { e.stopPropagation(); onAIDecompose(); }}
            className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 p-1 rounded hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20"
            title="Jira AI Decomposition"
          >
            <i className="fas fa-wand-magic-sparkles text-[10px]"></i>
          </button>
        </div>
      </div>

      <div className="w-24 p-1 border-l border-gray-100 dark:border-slate-800/80 shrink-0">
        <input 
          type="date"
          value={task.startDate}
          disabled={isParentRow}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleDateChange('startDate', e.target.value)}
          className={`w-full bg-transparent border-none text-[10px] p-1 focus:ring-0 cursor-pointer text-gray-800 dark:text-slate-200 dark:[color-scheme:dark] ${isParentRow ? 'opacity-50 cursor-not-allowed font-bold' : ''}`}
        />
      </div>

      <div className="w-24 p-1 border-l border-gray-100 dark:border-slate-800/80 shrink-0">
        <input 
          type="date"
          value={task.endDate}
          disabled={isParentRow}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleDateChange('endDate', e.target.value)}
          className={`w-full bg-transparent border-none text-[10px] p-1 focus:ring-0 cursor-pointer text-gray-800 dark:text-slate-200 dark:[color-scheme:dark] ${isParentRow ? 'opacity-50 cursor-not-allowed font-bold' : ''}`}
        />
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

      <div className="w-20 p-2 border-l border-gray-100 dark:border-slate-800/80 truncate text-gray-500 dark:text-slate-400 text-[10px] shrink-0">
        {task.owner}
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

      <div className="w-10 p-2 border-l border-gray-100 dark:border-slate-800/80 flex justify-center shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${getRAGColor(task.rag)} shadow-sm`}></div>
      </div>
    </div>
  );
};

export default TaskRow;
