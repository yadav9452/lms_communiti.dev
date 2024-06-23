import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getCourses12MonthsAnalytics,
  getOrders12MonthsAnalytics,
  getUsers12MonthsAnalytics,
} from "../controllers/analytics.controller";

const analyticsRouter = express.Router();

// 12 months users analytics
analyticsRouter.get(
  "/get-12months-users-analytics",
  isAuthenticated,
  authorizeRoles("admin"),
  getUsers12MonthsAnalytics
);
// 12 months courses analytics
analyticsRouter.get(
  "/get-12months-courses-analytics",
  isAuthenticated,
  authorizeRoles("admin"),
  getCourses12MonthsAnalytics
);

// 12 months orders analytics
analyticsRouter.get(
  "/get-12months-orders-analytics",
  isAuthenticated,
  authorizeRoles("admin"),
  getOrders12MonthsAnalytics
);

export default analyticsRouter;
