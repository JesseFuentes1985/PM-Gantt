
import React, { useState, useEffect, useRef } from 'react';
import { Task, RAGStatus, TaskStatus } from '../types';
import { calculateDuration, getEndDateFromDuration, parseDependencyString, formatDependencyString, formatDateDisplay } from '../utils/ganttLogic';

interface TaskRowProps {
  task: Task;
  hierarchyId: string;
  index: number;
  isSelected: boolean;
  allTasks: Task[];
  hierarchyToIdMap: Map<string, string>;
  idToHierarchyMap: Map<string, string>;
  onSelect: () => void;
  onToggle: () => void;
  onAddSubtask: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onAIDecompose: () => void;
  onRemoveTask: () => void;
  onOpenNotes: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragging?: boolean;
  isDragTarget?: boolean;
  isSummaryMode?: boolean;
  isDarkMode?: boolean;
  columnVisibility: {
    rag: boolean;
    done: boolean;
    float: boolean;
    owner: boolean;
    atRisk: boolean;
    status: boolean;
    pred: boolean;
    duration: boolean;
    dates: boolean;
  };
}

const TaskRow: React.FC<TaskRowProps> = ({ 
  task, 
  hierarchyId, 
  index,
  isSelected, 
  allTasks,
  hierarchyToIdMap,
  idToHierarchyMap,
  onSelect, 
  onToggle, 
  onAddSubtask,
  onUpdate, 
  onAIDecompose,
  onRemoveTask,
  onOpenNotes,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragTarget,
  isSummaryMode,
  isDarkMode,
  columnVisibility
}) => {
  const [predInput, setPredInput] = useState("");
  const [showRAGDetails, setShowRAGDetails] = useState(false);

  useEffect(() => {
    setPredInput(formatDependencyString(task.dependencies, idToHierarchyMap));
  }, [task.dependencies, idToHierarchyMap]);

  const getDepth = (t: Task): number => {
    let d = 0;
    let curr = t;
    while (curr.parentId) {
      const parent = allTasks.find(p => p.id === curr.parentId);
      if (!parent) break;
      d++;
      curr = parent;
    }
    return d;
  };

  const depth = getDepth(task);
  const hasChildren = allTasks.some(t => t.parentId === task.id);
  const isParentRow = hasChildren;
  const isEven = index % 2 === 0;
  const isComplete = task.status === TaskStatus.COMPLETED;

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
    onUpdate({ duration: dur, endDate: getEndDateFromDuration(task.startDate, dur) });
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

  const getRAGInsights = () => {
    const insights: { icon: string; text: string; type: 'neutral' | 'warn' | 'error' | 'success' }[] = [];
    
    if (isParentRow) {
      const children = allTasks.filter(c => c.parentId === task.id);
      const atRisk = children.filter(c => c.rag === RAGStatus.RED).length;
      const delayed = children.filter(c => c.rag === RAGStatus.AMBER).length;
      
      insights.push({ icon: 'fa-sitemap', text: `Roll-up of ${children.length} sub-items`, type: 'neutral' });
      if (atRisk > 0) insights.push({ icon: 'fa-exclamation-triangle', text: `${atRisk} critical subtask blocks detected`, type: 'error' });
      if (delayed > 0) insights.push({ icon: 'fa-clock', text: `${delayed} sub-items currently at risk or on hold`, type: 'warn' });
      if (atRisk === 0 && delayed === 0) insights.push({ icon: 'fa-check-circle', text: "All child paths are healthy", type: 'success' });
    } else {
      if (task.status === TaskStatus.BLOCKED) {
        insights.push({ icon: 'fa-ban', text: "Status: BLOCKED (Critical)", type: 'error' });
      } else if (task.status === TaskStatus.ON_HOLD) {
        insights.push({ icon: 'fa-pause', text: "Status: ON HOLD (Amber)", type: 'warn' });
      }

      if (task.isAtRisk) {
        insights.push({ icon: 'fa-flag', text: "Manually flagged 'At Risk' (Amber)", type: 'warn' });
      }

      const incompletePredecessors = task.dependencies
        .map(dep => allTasks.find(t => t.id === dep.predecessorId))
        .filter(p => p && p.status !== TaskStatus.COMPLETED);

      if (incompletePredecessors.length > 0) {
        insights.push({ icon: 'fa-link-slash', text: `${incompletePredecessors.length} incomplete predecessor dependencies`, type: 'error' });
      }
    }

    if (insights.length === 0) {
      if (task.rag === RAGStatus.GREEN) insights.push({ icon: 'fa-check-double', text: "Healthy: No blocking issues found", type: 'success' });
      if (task.rag === RAGStatus.GRAY) insights.push({ icon: 'fa-hourglass-start', text: "Planned: Pending project initiation", type: 'neutral' });
    }

    return insights;
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    const updates: Partial<Task> = { status: newStatus };
    if (newStatus === TaskStatus.COMPLETED) {
      updates.progress = 100;
    } else if (newStatus === TaskStatus.NOT_STARTED) {
      updates.progress = 0;
    }
    onUpdate(updates);
  };

  const ragColors = {
    [RAGStatus.GREEN]: 'bg-emerald-500',
    [RAGStatus.AMBER]: 'bg-amber-500',
    [RAGStatus.RED]: 'bg-rose-500',
    [RAGStatus.GRAY]: 'bg-slate-300 dark:bg-slate-600',
  };

  const statusIcons = {
    [TaskStatus.NOT_STARTED]: 'fa-circle-notch text-gray-300',
    [TaskStatus.IN_PROGRESS]: 'fa-spinner fa-spin text-blue-500',
    [TaskStatus.COMPLETED]: 'fa-check-circle text-emerald-500',
    [TaskStatus.ON_HOLD]: 'fa-pause-circle text-amber-500',
    [TaskStatus.BLOCKED]: 'fa-exclamation-circle text-rose-500',
  };

  const rowBaseColor = isSelected 
    ? 'bg-blue-50/80 dark:bg-blue-900/20' 
    : isEven ? 'bg-white dark:bg-slate-900' : 'bg-gray-50/50 dark:bg-slate-900/40';

  const riskColor = task.isAtRisk 
    ? (isDarkMode ? 'bg-red-900/10' : 'bg-red-50/70')
    : '';

  const finalRowBg = task.isAtRisk && !isSelected ? riskColor : rowBaseColor;

  const typeConfig = {
    PF: { label: 'PF', icon: 'fa-rocket', class: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' },
    EPIC: { label: 'EPIC', icon: 'fa-bolt', class: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' },
    STORY: { label: 'STORY', icon: 'fa-bookmark', class: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
    TASK: { label: 'TASK', icon: 'fa-check-square', class: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' },
  };

  const config = typeConfig[task.jiraType as keyof typeof typeConfig] || typeConfig.TASK;
  const insights = getRAGInsights();

  const isNearTop = index < 4;
  const tooltipPositionClass = isNearTop 
    ? "absolute top-full right-0 mt-3 z-[100] w-64 animate-in fade-in slide-in-from-top-2"
    : "absolute bottom-full right-0 mb-3 z-[100] w-64 animate-in fade-in slide-in-from-bottom-2";

  const renderRAGIndicator = (sizeClass: string = "w-[10px] h-[10px]") => (
    <div className="relative">
      <div 
        onClick={cycleRAG} 
        onMouseEnter={() => setShowRAGDetails(true)}
        onMouseLeave={() => setShowRAGDetails(false)}
        className={`${sizeClass} rounded-full transition-all shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${ragColors[task.rag]} ${isParentRow ? 'cursor-default' : 'cursor-pointer hover:scale-125'}`} 
      />
      {showRAGDetails && (
        <div className={`${tooltipPositionClass} bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-xl duration-200 pointer-events-none`}>
          <div className={`p-3 border-b dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 rounded-t-lg`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${ragColors[task.rag]}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${task.rag === RAGStatus.RED ? 'text-rose-600' : task.rag === RAGStatus.AMBER ? 'text-amber-600' : 'text-emerald-600'}`}>
                {task.rag} {isParentRow ? 'Roll-up' : 'Status'}
              </span>
            </div>
            <span className="text-[9px] text-gray-400 font-bold uppercase">{hierarchyId}</span>
          </div>
          <div className="p-3 space-y-2.5">
            {insights.map((issue, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <i className={`fas ${issue.icon} mt-0.5 text-[10px] shrink-0 ${
                  issue.type === 'error' ? 'text-rose-500' : 
                  issue.type === 'warn' ? 'text-amber-500' : 
                  issue.type === 'success' ? 'text-emerald-500' : 'text-slate-400'
                }`}></i>
                <span className={`text-[10px] leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{issue.text}</span>
              </div>
            ))}
          </div>
          {!isParentRow && (
            <div className="px-3 py-2 bg-gray-50 dark:bg-slate-900/50 rounded-b-lg border-t dark:border-slate-700">
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Click indicator to cycle health</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isSummaryMode) {
    return (
      <div 
        className={`flex items-center h-[36px] border-b dark:border-slate-800 text-[11px] group transition-all duration-75 px-1.5 gap-2 relative ${finalRowBg} ${isDragging ? 'opacity-50' : ''} ${isDragTarget ? 'border-t-2 border-t-blue-500' : ''}`}
        onClick={onSelect}
      >
        <div className="w-3 shrink-0 flex items-center justify-center">
          {isParentRow && (
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="text-gray-400 hover:text-blue-600">
              <i className={`fas ${task.isExpanded ? 'fa-caret-down' : 'fa-caret-right'} text-[10px]`}></i>
            </button>
          )}
        </div>
        
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
           <div style={{ width: depth * 8 }} className="shrink-0"></div>
           <i className={`fas ${config.icon} text-[10px] shrink-0 ${isParentRow ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 opacity-60'}`}></i>
           <span className={`truncate text-[10px] uppercase font-bold tracking-tight ${isParentRow ? 'text-gray-900 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
             {task.jiraId || task.name.substring(0, 5)}
           </span>
        </div>

        <div className="w-10 shrink-0 flex items-center justify-end gap-1.5 px-1 h-full border-l dark:border-slate-800">
           <i className={`fas ${statusIcons[task.status]} text-[10px]`}></i>
           {renderRAGIndicator("w-[6px] h-[6px]")}
        </div>
      </div>
    );
  }

  const doneTextColor = task.progress === 100 || task.status === TaskStatus.COMPLETED
    ? 'text-emerald-600 dark:text-emerald-500'
    : (isParentRow ? 'text-blue-700 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-500');

  const floatDays = task.totalFloat || 0;
  const floatTextColor = (floatDays === 0 && !isComplete) ? 'text-rose-600 dark:text-rose-500 font-black' : 'text-gray-400 dark:text-slate-500';

  // Notes state logic
  const hasNotes = task.notes && task.notes.trim().length > 0;
  // Specific notes button styling logic based on 3 states: Default, Hover(empty), Persistent(saved)
  const noteBtnClasses = hasNotes
    ? 'text-amber-500 hover:text-amber-500' // Yellow stays yellow persistently
    : 'text-gray-300 hover:text-gray-400 dark:text-slate-600 dark:hover:text-slate-500'; // Gray states

  return (
    <div 
      className={`flex items-center h-[36px] border-b dark:border-slate-800 text-[11px] group transition-all duration-75 ${finalRowBg} ${isDragging ? 'opacity-50' : ''} ${isDragTarget ? 'border-t-2 border-t-blue-500' : ''}`}
      onClick={onSelect}
      draggable={!isParentRow}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={(e) => onDragOver(e, task.id)}
      onDrop={(e) => onDrop(e, task.id)}
    >
      <div className="w-8 shrink-0 flex items-center justify-center h-full">
        {isParentRow && (
          <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="text-gray-400 hover:text-blue-600 transition-colors">
            <i className={`fas ${task.isExpanded ? 'fa-caret-down' : 'fa-caret-right'} text-sm`}></i>
          </button>
        )}
      </div>

      <div className="w-10 shrink-0 text-center font-mono text-[9px] text-gray-400 dark:text-slate-500 border-l dark:border-slate-800 h-full flex items-center justify-center">
        {hierarchyId}
      </div>

      <div className="flex-1 min-w-0 px-2 flex items-center gap-2 h-full border-l dark:border-slate-800">
        <div style={{ width: depth * 16 }}></div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] text-[8px] font-black uppercase tracking-tighter shrink-0 border transition-all ${config.class}`}>
          <i className={`fas ${config.icon} text-[9px]`}></i>
          <span>{task.jiraId || config.label}</span>
        </div>
        <input 
          value={task.name} 
          onChange={(e) => onUpdate({ name: e.target.value })}
          className={`bg-transparent outline-none flex-1 truncate transition-colors focus:bg-white dark:focus:bg-slate-800 px-1 rounded ${isParentRow ? 'font-bold text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
        />
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenNotes(); }} 
            className={`p-1 transition-colors duration-200 ${noteBtnClasses}`} 
            title="Row Notes"
          >
            <i className="fas fa-sticky-note"></i>
          </button>
          {task.jiraType !== 'STORY' && (
            <button onClick={(e) => { e.stopPropagation(); onAddSubtask(); }} className="p-1 text-gray-400 hover:text-green-500" title={`Add subtask`}><i className="fas fa-plus-circle"></i></button>
          )}
          {!isParentRow && <button onClick={(e) => { e.stopPropagation(); onAIDecompose(); }} className="p-1 text-indigo-400 hover:text-indigo-500" title="AI Breakdown"><i className="fas fa-sparkles"></i></button>}
          <button onClick={(e) => { e.stopPropagation(); onRemoveTask(); }} className="p-1 text-gray-300 hover:text-rose-500" title="Delete"><i className="fas fa-trash-alt"></i></button>
        </div>
      </div>

      {columnVisibility.dates && (
        <>
          <div className="w-[110px] shrink-0 border-l dark:border-slate-800 h-full flex items-center justify-center relative hover:bg-gray-100/50 dark:hover:bg-slate-800/50 cursor-pointer group/date">
            <span className="text-gray-500 dark:text-slate-400 font-mono text-[10px] pointer-events-none z-10">{formatDateDisplay(task.startDate)}</span>
            {!isParentRow && <i className="fas fa-calendar-alt absolute right-2 text-[10px] text-gray-300 group-hover/date:text-blue-500 transition-colors pointer-events-none"></i>}
            {!isParentRow && <input type="date" value={task.startDate} onChange={(e) => handleDateChange('startDate', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />}
          </div>

          <div className="w-[110px] shrink-0 border-l dark:border-slate-800 h-full flex items-center justify-center relative hover:bg-gray-100/50 dark:hover:bg-slate-800/50 cursor-pointer group/date">
            <span className="text-gray-500 dark:text-slate-400 font-mono text-[10px] pointer-events-none z-10">{formatDateDisplay(task.endDate)}</span>
            {!isParentRow && <i className="fas fa-calendar-alt absolute right-2 text-[10px] text-gray-300 group-hover/date:text-blue-500 transition-colors pointer-events-none"></i>}
            {!isParentRow && <input type="date" value={task.endDate} onChange={(e) => handleDateChange('endDate', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />}
          </div>
        </>
      )}

      {columnVisibility.duration && (
        <div className="w-16 shrink-0 border-l dark:border-slate-800 h-full flex items-center justify-center">
          <input type="number" value={task.duration} onChange={(e) => handleDurationChange(e.target.value)} disabled={isParentRow} className={`bg-transparent outline-none w-10 text-center font-bold ${isParentRow ? 'text-gray-400' : 'text-blue-600 dark:text-blue-400'}`} />
        </div>
      )}

      {columnVisibility.pred && (
        <div className="w-20 shrink-0 border-l dark:border-slate-800 h-full flex items-center px-1">
          <input 
            value={predInput} 
            onChange={(e) => setPredInput(e.target.value)}
            onBlur={() => {
              const parts = predInput.split(',').map(s => s.trim()).filter(Boolean);
              const newDeps = parts.map(p => parseDependencyString(p, hierarchyToIdMap)).filter(Boolean) as any[];
              onUpdate({ dependencies: newDeps.filter(d => d.predecessorId !== task.id) });
            }}
            placeholder="--"
            className="bg-transparent outline-none w-full text-[10px] uppercase font-bold text-gray-400 text-center placeholder-gray-200"
          />
        </div>
      )}

      {columnVisibility.status && (
        <div className="w-32 shrink-0 border-l dark:border-slate-800 h-full flex items-center px-1">
          <div className="relative w-full flex items-center gap-1.5 px-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors group/status">
            <i className={`fas ${statusIcons[task.status]} text-[10px] shrink-0`}></i>
            {isParentRow ? (
              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 truncate uppercase tracking-tight">{task.status}</span>
            ) : (
              <select 
                value={task.status} 
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="bg-transparent outline-none w-full text-[10px] font-bold text-gray-700 dark:text-slate-200 cursor-pointer appearance-none uppercase tracking-tight"
              >
                {Object.values(TaskStatus).map(s => <option key={s} value={s} className="bg-white dark:bg-slate-900">{s.toUpperCase()}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {columnVisibility.owner && (
        <div className="w-24 shrink-0 border-l dark:border-slate-800 h-full flex items-center px-2">
          <input value={task.owner} onChange={(e) => onUpdate({ owner: e.target.value })} className="bg-transparent outline-none w-full truncate text-gray-500 dark:text-slate-400 text-left px-1 hover:bg-white dark:hover:bg-slate-800 rounded" />
        </div>
      )}

      {columnVisibility.atRisk && (
        <>
          <div className={`w-12 shrink-0 h-full flex flex-col items-center justify-center border-l-2 border-rose-500/50 dark:border-rose-600/50 bg-rose-50/5 dark:bg-rose-950/5 ${isComplete ? 'opacity-30 grayscale cursor-not-allowed' : ''}`} title="At Risk">
            <input 
              type="checkbox" 
              checked={task.isAtRisk || false} 
              onChange={(e) => !isComplete && onUpdate({ isAtRisk: e.target.checked })}
              disabled={isComplete}
              className={`w-3.5 h-3.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 ${isComplete ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            />
          </div>
          <div className={`w-12 shrink-0 h-full flex flex-col items-center justify-center border-l-2 border-amber-500/50 dark:border-amber-600/50 bg-amber-50/5 dark:bg-amber-950/5 ${isComplete ? 'opacity-30 grayscale cursor-not-allowed' : ''}`} title="Is Milestone">
            <input 
              type="checkbox" 
              checked={task.isMilestone || false} 
              onChange={(e) => !isComplete && onUpdate({ isMilestone: e.target.checked })}
              disabled={isComplete}
              className={`w-3.5 h-3.5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 ${isComplete ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            />
          </div>
        </>
      )}

      {columnVisibility.float && (
        <div className="w-16 shrink-0 border-l dark:border-slate-800 h-full flex items-center justify-center">
          <div className={`flex flex-col items-center justify-center ${floatTextColor}`}>
             {isComplete ? (
               <i className="fas fa-check text-emerald-500/50 text-[10px]"></i>
             ) : (
               <>
                 <span className="text-[10px]">{floatDays}d</span>
                 {floatDays > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-400/30 mt-0.5"></div>}
               </>
             )}
          </div>
        </div>
      )}

      {columnVisibility.done && (
        <div className="w-16 shrink-0 border-l dark:border-slate-800 h-full flex items-center justify-center">
          <div className="flex items-center justify-center w-full">
            <input type="number" value={task.progress} onChange={(e) => onUpdate({ progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} disabled={isParentRow || isComplete} className={`bg-transparent outline-none w-8 text-center font-black ${doneTextColor}`} />
            <span className={`text-[9px] font-bold -ml-1 ${doneTextColor.replace('text-', 'text-opacity-60 text-')}`}>%</span>
          </div>
        </div>
      )}

      {columnVisibility.rag && (
        <div className="w-12 shrink-0 border-l dark:border-slate-800 h-full flex items-center justify-center">
          {renderRAGIndicator()}
        </div>
      )}
    </div>
  );
};

export default TaskRow;
