const { z } = require("zod");


const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Task title must be at least 3 characters")
    .max(100, "Title must be at most 100 characters"),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be at most 500 characters")
    .optional(),

  deadline: z
    .preprocess((val) => (val ? new Date(val) : undefined), z.date().optional())
    .refine((date) => !date || date.getTime() > Date.now(), {
      message: "Deadline must be in the future",
    }),

  AssignedTo: z
    .array(z.string().trim())
    .optional()
});




module.exports={
    createTaskSchema,
}