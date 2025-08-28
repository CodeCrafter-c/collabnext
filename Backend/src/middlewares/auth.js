const { RefreshToken } = require("../models/refreshTokens");
const { User } = require("../models/user");
const { ApiError } = require("../utils/apiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { acessCookieOption } = require("../utils/cookieOptions");
const {
  verifyAccessToken,
  verifyRefreshToken,
  createAcessToken,
} = require("../utils/tokens/tokens");

const verifyAccess = asyncHandler(async function (req, res, next) {
  const token = req.cookies.at;
  if (!token) {
    throw new ApiError(401, "Access Token Missing");
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = { _id: payload._id }; // add role later if needed
    
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      const reftoken = req.cookies.rt;
      if (!reftoken) {
        throw new ApiError(401, "Access expired and no refresh token");
      }

      let refreshPayload;
      try {
        refreshPayload = verifyRefreshToken(reftoken);
      } catch (err) {
        res.clearCookie("rt", refreshCookieOption);
        res.clearCookie("at", acessCookieOption);
        throw new ApiError(401, "Access expired, refresh token invalid");
      }

      const { jti, _id: userId } = refreshPayload;

      const user = await User.findById(userId);
      if (!user) {
        res.clearCookie("rt", refreshCookieOption);
        res.clearCookie("at", acessCookieOption);
        throw new ApiError(401, "User not found");
      }

      const storedToken = await RefreshToken.findOne({ jti, user: userId });
      if (!storedToken) {
        // 🚨 Possible reuse attempt
        await RefreshToken.deleteMany({ user: userId });
        res.clearCookie("rt", refreshCookieOption);
        res.clearCookie("at", acessCookieOption);
        throw new ApiError(401, "Refresh token invalid or expired");
      }

      const accessToken = createAcessToken({ _id: userId });
      res.cookie("at", accessToken, acessCookieOption);
      req.user = { _id: userId };
      return next();
    }
  }
});

module.exports = { verifyAccess };
