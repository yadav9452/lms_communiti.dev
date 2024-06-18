import { NextFunction, Request, Response } from "express";
import cloudinary from "cloudinary";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import { createCourse } from "../services/course.service";
import ErrorHandler from "../utlis/errorHandler";
import CourseModel from "../models/course.model";
import { redis } from "../utlis/redis";
// upload new courses
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

// edit existing courses
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

// get the single course  -- without purchasing
export const getSingleCourseWithoutPurchasing = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const cachedData = await redis.get(`courseId: ${courseId}`);

      // Check if cached data exists and is valid
      if (cachedData) {
        console.log("hitting redis");
        const singleCourse = JSON.parse(cachedData);
        res.status(200).json({
          success: true,
          singleCourse,
        });
      } else {
        const course = await CourseModel.findById(courseId).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );
        console.log("hitting mongoDB");
        await redis.set(`courseId: ${courseId}`, JSON.stringify(course));
        res.status(200).json({
          success: true,
          course,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get all the courses -- without purchasing
export const getAllCourseWithoutPurchasing = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCachedExist = await redis.get("allCourses");
      if (isCachedExist) {
        console.log("hitting redis");
        const courses = JSON.parse(isCachedExist);
        res.status(200).json({
          success: true,
          courses,
        });
      } else {
        const courses = await CourseModel.find().select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );
        console.log("hitting mongoDb");
        await redis.set("allCourses", JSON.stringify(courses));
        res.status(200).json({
          success: true,
          courses,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get Course Content--> only for the valid user
export const getCourseContentByUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      const courseExists = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );

      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      const course = await CourseModel.findById(courseId);

      const courseContent = course?.courseData;

      res.status(200).json({
        success: true,
        courseContent,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
