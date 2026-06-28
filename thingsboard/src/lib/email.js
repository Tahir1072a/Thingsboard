import nodemailer from "nodemailer";
import logger from "./logger.js";

export const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: process.env.EMAIL_SERVER_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  const mailOptions = {
    from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_FROM}>`,
    to: to,
    subject: subject,
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info("Message sent: %s", info.messageId);
    return info;
  } catch (err) {
    logger.error({ err }, "Error sending mail");
    throw new Error("E-posta gönderimi sırasında bir hata oluştu.");
  }
};

// user/route.js "sendMail" olarak import ediyor — alias
export const sendMail = sendEmail;
