import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { editCourses, uploadCourses } from "../controllers/course.controller";

const courseRouter = express.Router();
courseRouter.post(
  "/create-course",
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourses
);
courseRouter.put(
  "/edit-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  editCourses
);

export default courseRouter;
