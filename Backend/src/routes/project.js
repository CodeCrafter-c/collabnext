const express=require("express");
const { verifyAccess } = require("../middlewares/auth");
const { createProjectHandler, getMyProjects, getProjectDetails, updateProjectDetailsHandler, archiveProjectHandler,  makeAdminHandler, removeAdminHandler, rejectPendingArchiveRequestHandler, approvePendingArchiveRequestHandler } = require("../controllers/projectController");
const { validate } = require("uuid");
const { createProjectSchema, updateProjectDetailsSchema } = require("../validations/projectValidation");
const projectRouter=express.Router;


// post project - create project
projectRouter.post("/create",verifyAccess,validate(createProjectSchema),createProjectHandler)

// get project - all projects of the logged in user -- with clear segergations ( admin / member ) projects
projectRouter.get("/all",verifyAccess,getMyProjects)

// get project/:id  details about spcific project
projectRouter.get("/:id",verifyAccess,getProjectDetails)

// PUT /projects/:id → Update project details (title, description, deadline.)-- only admins
projectRouter.put("/:id",verifyAccess,validate(updateProjectDetailsSchema),updateProjectDetailsHandler);

//  DELETE /projects/:id → Delete a project ---  only admins
projectRouter.delete(":/id/archive",verifyAccess,archiveProjectHandler)


// POST /projects/:id/archive/approve → other admins approve --- only admins
projectRouter.post("/:id/archive/approve",verifyAccess,approvePendingArchiveRequestHandler)


// POST /projects/:id/archive/reject → reject request --- only admin
projectRouter.post("/:id/archive/reject",verifyAccess,rejectPendingArchiveRequestHandler)


// POST /projects/:Id/admins → add admin --- only admin
projectRouter.post("/:id/add/admin/:userId",verifyAccess,makeAdminHandler)


// patch /projects/:projectId/admins/:userId → remove admin
projectRouter.patch("/:id/admin/:userId",verifyAccess,removeAdminHandler)


// POST /projects/:id/adminRemoval/approve → other admins approve --- only admins
projectRouter.post(":/id/adminRemoval/approve/adminId",verifyAccess,approvePendingArchiveRequestHandler) 


// POST /projects/:id/adminRemoval/reject → reject request --- only admin
projectRouter.post("/:id/adminRemoval/reject/:adminId",verifyAccess,rejectPendingArchiveRequestHandler)


// Remove Member (DELETE /projects/:id/members/:userId) --- only admin



// POST /projects/:id/invite --- only admin



//Accept Invite (POST /projects/invite/:token/accept)



// Decline Invite (POST /projects/invite/:token/decline)




// POST /projects/:id/leave-- Member leaves project (not for admins).



//  GET /projects/:id/members → List all members + pending invites



module.exports={
    projectRouter
}