class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.isAppError = true;

    // Hata stack trace'ini (izini) koru
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
