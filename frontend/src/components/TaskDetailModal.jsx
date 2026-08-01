import { useEffect, useState } from "react";
import api from "../api/axios";

const STATUS_LABEL = { todo: "To Do", "in-progress": "In Progress", done: "Done" };

export default function TaskDetailModal({ task, onClose, onStatusChange }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadComments();
  }, [task._id]);

  async function loadComments() {
    setLoading(true);
    try {
      const res = await api.get(`/tasks/${task._id}/comments`);
      setComments(res.data);
    } catch (err) {
      setError("Failed to load comments.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await api.post(`/tasks/${task._id}/comments`, {
        text: newComment.trim(),
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isDone = task.status === "done";
  const now = new Date();
  const isOverdue = dueDate && !isDone && dueDate < now;
  const isDueSoon =
    dueDate &&
    !isDone &&
    !isOverdue &&
    dueDate.getTime() - now.getTime() <= 24 * 60 * 60 * 1000;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{task.title}</h2>
            <div className="task-detail-owner">
              Owner: <strong>{task.owner?.name || "Unknown"}</strong> ({task.owner?.email})
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div className="modal-body-scroll">
          {error && <div className="error-banner">{error}</div>}

          {task.description && (
            <div style={{ marginBottom: "16px", whiteSpace: "pre-wrap" }}>
              <strong>Description:</strong>
              <p className="task-desc" style={{ marginTop: "4px" }}>
                {task.description}
              </p>
            </div>
          )}

          <div className="field-row" style={{ marginBottom: "16px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--ink-dim)" }}>STATUS</label>
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task._id, e.target.value)}
                style={{ width: "100%", padding: "6px" }}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--ink-dim)" }}>PRIORITY</label>
              <div className={`priority-tag priority-${task.priority}`} style={{ paddingTop: "6px" }}>
                {task.priority.toUpperCase()}
              </div>
            </div>
          </div>

          {dueDate && (
            <div style={{ marginBottom: "16px", fontSize: "13px" }}>
              <strong>Due Date: </strong>
              {dueDate.toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              {isOverdue && <span className="due-badge overdue">Overdue</span>}
              {isDueSoon && <span className="due-badge soon">Due Soon</span>}
            </div>
          )}

          {/* Comments Section */}
          <div className="comments-section">
            <h3>Comments & Activity ({comments.length})</h3>

            {loading ? (
              <div className="loading-state" style={{ padding: "20px" }}>
                Loading activity…
              </div>
            ) : (
              <div className="comments-list">
                {comments.length === 0 ? (
                  <div className="column-empty">No comments yet. Start the conversation!</div>
                ) : (
                  comments.map((c) => (
                    <div className="comment-item" key={c._id}>
                      <div className="comment-header">
                        <span className="comment-author">
                          {c.author?.name || "User"}
                          <span
                            className="role-tag"
                            style={{ marginLeft: "6px", fontSize: "9px", padding: "1px 5px" }}
                          >
                            {c.author?.role || "member"}
                          </span>
                        </span>
                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="comment-text">{c.text}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            <form onSubmit={handleAddComment} className="comment-form">
              <textarea
                placeholder="Write a comment..."
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ alignSelf: "flex-end" }}
              >
                {submitting ? "Posting…" : "Post comment"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
