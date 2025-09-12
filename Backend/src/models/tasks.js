const mongoose = require("mongoose");
const { Project } = require("./projects");
const { User } = require("./user");

const taskSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["not started", "in progress", "completed", "submitted"],
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
        value: { type: String, required: true }, // S3 URL or link,
        fileName: {
          type: String,
          required: function () {
            return this.type === "file";
          },
        },
        fileType: {
          type: String,
          required: function () {
            return this.type === "file";
          },
        },
        s3Key: {
          type: String,
          required: function () {
            return this.type === "file";
          },
        },
        status: {
          type: String,
          enum: ["pending", "submitted"],
          default: function () {
            return this.type === "file" ? "pending" : "submitted";
          },
        },
        submittedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("Task", taskSchema);

module.exports = {
  Task,
};
