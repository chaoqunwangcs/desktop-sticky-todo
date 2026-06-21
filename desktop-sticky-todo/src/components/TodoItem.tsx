/**
 * A single todo row: checkbox, title, tag, countdown, due date, actions.
 * Supports drag handle, inline edit, pin, delete, complete.
 */
import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Check, Pin, Trash2, Calendar, Tag, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Todo } from "../types";
import { useStore } from "../store";
import { cn, countdownLabel } from "../utils";

/** Tag → color mapping so categories are visually distinct (fixes H3). */
const TAG_COLORS: Record<string, string> = {
  工作: "text-blue-300/90",
  生活: "text-green-300/90",
  学习: "text-purple-300/90",
  紧急: "text-red-300/90",
};

function tagColor(tag?: string): string {
  return (tag && TAG_COLORS[tag]) || "text-accent/80";
}

interface Props {
  todo: Todo;
}

export function TodoItem({ todo }: Props) {
  const { updateTodo, removeTodo, toggleDone, togglePinned } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const countdown = countdownLabel(todo.dueDate);
  const done = !!todo.completedAt;

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== todo.title) {
      updateTodo(todo.id, { title: trimmed });
    } else {
      setDraft(todo.title);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      setDraft(todo.title);
      setEditing(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-xl px-2.5 py-2 transition-colors",
        "hover:bg-white/[0.05]",
        done && "opacity-45",
      )}
    >
      {/* Drag handle — hidden until hover/focus (fixes H2); kept in tab order for keyboard reorder (fixes H6) */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab touch-none text-white/20 opacity-0 transition-opacity hover:text-white/50 active:cursor-grabbing group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label="拖拽排序"
      >
        <GripVertical size={14} />
      </button>

      {/* Checkbox */}
      <button
        onClick={() => toggleDone(todo.id)}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all",
          done
            ? "border-accent bg-accent text-black"
            : "border-white/25 hover:border-accent/60",
        )}
        aria-label={done ? "标记为未完成" : "标记为完成"}
      >
        {done && <Check size={11} strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-white/90 outline-none"
          />
        ) : (
          <p
            onClick={() => !done && setEditing(true)}
            className={cn(
              "cursor-text text-sm leading-snug text-white/90 break-words",
              // C3: stronger strikethrough so done items are clearly distinguishable on glass
              done && "line-through decoration-white/70 decoration-2 text-white/55",
            )}
          >
            {todo.title}
          </p>
        )}

        {/* Meta row */}
        {(todo.tag || todo.dueDate || countdown) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
            {todo.tag && (
              <span className={cn("inline-flex items-center gap-1", tagColor(todo.tag))}>
                <Tag size={10} />
                {todo.tag}
              </span>
            )}
            {todo.dueDate && (
              <span className="inline-flex items-center gap-1 text-white/55">
                <Calendar size={10} />
                {format(parseISO(todo.dueDate), "M月d日")}
              </span>
            )}
            {countdown && (
              <span
                className={cn(
                  // H4: overdue items get red; today stays accent; future stays muted
                  countdown.startsWith("已过")
                    ? "text-red-400/90 font-medium"
                    : countdown === "今天"
                      ? "text-accent font-medium"
                      : "text-white/55",
                )}
              >
                {countdown}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions — visible on hover, focus, and touch devices (H5) */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        <button
          onClick={() => togglePinned(todo.id)}
          className={cn(
            "rounded-md p-1 transition-colors hover:bg-white/10",
            todo.pinned ? "text-accent" : "text-white/30 hover:text-white/60",
          )}
          aria-label="置顶"
        >
          <Pin size={13} />
        </button>
        <button
          onClick={() => removeTodo(todo.id)}
          className="rounded-md p-1 text-white/30 transition-colors hover:bg-red-500/20 hover:text-red-400"
          aria-label="删除"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
