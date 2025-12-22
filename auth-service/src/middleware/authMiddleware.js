import jwt from "jsonwebtoken";
import AppError from "../utilts/AppError.js";

// İsteklerin ilgili rotaya ulaşmadan araya giren middleware.
// Kullanıcının giriş yapıp yapmadığını açıklar.
export const protectRoute = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Bu rotaya erişim için giriş yapmalısınız.", 401));
  }

  try {
    // Token'nı doğrula..
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError("Geçersiz veya süresi dolmuş token", 401));
  }
};
