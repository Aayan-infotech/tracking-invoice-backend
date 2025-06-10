import { validateSchema } from "../utils/validationHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validateRequest = (schema) =>
  asyncHandler(async (req, res, next) => {
    const errors = await validateSchema(schema, req.body);
    if (errors) {
      throw new ApiError(400, errors);
    }
    next();
  });

export { validateRequest };
