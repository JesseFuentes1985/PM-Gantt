
import React from 'react';
import { Task, RAGStatus } from '../types';
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

  const getRAGColor = (rag: RAGStatus) => {
    switch (rag) {
      case RAGStatus.GREEN: return 'bg-green-500';
      case RAGStatus.AMBER: return 'bg-yellow-500';
      case RAGStatus.RED: return 'bg-red-500';
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

        <input 
          value={task.name} 
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className={`bg-transparent border-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-700 rounded px-1 w-full truncate text-[11px] placeholder-gray-300 dark:placeholder-slate-700 dark:text-slate-200 ${isParentRow ? 'font-bold' : 'font-medium'}`}
          placeholder="New Task..."
        />
        
        <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onAddSubtask(); }}
            className="text-green-600 dark:text-green-500 hover:text-green-700 p-1 rounded hover:bg-green-100/50 dark:hover:bg-green-900/20"
            title="Add Subtask"
          >
            <i className="fas fa-plus-circle text-[10px]"></i>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onAIDecompose(); }}
            className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 p-1 rounded hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20"
            title="AI Breakdown"
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
        {task.progress}%
      </div>

      <div className="w-10 p-2 border-l border-gray-100 dark:border-slate-800/80 flex justify-center shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${getRAGColor(task.rag)} shadow-sm`}></div>
      </div>
    </div>
  );
};

export default TaskRow;
