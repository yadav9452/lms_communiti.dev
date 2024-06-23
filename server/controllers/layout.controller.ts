import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import cloudinary from "cloudinary";
import LayoutModel from "../models/layout.model";
import ErrorHandler from "../utlis/errorHandler";

// create layout
export const createLayout = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
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
          try {
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
          } catch (error) {
            return next(new ErrorHandler("Image upload failed", 500));
          }
          break;

        case "faq":
          if (!faq) {
            return next(
              new ErrorHandler("Missing required fields for FAQ", 400)
            );
          }
          try {
            const faqItems = faq.map((item: any) => ({
              question: item.question,
              answer: item.answer,
            }));
            newLayout = {
              type: normalizedType,
              faq: faqItems,
            };
          } catch (error) {
            return next(new ErrorHandler("Failed to process FAQ items", 500));
          }
          break;

        case "categories":
          if (!categories) {
            return next(
              new ErrorHandler("Missing required fields for Categories", 400)
            );
          }
          try {
            const categoriesItems = categories.map((item: any) => ({
              title: item.title,
            }));
            newLayout = {
              type: normalizedType,
              categories: categoriesItems,
            };
          } catch (error) {
            return next(
              new ErrorHandler("Failed to process Categories items", 500)
            );
          }
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
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// edit layout
export const editLayout = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, image, title, subTitle, faq, categories } = req.body;

      const normalizedType = type.trim().toLowerCase();
      let newLayout: any = {};

      // Find layout based on type
      const existingLayout = await LayoutModel.findOne({
        type: normalizedType,
      });

      if (!existingLayout) {
        return next(
          new ErrorHandler(`Layout with type ${type} not found`, 404)
        );
      }

      switch (normalizedType) {
        // case "banner":
        //   if (!image || !title || !subTitle) {
        //     return next(
        //       new ErrorHandler("Missing required fields for Banner", 400)
        //     );
        //   }
        //   try {
        //     if (existingLayout) {
        //       await cloudinary.v2.uploader.destroy(
        //         existingLayout.image.public_id
        //       );
        //     }
        //     const myCloud = await cloudinary.v2.uploader.upload(image, {
        //       folder: "layout",
        //     });
        //     newLayout = {
        //       type: normalizedType,
        //       image: {
        //         public_id: myCloud.public_id,
        //         url: myCloud.secure_url,
        //       },
        //       title,
        //       subTitle,
        //     };
        //   } catch (error) {
        //     return next(new ErrorHandler("Image upload failed", 500));
        //   }
        //   break;

        case "faq":
          try {
            const faqItems = faq.map((item: any) => ({
              question: item.question,
              answer: item.answer,
            }));
            newLayout = {
              type: normalizedType,
              faq: faqItems,
            };
          } catch (error) {
            return next(new ErrorHandler("Failed to process FAQ items", 500));
          }
          break;

        case "categories":
          try {
            const categoriesItems = categories.map((item: any) => ({
              title: item.title,
            }));
            newLayout = {
              type: normalizedType,
              categories: categoriesItems,
            };
          } catch (error) {
            return next(
              new ErrorHandler("Failed to process Categories items", 500)
            );
          }
          break;

        default:
          return next(new ErrorHandler(`Invalid type: ${type}`, 400));
      }

      // Update layout using _id of existingLayout
      const updatedLayout = await LayoutModel.findByIdAndUpdate(
        existingLayout._id,
        newLayout,
        { new: true, runValidators: true }
      );

      if (!updatedLayout) {
        return next(
          new ErrorHandler(`Layout with type ${type} not found`, 404)
        );
      }

      res.status(200).json({
        success: true,
        message: `${type} updated successfully`,
        data: updatedLayout,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get layout by type
export const getLayoutByType = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      const layout = await LayoutModel.findOne({ type });
      res.status(200).json({
        success: true,
        layout,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
