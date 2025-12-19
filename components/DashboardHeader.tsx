
import React, { useMemo, useRef } from 'react';
import { ProjectStats, ZoomLevel, Task } from '../types';
import { formatDateDisplay } from '../utils/ganttLogic';

interface HeaderProps {
  stats: ProjectStats;
  tasks: Task[];
  projectTitle: string;
  onTitleChange: (title: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAIAnalysis: () => void;
  onJiraSync: () => void;
  onSave: () => void;
  onExport: () => void;
  onExportExcel: () => void;
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
  searchTerm,
  onSearchChange,
  onAIAnalysis, 
  onJiraSync,
  onSave,
  onExport,
  onExportExcel,
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
    <header className="bg-white dark:bg-slate-900 px-6 py-2.5 flex items-center justify-between shadow-sm z-30 border-b dark:border-slate-800 transition-colors duration-200">
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-gradient-to-br from-blue-500 to-indigo-700 text-white w-9 h-9 flex items-center justify-center rounded-lg shadow-lg ring-1 ring-white/20">
            <i className="fas fa-rocket transform group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-300"></i>
          </div>
        </div>
        
        <div>
          <input 
            type="text"
            value={projectTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-lg font-black text-gray-900 dark:text-slate-100 leading-none bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 w-40 truncate"
          />
          <div className="flex items-center gap-1.5">
            <span className={`flex h-1.5 w-1.5 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <p className="text-[9px] text-gray-500 dark:text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
              {lastSaved ? `Synced ${lastSaved}` : 'Local Draft'}
            </p>
          </div>
        </div>
      </div>

      {summary && (
        <div className="hidden 2xl:flex items-center gap-6 px-4 py-1.5 bg-gray-50/50 dark:bg-slate-800/30 rounded-xl border border-gray-100 dark:border-slate-800/50">
          <div className="flex flex-col items-center border-r dark:border-slate-700 pr-6">
            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Today</span>
            <span className="text-[10px] font-bold text-gray-700 dark:text-slate-200 whitespace-nowrap">{summary.today}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <i className="fas fa-flag-checkered text-[7px] text-blue-400"></i> Start
              </span>
              <span className="text-[10px] font-bold text-gray-600 dark:text-slate-300">{formatDateDisplay(summary.start)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <i className="fas fa-bullseye text-[7px] text-emerald-400"></i> Finish
              </span>
              <span className="text-[10px] font-bold text-gray-600 dark:text-slate-300">{formatDateDisplay(summary.finish)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center border-l dark:border-slate-700 pl-6">
            <span className={`text-[8px] font-black uppercase tracking-widest ${summary.isOverdue ? 'text-rose-500' : 'text-emerald-500'}`}>
              {summary.isOverdue ? 'Overdue' : 'Left'}
            </span>
            <span className={`text-[11px] font-black ${summary.isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
              {Math.abs(summary.daysRemaining)}d
            </span>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="hidden xl:flex items-center gap-12 mx-8">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tighter leading-none mb-1">Progress</span>
          <span className="text-xs font-black text-blue-600 dark:text-blue-400">{stats.averageProgress}%</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tighter leading-none mb-1">Completed</span>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-500">{stats.completedTasks}/{stats.totalTasks}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tighter leading-none mb-1">Slack</span>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{stats.totalProjectFloat || 0}d</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 mr-2">
          {/* Functional Search Bar */}
          <div className="relative flex items-center mr-1">
            <i className="fas fa-search absolute left-3 text-gray-400 text-[10px]"></i>
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-8 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-[11px] font-medium w-32 md:w-40 lg:w-48 focus:w-56 transition-all outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 dark:text-slate-200 shadow-inner"
            />
            {searchTerm && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-0.5"
              >
                <i className="fas fa-times-circle text-[11px]"></i>
              </button>
            )}
          </div>

          <button 
            onClick={onJiraSync}
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#0052cc] hover:bg-[#0747a6] text-white px-3 py-1.5 rounded-md text-[11px] font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Sync with Jira"
          >
            <i className="fab fa-jira"></i>
            <span className="hidden lg:inline">Sync Jira</span>
          </button>

          <button 
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all shadow-sm active:scale-95 ${
              isSaving ? 'bg-gray-100 text-gray-400' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Save to Cloud"
          >
            {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
            <span className="hidden lg:inline">Save</span>
          </button>

          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-md border dark:border-slate-700">
            <button onClick={onExport} className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors" title="Export JSON"><i className="fas fa-file-export text-xs"></i></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors" title="Import JSON"><i className="fas fa-file-import text-xs"></i></button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = '';
            }} />
          </div>
        </div>

        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg border dark:border-slate-700 items-center">
          {(Object.values(ZoomLevel) as ZoomLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => onZoomChange(level)}
              className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${
                zoomLevel === level 
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {level.substring(0, 1)}
            </button>
          ))}
          <div className="w-[1px] h-3 bg-gray-200 dark:bg-slate-700 mx-1"></div>
          <button onClick={onJumpToToday} className="px-2 py-1 text-[9px] font-bold uppercase text-indigo-600 hover:bg-white rounded-md" title="Jump to Today">Today</button>
        </div>

        <button 
          onClick={onToggleCriticalPath}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold border transition-all ${
            showCriticalPath 
              ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800' 
              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300'
          }`}
        >
          <i className="fas fa-route"></i>
          <span className="hidden sm:inline">Path</span>
        </button>

        <button 
          onClick={onToggleDarkMode}
          className="w-9 h-9 flex items-center justify-center rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-yellow-400"
        >
          <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>

        <button 
          onClick={onAIAnalysis}
          disabled={isLoading}
          className="flex items-center gap-2 bg-[#5e35b1] hover:bg-[#512da8] text-white px-3 py-1.5 rounded-md text-[11px] font-bold transition-all shadow-sm disabled:opacity-50"
        >
          <i className="fas fa-sparkles"></i>
          <span className="hidden lg:inline">AI Insights</span>
        </button>
        
        <div className="flex gap-1">
          <button 
            onClick={onAddTask}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 px-3 py-1.5 rounded-md text-[11px] font-bold hover:bg-gray-50 shadow-sm"
          >
            <i className="fas fa-plus text-blue-500"></i>
            <span className="hidden sm:inline">Add PF</span>
          </button>
          
          <button 
            onClick={onExportExcel}
            className="flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-500 px-3 py-1.5 rounded-md text-[11px] font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all shadow-sm"
            title="Export to Excel"
          >
            <i className="fas fa-file-excel text-lg"></i>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
