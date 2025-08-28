// utils/issueTokens.js
const { createAcessToken, createRefreshToken } = require("./tokens");
const { hashToken } = require("./hashToken");
const { RefreshToken } = require("../../models/refreshTokens");
const { acessCookieOption, refreshCookieOption } = require("../cookieOptions");

async function issueTokens(user, req, res, deviceId) {
  // 1. Create tokens
  const accessToken = createAcessToken({ _id: user._id });
  const { token, jti } = createRefreshToken({ _id: user._id });

  // 2. Save refresh token in DB
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + refreshCookieOption.maxAge);

  const refToken = new RefreshToken({
    user: user._id,
    jti,
    deviceId,
    tokenHash,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    expiresAt,
  });
  await refToken.save();

  // 3. Set cookies
  res.cookie("at", accessToken, acessCookieOption);
  res.cookie("rt", token, refreshCookieOption);

  return { accessToken, refreshToken: token };
}

module.exports = { issueTokens };
