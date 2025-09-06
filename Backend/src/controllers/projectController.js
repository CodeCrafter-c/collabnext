const { Invite } = require("../models/invites");
const { Project } = require("../models/projects");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { sanitizeInvites } = require("../utils/sanitizeInvites");
const {
  checkProjectExistsAndIsAdmin,
} = require("../utils/checkprojectexistsAndIsAdmin");
const {
  ensureNotOwner,
  ensureStillAdmin,
  findRemovalRequestOrThrow,
} = require("../utils/projectHelpers");

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
    await sanitizeInvites(pendingInvites, admin);

  // Create project
  const project = new Project({
    projectName,
    projectDescription,
    deadline,
    owner: admin,
    admin: [admin],
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
                    $in: [
                      new mongoose.Types.ObjectId(req.user),
                      "$$task.AssignedTO",
                    ],
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

const updateProjectDetailsHandler = asyncHandler(async (req, res, next) => {
  const projectId = req?.params?.id;
  const { projectDescription, projectName, deadline } = req.body;
  const userId = req?.user;

  if (!userId) {
    throw new ApiError(400, "Please log in");
  }

  // check projectId exists
  if (!projectId) {
    throw new ApiError(400, "Invalid project");
  }

  // check project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project does not exist");
  }

  // user must be an admin
  const isAdmin = project.admin.some((memberId) => {
    return memberId.toString() === userId.toString();
  });

  if (!isAdmin) {
    throw new ApiError(403, "You are not authorized to do so.");
  }

  // check if at least one field is provided
  if (!projectName && !projectDescription && !deadline) {
    throw new ApiError(400, "No updates provided");
  }

  // Apply changes
  if (projectName) project.projectName = projectName;
  if (projectDescription) project.projectDescription = projectDescription;
  if (deadline) project.deadline = deadline;

  // Save updated project
  await project.save();

  res.json(new ApiResponse(200, "Project updated successfully", project));
});

const archiveProjectHandler = asyncHandler(async (req, res, next) => {
  const projectId = req?.params?.id;
  const userId = req.user;

  if (!userId) {
    throw new ApiError(400, "Please log in");
  }

  if (!projectId) {
    throw new ApiError(400, "Invalid project");
  }

  // Checks project existence and admin rights
  const { project, isAdmin } = await checkProjectExistsAndIsAdmin(
    projectId,
    userId,
    true
  );

  if (!isAdmin) {
    throw new ApiError(403, "You are not authorised to do so");
  }

  const totalAdmin = project.admin.length;

  if (totalAdmin === 1) {
    // Direct archive
    project.isArchived = true;
    project.archivedAt = new Date();
    await project.save();

    // TODO: notify members (sockets or notification service later)
    return res.json(new ApiResponse(200, "Project archived successfully"));
  }

  // Multi-admin flow → set project to pending archive
  project.pendingArchive = true;
  project.archiveRequestedBy = userId;

  // Reset approvals/rejections whenever a new request is made
  project.archiveApprovals = [userId];
  project.archivedRejectedBy = [];

  await project.save();

  // TODO: notify other admins for approval
  return res.json(
    new ApiResponse(200, "Archive request initiated, awaiting approvals")
  );
});

const approvePendingArchiveRequestHandler = asyncHandler(
  async (req, res, next) => {
    const userId = req.user;
    const projectId = req.params.id;

    if (!userId) {
      throw new ApiError(400, "Please log in");
    }

    if (!projectId) {
      throw new ApiError(400, "Invalid project");
    }

    // Check project existence and admin rights
    const { project, isAdmin } = await checkProjectExistsAndIsAdmin(
      projectId,
      userId,
      true
    );

    if (!isAdmin) {
      throw new ApiError(403, "You are not authorized to do so");
    }

    // Check project is in pending archive state
    if (!project.pendingArchive) {
      throw new ApiError(400, "No pending archive request for this project");
    }

    // The requester cannot approve again
    if (project.archiveRequestedBy.toString() === userId.toString()) {
      throw new ApiError(400, "You cannot approve your own archive request");
    }

    // Prevent duplicate approvals
    const alreadyApproved = project.archiveApprovals.some(
      (id) => id.toString() === userId.toString()
    );
    if (alreadyApproved) {
      throw new ApiError(400, "You have already approved this request");
    }

    // check if  already rejected
    if (project.archivedRejectedBy.length > 0) {
      throw new ApiError(400, "Archive request has already been rejected");
    }

    // Add approval
    project.archiveApprovals.push(userId);

    // Final approval check
    if (project.archiveApprovals.length === project.admin.length) {
      project.isArchived = true;
      project.archivedAt = new Date();
      project.pendingArchive = false;
      await project.save();

      // Todo: notify all the members and the admin that the project has been archived

      return res.json(new ApiResponse(200, "Project archived successfully"));
    }

    await project.save();
    return res.json(
      new ApiResponse(200, "Approval recorded. Waiting for others...")
    );
  }
);

const rejectPendingArchiveRequestHandler = asyncHandler(
  async (req, res, next) => {
    const userId = req.user;
    const projectId = req.params.id;

    if (!userId) {
      throw new ApiError(400, "please login");
    }

    if (!projectId) {
      throw new ApiError(400, "Invalid project");
    }

    const { project, isAdmin } = await checkProjectExistsAndIsAdmin(
      projectId,
      userId,
      true
    );

    if (!isAdmin) {
      throw new ApiError(403, "You are not authorised to do so");
    }

    // Check project is in pending archive state
    if (!project.pendingArchive) {
      throw new ApiError(400, "No pending archive request for this project");
    }

    // The requester cannot reject their own req
    if (project.archiveRequestedBy.toString() === userId.toString()) {
      throw new ApiError(400, "You cannot reject your own archive request");
    }

    // check if user has not already approved it
    const isApproved = project.archiveApprovals.some((id) => {
      id.toString() === userId.toString();
    });

    if (isApproved) {
      throw new ApiError(
        400,
        "You have already approved the request, you cannot reject it now"
      );
    }

    // check if not already rejected;
    const alreadyRejected = project.archivedRejectedBy.some((id) => {
      return id.toString() === userId.toString();
    });

    if (alreadyRejected) {
      throw new ApiError(400, "You have already rejected this request");
    }

    // add rejection
    project.archivedRejectedBy.push(userId);

    // If ANY admin rejects → cancel the archive process
    if (project.archivedRejectedBy.length >= 1) {
      project.isArchived = false;
      project.pendingArchive = false;
      project.archiveRequestedBy = null;
      project.archiveApprovals = [];
      project.archivedRejectedBy = [];

      // Todo : notify everyone that the archive req has been rejected
      await project.save();
      return res.json(
        new ApiResponse(200, "Archive request has been rejected", {
          rejectedBy: userId,
          project,
        })
      );
    }
    return res.json(new ApiResponse(200, "Rejection recorded."));
  }
);

const makeAdminHandler = asyncHandler(async (req, res, next) => {
  const adminId = req.user;
  const userId = req.params.userId;
  const projectId = req.params.id;

  if (!adminId) {
    throw new ApiError(400, "Please log in to continue");
  }

  if (!userId) {
    throw new ApiError(400, "User ID is required to promote a member to admin");
  }

  if (!projectId) {
    throw new ApiError(400, "Invalid project ID");
  }

  const { project, isAdmin } = await checkProjectExistsAndIsAdmin(
    projectId,
    adminId,
    true
  );

  if (!isAdmin) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }

  // Check user is a member of the project
  const isMember = project.members.some(
    (memberId) => memberId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new ApiError(
      400,
      "The specified user is not a member of this project"
    );
  }

  // Ensure user is not already an admin
  const isAlreadyAnAdmin = project.admin.some(
    (id) => id.toString() === userId.toString()
  );

  if (isAlreadyAnAdmin) {
    throw new ApiError(400, "The specified user is already an admin");
  }

  // Promote user to admin -> add to admin list, remove from members
  project.admin.push(userId);
  project.members = project.members.filter(
    (memberId) => memberId.toString() !== userId.toString()
  );

  await project.save();

  res.json(
    new ApiResponse(
      200,
      "Member has been successfully promoted to admin",
      project
    )
  );
});

const removeAdminHandler = asyncHandler(async (req, res) => {
  const initiatorId = req.user; // current admin
  const targetAdminId = req.params.userId; // admin to remove
  const projectId = req.params.id;

  if (!initiatorId) throw new ApiError(400, "Please log in to continue");
  if (!targetAdminId) throw new ApiError(400, "Target admin ID is required");
  if (!projectId) throw new ApiError(400, "Invalid project ID");

  const { project, isAdmin } = await checkProjectExistsAndIsAdmin(
    projectId,
    initiatorId,
    true
  );
  if (!isAdmin)
    throw new ApiError(403, "You are not authorized to perform this action");

  // owner cannot be removed
  ensureNotOwner(project, targetAdminId);

  // ensure target is actually an admin
  ensureStillAdmin(project, targetAdminId);
  const totalAdmins = project.admin.length;

  // Case A: self-removal (no request object needed)
  if (initiatorId.toString() === targetAdminId.toString()) {
    if (totalAdmins <= 1)
      throw new ApiError(
        400,
        "You are the only admin — cannot demote yourself"
      );

    project.admin = project.admin.filter(
      (id) => id.toString() !== targetAdminId.toString()
    );
    // add to members if not already present
    if (
      !project.members.some((id) => id.toString() === targetAdminId.toString())
    ) {
      project.members.push(targetAdminId);
    }
    await project.save();
    return res.json(
      new ApiResponse(200, "Removed from admin status successfully", project)
    );
  }

  // Case B: owner removing the only other admin → fast-track (no approvals needed)
  if (
    project.owner.toString() === initiatorId.toString() &&
    totalAdmins === 2 // owner + 1 other
  ) {
    project.admin = project.admin.filter(
      (id) => id.toString() !== targetAdminId.toString()
    );
    if (
      !project.members.some((id) => id.toString() === targetAdminId.toString())
    ) {
      project.members.push(targetAdminId);
    }
    await project.save();
    return res.json(
      new ApiResponse(200, "Admin removed immediately by owner", project)
    );
  }

  // Case C: create or reuse a pending request for this target
  let reqIdx = project.adminRemovalRequests.findIndex(
    (r) => r.target.toString() === targetAdminId.toString()
  );

  if (reqIdx === -1) {
    project.adminRemovalRequests.push({
      target: targetAdminId,
      requestedBy: initiatorId,
      approvals: [initiatorId],
      rejections: [],
      requestedAt: new Date(),
    });
  } else {
    // ensure initiator is counted as approving
    const r = project.adminRemovalRequests[reqIdx];
    const alreadyApproved = r.approvals.some(
      (id) => id.toString() === initiatorId.toString()
    );
    if (!alreadyApproved) r.approvals.push(initiatorId);
  }

  await project.save();
  return res.json(
    new ApiResponse(
      200,
      "Admin removal request created / updated; awaiting approvals",
      project
    )
  );
});

const approvePendingAdminRemovalHandler = asyncHandler(
  async (req, res, next) => {
    const projectId = req.params.id; // project being worked on
    const currentAdminId = req.user; // admin making the approval
    const targetAdminId = req.params.adminId; // admin being removed

    // Basic checks
    if (!currentAdminId) throw new ApiError(400, "Please log in to continue");
    if (!projectId) throw new ApiError(400, "Invalid project ID");
    if (!targetAdminId) throw new ApiError(400, "Target admin ID is required");

    // Check project + role
    const { project, isAdmin } = await checkProjectExistsAndIsAdmin(
      projectId,
      currentAdminId,
      true
    );
    if (!isAdmin)
      throw new ApiError(403, "You are not authorized to perform this action");

    // owner rejection
    ensureNotOwner(project, targetAdminId);

    // Find the relevant pending removal request
    const request = findRemovalRequestOrThrow(project, targetAdminId);

    // Verify target is still an admin
    ensureStillAdmin(project, targetAdminId);
    // Prevent duplicate approvals
    const alreadyApproved = request.approvals.some(
      (id) => id.toString() === currentAdminId.toString()
    );
    if (alreadyApproved) {
      throw new ApiError(400, "You have already approved this request");
    }

    // Prevent duplicate rejections -> if already rejected, can’t approve
    const alreadyRejected = request.rejections.some(
      (id) => id.toString() === currentAdminId.toString()
    );
    if (alreadyRejected) {
      throw new ApiError(400, "You already rejected this request");
    }

    // Add approval
    request.approvals.push(currentAdminId);

    // Check consensus: all other admins must approve
    const requiredApprovals = project.admin.length - 1; // minus 1 = target
    if (request.approvals.length === requiredApprovals) {
      //  Remove target from admins
      project.admin = project.admin.filter(
        (id) => id.toString() !== targetAdminId.toString()
      );

      // Move target to members array (if not already)
      if (
        !project.members.some(
          (id) => id.toString() === targetAdminId.toString()
        )
      ) {
        project.members.push(targetAdminId);
      }

      //  Remove request from list
      project.adminRemovalRequests = project.adminRemovalRequests.filter(
        (req) => req.target.toString() !== targetAdminId.toString()
      );

      await project.save();
      return res.json(
        new ApiResponse(200, "Admin removed successfully", project)
      );
    }

    // Save interim approval
    await project.save();
    return res.json(new ApiResponse(200, "Approval registered", project));
  }
);

const rejectPendingAdminRemovalHandler = asyncHandler(
  async (req, res, next) => {
    const projectId = req.params.id;
    const currentAdminId = req.user;
    const targetAdminId = req.params.adminId;

    // Basic checks
    if (!currentAdminId) throw new ApiError(400, "Please log in to continue");
    if (!projectId) throw new ApiError(400, "Invalid project ID");
    if (!targetAdminId) throw new ApiError(400, "Target admin ID is required");

    // Check project + role
    const { project, isAdmin } = await checkProjectExistsAndIsAdmin(
      projectId,
      currentAdminId,
      true
    );
    if (!isAdmin)
      throw new ApiError(403, "You are not authorized to perform this action");

    // Owner safety
    ensureNotOwner(project, targetAdminId);

    // Find the relevant pending removal request
    const request = findRemovalRequestOrThrow(project, targetAdminId);

    // Verify target is still an admin
    ensureStillAdmin(project, targetAdminId);

    // Prevent conflicting actions
    const alreadyApproved = request.approvals.some(
      (id) => id.toString() === currentAdminId.toString()
    );
    if (alreadyApproved) {
      throw new ApiError(
        400,
        "You have already approved this request, cannot reject now"
      );
    }

    const alreadyRejected = request.rejections.some(
      (id) => id.toString() === currentAdminId.toString()
    );
    if (alreadyRejected) {
      throw new ApiError(400, "You have already rejected this request");
    }

    // Register rejection
    request.rejections.push(currentAdminId);

    // Cancel the whole process immediately on any rejection
    project.adminRemovalRequests = project.adminRemovalRequests.filter(
      (req) => req.target.toString() !== targetAdminId.toString()
    );

    await project.save();

    return res.json(
      new ApiResponse(
        200,
        "Admin removal request has been rejected and cancelled",
        { project, rejectedBy: currentAdminId }
      )
    );
  }
);

const adminRemoveMemberHandler = asyncHandler(async (req, res, next) => {
  const adminId = req.user;
  const targetMemberId = req.params.id;
  const projectId = req.params.projectId;

  // basic check
  if (!adminId) {
    throw new ApiError(400, "Please login to continue");
  }
  if (!projectId) {
    throw new ApiError(400, "Invalid Project ID");
  }
  if (!targetMemberId) {
    throw new ApiError(400, "Member id is required");
  }

  // project + admin check
  const { project, isAdmin } = await checkProjectExistsAndIsAdmin(
    projectId,
    adminId,
    true
  );

  if (!isAdmin) {
    throw new ApiError(403, "you are not authorised to do so");
  }

  //owner safety
  if (project.owner.toString() === targetMemberId.toString()) {
    throw new ApiError(400, "Owner cannot be removed from his project");
  }

  // safeguard for himself
  if (adminId.toString() === targetMemberId.toString()) {
    throw new ApiError(400, "You cannot remove yourself from project members");
  }

  // ensure target is a member
  const isMember = project.members.some((id) => {
    return id.toString() === targetMemberId.toString();
  });

  if (!isMember) {
    throw new ApiError(400, "User is not a project member");
  }

  // remove from members
  project.members = project.members.filter((id) => {
    return id.toString() !== targetMemberId.toString();
  });

  await project.save();

  res.json(new ApiResponse(200, "Member removed Successfully", project));

  // Todo : notify other about this
});

const memberLeavingProjectHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user;
  const incomingUserId = req.params.userId;
  const projectId = req.params.id;

  // basic checks
  if (!userId) {
    throw new ApiError(400, "Please log in to continue");
  }
  if (!incomingUserId) {
    throw new ApiError(400, "User ID is required");
  }
  if (!projectId) {
    throw new ApiError(400, "Invalid project ID");
  }

  // check if user is leaving their own account
  if (userId.toString() !== incomingUserId.toString()) {
    throw new ApiError(403, "You can only leave a project for yourself");
  }

  // fetch project + check existence (no need admin check here)
  const { project } = await checkProjectExistsAndIsAdmin(
    projectId,
    userId,
    false
  );

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // safeguard: prevent admins from leaving via this route
  const isUserAdmin = project.admin.some(
    (id) => id.toString() === incomingUserId.toString()
  );

  if (isUserAdmin) {
    throw new ApiError(
      400,
      "Admins cannot leave using this route. Please use the admin removal process."
    );
  }

  // ensure user is actually a member
  const isMember = project.members.some(
    (id) => id.toString() === incomingUserId.toString()
  );

  if (!isMember) {
    throw new ApiError(403, "You are not a member of this project");
  }

  // remove from members
  project.members = project.members.filter(
    (id) => id.toString() !== incomingUserId.toString()
  );

  await project.save();

  // TODO: notify other members

  res.json(new ApiResponse(200, "You left the project successfully", project));
});

module.exports = {
  createProjectHandler,
  getMyProjects,
  getProjectDetails,
  updateProjectDetailsHandler,
  archiveProjectHandler,
  approvePendingArchiveRequestHandler,
  rejectPendingArchiveRequestHandler,
  makeAdminHandler,
  removeAdminHandler,
  approvePendingAdminRemovalHandler,
  rejectPendingAdminRemovalHandler,
  adminRemoveMemberHandler,
  memberLeavingProjectHandler,
};
