const { memo } = require("react");
const { Invite } = require("../models/invites");
const { Project } = require("../models/projects");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { sanitizeInvites } = require("../utils/sanitizeInvites");

const createProjectHandler = asyncHandler(async (req, res, next) => {
  const {
    projectName,
    projectDescription,
    deadline: deadlineStr = null,
    pendingInvites = [],
  } = req.body;
  const admin = req?.user;

  if (!admin) throw new ApiError(401, "You are not logged in");

  const deadline = deadlineStr ? new Date(deadlineStr) : null;

  // sanitize pending invites (split valid + invalid)
  const { valid: validInvites, invalid: invalidInvites } =
    await sanitizeInvites(pendingInvites, admin._id);

  // Create project
  const project = new Project({
    projectName,
    projectDescription,
    deadline,
    admin: [admin._id],
    status: "not started",
    members: [],
  });

  const savedProject = await project.save();

  // Attach project ID to valid invites & insert
  if (validInvites.length) {
    const invitesWithProject = validInvites.map((inv) => ({
      ...inv,
      project: savedProject._id,
    }));
    await Invite.insertMany(invitesWithProject);
  }
  const data = {
    project: savedProject,
    invites: {
      added: validInvites.map((inv) => inv.user),
      failed: invalidInvites.map((inv) => inv.user),
    },
  };

  // Todo  ---> send notification or email to the members for confirmation

  res.json(new ApiResponse(200, "Project created successfully", data));
});

const getMyProjects = asyncHandler(async (req, res, next) => {
  const user = req?.user;

  if (!user) {
    throw new ApiError(400, "please log in");
  }

  const allProjects = await Project.find({
    $or: [{ Admin: { $in: user._id } }, { members: { $in: user._id } }],
  });

  const adminProjects = allProjects.filter((project) =>
    project.admin.some((admin) => admin.toString() === user._id.toString())
  );

  const memberProjects = allProjects.filter((project) =>
    project.members.some((member) => member.toString() === user._id.toString())
  );

  const projects = {
    adminProjects,
    memberProjects,
  };

  res.json(200, "projects fetched completely", projects);
});

const getProjectDetails = asyncHandler(async (req, res, next) => {
  const projectId = req.params.id;

  // check if project id exists
  if (!projectId) {
    throw new ApiError(400, "no project Id");
  }

  // find project with project id
  const project = await Project.aggregate([
    {
      // find the project with the projectId
      // projectId is string so we need to covert it to ObjectID manully
      $match: { _id: new mongoose.Types.ObjectId(projectId) },
    },

    // lookup members to get full details
    {
      $lookup: {
        from: "Users",
        localField: "members",
        foreignField: "_id",
        as: "members",
      },
    },

    // find all the tasks associated with that project
    {
      $lookup: {
        from: "Task",
        localField: "_id",
        foreignField: "project",
        as: "tasks",
      },
    },
    // to check if task belong to logged in user or not
    {
      $addFields: {
        tasks: {
          $map: {
            input: "$tasks",
            as: "task",
            in: {
              $mergeObjects: [
                "$$task",
                {
                  isMine: {
                    $in: [new mongoose.Types.ObjectId(req.user), "$$task.AssignedTO"], 
                  },
                },
              ],
            },
          },
        },
      },
    },
        // sort tasks
    {
      $addFields: {
        tasks: {
          $sortArray: {
            input: "$tasks",
            sortBy: { isMine: -1, dueDate: 1 },
          },
        },
      },
    },
    // Step 4: Add isAdmin flag at project level
    {
      $addFields: {
        isAdmin: {
          $in: [new mongoose.Types.ObjectId(req.user), "$admin"],
        },
      },
    },
  ]);

  // check if project exists with that projectID
  if (!project.length) {
    throw new ApiError(404, "no project found");
  }

  const projectData = project[0];

  const isMember = projectData.members.some((member) => {
    return member._id.toString() === req.user.toString();
  });

  if (!isMember) {
    throw new ApiError(403, "you dont have access to this project");
  }

  res.json(new ApiResponse(200, "project Data fetched", project));
});

module.exports = {
  createProjectHandler,
  getMyProjects,
  getProjectDetails
};
