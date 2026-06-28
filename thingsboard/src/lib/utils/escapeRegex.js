/**
 * Regex özel karakterlerini escape eder.
 * NoSQL injection ve ReDoS saldırılarını önler.
 */
export function escapeRegex(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
