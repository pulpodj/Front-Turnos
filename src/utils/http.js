// src/utils/http.js
import { getCsrfHeader } from "../utils/security.js";

export async function httpJSON(path, { method = "GET", body, headers = {} } = {}) {
  const url = path.startsWith("http") ? path : `${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getCsrfHeader(),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "omit",
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
