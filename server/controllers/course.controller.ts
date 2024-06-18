import { NextFunction, Request, Response } from "express";
import cloudinary from "cloudinary";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import { createCourse } from "../services/course.service";
import ErrorHandler from "../utlis/errorHandler";
import CourseModel from "../models/course.model";

// upload courses
export const uploadCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail.url, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      await createCourse(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);


// edit courses
export const editCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const data = req.body;
      const thumbnail = data.thumbnail;

      if (thumbnail) {
        // Find the existing course to get the current thumbnail's public_id
        const existingCourse = await CourseModel.findById(courseId);
        if (!existingCourse) {
          return next(new ErrorHandler("Course not found", 404));
        }

        // Destroy the old thumbnail if it exists
        if (existingCourse?.thumbnail?.public_id) {
          await cloudinary.v2.uploader.destroy(
            existingCourse?.thumbnail?.public_id
          );
        }

        // Upload the new thumbnail
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail.url, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      // Update the course with the new data
      const updatedCourse = await CourseModel.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        course: updatedCourse,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
