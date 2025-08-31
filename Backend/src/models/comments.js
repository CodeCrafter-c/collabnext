// comment.model.js
const mongoose=require("mongoose");
const {User}=require("User");
const {Task}=require("Task")

const commentSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true }); 

 const Comment = mongoose.model("Comment", commentSchema);

 module.exports={
    Comment
 }
