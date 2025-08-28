const {z}=require("zod")
const forgetPasswordValidationSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
});

const changePasswordValidationSchema = z
  .object({
    oldPassword: z.string().trim().min(6, "Password must be at least 6 characters long"),
    newPassword: z.string().trim().min(6, "Password must be at least 6 characters long"),
    confirmNewPassword: z.string().trim().min(6, "Password must be at least 6 characters long"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"], // points error to confirmNewPassword
  });

module.exports={
    forgetPasswordValidationSchema,
    changePasswordValidationSchema
}