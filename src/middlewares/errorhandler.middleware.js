import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      message: err.message,
      success: err.success,
      data: null,
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      statusCode: 400,
      message: "You are sending more files than expected",
      success: false,
      data: null,
    });
  }
  res.status(err.statusCode || 500).json({
    statusCode: err.statusCode || 500,
    message: err.message || "Internal server error",
    success: false,
    data: null,
  });
};

export default errorHandler;
