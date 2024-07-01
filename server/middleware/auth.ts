import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utlis/errorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utlis/redis";

// authenticated user
export const isAuthenticated = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // access token
    // console.log("Cookies:", req.cookies);
    const access_token = req.cookies.access_token;
    if (!access_token) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }
    // console.log("Access Token:", access_token);
    // decode access token
    const decoded = jwt.verify(
      access_token,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload;

    if (!decoded) {
      return next(new ErrorHandler("access token is not valid", 400));
    }
    // console.log("decoded", decoded);

    const user = await redis.get(decoded?.id);
    // console.log("redis user", user);
    if (!user) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }

    req.user = JSON.parse(user);
    next();
  }
);

// validate user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandler(
          `Role: ${req.user?.role} is not allowed to acces this resourceLimits`,
          403
        )
      );
    }
    next();
  };
};
