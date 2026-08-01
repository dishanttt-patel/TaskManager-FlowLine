const express = require("express");
const Task = require("../models/Task");
const Comment = require("../models/Comment");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Every route below requires a valid JWT.
router.use(protect);

// @route  GET /api/tasks
// @desc   List tasks — admins see everyone's, members see only their own
// @access Private
router.get("/", async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { owner: req.user._id };
    const tasks = await Task.find(filter)
      .populate("owner", "name email")
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks", error: err.message });
  }
});

// @route  POST /api/tasks
// @desc   Create a task owned by the logged-in user
// @access Private
router.post("/", async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      owner: req.user._id,
    });

    const populatedTask = await task.populate("owner", "name email");
    res.status(201).json(populatedTask);
  } catch (err) {
    res.status(500).json({ message: "Failed to create task", error: err.message });
  }
});

// Shared helper: fetch a task and confirm the requester is allowed to touch it.
async function findAuthorizedTask(req, res) {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return null;
  }
  const isOwner = task.owner.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    res.status(403).json({ message: "You don't have permission to modify this task" });
    return null;
  }
  return task;
}

// @route  PUT /api/tasks/:id
// @desc   Update a task's fields (including moving it between status columns)
// @access Private (owner or admin)
router.put("/:id", async (req, res) => {
  try {
    const task = await findAuthorizedTask(req, res);
    if (!task) return; // response already sent by the helper

    const { title, description, status, priority, dueDate } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;

    const updated = await task.save();
    const populated = await updated.populate("owner", "name email");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update task", error: err.message });
  }
});

// @route  DELETE /api/tasks/:id
// @desc   Delete a task and its comments
// @access Private (owner or admin)
router.delete("/:id", async (req, res) => {
  try {
    const task = await findAuthorizedTask(req, res);
    if (!task) return;

    await Comment.deleteMany({ task: task._id });
    await task.deleteOne();
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete task", error: err.message });
  }
});

// @route  GET /api/tasks/:id/comments
// @desc   Get comments for a task
// @access Private (owner or admin)
router.get("/:id/comments", async (req, res) => {
  try {
    const task = await findAuthorizedTask(req, res);
    if (!task) return;

    const comments = await Comment.find({ task: task._id })
      .populate("author", "name email role")
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch comments", error: err.message });
  }
});

// @route  POST /api/tasks/:id/comments
// @desc   Add a comment to a task
// @access Private (owner or admin)
router.post("/:id/comments", async (req, res) => {
  try {
    const task = await findAuthorizedTask(req, res);
    if (!task) return;

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    let comment = await Comment.create({
      text: text.trim(),
      author: req.user._id,
      task: task._id,
    });

    comment = await comment.populate("author", "name email role");
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: "Failed to add comment", error: err.message });
  }
});

module.exports = router;
