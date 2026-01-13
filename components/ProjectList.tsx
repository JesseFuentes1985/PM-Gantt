
import React from 'react';
import { ProjectMetadata } from '../types';

interface ProjectListProps {
  projects: ProjectMetadata[];
  onCreateProject: () => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  isDarkMode: boolean;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onCreateProject, onOpenProject, onDeleteProject, isDarkMode }) => {
  return (
    <div className={`min-h-screen p-8 transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Projects</h1>
            <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              Gantt Sheet Management System
            </p>
          </div>
          <button
            onClick={onCreateProject}
            className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 group"
          >
            <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
            NEW PROJECT
          </button>
        </div>

        {projects.length === 0 ? (
          <div className={`flex flex-col items-center justify-center p-20 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-gray-100 text-gray-300'}`}>
              <i className="fas fa-folder-open text-3xl"></i>
            </div>
            <h2 className="text-xl font-black mb-2">No projects found</h2>
            <p className={`text-sm font-medium mb-8 text-center max-w-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Get started by creating your first hierarchical Gantt chart project.
            </p>
            <button
              onClick={onCreateProject}
              className="text-indigo-600 font-black text-sm hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`group relative p-6 rounded-2xl border transition-all hover:shadow-xl ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500`}>
                    <i className="fas fa-project-diagram text-xl"></i>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); if(confirm('Delete this project?')) onDeleteProject(project.id); }}
                    className="p-2 text-gray-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
                
                <h3 className="text-lg font-black truncate mb-1">{project.title}</h3>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-6 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  Last updated: {new Date(project.lastUpdated).toLocaleDateString()}
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Progress</span>
                    <span className="text-indigo-500">{project.progress}%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      {project.taskCount} Tasks
                    </span>
                    <button
                      onClick={() => onOpenProject(project.id)}
                      className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-500 flex items-center gap-2 group-hover:translate-x-1 transition-transform"
                    >
                      Open <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList;
