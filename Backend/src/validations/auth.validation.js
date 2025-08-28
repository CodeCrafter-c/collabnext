const { z } = require("zod");

//RegisterSchema
const regitserValidaitonSchema=z.object({
    firstname:z.string().trim().min(2,"first name must be at least 2 characters long"),
    lastname:z.string().trim().min(2,"last name must be at least 2 characters long"),
    email:z.string().trim().email("Invalid email format"),
    password:z.string().min(6,"Password must be atleast 6 characters long"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


const loginValidationSchema=z.object({
    email:z.string().trim().email("Invalid email format"),
    password:z.string().min(6,"Password must be atleast 6 character long")
})



module.exports={
    regitserValidaitonSchema,
    loginValidationSchema
}