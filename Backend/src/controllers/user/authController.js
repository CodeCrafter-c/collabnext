const { zod, hash, parseAsync } = require("zod");

const { User } = require("../../models/user");
const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/apiError");
const { createAcessToken, createRefreshToken, verifyRefreshToken } = require("../../utils/tokens/tokens");
const { ApiResponse } = require("../../utils/apiResponse");
const { issueTokens } = require("../../utils/tokens/issuetoken");
const { RefreshToken } = require("../../models/refreshTokens");
const { refreshCookieOption, acessCookieOption } = require("../../utils/cookieOptions");




const registerRouteHandler = asyncHandler(async (req, res, next) => {
  const { email, firstname, lastname, password, deviceId } = req.body;

  const alreadyExists = await User.findOne({ email });
  if (alreadyExists) throw new ApiError(400, "Email already exists");

  // TODO: Generate OTP and send


  // TODO: Verify OTP

  const user = new User({ firstname, lastname, email,password});
  const savedUser = await user.save();

  await issueTokens(savedUser,req,res,deviceId)
  
  res.json(new ApiResponse(200, "Registration successful",savedUser));
  });


const loginRouteHandler=asyncHandler(async(req,res,next)=>{
  const {email,password,deviceId}=req.body;

  const user= await User.findOne({email});
  if(!user || !user.comparePassword(password)){
    throw new  ApiError(401,"Invalid Credentials")    
  }

  await issueTokens(user,req,res,deviceId)
  res.json(new ApiResponse(200, "login successful"));
})


const refreshRouteHandler = asyncHandler(async (req, res, next) => {
  const rawToken = req.cookies?.rt;
  if (!rawToken) {
    throw new ApiError(401, "Invalid Refresh Token");
  }

  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch (err) {
    res.clearCookie("rt", refreshCookieOption);
    res.clearCookie("at", accessCookieOption);
    throw new ApiError(401, "Invalid Refresh Token");
  }

  const { jti, _id: userId } = payload;

  const record = await RefreshToken.findOne({ jti, user: userId });

  if (!record) {
    // possible reuse — nuke all refresh tokens for this user
    await RefreshToken.deleteMany({ user: userId });
    res.clearCookie("rt", refreshCookieOption);
    res.clearCookie("at", accessCookieOption);
    throw new ApiError(401, "Reuse of token detected");
  }

  // token is valid → remove old, rotate new
  await record.deleteOne();

  
  const tokens = await issueTokens(userId, req, res, next);

  return res.json(new ApiResponse(200, "Tokens rotated", tokens));
});


const logoutRouteHandler=asyncHandler(async(req,res,next)=>{
  const rawToken=req.cookies.rt;
  if(rawToken){
    try{
      const payload=verifyRefreshToken(rawToken);
      await RefreshToken.deleteOne({jti:payload.jti,user:payload._id})

    }catch(err){
      // if token invalid delete every token for that user
      await RefreshToken.deleteMany({user:req.user._id})
    }
  }

  res.clearCookie("rt",refreshCookieOption);
  res.clearCookie("at",acessCookieOption);
  return res.json(new ApiResponse(200, "Logged out successfully"));
})




module.exports={
  registerRouteHandler,
  loginRouteHandler ,
  refreshRouteHandler,
  logoutRouteHandler, 
}