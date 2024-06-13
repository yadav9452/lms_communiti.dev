import UserModel from "../models/user.model";
import { Response } from "express";

// get user By Id
export const getUserById = async (id: string, res: Response) => {
  const user = await UserModel.findById(id);
  res.status(200).json({
    success: true,
    user,
  });
};
