import nodemailer, { Transporter } from "nodemailer";
import ejs from "ejs";
import path from "path";

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
  options?: any;
}

const sendMail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter: Transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim(),
      port: parseInt(process.env.SMTP_PORT?.trim() || "465"),
      service: process.env.SMTP_SERVICE?.trim(),
      auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASSWORD?.trim(),
      },
      tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false,
      },
    });

    const { email, subject, template, data } = options;
    const templatePath = path.join(__dirname, "../mails", template);
    const html: string = await ejs.renderFile(templatePath, data);

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log("mail sent successfully");
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error occurred while sending email:", error);
    // Throw the error to be caught by the caller or error middleware
    throw error;
  }
};

export default sendMail;
