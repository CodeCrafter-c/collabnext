const { S3Client } = require("@aws-sdk/client-s3");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/apiError");
const { ApiResponse } = require("../../utils/apiResponse");
const {
  checkProjectExistsAndIsAdmin,
} = require("../../utils/checkprojectexistsAndIsAdmin");
const { Task } = require("../../models/tasks");
const { Max_SIZE_ALLOWED, ALLOWED_TYPES } = require("../../constants");
const { isAllowed } = require("../../utils/fileType");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const getUploadUrlHandler = asyncHandler(async (req, res) => {
  const { taskId, projectId } = req.params;
  const userId = req.user?._id;
  const { fileName, fileType, fileSize } = req.query;

  if (!userId) throw new ApiError(400, "Please login to continue");
  if (!projectId) throw new ApiError(400, "Invalid Project ID");
  if (!taskId) throw new ApiError(400, "Invalid Task ID");

  const { project } = await checkProjectExistsAndIsAdmin(projectId);
  const isMember = project.members.some(
    (id) => id.toString() === userId.toString()
  );
  if (!isMember) throw new ApiError(403, "You are not a project member");

  const task = await Task.findById(taskId);
  if (!task) throw new ApiError(404, "Task not found");

  const isAssignee = task.AssignedTo.some(
    (id) => id.toString() === userId.toString()
  );
  if (!isAssignee) throw new ApiError(403, "You are not assigned to this task");

  if (fileSize && fileSize > Max_SIZE_ALLOWED) {
    throw new ApiError(400, "File too large, max(10MB)");
  }

  if (!isAllowed(fileType)) {
    throw new ApiError(400, `File type '${fileType}' is not allowed`);
  }

  const key = `submissions/${taskId}/user-${userId}/${uuidv4()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
  if (!uploadUrl) throw new ApiError(500, "Failed to generate upload URL");

  task.submissions.push({
    submittedBy: userId,
    type: "file",
    value: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    fileName,
    fileType,
    s3Key: key,
    status: "pending",
  });

  await task.save();

  res.json(
    new ApiResponse(
      200,
      {
        uploadUrl,
        fileUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        key,
      },
      "Upload URL generated successfully"
    )
  );
});

const changeUploadStatusHandler = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { taskId, projectId } = req.params;
  const { s3Key, fileName } = req.body;

  // Basic validations
  if (!userId) throw new ApiError(400, "Please login to continue");
  if (!projectId) throw new ApiError(400, "Invalid Project ID");
  if (!taskId) throw new ApiError(400, "Invalid Task ID");
  if (!s3Key) throw new ApiError(400, "S3 key is required");
  if (!fileName) throw new ApiError(400, "Filename is required");

  // Check project & membership
  const { project } = await checkProjectExistsAndIsAdmin(projectId);
  const isMember = project.members.some(
    (id) => id.toString() === userId.toString()
  );
  if (!isMember) throw new ApiError(403, "You are not a project member");

  // Check task
  const task = await Task.findById(taskId);
  if (!task) throw new ApiError(404, "Task not found");

  // Check assignee
  const isAssignee = task.AssignedTo.some(
    (id) => id.toString() === userId.toString()
  );
  if (!isAssignee) throw new ApiError(403, "You are not assigned to this task");

  // Find matching submission
  const submission = task.submissions.find(
    (s) =>
      s.submittedBy.toString() === userId.toString() &&
      s.s3Key === s3Key &&
      s.fileName === fileName &&
      s.status === "pending"
  );

  if (!submission) {
    throw new ApiError(404, "No pending submission found for this file");
  }

  // Update status
  submission.status = "submitted";
  submission.submittedAt = new Date();
  await task.save();

  return res.json(
    new ApiResponse(200, submission, "File marked as submitted successfully")
  );
});

const linkSubmissionHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const { taskId, projectId } = req.params;
  const { link } = req.body;

  if (!userId) throw new ApiError(400, "Please log in to continue");
  if (!projectId) throw new ApiError(400, "Invalid Project ID");
  if (!taskId) throw new ApiError(400, "Invalid Task ID");
  if (!link || !link.trim()) throw new ApiError(400, "Link is required");

  // Check project + membership
  const { project } = await checkProjectExistsAndIsAdmin(projectId);
  const isMember = project.members.some(
    (id) => id.toString() === userId.toString()
  );
  if (!isMember) throw new ApiError(403, "You are not a project member");

  // Task
  const task = await Task.findById(taskId);
  if (!task) throw new ApiError(404, "Task not found");

  // Assignee
  const isAssignee = task.AssignedTo.some(
    (id) => id.toString() === userId.toString()
  );
  if (!isAssignee) throw new ApiError(403, "You are not assigned to this task");

  // Update submissions
  task.submissions.push({
    submittedBy: userId,
    type: "link",
    value: link,
    submittedAt: new Date(),
    status: "submitted",
  });

  await task.save();

  return res.json(
    new ApiResponse(200, task.submissions, "Link submitted successfully")
  );
});

const getMySubmissionsHandler = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { projectId } = req.params;

  if (!userId) throw new ApiError(400, "Please log in to continue");
  if (!projectId) throw new ApiError(400, "Invalid Project ID");

  // project check
  const { project } = await checkProjectExistsAndIsAdmin(projectId);

  const isMember = project.members.some(
    (id) => id.toString() === userId.toString()
  );
  if (!isMember) throw new ApiError(403, "You are not a project member");

  // aggregate tasks + submissions for this user
  const mySubmissions = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId), // tasks from this project
        "submissions.submittedBy": new mongoose.Types.ObjectId(userId), // tasks where this user submitted
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        submissions: {
          $filter: {
            input: "$submissions",
            as: "submission",
            cond: {
              $eq: [
                "$$submission.submittedBy",
                new mongoose.Types.ObjectId(userId),
              ],
            },
          },
        },
      },
    },
  ]);

  if (!mySubmissions.length) {
    throw new ApiError(404, "No submissions found for this project");
  }

  return res.json(
    new ApiResponse(
      200,
      {
        projectTitle: project.title,
        submissionsByTask: mySubmissions,
      },
      "Fetched my submissions successfully"
    )
  );
});

const getDownloadUrlHandler = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { projectId, taskId, submissionId } = req.params;

  // basic check
  if (!userId) throw new ApiError(400, "Please login to continue");
  if (!projectId) throw new ApiError(400, "Invalid Project ID");
  if (!taskId) throw new ApiError(400, "Invalid Task ID");
  if (!submissionId) throw new ApiError(400, "Invalid Submission ID");

  // project
  const { project } = await checkProjectExistsAndIsAdmin(projectId);

  // check if admin
  const isAdmin = project.admin.some(
    (id) => id.toString() === userId.toString()
  );

  let isMember = false;
  if (!isAdmin) {
    isMember = project.members.some(
      (id) => id.toString() === userId.toString()
    );
  }

  if (!isAdmin && !isMember) {
    throw new ApiError(403, "You are not a member of this project");
  }

  // find task
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw new ApiError(404, "Task not found");

  // find submission
  const submission = task.submissions.id(submissionId);
  if (!submission) throw new ApiError(404, "Submission not found");

  // only allow submitter or admin
  if (
    submission.submittedBy.toString() !== userId.toString() &&
    !isAdmin
  ) {
    throw new ApiError(403, "Not allowed to download this submission");
  }

  // if type: link
  if (submission.type === "link") {
    return res.json(
      new ApiResponse(200, "Link submission",{ url: submission.value })
    );
  }

  // if type: file
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: submission.s3Key,
  });

  const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

  return res.json(
    new ApiResponse(
      200,
      "Download URL generated successfully",
      { downloadUrl, fileName: submission.fileName, fileType: submission.fileType }
    )
  );
});

module.exports = {
  getUploadUrlHandler,
  changeUploadStatusHandler,
  linkSubmissionHandler,
  getDownloadUrlHandler
};
  