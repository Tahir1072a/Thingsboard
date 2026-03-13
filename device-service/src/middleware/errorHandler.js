import { ZodError } from "zod";
import AppError from "../utilts/AppError.js";

const globalErrorHandler = (err, req, res, next) => {
  console.error("HATA:", err);

  if (err instanceof ZodError) {
    const errorMessages = err.errors.map((e) => e.message).join(", ");

    return res.status(400).json({
      success: false,
      message: "Validation Failed",
      errors: errorMessages,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Bu kayıt zaten mevcut (Duplicate Key Error).",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Sunucu tarafında bir hata oluştu.",
  });
};

export default globalErrorHandler;
