
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Task, TaskStatus, RAGStatus, ProjectStats, ZoomLevel } from './types';
import { rollupHierarchy, getVisibleTasks, propagateChanges, identifyCriticalPath, createNewTask, getEndDateFromDuration, addDays, parseDependencyString, formatDependencyString, getProjectBounds, VisibleTaskWithHierarchy } from './utils/ganttLogic';
import { getAIProjectInsights, getAITaskBreakdown } from './services/geminiService';
import { saveToDatabase, loadFromDatabase, exportProjectJSON, exportToCSV, importProjectJSON, ProjectData } from './services/persistenceService';
import DashboardHeader from './components/DashboardHeader';
import TaskRow from './components/TaskRow';
import Timeline from './components/Timeline';
import AIAssistant from './components/AIAssistant';
import NotesDrawer from './components/NotesDrawer';

const INITIAL_TASKS: Task[] = [
  {
    id: 'PF-1',
    parentId: null,
    name: 'PF-01: Core Platform Infrastructure',
    startDate: '2025-10-15',
    endDate: '2025-11-10',
    duration: 27,
    progress: 80,
    status: TaskStatus.IN_PROGRESS,
    rag: RAGStatus.GREEN,
    owner: 'Sarah Connor',
    role: 'Lead Strategist',
    dependencies: [],
    isMilestone: false,
    isExpanded: true,
    isAtRisk: false,
    jiraType: 'PF',
    jiraId: 'PLAT-101'
  },
  {
    id: 'EP-1.1',
    parentId: 'PF-1',
    name: 'EPIC: Database Schema Migration',
    startDate: '2025-10-15',
    endDate: '2025-10-25',
    duration: 11,
    progress: 100,
    status: TaskStatus.COMPLETED,
    rag: RAGStatus.GREEN,
    owner: 'John Doe',
    role: 'Analyst',
    dependencies: [],
    isMilestone: false,
    isAtRisk: false,
    jiraType: 'EPIC',
    jiraId: 'PLAT-102'
  },
  {
    id: 'EP-1.2',
    parentId: 'PF-1',
    name: 'EPIC: Auth Provider Integration',
    startDate: '2025-10-26',
    endDate: '2025-10-27',
    duration: 2,
    progress: 100,
    status: TaskStatus.COMPLETED,
    rag: RAGStatus.GREEN,
    owner: 'Sarah Connor',
    role: 'Lead Strategist',
    dependencies: [{ predecessorId: 'EP-1.1', type: 'Finish-to-Start' as any, lagDays: 0 }],
    isMilestone: true,
    isAtRisk: false,
    jiraType: 'EPIC',
    jiraId: 'PLAT-103'
  }
];

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [projectTitle, setProjectTitle] = useState('Untitled Project');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [activeNotesTaskId, setActiveNotesTaskId] = useState<string | null>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(ZoomLevel.DAYS);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem('gantt_left_panel_width');
    return saved ? parseInt(saved, 10) : 800;
  });
  const isResizing = useRef(false);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  const isSummaryMode = leftPanelWidth < 380;
  const isVerticalHeader = leftPanelWidth < 650;
  
  const columnVisibility = useMemo(() => ({
    rag: leftPanelWidth > 1150,
    done: leftPanelWidth > 1050,
    float: leftPanelWidth > 950,
    owner: leftPanelWidth > 850,
    atRisk: leftPanelWidth > 780,
    status: leftPanelWidth > 680,
    pred: leftPanelWidth > 600,
    duration: leftPanelWidth > 520,
    dates: leftPanelWidth > 420,
  }), [leftPanelWidth]);

  // Load from database on mount
  useEffect(() => {
    const data = loadFromDatabase();
    if (data) {
      setTasks(identifyCriticalPath(rollupHierarchy(data.tasks)));
      setProjectTitle(data.title || 'Untitled Project');
      setLastSaved(data.lastUpdated);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const visibleTasksData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return getVisibleTasks(tasks);

    // If searching, we flatten the hierarchy and filter across the whole set
    const allItems: VisibleTaskWithHierarchy[] = [];
    const traverse = (parentId: string | null, prefix: string) => {
      const children = tasks.filter(t => t.parentId === parentId);
      children.forEach((child, index) => {
        const hierarchyId = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
        allItems.push({ task: child, hierarchyId });
        traverse(child.id, hierarchyId);
      });
    };
    traverse(null, "");

    return allItems.filter(v => 
      v.task.name.toLowerCase().includes(term) || 
      (v.task.jiraId && v.task.jiraId.toLowerCase().includes(term)) ||
      (v.task.owner && v.task.owner.toLowerCase().includes(term))
    );
  }, [tasks, searchTerm]);

  const visibleTasks = useMemo(() => visibleTasksData.map(v => v.task), [visibleTasksData]);

  const hierarchyToIdMap = useMemo(() => {
    const map = new Map<string, string>();
    visibleTasksData.forEach(v => map.set(v.hierarchyId, v.task.id));
    return map;
  }, [visibleTasksData]);

  const idToHierarchyMap = useMemo(() => {
    const map = new Map<string, string>();
    visibleTasksData.forEach(v => map.set(v.task.id, v.hierarchyId));
    return map;
  }, [visibleTasksData]);

  const stats: ProjectStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const atRisk = tasks.filter(t => t.rag === RAGStatus.RED || t.isAtRisk).length;
    const totalDur = tasks.reduce((acc, t) => acc + t.duration, 0);
    const avg = totalDur > 0 ? tasks.reduce((acc, t) => acc + (t.progress * t.duration), 0) / totalDur : 0;
    
    const rootTasks = tasks.filter(t => t.parentId === null);
    const projectFloat = rootTasks.length > 0 ? Math.max(...rootTasks.map(t => t.totalFloat || 0)) : 0;

    return {
      totalTasks: total,
      completedTasks: completed,
      atRiskTasks: atRisk,
      averageProgress: Math.round(avg),
      criticalPath: tasks.filter(t => t.isCritical).map(t => t.id),
      totalProjectFloat: projectFloat
    };
  }, [tasks]);

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === id);
      if (taskIndex === -1) return prev;
      const newTasks = [...prev];
      newTasks[taskIndex] = { ...newTasks[taskIndex], ...updates };
      if (updates.startDate || updates.endDate || updates.duration || updates.dependencies || updates.status) {
        return identifyCriticalPath(propagateChanges(newTasks, id));
      }
      return identifyCriticalPath(rollupHierarchy(newTasks));
    });
  };

  const handleSaveToDB = async () => {
    setIsSaving(true);
    const lastUpdate = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const data: ProjectData = { tasks, title: projectTitle, lastUpdated: lastUpdate };
    try {
      await saveToDatabase(data);
      setLastSaved(lastUpdate);
      setNotification({ msg: "Project saved successfully", type: 'success' });
    } catch (err) {
      setNotification({ msg: "Failed to save project", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    exportProjectJSON({ tasks, title: projectTitle, lastUpdated: lastSaved || new Date().toISOString() });
    setNotification({ msg: "Project exported", type: 'success' });
  };

  const handleExportExcel = () => {
    exportToCSV(tasks, projectTitle);
    setNotification({ msg: "Excel Export Complete", type: 'success' });
  };

  const handleImport = async (file: File) => {
    try {
      const data = await importProjectJSON(file);
      setTasks(identifyCriticalPath(rollupHierarchy(data.tasks)));
      setProjectTitle(data.title || 'Imported Project');
      setNotification({ msg: "Project imported", type: 'success' });
    } catch (err) {
      setNotification({ msg: (err as Error).message, type: 'error' });
    }
  };

  const handleJumpToToday = () => {
    if (!rightPaneRef.current) return;
    const bounds = getProjectBounds(tasks, zoomLevel);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const pixelsPerDay = zoomLevel === ZoomLevel.DAYS ? 35 : zoomLevel === ZoomLevel.WEEKS ? 8 : 2.5;
    const diffDays = (today.getTime() - bounds.start.getTime()) / (1000 * 60 * 60 * 24);
    const todayX = Math.floor(diffDays * pixelsPerDay);
    
    const containerWidth = rightPaneRef.current.clientWidth;
    rightPaneRef.current.scrollTo({
      left: todayX - containerWidth / 2,
      behavior: 'smooth'
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
    if (activeNotesTaskId === id) setActiveNotesTaskId(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedTaskId === id) return;
    setDragTargetId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedTaskId;
    setDraggedTaskId(null);
    setDragTargetId(null);
    if (!sourceId || sourceId === targetId) return;
    setTasks(prev => {
      const groupToMoveIds = new Set<string>();
      const collectDescendants = (id: string) => {
        groupToMoveIds.add(id);
        prev.filter(t => t.parentId === id).forEach(child => collectDescendants(child.id));
      };
      collectDescendants(sourceId);
      if (groupToMoveIds.has(targetId)) return prev;
      const itemsToMove = prev.filter(t => groupToMoveIds.has(t.id));
      const remainingItems = prev.filter(t => !groupToMoveIds.has(t.id));
      const targetIndex = remainingItems.findIndex(t => t.id === targetId);
      if (targetIndex === -1) return prev;
      const lastDescendantIdx = findLastDescendantIndex(targetId, remainingItems);
      const newTasks = [...remainingItems];
      newTasks.splice(lastDescendantIdx + 1, 0, ...itemsToMove);
      return identifyCriticalPath(rollupHierarchy(newTasks));
    });
  };

  const handleAIDecompose = async (task: Task) => {
    setLoading(true);
    try {
      const breakdown = await getAITaskBreakdown(task.name, "Breakdown this project component into logical sub-elements following hierarchy.");
      let newTasksToAdd: Task[] = [];
      let currentStartDate = task.startDate;
      breakdown.forEach((item: any) => {
        let childType: 'PF' | 'EPIC' | 'TASK' | 'STORY' = 'TASK';
        if (task.jiraType === 'PF') childType = 'EPIC';
        else if (task.jiraType === 'EPIC') childType = 'TASK';
        else if (task.jiraType === 'TASK') childType = 'STORY';
        else childType = 'STORY';

        const subTask = createNewTask(task.id, currentStartDate, childType);
        subTask.name = item.name;
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
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleAddTask = (targetId: string | null = null, asChild: boolean = false, forceRoot: boolean = false) => {
    let parentId: string | null = null;
    let insertIndex = tasks.length;
    let typeToCreate: 'PF' | 'EPIC' | 'TASK' | 'STORY' = 'PF';

    if (forceRoot) {
      parentId = null;
      insertIndex = tasks.length;
      typeToCreate = 'PF';
    } else {
      const contextId = targetId || selectedTaskId;
      if (contextId) {
        const targetTask = tasks.find(t => t.id === contextId);
        if (asChild) {
          parentId = contextId;
          insertIndex = findLastDescendantIndex(contextId, tasks) + 1;
          handleUpdateTask(contextId, { isExpanded: true });
          if (targetTask?.jiraType === 'PF') typeToCreate = 'EPIC';
          else if (targetTask?.jiraType === 'EPIC') typeToCreate = 'TASK';
          else if (targetTask?.jiraType === 'TASK') typeToCreate = 'STORY';
          else typeToCreate = 'STORY';
        } else {
          parentId = targetTask?.parentId || null;
          insertIndex = findLastDescendantIndex(contextId, tasks) + 1;
          typeToCreate = targetTask?.jiraType || 'PF';
        }
      }
    }

    const newT = createNewTask(parentId, tasks[0]?.startDate || new Date().toISOString().split('T')[0], typeToCreate);
    setTasks(prev => {
      const newTasks = [...prev];
      newTasks.splice(insertIndex, 0, newT);
      return identifyCriticalPath(rollupHierarchy(newTasks));
    });
    setSelectedTaskId(newT.id);
  };

  const handleAIAnalysis = async () => {
    setLoading(true);
    try {
      const insights = await getAIProjectInsights(tasks);
      setAiInsights(insights);
      setShowAI(true);
      setActiveNotesTaskId(null);
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target === leftPaneRef.current && rightPaneRef.current) rightPaneRef.current.scrollTop = target.scrollTop;
    else if (target === rightPaneRef.current && leftPaneRef.current) leftPaneRef.current.scrollTop = target.scrollTop;
  };

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = Math.min(Math.max(100, e.clientX), window.innerWidth - 100);
    setLeftPanelWidth(newWidth);
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem('gantt_left_panel_width', leftPanelWidth.toString());
  }, [handleResize, leftPanelWidth]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [handleResize, stopResizing]);

  const headerLabelClass = isVerticalHeader ? "writing-vertical-rl rotate-180 h-10 w-full flex items-center justify-center pt-2" : "w-full text-center p-2";

  const activeNotesTask = useMemo(() => tasks.find(t => t.id === activeNotesTaskId), [tasks, activeNotesTaskId]);

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-white text-gray-900'}`}>
      <DashboardHeader 
        stats={stats} 
        tasks={tasks}
        projectTitle={projectTitle}
        onTitleChange={setProjectTitle}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAIAnalysis={handleAIAnalysis} 
        onJiraSync={() => alert('Jira Sync complete!')}
        onSave={handleSaveToDB}
        onExport={handleExport}
        onExportExcel={handleExportExcel}
        onImport={handleImport}
        isLoading={loading} 
        isSaving={isSaving}
        lastSaved={lastSaved}
        onAddTask={() => handleAddTask(null, false, true)} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        showCriticalPath={showCriticalPath}
        onToggleCriticalPath={() => setShowCriticalPath(!showCriticalPath)}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        onJumpToToday={handleJumpToToday}
      />
      <div className="flex-1 flex overflow-hidden border-t dark:border-slate-800">
        <div className="flex w-full overflow-hidden relative">
          <div 
            className="flex-shrink-0 flex flex-col border-r bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm relative overflow-hidden"
            style={{ width: leftPanelWidth }}
          >
            <div className="flex bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-800 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest h-[63px] items-end pb-2 sticky top-0 z-30">
              <div className="w-8 shrink-0 flex items-center justify-center"></div>
              {!isSummaryMode && <div className="w-10 p-2 text-center shrink-0">#</div>}
              <div className="flex-1 p-2 min-w-0">Task</div>
              {!isSummaryMode && (
                <>
                  {columnVisibility.dates && (
                    <>
                      <div className="w-[110px] shrink-0 border-l dark:border-slate-800 flex items-end">
                        <span className={headerLabelClass}>Start</span>
                      </div>
                      <div className="w-[110px] shrink-0 border-l dark:border-slate-800 flex items-end">
                        <span className={headerLabelClass}>End</span>
                      </div>
                    </>
                  )}
                  {columnVisibility.duration && <div className="w-16 shrink-0 border-l dark:border-slate-800 flex items-end"><span className={headerLabelClass}>Dur.</span></div>}
                  {columnVisibility.pred && <div className="w-20 shrink-0 border-l dark:border-slate-800 flex items-end"><span className={headerLabelClass}>Pred.</span></div>}
                  {columnVisibility.status && <div className="w-32 shrink-0 border-l dark:border-slate-800 flex items-end"><span className={headerLabelClass}>Status</span></div>}
                  {columnVisibility.owner && <div className="w-24 shrink-0 border-l dark:border-slate-800 flex items-end"><span className={headerLabelClass}>Owner</span></div>}
                  {columnVisibility.atRisk && (
                    <>
                      <div className="w-12 shrink-0 border-l-2 border-rose-500/50 dark:border-rose-600/50 flex items-end bg-rose-50/5 dark:bg-rose-950/5">
                        <span className={headerLabelClass}>Risk</span>
                      </div>
                      <div className="w-12 shrink-0 border-l-2 border-amber-500/50 dark:border-amber-600/50 flex items-end bg-amber-50/5 dark:bg-amber-950/5">
                        <span className={headerLabelClass}>MS</span>
                      </div>
                    </>
                  )}
                  {columnVisibility.float && <div className="w-16 shrink-0 border-l dark:border-slate-800 flex items-end"><span className={headerLabelClass}>Float</span></div>}
                  {columnVisibility.done && <div className="w-16 shrink-0 border-l dark:border-slate-800 flex items-end"><span className={headerLabelClass}>Done</span></div>}
                  {columnVisibility.rag && <div className="w-12 shrink-0 border-l dark:border-slate-800 flex items-end"><span className={headerLabelClass}>RAG</span></div>}
                </>
              )}
              {isSummaryMode && <div className="w-12 shrink-0 border-l dark:border-slate-800 flex items-end"><span className="writing-vertical-rl rotate-180 h-10 w-full flex items-center justify-center pt-2">STATUS</span></div>}
            </div>
            
            <div ref={leftPaneRef} onScroll={onScroll} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white dark:bg-slate-900">
              <div className="w-full">
                {visibleTasksData.map(({ task, hierarchyId }, index) => (
                  <TaskRow 
                    key={task.id} 
                    task={task} 
                    hierarchyId={hierarchyId}
                    index={index}
                    isSelected={selectedTaskId === task.id}
                    allTasks={tasks}
                    hierarchyToIdMap={hierarchyToIdMap}
                    idToHierarchyMap={idToHierarchyMap}
                    onSelect={() => setSelectedTaskId(task.id)}
                    onToggle={() => handleUpdateTask(task.id, { isExpanded: !task.isExpanded })}
                    onUpdate={(updates) => handleUpdateTask(task.id, updates)}
                    onAIDecompose={() => handleAIDecompose(task)}
                    onAddSubtask={() => handleAddTask(task.id, true)}
                    onRemoveTask={() => handleRemoveTask(task.id)}
                    onOpenNotes={() => {
                      setActiveNotesTaskId(task.id);
                      setShowAI(false);
                    }}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragging={draggedTaskId === task.id}
                    isDragTarget={dragTargetId === task.id}
                    columnVisibility={columnVisibility}
                    isSummaryMode={isSummaryMode}
                    isDarkMode={isDarkMode}
                  />
                ))}
                {!isSummaryMode && !searchTerm && (
                   <div className={`p-3 flex items-center gap-2 text-gray-300 dark:text-slate-600 hover:text-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 cursor-pointer text-xs font-bold h-[36px] border-b border-dashed dark:border-slate-800 ${visibleTasksData.length % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/40'}`} onClick={() => handleAddTask(null, false, true)}>
                    <i className="fas fa-plus-circle ml-8"></i> Add Feature (PF)
                  </div>
                )}
                {searchTerm && visibleTasksData.length === 0 && (
                  <div className="p-10 text-center text-gray-400 dark:text-slate-500 italic text-sm">
                    No tasks match your search...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div 
            onMouseDown={startResizing}
            className="w-1 h-full cursor-col-resize bg-gray-200 dark:bg-slate-800 hover:bg-blue-500 active:bg-blue-600 transition-colors z-40 flex-shrink-0 relative group"
          >
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-md shadow-sm hidden group-hover:flex items-center justify-center text-[10px] text-gray-400">
                <i className="fas fa-grip-vertical"></i>
             </div>
          </div>

          <div ref={rightPaneRef} onScroll={onScroll} className="flex-1 min-w-0 overflow-auto bg-white dark:bg-slate-950 relative custom-scrollbar">
            <Timeline tasks={visibleTasks} onTaskUpdate={handleUpdateTask} isDarkMode={isDarkMode} showCriticalPath={showCriticalPath} zoomLevel={zoomLevel} />
          </div>
        </div>
      </div>
      {showAI && aiInsights && <AIAssistant insights={aiInsights} onClose={() => setShowAI(false)} isDarkMode={isDarkMode} />}
      {activeNotesTaskId && activeNotesTask && (
        <NotesDrawer 
          task={activeNotesTask} 
          onUpdate={handleUpdateTask} 
          onClose={() => setActiveNotesTaskId(null)} 
          isDarkMode={isDarkMode} 
        />
      )}
      {loading && (
        <div className="fixed inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="h-10 w-10 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
      )}
      
      {/* Persistent Notification System */}
      {notification && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 border ${
          notification.type === 'success' 
            ? 'bg-emerald-600 border-emerald-500 text-white' 
            : 'bg-rose-600 border-rose-500 text-white'
        }`}>
          <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          <span className="text-sm font-bold uppercase tracking-wide">{notification.msg}</span>
        </div>
      )}
    </div>
  );
};

export default App;
