const express=require("express");
const commentRouter=express.Router;


// POST /tasks/:taskId/comments → Add a comment on a task



// GET /tasks/:taskId/comments → Get all comments for a task (with timestamps + user info



// PATCH tasks/:taskId/comments/:commentId → Edit comment



// DELETE /comments/:id → Delete a comment (only owner/admin can

module.exports={
    commentRouter
}