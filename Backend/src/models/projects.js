const mongoose = require("mongoose");
const { User } = require("./user");

const projectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
    projectDescription: {
      type: String,
      trim: true,
      required: true,
      default: "",
    },
    deadLine: {
      type: Date, // optional
    },
    status: {
      type: String,
      enum: ["not started", "in progress", "completed", "on hold"],
      default: "not started",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admin: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    pendingArchive: {
      type: Boolean,
      default: false,
    },
    archiveRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    archiveApprovals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    archivedRejectedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ✅ Multiple admin removal requests support
    adminRemovalRequests: [
      {
        target: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        approvals: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        rejections: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

projectSchema.pre("save", function (next) {
  if (this.isArchived && !this.archivedAt) {
    this.archivedAt = new Date();
  }
  next();
});

const Project = mongoose.model("Project", projectSchema);

module.exports = { Project };
