const express=require("express");
const { verifyAccess } = require("../middlewares/auth");
const { validate } = require("../utils/validateSchema");
const { createTaskHandler, getTasksHandler, getTaskDetailsHandler, deleteTaskHandler, updateTaskHandler, addMemberToTaskHandler, removeMemberFromTaskHandler } = require("../controllers/task/taskController");
const { createTaskSchema } = require("../validations/taskValidation");
const { getUploadUrlHandler, changeUploadStatusHandler, linkSubmissionHandler, getDownloadUrlHandler } = require("../controllers/task/taskSubmissions");
const taskRouter=express.Router;


// post projects/:projectID/tasks/create - create tasks ------  only admins
taskRouter.post("/create",verifyAccess,validate(createTaskSchema),createTaskHandler)

// GET /projects/:projectId/tasks → Get all tasks of a project--- both admin and members 
taskRouter.get("/tasks",verifyAccess,getTasksHandler);

// GET /projects/:projectId/tasks/:taskId → Get details of a specific task
taskRouter.get("/task",verifyAccess,getTaskDetailsHandler)


// PUT /projects/:projectId/tasks/:taskId → Update task (title, description, status, priority, deadline) ---  only admins
taskRouter.put("/:taskId",verifyAccess,validate(updateTaskHandler),updateTaskHandler);


//POST /projects/:projectId/tasks/:taskId/assign               ---- for assigning  new members to task
taskRouter.post("/:taskId/assign",verifyAccess,addMemberToTaskHandler)

//POST /projects/:projectId/tasks/:taskId/remove               ---- for removing member from a task
taskRouter.post("/:taskId/remove",verifyAccess,removeMemberFromTaskHandler)

// DELETE /projects/:projectId/tasks/:taskId → Delete a task -- only admins
taskRouter.delete("/:taskId",verifyAccess,deleteTaskHandler)



// ------------------------------------------------------------submissions

// GET /projects/:projectId/tasks/:taskId/generate-upload-url  -->
taskRouter.get("/:taskId/generate-upload-url",verifyAccess,getUploadUrlHandler)

// PATCH /projects/:projectId/tasks/:taskId/change-upload-status --> change uplolad status
taskRouter.post(":taskId/change-upload-status",verifyAccess,changeUploadStatusHandler)

// POST /projects/:projectId/tasks/:taskId/submit ---->  Add submission (for links, not files)
taskRouter.post(":taskId/submit",verifyAccess,linkSubmissionHandler);

// /projects/:projectId/tasks/:taskId/submissions  --> Get all submissions for a task -----> admin only
taskRouter.get("/:taskId/submissions",verifyAccess,)

// GET /api/projects/:projectId/tasks/:taskId/submissions/:submissionId/download
taskRouter.get("/:taskId/submissions/:submissionId/download",verifyAccess,  getDownloadUrlHandler)

// /projects/:projectId/tasks/:taskId/submissions/:submissionId -> Delete a submission 


module.exports={
    taskRouter
}