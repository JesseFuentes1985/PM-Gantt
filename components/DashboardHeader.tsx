
import React, { useMemo, useRef } from 'react';
import { ProjectStats, ZoomLevel, Task } from '../types';
import { formatDateDisplay } from '../utils/ganttLogic';

interface HeaderProps {
  stats: ProjectStats;
  tasks: Task[];
  projectTitle: string;
  onTitleChange: (title: string) => void;
  onAIAnalysis: () => void;
  onJiraSync: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: string | null;
  onAddTask: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  showCriticalPath: boolean;
  onToggleCriticalPath: () => void;
  zoomLevel: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
  onJumpToToday: () => void;
}

const DashboardHeader: React.FC<HeaderProps> = ({ 
  stats, 
  tasks,
  projectTitle,
  onTitleChange,
  onAIAnalysis, 
  onJiraSync,
  onSave,
  onExport,
  onImport,
  isLoading, 
  isSaving,
  lastSaved,
  onAddTask, 
  isDarkMode, 
  onToggleDarkMode,
  showCriticalPath,
  onToggleCriticalPath,
  zoomLevel,
  onZoomChange,
  onJumpToToday
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => {
    if (tasks.length === 0) return null;
    
    const starts = tasks.map(t => new Date(t.startDate + 'T00:00:00').getTime());
    const ends = tasks.map(t => new Date(t.endDate + 'T00:00:00').getTime());
    
    const projectStart = new Date(Math.min(...starts));
    const projectFinish = new Date(Math.max(...ends));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeDiff = projectFinish.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return {
      start: projectStart.toISOString().split('T')[0],
      finish: projectFinish.toISOString().split('T')[0],
      daysRemaining,
      isOverdue: daysRemaining < 0,
      today: today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    };
  }, [tasks]);

  return (
    <header className="bg-white dark:bg-slate-900 px-6 py-3 flex items-center justify-between shadow-sm z-30 border-b dark:border-slate-800 transition-colors duration-200">
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-gradient-to-br from-blue-500 to-indigo-700 text-white w-10 h-10 flex items-center justify-center rounded-lg shadow-lg ring-1 ring-white/20">
            <i className="fas fa-rocket fa-lg transform group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-300"></i>
          </div>
        </div>
        
        <div>
          <input 
            type="text"
            value={projectTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-xl font-black text-gray-900 dark:text-slate-100 leading-tight tracking-tight bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 w-48 truncate"
          />
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              {lastSaved ? `Synced ${lastSaved}` : 'Local Draft'}
            </p>
          </div>
        </div>
      </div>

      {summary && (
        <div className="hidden xl:flex items-center gap-8 px-6 py-1.5 bg-gray-50/50 dark:bg-slate-800/30 rounded-xl border border-gray-100 dark:border-slate-800/50 shadow-inner">
          <div className="flex flex-col items-center border-r dark:border-slate-700 pr-8">
            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Today</span>
            <span className="text-[11px] font-bold text-gray-700 dark:text-slate-200">{summary.today}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <i className="fas fa-flag-checkered text-[8px] text-blue-400"></i> Start
              </span>
              <span className="text-[11px] font-bold text-gray-600 dark:text-slate-300">{formatDateDisplay(summary.start)}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <i className="fas fa-bullseye text-[8px] text-emerald-400"></i> Finish
              </span>
              <span className="text-[11px] font-bold text-gray-600 dark:text-slate-300">{formatDateDisplay(summary.finish)}</span>
            </div>
          </div>

          <div className={`flex flex-col items-center border-l dark:border-slate-700 pl-8 min-w-[100px]`}>
            <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${summary.isOverdue ? 'text-rose-500' : 'text-emerald-500'}`}>
              {summary.isOverdue ? 'Status' : 'Countdown'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-[13px] font-black ${summary.isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
                {Math.abs(summary.daysRemaining)}
              </span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">
                {summary.isOverdue ? 'Days Overdue' : 'Days Left'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1">
          <button 
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all shadow-sm active:scale-95 ${
              isSaving ? 'bg-gray-100 text-gray-400' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Save project to Database"
          >
            {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
            <span className="hidden sm:inline">Save</span>
          </button>
          
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-md border dark:border-slate-700">
            <button 
              onClick={onExport}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              title="Export as JSON"
            >
              <i className="fas fa-file-export"></i>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              title="Import from JSON"
            >
              <i className="fas fa-file-import"></i>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg border dark:border-slate-700 items-center">
          {(Object.values(ZoomLevel) as ZoomLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => onZoomChange(level)}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                zoomLevel === level 
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
              }`}
            >
              {level}
            </button>
          ))}
          <div className="w-[1px] h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={onJumpToToday}
            className="px-3 py-1 text-[10px] font-bold uppercase rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-all"
            title="Jump to Today"
          >
            Today
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <button 
            onClick={onToggleCriticalPath}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all shadow-sm border ${
              showCriticalPath 
                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            <i className={`fas fa-route ${showCriticalPath ? 'text-red-500' : ''}`}></i>
            <span className="hidden sm:inline">Path</span>
          </button>

          <button 
            onClick={onToggleDarkMode}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-500 dark:text-yellow-400 shadow-sm"
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>

          <button 
            onClick={onAIAnalysis}
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#5e35b1] hover:bg-[#512da8] text-white px-4 py-2 rounded-md text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <i className="fas fa-sparkles"></i>
            <span className="hidden sm:inline">Insights</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
