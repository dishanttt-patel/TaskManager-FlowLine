import { useEffect, useState, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import TaskDetailModal from "../components/TaskDetailModal";

const COLUMNS = [
  { key: "todo", label: "To Do", stampClass: "stamp-todo" },
  { key: "in-progress", label: "In Progress", stampClass: "stamp-in-progress" },
  { key: "done", label: "Done", stampClass: "stamp-done" },
];

function ColumnDroppable({ col, tasks, onStatusChange, onDelete, onClickDetail }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      className="column"
      style={{
        background: isOver ? "var(--paper-raised)" : undefined,
        borderColor: isOver ? "var(--stamp-progress)" : undefined,
      }}
    >
      <div className="column-header">
        <span className={`column-stamp ${col.stampClass}`} />
        <span className="column-title">{col.label}</span>
        <span className="column-count">{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        {tasks.length === 0 ? (
          <div className="column-empty">Nothing here yet</div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onClickDetail={onClickDetail}
            />
          ))
        )}
      </SortableContext>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await api.get("/tasks");
      setTasks(res.data);
    } catch (err) {
      setError("Couldn't load your tasks. Try refreshing the page.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(taskData) {
    const res = await api.post("/tasks", taskData);
    setTasks((prev) => [res.data, ...prev]);
  }

  async function handleStatusChange(taskId, newStatus) {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
    } catch (err) {
      setError("Couldn't update that task's status.");
      loadTasks(); // rollback
    }
  }

  async function handleDelete(taskId) {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    try {
      await api.delete(`/tasks/${taskId}`);
      if (selectedTaskDetail?._id === taskId) {
        setSelectedTaskDetail(null);
      }
    } catch (err) {
      setError("Couldn't delete that task.");
      setTasks(previous);
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    let targetStatus = over.id;

    // If dropped over another task card, find that task's status column
    if (!["todo", "in-progress", "done"].includes(targetStatus)) {
      const overTask = tasks.find((t) => t._id === over.id);
      if (overTask) targetStatus = overTask.status;
    }

    const currentTask = tasks.find((t) => t._id === taskId);
    if (currentTask && currentTask.status !== targetStatus) {
      handleStatusChange(taskId, targetStatus);
    }
  }

  // Extract unique task owners for admin filter
  const uniqueOwners = useMemo(() => {
    const ownersMap = new Map();
    tasks.forEach((t) => {
      if (t.owner?._id) {
        ownersMap.set(t.owner._id, t.owner.name || t.owner.email);
      }
    });
    return Array.from(ownersMap.entries());
  }, [tasks]);

  // Client-side filtering logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesDesc) return false;
      }
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (ownerFilter !== "all" && t.owner?._id !== ownerFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, ownerFilter]);

  // Due date reminders calculations
  const { overdueCount, dueSoonCount } = useMemo(() => {
    const now = new Date();
    let overdue = 0;
    let dueSoon = 0;
    tasks.forEach((t) => {
      if (t.status === "done" || !t.dueDate) return;
      const due = new Date(t.dueDate);
      if (due < now) {
        overdue++;
      } else if (due.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
        dueSoon++;
      }
    });
    return { overdueCount: overdue, dueSoonCount: dueSoon };
  }, [tasks]);

  const hasActiveFilters =
    search || statusFilter !== "all" || priorityFilter !== "all" || ownerFilter !== "all";

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Your board</h1>
          <div className="dashboard-sub">
            {user?.role === "admin"
              ? "Showing tasks from every team member"
              : "Showing your tasks"}
          </div>
        </div>
        <button className="btn btn-primary fab" onClick={() => setModalOpen(true)}>
          + New task
        </button>
      </div>

      {/* Due Date Reminder Summary Banner */}
      {(overdueCount > 0 || dueSoonCount > 0) && (
        <div className="reminder-banner">
          <div className="reminder-items">
            {overdueCount > 0 && (
              <span className="reminder-tag overdue">
                ⚠️ {overdueCount} task{overdueCount > 1 ? "s" : ""} overdue
              </span>
            )}
            {dueSoonCount > 0 && (
              <span className="reminder-tag due-soon">
                ⏰ {dueSoonCount} task{dueSoonCount > 1 ? "s" : ""} due within 24 hours
              </span>
            )}
          </div>
          <span style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
            Keep up the progress!
          </span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="search-input-wrapper field" style={{ marginBottom: 0 }}>
          <input
            type="text"
            placeholder="🔍 Search tasks by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>

          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {user?.role === "admin" && uniqueOwners.length > 0 && (
            <select
              className="filter-select"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              aria-label="Filter by owner"
            >
              <option value="all">All Task Owners</option>
              {uniqueOwners.map(([id, name]) => (
                <option key={id} value={id}>
                  Owner: {name}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              className="btn"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setPriorityFilter("all");
                setOwnerFilter("all");
              }}
              style={{ fontSize: "12px", padding: "6px 10px" }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading tasks…</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="board">
            {COLUMNS.map((col) => {
              const columnTasks = filteredTasks.filter((t) => t.status === col.key);
              return (
                <ColumnDroppable
                  key={col.key}
                  col={col}
                  tasks={columnTasks}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onClickDetail={(task) => setSelectedTaskDetail(task)}
                />
              );
            })}
          </div>
        </DndContext>
      )}

      {modalOpen && (
        <TaskModal onClose={() => setModalOpen(false)} onCreate={handleCreate} />
      )}

      {selectedTaskDetail && (
        <TaskDetailModal
          task={selectedTaskDetail}
          onClose={() => setSelectedTaskDetail(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
