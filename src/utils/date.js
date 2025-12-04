// src/utils/date.js

// Convierte un "YYYY-MM-DD" a Date **local** (sin el problema de UTC que te corre un día)
export function parseYMDToLocal(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d); // año, mes (0-based), día
}

// Milisegundos en un día, para calcular diferencias de días sin desfasajes raros
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
