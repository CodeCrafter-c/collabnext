const { User } = require("../../models/user");
const { ApiError } = require("../../utils/apiError");
const { ApiResponse } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");

const meRouteHandler=asyncHandler(async function(req,res,next){
    const userId=req?.user?._id;

    if(!userId){
        throw new ApiError (401,"You are not logged in")
    }
    const user= await User.findOne({_id:userId});
    if(!user){
        throw new ApiError(401,"No such user");
    }
    res.json(new ApiResponse(200,"Profile retrieved successfully",{user}))
})

module.exports={
    meRouteHandler
}