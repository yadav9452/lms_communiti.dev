import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  editCourses,
  getAllCourseWithoutPurchasing,
  getSingleCourseWithoutPurchasing,
  uploadCourses,
} from "../controllers/course.controller";

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

export default courseRouter;
