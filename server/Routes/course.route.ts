import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  addAnswerToCourseData,
  addQuestionToCourseData,
  addReplyToReview,
  addReviewDataToCourse,
  editCourses,
  getAllCourseWithoutPurchasing,
  getAllCoursesAnalytics,
  getCourseContentByUser,
  getSingleCourseWithoutPurchasing,
  uploadCourses,
} from "../controllers/course.controller";
import { updateUserRoleByAdmin } from "../controllers/user.controller";

const courseRouter = express.Router();
// create a new course
courseRouter.post(
  "/create-course",
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourses
);
// create a existing course
courseRouter.put(
  "/edit-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  editCourses
);
// get the single course without purchasing
courseRouter.get("/get-course/:id", getSingleCourseWithoutPurchasing);

// get all the  course without purchasing
courseRouter.get("/get-courses", getAllCourseWithoutPurchasing);
courseRouter.get(
  "/get-course-content/:id",
  isAuthenticated,
  getCourseContentByUser
);
courseRouter.put("/add-question", isAuthenticated, addQuestionToCourseData);
courseRouter.put("/add-answer", isAuthenticated, addAnswerToCourseData);
courseRouter.put("/add-review/:id", isAuthenticated, addReviewDataToCourse);
courseRouter.put(
  "/add-reply-to-review",
  isAuthenticated,
  authorizeRoles("admin"),
  addReplyToReview
);
courseRouter.get(
  "/get-all-courses",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllCoursesAnalytics
);

export default courseRouter;
