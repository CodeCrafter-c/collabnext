const mongoose=require("mongoose");
const {User}=require("./user")



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
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model("Project", projectSchema);

module.exports = { Project };



