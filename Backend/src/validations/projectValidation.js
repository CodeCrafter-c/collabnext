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
    .min(3, "Project name must be at least 3 characters"),
  projectDescription: z.string().trim().optional(),
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

module.exports = {
  createProjectSchema,
  createInviteBeforeProjectSchema,
  createInviteAfterProjectSchema,
};
