import { NextFunction, Request, Response } from "express";
import cloudinary from "cloudinary";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import { createCourse } from "../services/course.service";
import ErrorHandler from "../utlis/errorHandler";
import CourseModel from "../models/course.model";
import { redis } from "../utlis/redis";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import sendMail from "../utlis/sendMail";
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

// add question to the courses
interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}
export const addQuestionToCourseData = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId }: IAddQuestionData = req.body;
      // Validate the courseId and contentId
      if (
        !mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(contentId)
      ) {
        return next(new ErrorHandler("Invalid course ID or content ID", 400));
      }

      // Find the course by ID
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new ErrorHandler("invalid content Id", 500));
      }
      //  create a new question object

      const newQuestion: any = {
        user: req.user,
        question: question,
        questionReplies: [],
      };

      // add this question to our course content
      courseContent.questions.push(newQuestion);

      // save the updated course
      await course?.save();

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

// add answer to the answer list
export const addAnswerToCourseData = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, courseId, contentId, questionId }: IAddAnswerData =
        req.body;

      // Validate IDs
      if (
        !mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(contentId) ||
        !mongoose.Types.ObjectId.isValid(questionId)
      ) {
        return next(new ErrorHandler("Invalid ID(s)", 400));
      }

      // Find the course by ID
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      // Find the content by ID
      const courseContent = course?.courseData.find((item: any) =>
        item._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new ErrorHandler("Content not found", 404));
      }

      // Find the question by ID
      const question = courseContent?.questions?.find((question: any) =>
        question._id.equals(questionId)
      );
      if (!question) {
        return next(new ErrorHandler("Question not found", 404));
      }
      // Ensure commentReplies is initialized
      if (!question.questionReplies) {
        question.questionReplies = [];
      }

      // Create a new answer object
      const newAnswer: any = {
        user: req.user,
        answer,
      };

      // Add the new answer to the question's replies
      question?.questionReplies.push(newAnswer);

      // Save the updated course
      await course?.save();

      if (req.user?._id === question.user._id) {
        // create a notification
      } else {
        const data = {
          name: question?.user.name,
          title: courseContent?.title,
        };
        console.log(data);
        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/question-reply.ejs"),
          data
        );
        try {
          await sendMail({
            email: question?.user.email,
            subject: "Question Reply ",
            template: "question-reply.ejs",
            data,
          });
          console.log("mail sent successfully");
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 500));
        }
      }
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add review in course

interface IAddReviewData {
  review: string;
  rating: number;
  userId: string;
}

export const addReviewDataToCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req?.user?.courses;
      const courseId = req.params.id;
      // check if courseId already exists in userCourseList based on _id
      const courseExists = userCourseList?.some(
        (course: any) => course._id.toString() === courseId.toString()
      );

      if (courseExists) {
        return next(
          new ErrorHandler("You are not accessible to this course.", 404)
        );
      }
      const course = await CourseModel.findById(courseId);
      // sent data to server
      const { review, rating } = req.body as IAddReviewData;

      const reviewData: any = {
        user: req.user,
        rating,
        comment: review,
      };

      course?.reviews.push(reviewData);

      let avg = 0;
      course?.reviews.forEach((review: any) => {
        avg += Number(review?.rating);
      });

      if (course) {
        course.rating = avg / course.reviews.length;
      }
      await course?.save();
      const notification = {
        title: "New Review Added",
        message: `${req.user?.name} has given a review in ${course?.name}`,
      };
      // create notification

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add reply in review (like admin can reply to user's review )

interface IAddReplyToReviewData {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReplyToReviewData;

      const course = await CourseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler(`Course not found`, 404));
      }

      const review = course?.reviews?.find(
        (review: any) => review._id.toString() === reviewId
      );

      if (!review) {
        return next(new ErrorHandler(`Review not found`, 404));
      }
      const replyData: any = {
        user: req.user,
        comment,
      };

      if (!review.commentReplies) {
        review.commentReplies = [];
      }
      review.commentReplies?.push(replyData);

      await course?.save();

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
