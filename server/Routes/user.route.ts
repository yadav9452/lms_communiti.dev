import express from "express";
import {
  SocialAuth,
  UpdateUserInfo,
  activateUser,
  deleteUserByAdmin,
  getAllUsersAnalytics,
  getUserInfo,
  loginUser,
  logoutUser,
  registrationUser,
  updateAccessToken,
  updateUserAvatar,
  updateUserPassword,
  updateUserRoleByAdmin,
} from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const userRouter = express.Router();

userRouter.post("/register", registrationUser);

userRouter.post("/activate-user", activateUser);

userRouter.post("/login-user", loginUser);

// userRouter.get("/logout", isAuthenticated, authorizeRoles("admin"), logoutUser);

userRouter.get("/logout", isAuthenticated, logoutUser);

userRouter.get("/refreshtoken", updateAccessToken);

userRouter.get("/me", isAuthenticated, getUserInfo);

userRouter.post("/social-auth", SocialAuth);

userRouter.put("/update-user-info", isAuthenticated, UpdateUserInfo);

userRouter.put("/update-user-password", isAuthenticated, updateUserPassword);

userRouter.put("/update-user-avatar", isAuthenticated, updateUserAvatar);
userRouter.get(
  "/get-all-users",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllUsersAnalytics
);

userRouter.put(
  "/update-user-role",
  isAuthenticated,
  authorizeRoles("admin"),
  updateUserRoleByAdmin
);
userRouter.delete(
  "/delete-user-by-admin/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteUserByAdmin
);

export default userRouter;
