
import { Task } from "../types";

const STORAGE_KEY = 'gemini_gantt_project_data';

export interface ProjectData {
  tasks: Task[];
  title: string;
  lastUpdated: string;
}

/**
 * Simulates an asynchronous database save operation.
 * In a real-world scenario, this would be an API call to a backend.
 */
export const saveToDatabase = async (data: ProjectData): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Simulate network latency
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
