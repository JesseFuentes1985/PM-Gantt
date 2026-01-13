
import { Task, ProjectMetadata } from "../types";

const PROJECTS_LIST_KEY = 'pm_projects_list_v1';
const PROJECT_DATA_PREFIX = 'pm_project_data_v1_';
const LEGACY_KEY = 'pm_gantt_state_v1';
const SCHEMA_VERSION = 1;

export interface ProjectState {
  tasks: Task[];
  title: string;
  lastUpdated: string;
  version: number;
}

/**
 * Migration from single project to multi-project
 */
export const migrateLegacyData = () => {
  const legacyData = localStorage.getItem(LEGACY_KEY);
  if (legacyData) {
    try {
      const state = JSON.parse(legacyData);
      const id = 'default-project';
      saveProjectState(id, state.tasks, state.title || 'Imported Project');
      localStorage.removeItem(LEGACY_KEY);
      return id;
    } catch (e) {
      console.error("Migration failed", e);
    }
  }
  return null;
};

export const getProjectsList = (): ProjectMetadata[] => {
  try {
    const list = localStorage.getItem(PROJECTS_LIST_KEY);
    return list ? JSON.parse(list) : [];
  } catch (error) {
    console.error("Failed to load projects list", error);
    return [];
  }
};

const updateProjectsListMetadata = (id: string, title: string, tasks: Task[]) => {
  const list = getProjectsList();
  const existingIndex = list.findIndex(p => p.id === id);
  
  const progress = tasks.length > 0 
    ? Math.round(tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / tasks.length) 
    : 0;

  const metadata: ProjectMetadata = {
    id,
    title,
    lastUpdated: new Date().toISOString(),
    taskCount: tasks.length,
    progress
  };

  if (existingIndex > -1) {
    list[existingIndex] = metadata;
  } else {
    list.unshift(metadata);
  }
  
  localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(list));
};

export const saveProjectState = (id: string, tasks: Task[], title: string): void => {
  try {
    const state: ProjectState = {
      tasks,
      title,
      lastUpdated: new Date().toISOString(),
      version: SCHEMA_VERSION
    };
    localStorage.setItem(`${PROJECT_DATA_PREFIX}${id}`, JSON.stringify(state));
    updateProjectsListMetadata(id, title, tasks);
  } catch (error) {
    console.error("Failed to save project state:", error);
  }
};

export const loadProjectState = (id: string): ProjectState | null => {
  try {
    const data = localStorage.getItem(`${PROJECT_DATA_PREFIX}${id}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load project state:", error);
    return null;
  }
};

export const deleteProject = (id: string) => {
  localStorage.removeItem(`${PROJECT_DATA_PREFIX}${id}`);
  const list = getProjectsList().filter(p => p.id !== id);
  localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(list));
};

export const exportProjectJSON = (tasks: Task[], title: string) => {
  const state: ProjectState = {
    tasks,
    title,
    lastUpdated: new Date().toISOString(),
    version: SCHEMA_VERSION
  };
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gantt_${title.replace(/\s+/g, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (tasks: Task[], title: string) => {
  const headers = ["ID", "Name", "Start Date", "End Date", "Duration", "Progress (%)", "Status", "RAG", "Owner", "At Risk", "Critical"];
  const rows = tasks.map(t => [
    t.id,
    `"${t.name.replace(/"/g, '""')}"`,
    t.startDate,
    t.endDate,
    t.duration,
    t.progress,
    t.status,
    t.rag,
    t.owner,
    t.isAtRisk ? "Yes" : "No",
    t.isCritical ? "Yes" : "No"
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importProjectJSON = (file: File): Promise<ProjectState> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.tasks && Array.isArray(data.tasks)) {
          resolve(data);
        } else {
          reject(new Error("Invalid project file format."));
        }
      } catch (err) {
        reject(new Error("Failed to parse project file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
};

// Legacy stubs for App.tsx compatibility during migration
export const saveToDatabase = async (data: { tasks: Task[], title: string }): Promise<void> => {
    // This is now handled by saveProjectState(id, ...)
};
export const loadFromDatabase = () => null;
