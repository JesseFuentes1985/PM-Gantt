
import { Task } from "../types";

const STORAGE_KEY = 'pm_gantt_state_v1';
const SCHEMA_VERSION = 1;

export interface ProjectState {
  tasks: Task[];
  title: string;
  lastUpdated: string;
  version: number;
}

/**
 * Saves the full project state to localStorage.
 */
export const saveProjectState = (tasks: Task[], title: string): void => {
  try {
    const state: ProjectState = {
      tasks,
      title,
      lastUpdated: new Date().toISOString(),
      version: SCHEMA_VERSION
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save project state:", error);
  }
};

/**
 * Loads and validates project state from localStorage.
 */
export const loadProjectState = (): ProjectState | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    const state: ProjectState = JSON.parse(data);
    
    // Simple schema version check
    if (state.version !== SCHEMA_VERSION) {
      console.warn("Storage version mismatch. Attempting migration or fallback.");
      // Future migration logic can go here
    }
    
    if (!Array.isArray(state.tasks)) return null;
    
    return state;
  } catch (error) {
    console.error("Failed to load project state:", error);
    return null;
  }
};

/**
 * Triggers a browser download of the project data as a JSON file.
 */
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
  link.download = `gantt_project_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports task data to CSV format (Excel compatible).
 */
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
  link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Handles project import from a JSON file.
 */
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

// Legacy support for manual saving if UI still uses it, but updated to use new key
export const saveToDatabase = async (data: { tasks: Task[], title: string }): Promise<void> => {
    saveProjectState(data.tasks, data.title);
};

export const loadFromDatabase = () => loadProjectState();
