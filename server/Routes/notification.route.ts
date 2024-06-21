import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getAllNotificationsAdmin,
  updateNotificationsAdmin,
} from "../controllers/notification.controller";

const notificationRoute = express.Router();

notificationRoute.get(
  "/get-all-notifications",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllNotificationsAdmin
);
notificationRoute.put(
  "/update-notifications/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  updateNotificationsAdmin
);
// notificationRoute.get(
//   "/get-all-notifications",
//   isAuthenticated,
//   authorizeRoles("admin")
// );
export default notificationRoute;
