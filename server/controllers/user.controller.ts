require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import UserModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utlis/errorHandler";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import path from "path";
import sendMail from "../utlis/sendMail";
import ejs from "ejs";
import cloudinary from "cloudinary";
import * as https from "https";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utlis/jst";
import { redis } from "../utlis/redis";
import {
  getAllUsersService,
  getUserById,
  updateUserRoleByAdminService,
} from "../services/user.service";

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

// registering a new user
export const registrationUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;
      const isEmailExists = await UserModel.findOne({ email });
      // check for existing user
      if (isEmailExists) {
        return next(new ErrorHandler("Email already exist", 400));
      }
      const user: IRegistrationBody = {
        name,
        email,
        password,
      };
      const activationToken = createActivationToken(user);
      console.log(activationToken);
      const activationcode = activationToken.activationCode;
      console.log(activationcode);
      const data = { user: { name: user.name }, activationcode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your mail",
          template: "activation-mail.ejs",
          data,
        });
        res.status(201).json({
          success: true,
          message: `Please cheack your email :${user.email} to activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );
  return { token, activationCode };
};

//activate user

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}
export const activateUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = newUser.user;

      const exitUser = await UserModel.findOne({ email });
      if (exitUser) {
        return next(new ErrorHandler("User already exists", 400));
      }

      const user = await UserModel.create({
        name,
        email,
        password,
      });
      res.status(201).json({
        success: true,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
function next(arg0: ErrorHandler) {
  throw new Error("Function not implemented.");
}

//login user
interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(
          new ErrorHandler("Please enter a valid email and password.", 400)
        );
      }

      const user = await UserModel.findOne({ email }).select("+password");
      if (!user) {
        return next(new ErrorHandler("Invalid User", 400));
      }
      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid Password", 400));
      }
      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//logout user
export const logoutUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Options for clearing cookies
      const cookieOptions = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
      };

      // Clear the cookies
      res.clearCookie("access_token", cookieOptions);
      res.clearCookie("refresh_token", cookieOptions);

      // Delete the user session from Redis
      const userId = req.user?._id || "";
      await redis.del(userId);

      // Send response
      res.status(200).json({
        success: true,
        message: "User logged out",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update access token
export const updateAccessToken = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const message = "Couldn't refresh token";

      if (!decoded) {
        return next(new ErrorHandler(message, 400));
      }

      const session = await redis.get(decoded.id as string);

      if (!session) {
        return next(new ErrorHandler(message, 400));
      }

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user.id },
        process.env.ACCESS_TOKEN as string,
        {
          expiresIn: "5m",
        }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn: "3d",
        }
      );
      req.user = user;
      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      res.status(200).json({ status: "success", accessToken });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get user information
export const getUserInfo = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req?.user?._id;
      console.log(userId);
      getUserById(userId, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
  password: string;
}
// social authentication
export const SocialAuth = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;
      const user = await UserModel.findOne({ email });
      if (!user) {
        const newUser = await UserModel.create({ email, name, avatar });
        sendToken(newUser, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update user information
interface IupdateUserInfo {
  name?: string;
  email?: string;
}

export const UpdateUserInfo = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as ISocialAuthBody;
      const userId = req.user?._id;
      const user = await UserModel.findById(userId);

      if (email && user) {
        const isEmailExist = await UserModel.findOne({ email });
        if (isEmailExist) {
          return next(new ErrorHandler("Email already exists", 400));
        }
        user.email = email;
      }
      if (name && user) {
        user.name = name;
      }
      await user?.save();
      await redis.set(userId, JSON.stringify(user));
      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update user password

interface IUpdateUserPassword {
  oldPassword: string;
  newPassword: string;
}

export const updateUserPassword = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdateUserPassword;
      if (!oldPassword || !newPassword) {
        return next(
          new ErrorHandler("Please enter a old and new password", 400)
        );
      }
      const user = await UserModel.findById(req.user?._id).select("+password");

      if (user?.password === undefined) {
        return next(new ErrorHandler("Invalid user", 400));
      }
      const IsPasswordMatch = await user?.comparePassword(oldPassword);
      if (!IsPasswordMatch) {
        return next(new ErrorHandler("Invalid old password", 400));
      }
      user.password = newPassword;

      await user.save();

      await redis.set(req.user?._id, JSON.stringify(user));

      res.status(201).send({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update profile picture
export const updateUserAvatar = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body;
      const userId = req.user?._id;
      const user = await UserModel.findById(userId);
      if (avatar && user) {
        // if the user have one avatar then call this
        if (user?.avatar?.public_id) {
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);

          const mycloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: mycloud.public_id,
            url: mycloud.secure_url,
          };
        } else {
          const mycloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: mycloud.public_id,
            url: mycloud.secure_url,
          };
        }
      }
      await user?.save();
      await redis.set(userId, JSON.stringify(user));
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get all users - only for the admins

export const getAllUsersAnalytics = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getAllUsersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update user role -- only for the admins
export const updateUserRoleByAdmin = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.body;
      updateUserRoleByAdminService(res, id, role);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//  delete the user role -- only for the admins
export const deleteUserByAdmin = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);
      if (!user) {
        return next(new ErrorHandler("user not found", 400));
      }
      await user.deleteOne({ id });
      await redis.del(id);
      res.status(200).json({
        succes: true,
        message: "User Deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
