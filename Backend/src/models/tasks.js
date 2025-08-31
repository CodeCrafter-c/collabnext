const mongoose=require("mongoose");
const { Project } = require("./projects");
const { User } = require("./user");



const taskSchema=({
    title:{
        type:String,
        required:true,
        trim:true
    },
    description:{
        type:String,
        trim:true,
    },
    status:{
        type: String,
        enum: ["not started", "in progress", "completed", "blocked"],
        default: "not started"
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },
    deadLine:{
        type:Date,
    },
    project:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Project",
        required:true
    },
    AssignedTO:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ],
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
},{
    timestamps:true
})

const Task=mongoose.model("Task",taskSchema);

module.exports={
    Task
}