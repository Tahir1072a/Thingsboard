const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

export async function authFetch(endpoint, options = {}) {
  let token = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("authToken");
  }

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
}
