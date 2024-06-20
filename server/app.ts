import express, { NextFunction, Request, Response } from "express";
require("dotenv").config();
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
import errorMiddleware from "./middleware/errorMiddleware";
import userRouter from "./Routes/user.route";
import courseRouter from "./Routes/course.route";
import orderRouter from "./Routes/order.route";
import notificationRoute from "./Routes/notification.route";
// body pareser
app.use(express.json({ limit: "50mb" }));

// cookie parser
app.use(cookieParser());

// cors
app.use(
  cors({
    origin: process.env.ORIGIN,
  })
);

app.use("/api/v1", userRouter, courseRouter, orderRouter, notificationRoute);

// testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "test api",
  });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Routes ${req.originalUrl} not found`) as any;
  err.statusCode = 404;
  next(err);
});

app.use(errorMiddleware);
