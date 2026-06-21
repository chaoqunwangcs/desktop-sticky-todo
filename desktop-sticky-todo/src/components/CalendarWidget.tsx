/**
 * Calendar widget: month grid with weekday headers, todo-count dots per day,
 * prev/next/today navigation, and click-to-select-date which drives the todo
 * filter. Also supports dropping a todo onto a date to reschedule it.
 */
import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "../store";
import { cn, groupByDate } from "../utils";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function CalendarWidget() {
  const { todos, selectedDate, setSelectedDate, updateTodo } = useStore();
  const [cursor, setCursor] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    // Week starts on Monday (firstDayOfWeek=1) — our default.
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const todosByDate = useMemo(() => groupByDate(todos), [todos]);

  function handleDrop(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    const todoId = e.dataTransfer.getData("text/plain");
    if (todoId) {
      updateTodo(todoId, { dueDate: dateKey, completedAt: undefined });
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-white/80">
          {format(cursor, "yyyy年 M月", { locale: zhCN })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(subMonths(cursor, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 hover:bg-white/10 hover:text-white/80"
            aria-label="上个月"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => {
              setCursor(new Date());
              setSelectedDate(format(new Date(), "yyyy-MM-dd"));
            }}
            // M6: give "today" a visible background so it reads as a button
            className="rounded-md bg-white/[0.06] px-2.5 py-1 text-xs text-white/70 hover:bg-white/[0.12] hover:text-white/90"
          >
            今天
          </button>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 hover:bg-white/10 hover:text-white/80"
            aria-label="下个月"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Weekday row */}
      <div className="mb-1 grid grid-cols-7 gap-1 px-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-medium text-white/55"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid — H1: cap height so calendar-only view isn't absurdly tall */}
      <div className="grid grid-cols-7 gap-1 px-1 h-fit max-h-[440px]">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayTodos = todosByDate[dateKey] ?? [];
          const inMonth = isSameMonth(day, cursor);
          const isSel = selectedDate ? isSameDay(day, parseISO(selectedDate)) : false;
          const today = isToday(day);

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(isSel ? null : dateKey)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, dateKey)}
              className={cn(
                "relative flex min-h-[2.6rem] flex-col items-center rounded-lg py-1 text-xs transition-all",
                "hover:bg-white/[0.07]",
                !inMonth && "opacity-25",
                isSel && "bg-accent/20 ring-1 ring-accent/40",
                // L1: use accent ring for today instead of white (clearer, no glitch look)
                today && !isSel && "ring-1 ring-accent/30",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  today && "bg-accent font-semibold text-black",
                  !today && isSel && "text-accent",
                  !today && !isSel && "text-white/75",
                )}
              >
                {format(day, "d")}
              </span>
              {/* Todo dots — L2: add top margin so they don't collide with today badge */}
              {dayTodos.length > 0 && (
                <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                  {dayTodos.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className={cn(
                        "h-1 w-1 rounded-full",
                        t.color ?? "bg-accent/70",
                      )}
                    />
                  ))}
                  {dayTodos.length > 3 && (
                    <span className="text-[8px] leading-none text-white/45">
                      +
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
