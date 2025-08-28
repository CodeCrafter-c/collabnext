const express = require("express");
const { validate } = require("../utils/validateSchema");
const {
  regitserValidaitonSchema,
  loginValidationSchema,
} = require("../validations/auth.validation");
const {
  registerRouteHandler,
  refreshRouteHandler,
  logoutRouteHandler,
  loginRouteHandler,
} = require("../controllers/user/authController");
const { verifyAccess } = require("../middlewares/auth");
const { meRouteHandler } = require("../controllers/user/profileController");
const {
  changePasswordHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} = require("../controllers/user/passwordController");

const UserRouter = express.Router();

//------------------------------- routes
UserRouter.post(
  "/register",
  validate(regitserValidaitonSchema),
  registerRouteHandler
);

UserRouter.post("/login", validate(loginValidationSchema), loginRouteHandler);

UserRouter.post("/refresh", refreshRouteHandler);

UserRouter.post("/logout", verifyAccess, logoutRouteHandler);

UserRouter.patch("/changePassword", verifyAccess, changePasswordHandler);

UserRouter.post("/forgotPassword", forgotPasswordHandler);

UserRouter.patch("/resetPassword", resetPasswordHandler);

UserRouter.get("/me", verifyAccess, meRouteHandler);

module.exports = {
  UserRouter,
};
