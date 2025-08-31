const mongoose=require("mongoose");
const {User}=require("./user")


const projectSchema=mongoose.Schema({

    projectName:{
        type:String,
        required:true,
        trim:true,
    },
    projectDescription:{
        type:String,
        trim:true,
    },
    deadLine:{
        type:Date,
        required:true
    },

    status:{
        type:String,
        enum:["not started","in progress","completed","on hold"],
        default:"not started"
    },

    admin:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    members:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ],
    progress:{
        type:Number,
        min:0,
        max:100,
        default:0
    }
},{
    timestamps:true
})


const Project=mongoose.model("Project",projectSchema);

module.exports={
    Project
}