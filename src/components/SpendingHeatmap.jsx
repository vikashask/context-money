import {
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { db } from "../db";
import { getCurrencySymbol, useStore } from "../store";
import { formatAmount } from "../utils";

export default function SpendingHeatmap() {
  const { activeContextId, currency } = useStore();
  const sym = getCurrencySymbol(currency);
  const [hoveredDay, setHoveredDay] = useState(null);

  const weeks = 12; // Show last 12 weeks
  const today = new Date();
  const startDate = startOfWeek(subWeeks(today, weeks - 1), {
    weekStartsOn: 1,
  });
  const endDate = endOfWeek(today, { weekStartsOn: 1 });

  const expenses = useLiveQuery(
    () =>
      activeContextId
        ? db.expenses
            .where("contextId")
            .equals(activeContextId)
            .and(
              (e) =>
                new Date(e.date) >= startDate && new Date(e.date) <= endDate,
            )
            .toArray()
        : [],
    [activeContextId],
  );

  const { grid, maxSpend, dailyData } = useMemo(() => {
    if (!expenses) return { grid: [], maxSpend: 0, dailyData: {} };

    // Group expenses by date
    const byDate = {};
    expenses.forEach((exp) => {
      const key = format(new Date(exp.date), "yyyy-MM-dd");
      byDate[key] = (byDate[key] || 0) + exp.amount;
    });

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    let max = 0;
    Object.values(byDate).forEach((v) => {
      if (v > max) max = v;
    });

    // Build grid: columns = weeks, rows = days (Mon-Sun)
    const weekGrid = [];
    let currentWeek = [];
    allDays.forEach((day, i) => {
      const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1; // Mon=0, Sun=6
      if (i > 0 && dayOfWeek === 0) {
        weekGrid.push(currentWeek);
        currentWeek = [];
      }
      const key = format(day, "yyyy-MM-dd");
      const amount = byDate[key] || 0;
      currentWeek.push({ date: day, amount, key });
    });
    if (currentWeek.length > 0) weekGrid.push(currentWeek);

    return { grid: weekGrid, maxSpend: max, dailyData: byDate };
  }, [expenses, startDate, endDate]);

  const getLevel = (amount) => {
    if (amount === 0) return 0;
    if (maxSpend === 0) return 0;
    const ratio = amount / maxSpend;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""];

  return (
    <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100/80 dark:border-dark-border card-elevated animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-navy dark:text-dark-text">
          Spending Activity
        </h3>
        <span className="text-xs text-gray-400 dark:text-dark-muted">
          Last {weeks} weeks
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-0.5 overflow-x-auto fancy-scroll pb-1">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1 flex-shrink-0">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-[14px] flex items-center">
              <span className="text-[9px] text-gray-400 dark:text-dark-muted w-5">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Weeks */}
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5 flex-shrink-0">
            {week.map((day) => (
              <div
                key={day.key}
                className={`w-[14px] h-[14px] rounded-[3px] heatmap-${getLevel(day.amount)} transition-all hover:ring-2 hover:ring-coral/40 cursor-pointer`}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                title={`${format(day.date, "MMM d")}: ${formatAmount(day.amount, sym)}`}
              />
            ))}
            {/* Fill remaining cells if week is incomplete */}
            {week.length < 7 &&
              Array.from({ length: 7 - week.length }).map((_, i) => (
                <div key={`empty-${i}`} className="w-[14px] h-[14px]" />
              ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 dark:text-dark-muted">
            Less
          </span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`w-[12px] h-[12px] rounded-[2px] heatmap-${level}`}
            />
          ))}
          <span className="text-[10px] text-gray-400 dark:text-dark-muted">
            More
          </span>
        </div>
        {hoveredDay && (
          <span className="text-xs font-medium text-navy dark:text-dark-text animate-scale-in">
            {format(hoveredDay.date, "MMM d")}:{" "}
            <span className="font-mono-amount">
              {formatAmount(hoveredDay.amount, sym)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
