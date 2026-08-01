import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const STATUS_LABEL = { todo: "TD", "in-progress": "IP", done: "DN" };

export default function TaskCard({ task, onStatusChange, onDelete, onClickDetail }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const due = task.dueDate ? new Date(task.dueDate) : null;
  const isDone = task.status === "done";
  const now = new Date();
  const isOverdue = due && !isDone && due < now;
  const isDueSoon =
    due && !isDone && !isOverdue && due.getTime() - now.getTime() <= 24 * 60 * 60 * 1000;

  const dueLabel = due
    ? due.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  function handleCardClick(e) {
    // Avoid triggering card details when clicking select, button, or drag handle
    if (
      e.target.tagName === "SELECT" ||
      e.target.tagName === "OPTION" ||
      e.target.tagName === "BUTTON" ||
      e.target.closest(".drag-handle")
    ) {
      return;
    }
    if (onClickDetail) {
      onClickDetail(task);
    }
  }

  const cardClasses = [
    "task-card",
    "task-card-clickable",
    isOverdue ? "due-overdue" : "",
    isDueSoon ? "due-soon" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={setNodeRef} style={style} className={cardClasses} onClick={handleCardClick}>
      <div className="task-top">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            className="drag-handle"
            {...attributes}
            {...listeners}
            title="Drag to move task between columns"
            aria-label="Drag handle"
          >
            ⠿
          </span>
          <div className="task-title">{task.title}</div>
        </div>
        <div className={`stamp stamp-${task.status}`} title={`Status: ${task.status}`}>
          {STATUS_LABEL[task.status]}
        </div>
      </div>

      {task.description && <div className="task-desc">{task.description}</div>}

      {task.owner?.name && (
        <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "4px" }}>
          By: {task.owner.name}
        </div>
      )}

      <div className="task-meta">
        <span className={`priority-tag priority-${task.priority}`}>{task.priority}</span>
        {dueLabel && (
          <span>
            due {dueLabel}
            {isOverdue && <span className="due-badge overdue">overdue</span>}
            {isDueSoon && <span className="due-badge soon">today</span>}
          </span>
        )}
      </div>

      <div className="task-actions">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task._id, e.target.value)}
          aria-label={`Change status for ${task.title}`}
        >
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <button
          className="icon-btn"
          onClick={() => onDelete(task._id)}
          aria-label={`Delete ${task.title}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
