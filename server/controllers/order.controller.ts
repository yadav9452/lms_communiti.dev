import { NextFunction, Request, Response } from "express";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utlis/errorHandler";
import OrderModel, { IOrder } from "../models/order.Model";
import UserModel from "../models/user.model";
import CourseModel from "../models/course.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utlis/sendMail";
import NotificationModel from "../models/notification.model";
import {
  getAllOrdersServices,
  newOrderService,
} from "../services/order.service";
import { privateDecrypt } from "crypto";

// create Order

export const createOrder = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;
      const user = await UserModel.findById(req.user?._id);
      const courseExistInUser = user?.courses.some(
        (course: any) => course._id.toString() === courseId
      );

      if (courseExistInUser) {
        return next(
          new ErrorHandler("You already have purchased the course", 400)
        );
      }
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      const data: any = {
        courseId: course._id,
        userId: user?.id,
      };

      const mailData = {
        order: {
          _id: course._id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };
      console.log(mailData);
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        { order: mailData }
      );
      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: "Order confirmation",
            template: "order-confirmation.ejs",
            data: mailData,
          });
          console.log("mail send successful");
        }
        user?.courses.push(course?._id);
        await user?.save();

        await NotificationModel.create({
          user: user?.id,
          title: "New order confirmation",
          message: `you have a new order confirmation from ${course?.name}`,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 404));
      }
      course.purchased ? (course.purchased += 1) : course.purchased;
      await course?.save();
      newOrderService(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get order controller -- only for admin
export const getAllOrdersAnalytics = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getAllOrdersServices(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
