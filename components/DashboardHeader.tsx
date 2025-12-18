
import React from 'react';
import { ProjectStats } from '../types';

interface HeaderProps {
  stats: ProjectStats;
  onAIAnalysis: () => void;
  isLoading: boolean;
  onAddTask: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const DashboardHeader: React.FC<HeaderProps> = ({ stats, onAIAnalysis, isLoading, onAddTask, isDarkMode, onToggleDarkMode }) => {
  return (
    <header className="bg-white dark:bg-slate-900 px-6 py-3 flex items-center justify-between shadow-sm z-30 border-b dark:border-slate-800 transition-colors duration-200">
      <div className="flex items-center gap-4">
        <div className="bg-blue-600 dark:bg-blue-700 text-white w-10 h-10 flex items-center justify-center rounded-lg shadow-inner">
          <i className="fas fa-project-diagram fa-lg"></i>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100 leading-tight">Global Launch Program 2024</h1>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium tracking-wide uppercase">Master Schedule • Version 2.4.1</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-6 mr-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Progress</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400 leading-none">{stats.averageProgress}%</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Completed</span>
            <span className="text-sm font-black text-green-600 dark:text-green-500 leading-none">{stats.completedTasks}/{stats.totalTasks}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tighter">At Risk</span>
            <span className="text-sm font-black text-red-500 dark:text-red-400 leading-none">{stats.atRiskTasks}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={onToggleDarkMode}
            className={`flex items-center justify-center w-10 h-10 rounded-md transition-all shadow-sm border ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' 
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>

          <button 
            onClick={onAIAnalysis}
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#5e35b1] hover:bg-[#512da8] text-white px-4 py-2 rounded-md text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <i className="fas fa-sparkles"></i>
            Gemini AI
          </button>
          
          <button 
            onClick={onAddTask}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 px-3 py-2 rounded-md text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <i className="fas fa-plus text-blue-500 dark:text-blue-400"></i>
            Add Task
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
            <i className="fas fa-cog text-sm"></i>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
