const { default: mongoose } = require("mongoose");
const { Task } = require("../models/tasks");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  checkProjectExistsAndIsAdmin,
} = require("../utils/checkprojectexistsAndIsAdmin");
const { Project } = require("../models/projects");

const createTaskHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user;
  const {
    title,
    description = "",
    deadline,
    AssignedTo = [],
    priority = "medium",
  } = req.body;
  const projectId = req.params.projectId;

  // basic check
  if (!userId) {
    throw new ApiError(400, "Please log in to continue");
  }

  if (!projectId) {
    throw new ApiError(400, "Invalid Project ID");
  }

  // check project and admin
  const { project, isAdmin } = await checkProjectExistsAndIsAdmin(
    projectId,
    userId,
    true
  );

  if (!isAdmin) {
    throw new ApiError(403, "You are not authorised to perform this action");
  }

  // validate assigned members
  let validAssignees = [];
  let invalidAssignees = [];

  if (AssignedTo.length > 0) {
    const projectMembers = project.members.map((id) => id.toString());

    // find valid ones
    validAssignees = AssignedTo.filter((id) =>
      projectMembers.includes(id.toString())
    );

    // optimization 1: if only one, no need to compute invalids
    if (AssignedTo.length === 1) {
      if (validAssignees.length === 0) {
        invalidAssignees = AssignedTo;
      }
    } else if (validAssignees.length !== AssignedTo.length) {
      // optimization 2: only compute invalid if mismatch
      invalidAssignees = AssignedTo.filter(
        (id) => !projectMembers.includes(id.toString())
      );
    }
  }

  // populate details
  let validUser = [];
  let invalidUsers = [];
  if (validAssignees.length) {
    validUsers = await User.find({ _id: { $in: validAssignees } }).select(
      "name email"
    );
  }
  if (invalidAssignees.length) {
    invalidUsers = await User.find({ _id: { $in: invalidAssignees } }).select(
      "name email"
    );
  }

  // create task
  const task = new Task({
    title,
    description,
    deadline: deadline || null,
    AssignedTo: validAssignees.length > 0 ? validAssignees : [],
    status: "not started",
    priority,
    project: project._id,
    createdBy: userId,
  });

  const savedTask = await task.save();
  await savedTask.populate("AssignedTo", "name email");

  res.json(
    new ApiResponse(200, "task created successfully", {
      task: savedTask,
      assignedUsers: validUser,
      invalidUsers,
    })
  );
});

const getTasksHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user;
  const projectId = req.params.projectId;

  if (!userId) throw new ApiError(400, "Please log in to continue");
  if (!projectId) throw new ApiError(400, "Invalid Project ID");

  const { project } = await checkProjectExistsAndIsAdmin(projectId);

  const isAdmin = project.admin.some(
    (id) => id.toString() === userId.toString()
  );
  const isMember = project.members.some(
    (id) => id.toString() === userId.toString()
  );

  if (!isAdmin && !isMember) throw new ApiError(403, "You are not authorized");

  const tasks = await Task.find({ project: project._id })
    .populate("AssignedTo", "name email")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  const myTasks = [];
  const teamTasks = [];
  const unAssignedTasks = [];

  const projectMemberIds = project.members.map((m) => m.toString());

  tasks.forEach((task) => {
    const assignees = task.AssignedTo.map((u) => u._id.toString());

    // unassigned tasks
    if (!assignees.length) {
      if (isAdmin) unAssignedTasks.push(task);
      return;
    }

    if (assignees.includes(userId.toString())) {
      myTasks.push(task);
    } else if (isMember) {
      // only include tasks assigned to other members
      const assignedMemberIds = assignees.filter((id) =>
        projectMemberIds.includes(id)
      );
      if (assignedMemberIds.length) teamTasks.push(task);
    } else if (isAdmin) {
      teamTasks.push(task);
    }
  });

  res.json(
    new ApiResponse(200, "Tasks fetched successfully", {
      project,
      myTasks,
      teamTasks,
      unAssignedTasks,
    })
  );
});
const getTaskDetailsHandler = asyncHandler(async (req, res, next) => {
  const { taskId, projectId } = req.params;
  const userId =   req.user; 

  // basic checks
  if (!userId) throw new ApiError(400, "Please log in to continue");
  if (!projectId) throw new ApiError(400, "Invalid Project ID");
  if (!taskId) throw new ApiError(400, "Invalid Task ID");

  // check if task exists in this project
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw new ApiError(404, "Task not found");

  // check project exists
  const project = await checkProjectExists(projectId);

  // check admin or member
  const isAdmin = project.admin.some(id => id.toString() === userId.toString());
  const isMember = project.members.some(id => id.toString() === userId.toString());

  if (!isAdmin && !isMember) {
    throw new ApiError(403, "You are not authorized");
  }

  // if admin → full access
  if (isAdmin) {
    return res.status(200).json(new ApiResponse(200, "Task fetched successfully", task));
  }

  // if member → restricted access
  if (isMember) {
    const assignees = task.AssignedTo.map(id => id.toString());
    const memberIds = project.members.map(m => m.toString());

    const isAssignedToMe = assignees.includes(userId.toString());
    const isAssignedToOtherMembers = assignees.some(id => memberIds.includes(id));

    if (isAssignedToMe || isAssignedToOtherMembers) {
      return res.status(200).json(new ApiResponse(200, "Task fetched successfully", task));
    }

    throw new ApiError(403, "You are not authorized to view this task");
  }
});

const deleteTaskHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user;
  const { taskId, projectId } = req.params;

  // basic checks
  if (!userId) throw new ApiError(400, "Please log in to continue");
  if (!projectId) throw new ApiError(400, "Invalid Project ID");
  if (!taskId) throw new ApiError(400, "Invalid Task ID");

  // check if task exists in this project
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw new ApiError(404, "Task not found");

  // check project and admin
  const { isAdmin } = await checkProjectExistsAndIsAdmin(projectId, userId, true);
  if (!isAdmin) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }

  await Task.deleteOne({ _id: taskId });

  // Todo : notify other about this  

  res.json(
    new ApiResponse(200, "Task deleted successfully", {
      deletedTaskId: taskId,
      deletedTaskTitle: task.title,
    })
  );
});

module.exports = {
  createTaskHandler,
  getTasksHandler,
  getTaskDetailsHandler
};
