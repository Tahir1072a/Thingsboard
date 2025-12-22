import { z } from "zod";
import { formatZodErrorV4 } from "../utilts/formatZodError.js";

export function globalErrorHandler(err, req, res, next) {
  console.error("Error Handler :", err);

  if (err instanceof z.ZodError) {
    return res.status(422).json(formatZodErrorV4(err));
  }

  if (err.isAppError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: err.message,
    });
  }

  return res.status(500).json({
    ok: false,
    error: "Sunucuda beklenmedik bir hata oluştu",
  });
}
