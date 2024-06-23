import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import cloudinary from "cloudinary";
import LayoutModel from "../models/layout.model";
import ErrorHandler from "../utlis/errorHandler";

// create layout
export const createLayout = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { type, image, title, subTitle, faq, categories } = req.body;

    const normalizedType = type.trim().toLowerCase();

    // Check for existing type in the database
    const isTypeExists = await LayoutModel.findOne({ type: normalizedType });
    if (isTypeExists) {
      return next(new ErrorHandler(`${type} already exists`, 400));
    }

    let newLayout;

    switch (normalizedType) {
      case "banner":
        if (!image || !title || !subTitle) {
          return next(
            new ErrorHandler("Missing required fields for Banner", 400)
          );
        }
        const myCloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });
        newLayout = {
          type: normalizedType,
          image: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          },
          title,
          subTitle,
        };
        break;

      case "faq":
        if (!faq) {
          return next(new ErrorHandler("Missing required fields for FAQ", 400));
        }
        const faqItems = faq.map((item: any) => ({
          question: item.question,
          answer: item.answer,
        }));
        newLayout = {
          type: normalizedType,
          faq: faqItems,
        };
        break;

      case "categories":
        if (!categories) {
          return next(
            new ErrorHandler("Missing required fields for Categories", 400)
          );
        }
        const categoriesItems = categories.map((item: any) => ({
          title: item.title,
        }));
        newLayout = {
          type: normalizedType,
          categories: categoriesItems,
        };
        break;

      default:
        return next(new ErrorHandler(`Invalid type: ${type}`, 400));
    }

    const createdLayout = await LayoutModel.create(newLayout);

    res.status(201).json({
      success: true,
      message: `${type} created successfully`,
      data: createdLayout,
    });
  }
);
