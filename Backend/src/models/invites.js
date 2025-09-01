const mongoose = require("mongoose");

const inviteSchema = mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// prevent duplicate invites for same project + user
inviteSchema.index({ project: 1, user: 1 }, { unique: true });

const Invite = mongoose.model("Invite", inviteSchema);

module.exports = { Invite };
