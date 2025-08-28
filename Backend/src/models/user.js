const mongoose=require("mongoose")
const bcrypt=require("bcrypt");

const userSchema= mongoose.Schema({
    firstname:{
        type:String,
        required:true,
        trim:true
    },
    lastname:{
        type:String,
        default:"",
        trim:true
    },
    email:{
        type:String,
        trim:true,
        lowercase:true,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true,
        trim:true,
        select:false
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
},{
    timestamps:true,
})


// password hashing middleware before saving 
// password hashing middleware before saving 
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next(); // skip if password not changed
    }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// instance method to compare password on login
userSchema.methods.comparePassword = async function (userInputPassword) {
    return await bcrypt.compare(userInputPassword, this.password);
};



const User=mongoose.model("User",userSchema);

module.exports={
    User
}