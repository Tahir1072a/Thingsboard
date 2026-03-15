import toast from "react-hot-toast";

/**
 * fetchClient — Basitleştirilmiş fetch wrapper
 *
 * NextAuth cookie bazlı oturum kullandığı için artık:
 * - localStorage token'ı okunmuyor (cookie otomatik gider)
 * - Dış BASE_URL yok, tüm istekler relative path'e gider
 */
export async function fetchClient(endpoint, { body, ...customConfig } = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...customConfig.headers,
  };

  const config = {
    method: body ? "POST" : "GET",
    ...customConfig,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  };

  try {
    const response = await fetch(endpoint, config);

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        toast.error("Oturum süreniz doldu. Lütfen tekrar giriş yapın", {
          id: "session-expired",
        });
        window.location.href = "/login";
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
