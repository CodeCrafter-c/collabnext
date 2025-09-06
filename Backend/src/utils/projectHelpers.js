const {ApiError} = require("./apiError");

// Ensure target is not the owner
const ensureNotOwner = (project, targetAdminId) => {
  if (project.owner.toString() === targetAdminId.toString()) {
    throw new ApiError(400, "The project owner cannot be removed as admin");
  }
};

// Ensure target is still in admins list
const ensureStillAdmin = (project, targetAdminId) => {
  const isStillAdmin = project.admin.some(
    (id) => id.toString() === targetAdminId.toString()
  );
  if (!isStillAdmin) {
    throw new ApiError(400, "Target user is not an admin anymore");
  }
};

// Find request or throw error
const findRemovalRequestOrThrow = (project, targetAdminId) => {
  const request = project.adminRemovalRequests.find(
    (req) => req.target.toString() === targetAdminId.toString()
  );
  if (!request) {
    throw new ApiError(400, "No active removal request for this admin");
  }
  return request;
};

module.exports = {
  ensureNotOwner,
  ensureStillAdmin,
  findRemovalRequestOrThrow,
};
