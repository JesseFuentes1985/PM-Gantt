
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Task, DependencyType, TaskStatus, ZoomLevel } from '../types';
import { addDays, calculateDuration, getEndDateFromDuration } from '../utils/ganttLogic';

interface TimelineProps {
  tasks: Task[];
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  isDarkMode?: boolean;
  showCriticalPath?: boolean;
  zoomLevel?: ZoomLevel;
}

const Timeline: React.FC<TimelineProps> = ({ 
  tasks, 
  onTaskUpdate, 
  isDarkMode, 
  showCriticalPath = false,
  zoomLevel = ZoomLevel.DAYS
}) => {
  const PIXELS_PER_DAY = useMemo(() => {
    switch (zoomLevel) {
      case ZoomLevel.DAYS: return 35;
      case ZoomLevel.WEEKS: return 8;
      case ZoomLevel.MONTHS: return 2.5;
      default: return 35;
    }
  }, [zoomLevel]);

  const ROW_HEIGHT = 36;
  const HEADER_HEIGHT_MONTH = 26;
  const HEADER_HEIGHT_DAY = 36;

  const [dragState, setDragState] = useState<{ id: string; type: 'move' | 'resize'; initialX: number; initialStart: string; initialDur: number } | null>(null);

  const projectBounds = useMemo(() => {
    if (tasks.length === 0) return { start: new Date(), end: new Date() };
    const starts = tasks.map(t => new Date(t.startDate + 'T00:00:00').getTime());
    const ends = tasks.map(t => new Date(t.endDate + 'T00:00:00').getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    
    const buffer = zoomLevel === ZoomLevel.DAYS ? 10 : zoomLevel === ZoomLevel.WEEKS ? 30 : 90;
    min.setDate(min.getDate() - buffer); 
    max.setDate(max.getDate() + buffer * 2); 
    return { start: min, end: max };
  }, [tasks, zoomLevel]);

  const days: Date[] = useMemo(() => {
    const list = [];
    let current = new Date(projectBounds.start);
    while (current <= projectBounds.end) {
      list.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return list;
  }, [projectBounds]);

  const months = useMemo(() => {
    const groups: { label: string; daysCount: number }[] = [];
    if (days.length === 0) return groups;
    let currentMonth = days[0].getMonth();
    let currentYear = days[0].getFullYear();
    let count = 0;
    days.forEach((day, i) => {
      if (day.getMonth() !== currentMonth || day.getFullYear() !== currentYear) {
        groups.push({
          label: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(currentYear, currentMonth)),
          daysCount: count
        });
        currentMonth = day.getMonth();
        currentYear = day.getFullYear();
        count = 1;
      } else count++;
      if (i === days.length - 1) {
        groups.push({
          label: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(currentYear, currentMonth)),
          daysCount: count
        });
      }
    });
    return groups;
  }, [days]);

  const getOffset = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const diff = d.getTime() - projectBounds.start.getTime();
    return Math.floor((diff / (1000 * 60 * 60 * 24)) * PIXELS_PER_DAY);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED: return 'bg-emerald-500';
      case TaskStatus.IN_PROGRESS: return 'bg-blue-500';
      case TaskStatus.ON_HOLD: return 'bg-orange-400';
      case TaskStatus.BLOCKED: return 'bg-rose-600';
      case TaskStatus.NOT_STARTED: return isDarkMode ? 'bg-slate-600' : 'bg-slate-300';
      default: return 'bg-blue-500';
    }
  };

  const handleMouseDown = (e: React.MouseEvent, taskId: string, type: 'move' | 'resize') => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const hasChildren = tasks.some(t => t.parentId === taskId);
    if (hasChildren) return;
    setDragState({
      id: taskId,
      type,
      initialX: e.clientX,
      initialStart: task.startDate,
      initialDur: task.duration
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;
      const deltaX = e.clientX - dragState.initialX;
      const deltaDays = Math.round(deltaX / PIXELS_PER_DAY);
      const task = tasks.find(t => t.id === dragState.id);
      if (!task) return;
      if (dragState.type === 'move') {
        const newStart = addDays(dragState.initialStart, deltaDays);
        if (newStart !== task.startDate) {
          onTaskUpdate(task.id, { startDate: newStart, endDate: getEndDateFromDuration(newStart, task.duration) });
        }
      } else {
        const newDur = Math.max(1, dragState.initialDur + deltaDays);
        if (newDur !== task.duration) {
          onTaskUpdate(task.id, { duration: newDur, endDate: getEndDateFromDuration(task.startDate, newDur) });
        }
      }
    };
    const handleMouseUp = () => setDragState(null);
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, tasks, onTaskUpdate, PIXELS_PER_DAY]);

  return (
    <div className={`relative inline-block select-none min-w-full font-sans transition-colors duration-200 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
      <div className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-800">
        <div className="flex border-b dark:border-slate-800" style={{ height: HEADER_HEIGHT_MONTH }}>
          {months.map((m, i) => (
            <div key={i} className="flex-shrink-0 border-r dark:border-slate-800 text-[10px] font-bold text-blue-800 dark:text-blue-400 flex items-center px-3 uppercase tracking-widest bg-blue-50/40 dark:bg-blue-900/10 whitespace-nowrap overflow-hidden" style={{ width: m.daysCount * PIXELS_PER_DAY }}>
              {m.label}
            </div>
          ))}
        </div>
        <div className="flex" style={{ height: HEADER_HEIGHT_DAY }}>
          {days.map((day, i) => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isToday = new Date().toISOString().split('T')[0] === day.toISOString().split('T')[0];
            const isMon = day.getDay() === 1;
            const isFirstOfMonth = day.getDate() === 1;
            let shouldShowLabel = zoomLevel === ZoomLevel.DAYS || (zoomLevel === ZoomLevel.WEEKS && isMon) || (zoomLevel === ZoomLevel.MONTHS && isFirstOfMonth);
            return (
              <div key={i} className={`flex-shrink-0 border-r dark:border-slate-800 text-[9px] flex flex-col items-center justify-center transition-colors ${isWeekend ? 'bg-gray-100/40 dark:bg-slate-800/40' : ''} ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/30' : ''}`} style={{ width: PIXELS_PER_DAY }}>
                {shouldShowLabel && (
                  <>
                    <span className={`font-bold leading-tight ${isMon || isFirstOfMonth ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'}`}>
                      {zoomLevel === ZoomLevel.DAYS ? day.toLocaleDateString('en-US', { weekday: 'narrow' }) : (zoomLevel === ZoomLevel.WEEKS ? 'W' : '')}
                    </span>
                    <span className={`text-[9px] font-medium leading-tight ${isMon || isFirstOfMonth ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-slate-400'}`}>
                      {zoomLevel === ZoomLevel.MONTHS ? day.toLocaleDateString('en-US', { month: 'short' }) : day.getDate()}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 pointer-events-none flex h-full">
          {days.map((day, i) => {
             const isMon = day.getDay() === 1;
             const isFirst = day.getDate() === 1;
             let showLine = zoomLevel === ZoomLevel.DAYS || (zoomLevel === ZoomLevel.WEEKS && isMon) || (zoomLevel === ZoomLevel.MONTHS && isFirst);
             return (
              <div key={i} className={`${showLine ? 'border-r dark:border-slate-800' : ''} h-full ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-50/20 dark:bg-slate-800/10' : ''}`} style={{ width: PIXELS_PER_DAY }} />
            );
          })}
        </div>

        <svg className="absolute inset-0 pointer-events-none w-full h-full z-10 overflow-visible">
          {tasks.map((task, idx) => 
            task.dependencies.map((dep) => {
              const pred = tasks.find(t => t.id === dep.predecessorId);
              if (!pred) return null;
              const predIdx = tasks.indexOf(pred);
              if (predIdx === -1) return null;

              let x1 = 0, y1 = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
              let x2 = 0, y2 = idx * ROW_HEIGHT + ROW_HEIGHT / 2;

              if (dep.type === DependencyType.FS) {
                x1 = getOffset(pred.endDate) + PIXELS_PER_DAY;
                x2 = getOffset(task.startDate);
              } else if (dep.type === DependencyType.SS) {
                x1 = getOffset(pred.startDate);
                x2 = getOffset(task.startDate);
              } else if (dep.type === DependencyType.FF) {
                x1 = getOffset(pred.endDate) + PIXELS_PER_DAY;
                x2 = getOffset(task.endDate) + PIXELS_PER_DAY;
              } else if (dep.type === DependencyType.SF) {
                x1 = getOffset(pred.startDate);
                x2 = getOffset(task.endDate) + PIXELS_PER_DAY;
              }

              const isLineCritical = showCriticalPath && task.isCritical && pred.isCritical;
              const color = isLineCritical ? '#ef4444' : (isDarkMode ? '#334155' : '#94a3b8');

              const path = dep.type === DependencyType.FS 
                ? `M ${x1} ${y1} L ${x1+5} ${y1} L ${x1+5} ${y2} L ${x2} ${y2}`
                : `M ${x1} ${y1} L ${x1-10} ${y1} L ${x1-10} ${y2} L ${x2} ${y2}`;

              return (
                <g key={`${task.id}-${dep.predecessorId}`}>
                  <path d={path} stroke={color} strokeWidth={isLineCritical ? "1.8" : "1.2"} fill="none" strokeDasharray={isLineCritical ? "0" : "3 2"} />
                  <polygon points={`${x2},${y2} ${x2-4},${y2-2.5} ${x2-4},${y2+2.5}`} fill={color} transform={dep.type === DependencyType.FS || dep.type === DependencyType.SS ? '' : 'rotate(180, ' + x2 + ', ' + y2 + ')'} />
                </g>
              );
            })
          )}
        </svg>

        <div className="relative z-10">
          {tasks.map((task, idx) => {
            const startX = getOffset(task.startDate);
            const barWidth = Math.max(2, task.duration * PIXELS_PER_DAY);
            const hasChildren = tasks.some(t => t.parentId === task.id);
            const isCurrentlyCritical = showCriticalPath && task.isCritical;
            const isEven = idx % 2 === 0;

            const baseClasses = "absolute top-1/2 -translate-y-1/2 h-[22px] group transition-all duration-300 shadow-sm flex items-center px-0.5 overflow-hidden";
            const interactionClasses = hasChildren ? "rounded-sm cursor-default" : "rounded-md cursor-grab active:cursor-grabbing";
            let colorClasses = !task.isMilestone ? (hasChildren ? (isCurrentlyCritical ? "bg-red-800 dark:bg-red-600" : "bg-slate-800 dark:bg-slate-100") : (isCurrentlyCritical ? "bg-red-500 border-2 border-red-700 scale-y-110 shadow-lg" : getStatusColor(task.status))) : "rotate-45 !w-[10px] !h-[10px] !rounded-none !bg-yellow-500 border border-white dark:border-slate-900 shadow-md";

            const rowBg = isEven ? 'bg-white dark:bg-slate-950' : 'bg-gray-50/50 dark:bg-slate-900/40';

            return (
              <div key={task.id} className={`relative w-full border-b border-gray-100 dark:border-slate-800/80 transition-colors ${rowBg}`} style={{ height: ROW_HEIGHT }}>
                <div onMouseDown={(e) => handleMouseDown(e, task.id, 'move')} className={`${baseClasses} ${interactionClasses} ${colorClasses}`} style={{ left: startX, width: task.isMilestone ? 10 : barWidth }}>
                  {!hasChildren && !task.isMilestone && (
                    <>
                      <div className="h-full absolute left-0 top-0 bg-black/10 pointer-events-none" style={{ width: `${task.progress}%` }} />
                      <div onMouseDown={(e) => handleMouseDown(e, task.id, 'resize')} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 rounded-r-md z-10" />
                    </>
                  )}
                  {hasChildren && (
                    <>
                      <div className={`absolute left-0 bottom-0 w-[4px] h-[6px] -translate-y-[2px] border-l border-b ${isDarkMode ? 'bg-slate-100 border-slate-400' : 'bg-slate-800 border-gray-400'}`} />
                      <div className={`absolute right-0 bottom-0 w-[4px] h-[6px] -translate-y-[2px] border-r border-b ${isDarkMode ? 'bg-slate-100 border-slate-400' : 'bg-slate-800 border-gray-400'}`} />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
