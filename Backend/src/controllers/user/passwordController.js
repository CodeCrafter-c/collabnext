const { $ZodCheckGreaterThan } = require("zod/v4/core");
const { User } = require("../../models/user");
const { ApiError } = require("../../utils/apiError");
const { ApiResponse } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const { createResetPasswordToken } = require("../../utils/tokens/tokens");
const crypto = require("crypto");

const changePasswordHandler = asyncHandler(async function (req, res, next) {
  const { oldPassword, newPassword, confirmNewPassword } = req.body;
  const userId = req?.user?._id;

  // check if user exist with such ID
  const user = await User.findOne({ _id: userId });
  if (!user) {
    throw new ApiError(401, "Invalid User");
  }
  // compare old password with the stored password hash
  const isPasswordCorrect = await user.comparePassword(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect Password");
  }

  // compare newPassword and confirmnewPassword
  if (!(newPassword === confirmNewPassword)) {
    throw new ApiError(400, "Passwords do not match");
  }

  // compare oldpassword and new password
  if (newPassword === oldPassword) {
    throw new ApiError(400, "new password must not be same as old password");
  }

  // store new password
  user.password = newPassword;
  const storedUserwithUpdatedPassword = await user.save();

  // return response
  res.json(
    new ApiResponse(
      200,
      "password changed successfully",
      storedUserwithUpdatedPassword
    )
  );
});

const forgotPasswordHandler = asyncHandler(async function (req, res, next) {
  const { email } = req?.body;

  // check email exists;
  if (!email) {
    throw new ApiError(401, "Please Provide Email");
  }

  //   check if user with that email exists
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "invalid Email");
  }

  // create a token
  const resetToken = createResetPasswordToken();

  //   hash token
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // save it to db with expiry
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpiry = Date.now() + 1000 * 60 * 15;
  await user.save();

  // TODO:  send resent token in email to user;
});

const resetPasswordHandler = asyncHandler(async function (req, res, next) {
  const token = req.params.resetToken;
  const { newPassword, confirmNewPassword } = req.body;

  if (!token) {
    throw new ApiError(400, "NO Token");
  }
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError("Token Expired or Invalid");
  }

  // check password
  if (!(newPassword === confirmNewPassword)) {
    throw new ApiError(400, "Passwords do not match");
  }

  // set password
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  // **  Might log the user out of all the devices ;


  res.status(200).json({
    success: true,
    message:
      "Password reset successful. You can now log in with your new password.",
  });
});

module.exports = {
  forgotPasswordHandler,
  changePasswordHandler,
  resetPasswordHandler
};
