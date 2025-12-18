
import { Task } from "../types";

const STORAGE_KEY = 'gemini_gantt_project_data';

export interface ProjectData {
  tasks: Task[];
  title: string;
  lastUpdated: string;
}

/**
 * Simulates an asynchronous database save operation.
 */
export const saveToDatabase = async (data: ProjectData): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        resolve();
      } catch (error) {
        reject(new Error("Failed to save to storage. Possibly quota exceeded."));
      }
    }, 800);
  });
};

/**
 * Loads project data from the local storage "database".
 */
export const loadFromDatabase = (): ProjectData | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

/**
 * Triggers a browser download of the project data as a JSON file.
 */
export const exportProjectJSON = (data: ProjectData) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
export const importProjectJSON = (file: File): Promise<ProjectData> => {
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
