
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Task, DependencyType } from '../types';
import { addDays, calculateDuration, getEndDateFromDuration } from '../utils/ganttLogic';

interface TimelineProps {
  tasks: Task[];
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  isDarkMode?: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ tasks, onTaskUpdate, isDarkMode }) => {
  const PIXELS_PER_DAY = 35;
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
    min.setDate(min.getDate() - 10); 
    max.setDate(max.getDate() + 25); 
    return { start: min, end: max };
  }, [tasks]);

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
      } else {
        count++;
      }

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

  const handleMouseDown = (e: React.MouseEvent, taskId: string, type: 'move' | 'resize') => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Rule: Parent rollup bars are non-schedulable/non-draggable
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
          onTaskUpdate(task.id, { 
            startDate: newStart, 
            endDate: getEndDateFromDuration(newStart, task.duration) 
          });
        }
      } else {
        const newDur = Math.max(1, dragState.initialDur + deltaDays);
        if (newDur !== task.duration) {
          onTaskUpdate(task.id, { 
            duration: newDur, 
            endDate: getEndDateFromDuration(task.startDate, newDur)
          });
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
  }, [dragState, tasks, onTaskUpdate]);

  return (
    <div className={`relative inline-block select-none min-w-full font-sans transition-colors duration-200 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
      <div className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-800">
        <div className="flex border-b dark:border-slate-800" style={{ height: HEADER_HEIGHT_MONTH }}>
          {months.map((m, i) => (
            <div 
              key={i} 
              className="flex-shrink-0 border-r dark:border-slate-800 text-[10px] font-bold text-blue-800 dark:text-blue-400 flex items-center px-3 uppercase tracking-widest bg-blue-50/40 dark:bg-blue-900/10"
              style={{ width: m.daysCount * PIXELS_PER_DAY }}
            >
              {m.label}
            </div>
          ))}
        </div>
        <div className="flex" style={{ height: HEADER_HEIGHT_DAY }}>
          {days.map((day, i) => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isToday = new Date().toISOString().split('T')[0] === day.toISOString().split('T')[0];
            const isMon = day.getDay() === 1;
            return (
              <div 
                key={i} 
                className={`flex-shrink-0 border-r dark:border-slate-800 text-[9px] flex flex-col items-center justify-center transition-colors 
                  ${isWeekend ? 'bg-gray-100/40 dark:bg-slate-800/40' : ''} 
                  ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/30' : ''}`} 
                style={{ width: PIXELS_PER_DAY }}
              >
                <span className={`font-bold ${isMon ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
                </span>
                <span className={`text-[10px] font-medium ${isMon ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-slate-400'}`}>
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 pointer-events-none flex h-full">
          {days.map((day, i) => (
            <div 
              key={i} 
              className={`border-r dark:border-slate-800 h-full ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-50/20 dark:bg-slate-800/10' : ''}`} 
              style={{ width: PIXELS_PER_DAY }}
            />
          ))}
        </div>

        <svg className="absolute inset-0 pointer-events-none w-full h-full z-10 overflow-visible">
          {tasks.map((task, idx) => 
            task.dependencies.map((dep, dIdx) => {
              const pred = tasks.find(t => t.id === dep.predecessorId);
              if (!pred) return null;
              
              // Only draw dependencies between subtasks
              const predHasChildren = tasks.some(t => t.parentId === pred.id);
              const taskHasChildren = tasks.some(t => t.parentId === task.id);
              if (predHasChildren || taskHasChildren) return null;

              const predIdx = tasks.indexOf(pred);
              if (predIdx === -1) return null;

              const x1 = getOffset(pred.endDate) + PIXELS_PER_DAY;
              const y1 = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
              const x2 = getOffset(task.startDate);
              const y2 = idx * ROW_HEIGHT + ROW_HEIGHT / 2;

              return (
                <g key={`${task.id}-${dep.predecessorId}`}>
                  <path 
                    d={`M ${x1} ${y1} L ${x1+10} ${y1} L ${x1+10} ${y2} L ${x2} ${y2}`}
                    stroke={task.isCritical ? '#ef4444' : (isDarkMode ? '#334155' : '#94a3b8')}
                    strokeWidth="1.2"
                    fill="none"
                    strokeDasharray="3 2"
                  />
                  <polygon points={`${x2},${y2} ${x2-4},${y2-2.5} ${x2-4},${y2+2.5}`} fill={task.isCritical ? '#ef4444' : (isDarkMode ? '#334155' : '#94a3b8')} />
                </g>
              );
            })
          )}
        </svg>

        <div className="relative z-10">
          {tasks.map((task, idx) => {
            const startX = getOffset(task.startDate);
            const barWidth = Math.max(8, task.duration * PIXELS_PER_DAY);
            const hasChildren = tasks.some(t => t.parentId === task.id);

            return (
              <div 
                key={task.id} 
                className={`relative w-full border-b border-gray-100 dark:border-slate-800/80 ${hasChildren ? 'bg-gray-100 dark:bg-slate-800/60' : ''}`} 
                style={{ height: ROW_HEIGHT }}
              >
                {task.baselineStart && task.baselineEnd && (
                  <div 
                    className="absolute top-[85%] h-[2px] bg-gray-300/60 dark:bg-slate-700/60 rounded-full"
                    style={{ left: getOffset(task.baselineStart), width: calculateDuration(task.baselineStart, task.baselineEnd) * PIXELS_PER_DAY }}
                  />
                )}

                <div 
                  onMouseDown={(e) => handleMouseDown(e, task.id, 'move')}
                  className={`absolute top-1/2 -translate-y-1/2 h-[20px] group transition-all shadow-sm 
                    ${hasChildren ? 'bg-slate-800 dark:bg-slate-100 rounded-sm cursor-default' : 'cursor-grab active:cursor-grabbing'}
                    ${!hasChildren && task.isCritical ? 'bg-red-500 rounded-md border border-red-600' : !hasChildren ? 'bg-blue-500 dark:bg-blue-600 rounded-md' : ''} 
                    ${task.isMilestone ? 'rotate-45 !w-[10px] !h-[10px] !rounded-none !bg-yellow-500 border border-white dark:border-slate-900 shadow-md' : ''}
                  `}
                  style={{ left: startX, width: task.isMilestone ? 10 : barWidth }}
                >
                  {!hasChildren && !task.isMilestone && (
                    <div className="h-full bg-blue-700/30 dark:bg-blue-400/30 rounded-l-md pointer-events-none" style={{ width: `${task.progress}%` }} />
                  )}
                  {!hasChildren && !task.isMilestone && (
                    <div onMouseDown={(e) => handleMouseDown(e, task.id, 'resize')} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 rounded-r-md" />
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
