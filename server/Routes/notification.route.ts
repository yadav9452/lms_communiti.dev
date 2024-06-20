import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getAllNotificationsAdmin } from "../controllers/notification.controller";

const notificationRoute = express.Router();

notificationRoute.get(
  "/get-all-notifications",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllNotificationsAdmin
);
export default notificationRoute;
