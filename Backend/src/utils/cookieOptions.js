const acessCookieOption = {
  httpOnly: true,
  secure: process.env.MODE === "production",
  sameSite: process.env.MODE === "production" ? "None" : "Lax",
  maxAge: (() => {
    const expireTime = process.env.ACCESS_TOKEN_EXPIRY || "15m";
    if (expireTime.endsWith("m")) {
      return Number(expireTime.slice(0, -1)) * 60 * 1000;
    }
    if (expireTime.endsWith("h")) {
      return Number(expireTime.slice(0, -1)) * 60 * 60 * 1000;
    }
    if (expireTime.endsWith("d")) {
      return Number(expireTime.slice(0, -1)) * 24 * 60 * 60 * 1000;
    }
    return 15 * 60 * 1000;
  })(),
};

const refreshCookieOption = {
  httpOnly: true,
  secure: process.env.MODE === "production",
  sameSite: process.env.MODE === "production" ? "None" : "Lax",
  maxAge: (() => {
    const expireTime = process.env.REFRESH_TOKEN_EXPIRY || "7d";
    if (expireTime.endsWith("m"))
      return Number(expireTime.slice(0, -1)) * 60 * 1000;
    if (expireTime.endsWith("h"))
      return Number(expireTime.slice(0, -1)) * 60 * 60 * 1000;
    if (expireTime.endsWith("d"))
      return Number(expireTime.slice(0, -1)) * 24 * 60 * 60 * 1000;
    return 7 * 24 * 60 * 60 * 1000;
  })(),
};

module.exports={
    acessCookieOption,
    refreshCookieOption
}