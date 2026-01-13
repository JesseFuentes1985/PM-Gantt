
import React from 'react';
import { ProjectMetadata } from '../types';

interface ProjectListProps {
  projects: ProjectMetadata[];
  onCreateProject: () => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onCreateProject, onOpenProject, onDeleteProject, isDarkMode, onToggleDarkMode }) => {
  return (
    <div className={`min-h-screen p-6 md:p-12 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#fcfcfd] text-slate-900'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Projects
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Workspace & Schedule Management
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onToggleDarkMode}
              className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
            </button>

            <button
              onClick={onCreateProject}
              className="flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] group"
            >
              <i className="fas fa-plus text-[10px] group-hover:rotate-90 transition-transform duration-300"></i>
              NEW PROJECT
            </button>
          </div>
        </div>

        {/* Empty State or Grid */}
        {projects.length === 0 ? (
          <div className={`flex flex-col items-center justify-center p-20 rounded-[2rem] border-2 border-dashed ${isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-white'}`}>
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 ${isDarkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-50 text-slate-300'}`}>
              <i className="fas fa-folder-open text-4xl"></i>
            </div>
            <h2 className="text-2xl font-bold mb-3">Your workspace is empty</h2>
            <p className={`text-sm font-medium mb-10 text-center max-w-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Create your first project to start building professional-grade Gantt charts and tracking deliverables.
            </p>
            <button
              onClick={onCreateProject}
              className="text-indigo-600 font-bold text-sm hover:text-indigo-500 transition-colors flex items-center gap-2"
            >
              Start a new project <i className="fas fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onOpenProject(project.id)}
                className={`group relative p-7 rounded-[1.75rem] border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800/60 hover:border-indigo-500/40 hover:shadow-indigo-500/5' 
                    : 'bg-white border-slate-200/60 hover:border-indigo-200 hover:shadow-slate-200/50'
                }`}
              >
                {/* Card Top Branding */}
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center transition-colors ${
                    isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    <i className="fas fa-project-diagram text-xl"></i>
                  </div>
                  
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if(confirm('Permanently delete this project?')) onDeleteProject(project.id); 
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <i className="fas fa-trash-alt text-sm"></i>
                  </button>
                </div>
                
                {/* Project Identity */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Updated {new Date(project.lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight">
                    <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>Task Completion</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{project.progress}%</span>
                  </div>
                  
                  <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700 ease-out" 
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                        isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'
                      }`}>
                        {project.taskCount} Nodes
                      </span>
                    </div>
                    
                    <div className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      View Gantt <i className="fas fa-arrow-right text-[9px] transition-transform group-hover:translate-x-1"></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer Meta */}
      <div className="max-w-6xl mx-auto mt-20 pt-8 border-t dark:border-slate-900 flex justify-center">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
          Gemini Powered Gantt System • v1.0.4
        </p>
      </div>
    </div>
  );
};

export default ProjectList;
