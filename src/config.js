// base para llamadas del front; en dev pasa por el proxy de Vite
export const API_URL =
  (import.meta?.env && import.meta.env.VITE_API_URL) || '/API';

