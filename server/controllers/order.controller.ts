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
import { newOrderService } from "../services/order.service";
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
        }
        user?.courses.push(course?._id);
        await user?.save();

        await NotificationModel.create({
          user: user?.id,
          title: "New order confirmation",
          message: `you have a new order confirmation from ${course?._id}`,
        });

        course.purchased ? (course.purchased += 1) : course.purchased;
        await course?.save();

        newOrderService(data, res, next);
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 404));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
