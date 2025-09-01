const express=require("express");
const { verifyAccess } = require("../middlewares/auth");
const { createProjectHandler, getMyProjects } = require("../controllers/projectController");
const { validate } = require("uuid");
const { createProjectSchema } = require("../validations/projectValidation");
const projectRouter=express.Router;


// post project - create project
projectRouter.post("/create",verifyAccess,validate(createProjectSchema),createProjectHandler)


// get project - all projects of the logged in user -- with clear segergations ( admin / member ) projects
projectRouter.get("/all",verifyAccess,getMyProjects)


// get project/:id  details about spcific project



// PUT /projects/:id → Update project details (title, description, etc.)-- only admins



//  DELETE /projects/:id → Delete a project ---  only admins



// Remove Member (DELETE /projects/:id/members/:userId)



// POST /projects/:id/invite



//Accept Invite (POST /projects/invite/:token/accept)



// Decline Invite (POST /projects/invite/:token/decline)




// POST /projects/:id/leave-- Member leaves project (not for admins).



//  GET /projects/:id/members → List all members + pending invites

module.exports={
    projectRouter
}