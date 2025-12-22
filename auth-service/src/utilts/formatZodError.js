import { z } from "zod";

export function formatZodErrorV4(err) {
  const { formErrors, fieldErrors } = z.flattenError(err);

  const issues = err.issues.map((i) => ({
    path: i.path.join("."),
    code: i.code,
    message: i.message,
  }));

  return {
    ok: false,
    errorCode: "VALIDATION_ERROR",
    message: "Gönderdiğiniz verilerde doğrulama hataları var.",
    formErrors,
    fieldErrors,
    issues,
  };
}
