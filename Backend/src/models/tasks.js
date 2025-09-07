const mongoose = require("mongoose");
const { Project } = require("./projects");
const { User } = require("./user");

const taskSchema =
  ({
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default:""
    },
    status: {
      type: String,
      enum: ["not started", "in progress", "completed", "blocked"],
      default: "not started",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    deadline: {
      type: Date,
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    AssignedTo: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submissions: [
      {
        submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        type: { type: String, enum: ["link", "file"], required: true },
        value: { type: String, required: true }, // url/path
        fileType: String, // pdf, docx, xlsx, image etc.
        submittedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  });

const Task = mongoose.model("Task", taskSchema);

module.exports = {
  Task,
};
