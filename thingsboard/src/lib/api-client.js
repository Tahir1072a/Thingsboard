import toast from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

export async function fetchClient(endpoint, { body, ...customConfig } = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...customConfig.headers,
  };

  const config = {
    method: body ? "POST" : "GET",
    ...customConfig,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  };

  try {
    // Backend'de isetği atıyoruz...
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        if (token) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          toast.error("Oturum süreniz doldu. Lütfen tekrar giriş yapın", {
            id: "session-expired",
          });

          window.location.href = "/login";
        }
      }

      return Promise.reject(new Error("Oturum süresi doldu"));
    }

    const data = await response.json();

    if (response.ok) {
      return data;
    } else {
      return Promise.reject(data);
    }
  } catch (error) {
    return Promise.reject(error);
  }
}
