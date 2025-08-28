const { ZodError } = require("zod");

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body); // validate body
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return next({
        statusCode: 400,
        message: "Validation failed",
        errors: err.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    next(err); // any other error
  }
};





module.exports={
    validate
}