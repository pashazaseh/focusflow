import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { StudyLog, DayStats, HeatmapTheme } from '../types';

interface HeatmapProps {
  data: StudyLog[];
  year: number;
  onDayClick: (date: string) => void;
  isDarkMode: boolean;
  theme: HeatmapTheme;
}

export const Heatmap: React.FC<HeatmapProps> = ({ data, year, onDayClick, isDarkMode, theme }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  // Generate full year of dates
  const days = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const dayArray: DayStats[] = [];

    // Map logs for quick lookup
    const logMap = new Map<string, StudyLog>();
    data.forEach(log => logMap.set(log.date, log));

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const log = logMap.get(dateStr);
      dayArray.push({
        date: new Date(d),
        dateStr,
        value: log?.hours || 0,
        notes: log?.notes
      });
    }
    return dayArray;
  }, [data, year]);

  // Dimensions
  const cellSize = 12;
  const cellGap = 3;
  const weekLabelWidth = 30;
  const monthLabelHeight = 20;

  // D3 Scales based on theme
  const colorInterpolator = useMemo(() => {
    switch (theme) {
      case 'blue': return d3.interpolateBlues;
      case 'orange': return d3.interpolateOranges;
      case 'purple': return d3.interpolatePurples;
      case 'green':
      default: return d3.interpolateGreens;
    }
  }, [theme]);

  const colorScale = useMemo(() => 
    d3.scaleSequential()
      .interpolator(colorInterpolator)
      .domain([0, 10]) // 0 to 10 hours for better spread
  , [colorInterpolator]);

  // Group by week
  // We need to calculate (x, y) for each day
  // x = week index, y = day of week (0 = Sun, 6 = Sat)
  const cells = useMemo(() => days.map(day => {
    const dayOfWeek = day.date.getDay(); // 0 (Sun) to 6 (Sat)
    // d3.timeWeek.count returns number of weeks since start of year
    const weekIndex = d3.timeSunday.count(d3.timeYear(day.date), day.date);

    // Dark mode empty color: #374151 (gray-700) for better contrast against gray-800 bg
    // Light mode: #ebedf0
    const emptyColor = isDarkMode ? '#374151' : '#ebedf0';

    return {
      ...day,
      x: weekLabelWidth + weekIndex * (cellSize + cellGap),
      y: monthLabelHeight + dayOfWeek * (cellSize + cellGap),
      color: day.value === 0 ? emptyColor : colorScale(Math.max(1, day.value)) 
    };
  }), [days, isDarkMode, colorScale]);

  const width = weekLabelWidth + 53 * (cellSize + cellGap) + 20;
  const height = monthLabelHeight + 7 * (cellSize + cellGap) + 20;

  // Generate Month Labels
  const monthLabels = useMemo(() => d3.timeMonths(new Date(year, 0, 1), new Date(year, 11, 31)).map(d => {
    const weekIndex = d3.timeSunday.count(d3.timeYear(d), d);
    return {
      x: weekLabelWidth + weekIndex * (cellSize + cellGap),
      y: monthLabelHeight - 6,
      label: d3.timeFormat("%b")(d)
    };
  }), [year]);

  return (
    <div className="overflow-x-auto pb-4 custom-scrollbar">
      <div className="relative inline-block">
        <svg width={width} height={height}>
          {/* Day Labels */}
          {['Mon', 'Wed', 'Fri'].map((day, i) => (
            <text
              key={day}
              x={weekLabelWidth - 6}
              y={monthLabelHeight + (2 * i + 1) * (cellSize + cellGap) + cellSize} // 1 = Mon, 3 = Wed, 5 = Fri
              className="text-[10px] fill-gray-400 dark:fill-gray-400"
              textAnchor="end"
            >
              {day}
            </text>
          ))}

          {/* Month Labels */}
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={m.x}
              y={m.y}
              className="text-[10px] fill-gray-400 dark:fill-gray-400 font-medium"
            >
              {m.label}
            </text>
          ))}

          {/* Cells */}
          {cells.map((cell) => (
            <rect
              key={cell.dateStr}
              x={cell.x}
              y={cell.y}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={cell.color}
              className="hover:stroke-gray-400 dark:hover:stroke-gray-500 stroke-1 cursor-pointer transition-colors duration-100 ease-in-out hover:z-10"
              onClick={() => onDayClick(cell.dateStr)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  x: rect.x + rect.width / 2,
                  y: rect.y - 10,
                  content: (
                    <div className="text-center">
                      <div className="font-semibold">{cell.dateStr}</div>
                      <div>{cell.value > 0 ? `${cell.value} hours` : 'No study logged'}</div>
                      {cell.notes && (
                        <div className="text-[10px] text-gray-300 mt-1 max-w-[150px] italic border-t border-gray-600 pt-1">
                          "{cell.notes}"
                        </div>
                      )}
                      <div className="text-[9px] text-gray-400 mt-1">Click to edit</div>
                    </div>
                  )
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
        </svg>

        {tooltip && (
          <div
            className="fixed z-50 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full border border-gray-700 dark:border-gray-600 backdrop-blur-sm bg-opacity-95"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.content}
            <div className="absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1 border-r border-b border-gray-700 dark:border-gray-600"></div>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-2 px-4">
        <div className="text-[10px] text-gray-400"></div>

        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
            <span>Less</span>
            <div className="flex space-x-1">
            <div className={`w-3 h-3 rounded-sm ${isDarkMode ? 'bg-[#374151]' : 'bg-[#ebedf0]'}`}></div>
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorScale(2) }}></div>
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorScale(5) }}></div>
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorScale(8) }}></div>
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorScale(10) }}></div>
            </div>
            <span>More</span>
        </div>
      </div>
    </div>
  );
};
