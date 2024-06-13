import { app } from "./app";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "./utlis/db";

require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET_KEY,
});

app.listen(process.env.PORT, () => {
  console.log(`Server is connected with PORT ${process.env.PORT}`);
  connectDB();
});
