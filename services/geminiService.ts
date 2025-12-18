
import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAITaskBreakdown = async (projectName: string, goal: string) => {
  // Use ai.models.generateContent to query GenAI with both model name and prompt
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a detailed WBS (Work Breakdown Structure) for a project called "${projectName}" with the goal: "${goal}". 
    Return a hierarchical list of phases and subtasks with estimated durations.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            duration: { type: Type.NUMBER, description: "Estimated duration in days" },
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  duration: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    }
  });

  // Access the text property directly (it is a property, not a method)
  return JSON.parse(response.text || '[]');
};

export const getAIProjectInsights = async (tasks: Task[]) => {
  const taskSummary = tasks.map(t => ({
    name: t.name,
    status: t.status,
    progress: t.progress,
    rag: t.rag,
    owner: t.owner
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this project data and provide an executive summary, identify top 3 risks, and suggest 2 timeline optimizations. 
    Tasks: ${JSON.stringify(taskSummary)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          risks: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          optimizations: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          }
        }
      }
    }
  });

  // Access the text property directly
  return JSON.parse(response.text || '{}');
};
