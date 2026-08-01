const express = require("express");
const User = require("../models/User");
const Task = require("../models/Task");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

// Guard all admin routes
router.use(protect, requireRole("admin"));

// @route  GET /api/admin/users
// @desc   Get all registered users with task count
// @access Private (Admin only)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("name email role createdAt").sort({ createdAt: -1 });
    
    // Get task count per user
    const userTaskCounts = await Task.aggregate([
      { $group: { _id: "$owner", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    userTaskCounts.forEach((item) => {
      countMap[item._id.toString()] = item.count;
    });

    const userList = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      taskCount: countMap[u._id.toString()] || 0,
    }));

    res.json(userList);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

// @route  PUT /api/admin/users/:id/role
// @desc   Update a user's role (admin or member)
// @access Private (Admin only)
router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be admin or member" });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent demoting self if sole admin or optional self-demotion safety check
    if (targetUser._id.toString() === req.user._id.toString() && role !== "admin") {
      return res.status(400).json({ message: "You cannot demote yourself from admin role" });
    }

    targetUser.role = role;
    await targetUser.save();

    res.json({
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user role", error: err.message });
  }
});

module.exports = router;
