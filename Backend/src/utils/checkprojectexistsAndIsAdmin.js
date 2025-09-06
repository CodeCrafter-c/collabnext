const { Project } = require("../models/projects");
const { ApiError } = require("./apiError");

const checkProjectExistsAndIsAdmin = async function (
  projectId,
  userId = null,
  checkForAdmin = false
) {
  // validate projectId
  if (!projectId) {
    throw new ApiError(400, "Invalid project ID");
  }

  // check project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "No project found");
  }

  // if admin check is not required, just return project
  if (!checkForAdmin) {
    return project;
  }

  // validate userId
  if (!userId) {
    throw new ApiError(400, "User ID required for admin check");
  }

  // check if user is admin
  const isAdmin = project.admin.some(
    (adminId) => adminId.toString() === userId.toString()
  );

  if (!isAdmin) {
    throw new ApiError(403, "You are not authorised to do so");
  }

  return { project, isAdmin: true };
};

module.exports={
    checkProjectExistsAndIsAdmin
}