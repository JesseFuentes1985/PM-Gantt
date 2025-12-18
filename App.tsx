
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, TaskStatus, RAGStatus, ProjectStats, ZoomLevel } from './types';
import { rollupHierarchy, getVisibleTasks, propagateChanges, identifyCriticalPath, createNewTask, getEndDateFromDuration, addDays } from './utils/ganttLogic';
import { getAIProjectInsights, getAITaskBreakdown } from './services/geminiService';
import DashboardHeader from './components/DashboardHeader';
import TaskRow from './components/TaskRow';
import Timeline from './components/Timeline';
import AIAssistant from './components/AIAssistant';

const INITIAL_TASKS: Task[] = [
  {
    id: 'PF-1',
    parentId: null,
    name: 'PF-01: Core Platform Infrastructure',
    startDate: '2023-11-01',
    endDate: '2023-11-15',
    duration: 15,
    progress: 80,
    status: TaskStatus.IN_PROGRESS,
    rag: RAGStatus.GREEN,
    owner: 'Sarah Connor',
    role: 'Lead Strategist',
    dependencies: [],
    isMilestone: false,
    isExpanded: true,
    jiraType: 'PF',
    jiraId: 'PLAT-101'
  },
  {
    id: 'EP-1.1',
    parentId: 'PF-1',
    name: 'EPIC: Database Schema Migration',
    startDate: '2023-11-01',
    endDate: '2023-11-05',
    duration: 5,
    progress: 100,
    status: TaskStatus.COMPLETED,
    rag: RAGStatus.GREEN,
    owner: 'John Doe',
    role: 'Analyst',
    dependencies: [],
    isMilestone: false,
    jiraType: 'EPIC',
    jiraId: 'PLAT-102'
  },
  {
    id: 'EP-1.2',
    parentId: 'PF-1',
    name: 'EPIC: Auth Provider Integration',
    startDate: '2023-11-06',
    endDate: '2023-11-07',
    duration: 2,
    progress: 100,
    status: TaskStatus.COMPLETED,
    rag: RAGStatus.GREEN,
    owner: 'Sarah Connor',
    role: 'Lead Strategist',
    dependencies: [{ predecessorId: 'EP-1.1', type: 'Finish-to-Start' as any, lagDays: 0 }],
    isMilestone: true,
    jiraType: 'EPIC',
    jiraId: 'PLAT-103'
  },
  {
    id: 'PF-2',
    parentId: null,
    name: 'PF-02: Mobile Experience Rollout',
    startDate: '2023-11-16',
    endDate: '2023-12-20',
    duration: 35,
    progress: 15,
    status: TaskStatus.IN_PROGRESS,
    rag: RAGStatus.AMBER,
    owner: 'Kyle Reese',
    role: 'Project Manager',
    dependencies: [{ predecessorId: 'PF-1', type: 'Finish-to-Start' as any, lagDays: 0 }],
    isMilestone: false,
    isExpanded: true,
    jiraType: 'PF',
    jiraId: 'MOB-201'
  },
  {
    id: 'EP-2.1',
    parentId: 'PF-2',
    name: 'EPIC: iOS Application Development',
    startDate: '2023-11-16',
    endDate: '2023-11-30',
    duration: 15,
    progress: 30,
    status: TaskStatus.IN_PROGRESS,
    rag: RAGStatus.GREEN,
    owner: 'Jane Dev',
    role: 'Lead Developer',
    dependencies: [],
    isMilestone: false,
    jiraType: 'EPIC',
    jiraId: 'MOB-202'
  },
  {
    id: 'EP-2.2',
    parentId: 'PF-2',
    name: 'EPIC: Android Play Store Compliance',
    startDate: '2023-12-01',
    endDate: '2023-12-15',
    duration: 15,
    progress: 0,
    status: TaskStatus.NOT_STARTED,
    rag: RAGStatus.RED,
    owner: 'Jim Back',
    role: 'Backend Dev',
    dependencies: [{ predecessorId: 'EP-2.1', type: 'Finish-to-Start' as any, lagDays: 0 }],
    isMilestone: false,
    jiraType: 'EPIC',
    jiraId: 'MOB-203'
  }
];

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(ZoomLevel.DAYS);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    setTasks(prev => identifyCriticalPath(rollupHierarchy(prev)));
  }, []);

  const visibleTasks = useMemo(() => getVisibleTasks(tasks), [tasks]);

  const stats: ProjectStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const atRisk = tasks.filter(t => t.rag === RAGStatus.RED).length;
    const totalDur = tasks.reduce((acc, t) => acc + t.duration, 0);
    const avg = totalDur > 0 ? tasks.reduce((acc, t) => acc + (t.progress * t.duration), 0) / totalDur : 0;
    return {
      totalTasks: total,
      completedTasks: completed,
      atRiskTasks: atRisk,
      averageProgress: Math.round(avg),
      criticalPath: tasks.filter(t => t.isCritical).map(t => t.id)
    };
  }, [tasks]);

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === id);
      if (taskIndex === -1) return prev;
      const newTasks = [...prev];
      newTasks[taskIndex] = { ...newTasks[taskIndex], ...updates };
      
      if (updates.startDate || updates.endDate || updates.duration) {
        return identifyCriticalPath(propagateChanges(newTasks, id));
      }
      return identifyCriticalPath(rollupHierarchy(newTasks));
    });
  };

  const findLastDescendantIndex = (parentId: string, allTasks: Task[]): number => {
    const idx = allTasks.findIndex(t => t.id === parentId);
    let last = idx;
    for (let i = idx + 1; i < allTasks.length; i++) {
      let isDesc = false;
      let curr = allTasks[i];
      let pId = curr.parentId;
      while (pId) {
        if (pId === parentId) { isDesc = true; break; }
        const parent = allTasks.find(t => t.id === pId);
        pId = parent?.parentId || null;
      }
      if (isDesc) last = i; else break;
    }
    return last;
  };

  const handleRemoveTask = (id: string) => {
    setTasks(prev => {
      const toRemove = new Set<string>();
      const collectDescendants = (parentId: string) => {
        toRemove.add(parentId);
        prev.filter(t => t.parentId === parentId).forEach(child => collectDescendants(child.id));
      };
      collectDescendants(id);
      const newTasks = prev.filter(t => !toRemove.has(t.id));
      return identifyCriticalPath(rollupHierarchy(newTasks));
    });
    if (selectedTaskId === id) setSelectedTaskId(null);
  };

  const handleAIDecompose = async (task: Task) => {
    setLoading(true);
    try {
      const isPF = !task.parentId;
      const targetLabel = isPF ? "Epics" : "Subtasks";
      const breakdown = await getAITaskBreakdown(task.name, `Generate a logical ${targetLabel} structure to complete this ${task.jiraType || 'item'}.`);
      
      let newTasksToAdd: Task[] = [];
      let currentStartDate = task.startDate;

      breakdown.forEach((item: any, i: number) => {
        const subTask = createNewTask(task.id, currentStartDate);
        subTask.name = isPF ? `EPIC: ${item.name}` : item.name;
        subTask.jiraType = isPF ? 'EPIC' : 'STORY';
        subTask.jiraId = `JIRA-${Math.floor(Math.random() * 9000) + 1000}`;
        subTask.duration = item.duration || 3;
        subTask.endDate = getEndDateFromDuration(currentStartDate, subTask.duration);
        newTasksToAdd.push(subTask);
        currentStartDate = addDays(subTask.endDate, 1);
      });

      setTasks(prev => {
        const newTasks = [...prev];
        const insertIndex = findLastDescendantIndex(task.id, prev) + 1;
        newTasks.splice(insertIndex, 0, ...newTasksToAdd);
        return identifyCriticalPath(rollupHierarchy(newTasks));
      });
      handleUpdateTask(task.id, { isExpanded: true });
    } catch (error) {
      console.error("AI breakdown failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJiraSync = () => {
    setLoading(true);
    // Simulate Jira API Sync
    setTimeout(() => {
      setLoading(false);
      alert("Successfully synced with Jira Cloud. Updated 4 PFs and 12 Epics.");
    }, 1500);
  };

  const handleAIAnalysis = async () => {
    setLoading(true);
    try {
      const insights = await getAIProjectInsights(tasks);
      setAiInsights(insights);
      setShowAI(true);
    } catch (error) {
      console.error("AI project analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = (targetId: string | null = null, asChild: boolean = false, forceRoot: boolean = false) => {
    let parentId: string | null = null;
    let insertIndex = tasks.length;
    const contextId = forceRoot ? null : (targetId || selectedTaskId);

    if (contextId) {
      if (asChild) {
        parentId = contextId;
        insertIndex = findLastDescendantIndex(contextId, tasks) + 1;
        handleUpdateTask(contextId, { isExpanded: true });
      } else {
        const targetTask = tasks.find(t => t.id === contextId);
        parentId = targetTask?.parentId || null;
        insertIndex = findLastDescendantIndex(contextId, tasks) + 1;
      }
    }

    const newT = createNewTask(parentId, tasks[0]?.startDate || '2023-11-01');
    const isRoot = !parentId;
    newT.jiraType = isRoot ? 'PF' : (tasks.find(t => t.id === parentId)?.jiraType === 'PF' ? 'EPIC' : 'STORY');
    newT.name = isRoot ? `PF-${tasks.filter(t => !t.parentId).length + 1}: New Feature` : `EPIC: New Sub-work`;
    
    setTasks(prev => {
      const newTasks = [...prev];
      newTasks.splice(insertIndex, 0, newT);
      return identifyCriticalPath(rollupHierarchy(newTasks));
    });
    setSelectedTaskId(newT.id);
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target === leftPaneRef.current && rightPaneRef.current) {
      rightPaneRef.current.scrollTop = target.scrollTop;
    } else if (target === rightPaneRef.current && leftPaneRef.current) {
      leftPaneRef.current.scrollTop = target.scrollTop;
    }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden selection:bg-blue-100 transition-colors duration-200 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-white text-gray-900'}`}>
      <DashboardHeader 
        stats={stats} 
        onAIAnalysis={handleAIAnalysis} 
        onJiraSync={handleJiraSync}
        isLoading={loading} 
        onAddTask={() => handleAddTask(null, false, true)} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        showCriticalPath={showCriticalPath}
        onToggleCriticalPath={() => setShowCriticalPath(!showCriticalPath)}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
      />
      
      <div className="flex-1 flex overflow-hidden border-t dark:border-slate-800">
        <div className="flex w-full overflow-hidden">
          <div className="w-[850px] flex-shrink-0 flex flex-col border-r bg-white dark:bg-slate-900 dark:border-slate-800 z-20 shadow-lg relative">
            <div className="flex bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-800 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider h-[63px] items-end pb-2 sticky top-0 z-30">
              <div className="w-10 p-2 text-center">#</div>
              <div className="flex-1 p-2">Jira Task Name</div>
              <div className="w-24 p-2 border-l border-gray-100 dark:border-slate-800">Start Date</div>
              <div className="w-24 p-2 border-l border-gray-100 dark:border-slate-800">End Date</div>
              <div className="w-16 p-2 border-l border-gray-100 dark:border-slate-800 text-center">Dur.</div>
              <div className="w-20 p-2 border-l border-gray-100 dark:border-slate-800">Owner</div>
              <div className="w-14 p-2 border-l border-gray-100 dark:border-slate-800 text-right">Done</div>
              <div className="w-10 p-2 border-l border-gray-100 dark:border-slate-800 text-center">RAG</div>
            </div>
            <div 
              ref={leftPaneRef} 
              onScroll={onScroll}
              className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white dark:bg-slate-900 transition-colors"
            >
              {visibleTasks.map((task, idx) => (
                <TaskRow 
                  key={task.id} 
                  task={task} 
                  index={idx + 1}
                  isSelected={selectedTaskId === task.id}
                  allTasks={tasks}
                  onSelect={() => setSelectedTaskId(task.id)}
                  onToggle={() => handleUpdateTask(task.id, { isExpanded: !task.isExpanded })}
                  onUpdate={(updates) => handleUpdateTask(task.id, updates)}
                  onAIDecompose={() => handleAIDecompose(task)}
                  onAddSubtask={() => handleAddTask(task.id, true)}
                  onRemoveTask={() => handleRemoveTask(task.id)}
                />
              ))}
              <div 
                className="p-3 flex items-center gap-2 text-gray-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer text-xs font-semibold h-[36px] border-b border-dashed dark:border-slate-800" 
                onClick={() => handleAddTask(null, false, true)}
              >
                <i className="fas fa-plus-circle ml-8"></i> Add Feature (PF)
              </div>
            </div>
          </div>

          <div 
            ref={rightPaneRef} 
            onScroll={onScroll}
            className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950 relative custom-scrollbar transition-colors"
          >
            <Timeline 
              tasks={visibleTasks} 
              onTaskUpdate={handleUpdateTask} 
              isDarkMode={isDarkMode} 
              showCriticalPath={showCriticalPath}
              zoomLevel={zoomLevel}
            />
          </div>
        </div>
      </div>

      {showAI && aiInsights && <AIAssistant insights={aiInsights} onClose={() => setShowAI(false)} isDarkMode={isDarkMode} />}

      {loading && (
        <div className="fixed inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <p className="text-gray-900 dark:text-slate-100 font-bold">Processing Schedule...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
