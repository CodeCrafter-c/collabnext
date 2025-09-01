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

module.exports = {
  createProjectHandler,
  getMyProjects
};
