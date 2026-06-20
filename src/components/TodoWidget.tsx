/**
 * The todo list widget: quick-add input, sortable active list, collapsible
 * archive section for completed items, and date filter when a day is picked
 * from the calendar.
 */
import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Inbox, CheckCircle2, ChevronDown, ChevronRight, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useStore } from "../store";
import { TodoItem } from "./TodoItem";
import { partitionTodos } from "../utils";

export function TodoWidget() {
  const { todos, selectedDate, setSelectedDate, addTodo, reorder } = useStore();
  const [input, setInput] = useState("");
  const [showArchive, setShowArchive] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Filter by selected calendar date if one is picked.
  const visibleTodos = useMemo(() => {
    if (!selectedDate) return todos;
    return todos.filter((t) => t.dueDate === selectedDate);
  }, [todos, selectedDate]);

  const { active, done } = useMemo(
    () => partitionTodos(visibleTodos),
    [visibleTodos],
  );

  function handleAdd() {
    const title = input.trim();
    if (!title) return;
    addTodo({ title, dueDate: selectedDate ?? undefined });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const ids = active.map((t) => t.id);
    const oldIdx = ids.indexOf(a.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    reorder(arrayMove(ids, oldIdx, newIdx));
  }

  const total = active.length + done.length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-white/80">
          {selectedDate
            ? format(parseISO(selectedDate), "M月d日 EEEE")
            : "待办清单"}
        </h2>
        <span className="text-xs text-white/35">{total} 项</span>
      </div>

      {/* Selected date chip */}
      {selectedDate && (
        <button
          onClick={() => setSelectedDate(null)}
          className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-accent hover:bg-accent/25"
        >
          {format(parseISO(selectedDate), "M月d日")}
          <X size={11} />
        </button>
      )}

      {/* Quick add */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Plus
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="添加待办，回车确认…"
            className="glass-input w-full !pl-8 !py-1.5 text-[13px]"
          />
        </div>
      </div>

      {/* Active list */}
      <div className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1">
        {active.length === 0 ? (
          <div className="flex h-24 flex-col items-center justify-center gap-1 text-white/25">
            <Inbox size={22} />
            <span className="text-xs">暂无待办</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={active.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {active.map((t) => (
                <TodoItem key={t.id} todo={t} />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Archive */}
        {done.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowArchive((v) => !v)}
              className="flex w-full items-center gap-1.5 px-1 py-1 text-xs text-white/40 hover:text-white/60"
            >
              {showArchive ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
              <CheckCircle2 size={13} />
              已完成 ({done.length})
            </button>
            {showArchive && (
              <div className="mt-0.5 opacity-60">
                {done.map((t) => (
                  <TodoItem key={t.id} todo={t} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
