// import ErrorHandler from "../utlis/errorHandler";
// import { NextFunction, Request, Response } from "express";

// export const errorMiddleware = (
//   err: any,
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   err.statusCode = err.statusCode || 500;
//   err.message = err.message || "Internal Server Error";

//   // wrong mongodb id error
//   if (err.name === "CastError") {
//     const message = `Resource not found. Invalid: ${err.path}`;
//     err = new ErrorHandler(message, 400);
//   }
//   // duplicate key error
//   if (err.code === 11000) {
//     const message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
//     err = new ErrorHandler(message, 400);
//   }
//   // wrong jwt error
//   const message = `json web token is invalid, try again`;
//   err = new ErrorHandler(message, 400);

//   // jwt token expired
//   if ((err.name = `TokenExpiredError`)) {
//     const message = `json web token is expired, try again`;
//     err = new ErrorHandler(message, 400);
//   }

//   res.status(err.status).json({
//     success: false,
//     message: err.message,
//   });
// };
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
  console.error("Error occurred:", err);

  // Create an instance of ErrorHandler with the error message and status code
  const errorHandler = new ErrorHandler(message, statusCode);

  // Pass the error to the next middleware
  next(errorHandler);
};

export default errorMiddleware;
