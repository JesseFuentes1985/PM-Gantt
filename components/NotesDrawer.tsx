
import React from 'react';
import { Task } from '../types';

interface NotesDrawerProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

const NotesDrawer: React.FC<NotesDrawerProps> = ({ task, onUpdate, onClose, isDarkMode }) => {
  return (
    <div className={`fixed top-0 right-0 h-screen w-[400px] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
      <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-gradient-to-r from-slate-900 to-indigo-950 border-slate-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            <i className="fas fa-sticky-note"></i>
          </div>
          <div className="flex flex-col">
            <h2 className={`text-lg font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>Row Notes</h2>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {task.jiraId || 'TASK ID: ' + task.id.substring(0, 8)}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-2 transition-colors">
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      <div className="p-6 bg-gray-50/50 dark:bg-slate-950/30 border-b dark:border-slate-800">
        <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{task.name}</p>
      </div>

      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        <textarea
          value={task.notes || ''}
          onChange={(e) => onUpdate(task.id, { notes: e.target.value })}
          placeholder="Enter freeform notes for this row here..."
          className={`flex-1 w-full p-4 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none font-sans text-sm leading-relaxed ${
            isDarkMode 
              ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder-slate-600' 
              : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'
          }`}
        />
        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          <i className="fas fa-cloud-check text-blue-500"></i>
          <span>Auto-saving enabled</span>
        </div>
      </div>

      <div className={`p-6 border-t ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
        <p className={`text-[10px] text-center leading-relaxed ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>
          Notes persist per row • Last edited: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default NotesDrawer;
