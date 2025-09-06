const { z } = require("zod");

const createInviteBeforeProjectSchema = z.object({
  user: z.string().trim().min(1, "User ID is required"),
  status: z.enum(["pending", "accepted", "rejected"]).optional(), // default to "pending"
});

const createInviteAfterProjectSchema = z.object({
  project: z.string().trim().min(1, "Project ID is required"),
  user: z.string().trim().min(1, "User ID is required"),
  status: z.enum(["pending", "accepted", "rejected"]).optional(), // defaults to "pending"
});

const createProjectSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name must be at most 100 characters"),

  projectDescription: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional(),
  deadline: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return date.getTime() > Date.now();
      },
      { message: "Deadline must be in the future" }
    ),
  pendingInvites: z.array(createInviteBeforeProjectSchema).optional(),
});

const updateProjectDetailsSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name must be at most 100 characters")
    .optional(),

  projectDescription: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be at most 500 characters")
    .optional(),

  deadline: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return date.getTime() > Date.now();
      },
      { message: "Deadline must be in the future" }
    ),
});

module.exports = {
  createProjectSchema,
  createInviteBeforeProjectSchema,
  createInviteAfterProjectSchema,
  updateProjectDetailsSchema,
};
