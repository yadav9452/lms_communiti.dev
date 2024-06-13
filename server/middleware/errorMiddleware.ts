import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utlis/errorHandler";

const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // If the error is a RangeError with undefined status code, set it to 500
  if (
    err instanceof RangeError &&
    err.message === "Invalid status code: undefined"
  ) {
    statusCode = 500;
    message = "Internal Server Error";
  }

  // Log the error for debugging purposes
  console.error("Error occurred:", err.message);

  // Create an instance of ErrorHandler with the error message and status code
  const errorHandler = new ErrorHandler(message, statusCode);

  // Pass the error to the next middleware
  next(errorHandler);
};

export default errorMiddleware;
