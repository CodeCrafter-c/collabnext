const express=require("express");
const { verifyAccess } = require("../middlewares/auth");
const { validate } = require("../utils/validateSchema");
const { createTaskHandler, getTasksHandler, getTaskDetailsHandler } = require("../controllers/taskController");
const { createTaskSchema } = require("../validations/taskValidation");
const { Project } = require("../models/projects");
const taskRouter=express.Router;


// post projects/:projectID/tasks/create - create tasks ------  only admins
taskRouter.post("/create",verifyAccess,validate(createTaskSchema),createTaskHandler)

// GET /projects/:projectId/tasks → Get all tasks of a project--- both admin and members 
taskRouter.get("/tasks",verifyAccess,getTasksHandler);

// GET /projects/:projectId/tasks/:taskId → Get details of a specific task
taskRouter.get("/task",verifyAccess,getTaskDetailsHandler)


// PUT /projects/:projectId/tasks/:taskId → Update task (title, description, status, priority, deadline, assignedTo) ---  only admins



// DELETE /projects/:projectId/tasks/:taskId → Delete a task -- only admins
taskRouter.delete("/:taskId",verifyAccess,)



// ------------------------------------------------------------submissions

// /projects/:projectId/tasks/:taskId/submit -> Add a submission (link/file) to a task



// /projects/:projectId/tasks/:taskId/submissions  Get all submissions for a task



// /projects/:projectId/tasks/:taskId/submissions/:submissionId -> Delete a submission 
module.exports={
    taskRouter
}