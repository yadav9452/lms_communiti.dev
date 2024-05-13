import { app } from "./app";
import connectDB from "./utlis/db";

require("dotenv").config();

app.listen(process.env.PORT, () => {
  console.log(`Server is connected with PORT ${process.env.PORT}`);
  connectDB();
});
