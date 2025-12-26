// src/ui/ResizableLayout.jsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ResizableLayout
 * - 3 paneles horizontales: left | center | right
 * - 2 handles: entre left-center y center-right
 * - widths en %
 *
 * Props:
 *  - left, center, right: ReactNode
 *  - defaultSizes: [left%, center%, right%]
 *  - minLeftPx, minCenterPx, minRightPx
 *  - storageKey (opcional) para recordar tamaños
 */
export default function ResizableLayout({
  left,
  center,
  right,
  defaultSizes = [26, 48, 26],
  minLeftPx = 260,
  minCenterPx = 520,
  minRightPx = 280,
  storageKey = "gt_resizable_secretaria_v1",
}) {
  const containerRef = useRef(null);
  const draggingRef = useRef(null); // "L" | "R" | null

  const initial = useMemo(() => {
    try {
      const raw = storageKey ? localStorage.getItem(storageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.length === 3 &&
          parsed.every((n) => typeof n === "number")
        ) {
          const sum = parsed[0] + parsed[1] + parsed[2];
          if (sum > 90 && sum < 110) return parsed;
        }
      }
    } catch {}
    return defaultSizes;
  }, [defaultSizes, storageKey]);

  const [sizes, setSizes] = useState(initial); // [%L, %C, %R]

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(sizes));
    } catch {}
  }, [sizes, storageKey]);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const pxToPct = (px, width) => (width > 0 ? (px / width) * 100 : 0);
  const pctToPx = (pct, width) => (width > 0 ? (pct / 100) * width : 0);

  const applyDrag = (clientX) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const totalW = rect.width;
    const x = clientX - rect.left;

    const minLPct = pxToPct(minLeftPx, totalW);
    const minCPct = pxToPct(minCenterPx, totalW);
    const minRPct = pxToPct(minRightPx, totalW);

    setSizes((prev) => {
      let [L, C, R] = prev;

      // Handle izquierdo: redefine L y C (R queda igual)
      if (draggingRef.current === "L") {
        let newL = pxToPct(x, totalW);
        // L min
        newL = clamp(newL, minLPct, 100 - (minCPct + minRPct));

        // C se ajusta en función de L (manteniendo R)
        let newC = 100 - newL - R;

        // C min
        if (newC < minCPct) {
          newC = minCPct;
          newL = 100 - newC - R;
        }

        // Por seguridad
        if (newL < minLPct) newL = minLPct;

        return [newL, newC, R];
      }

      // Handle derecho: redefine C y R (L queda igual)
      if (draggingRef.current === "R") {
        // x es posición del handle (fin de center)
        // center = x - leftWidth
        const leftPx = pctToPx(L, totalW);
        let centerPx = x - leftPx;
        let newC = pxToPct(centerPx, totalW);

        newC = clamp(newC, minCPct, 100 - (minLPct + minRPct));
        let newR = 100 - L - newC;

        if (newR < minRPct) {
          newR = minRPct;
          newC = 100 - L - newR;
        }

        return [L, newC, newR];
      }

      return prev;
    });
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      applyDrag(e.clientX);
      e.preventDefault();
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = null;
      document.body.classList.remove("is-resizing");
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const startDrag = (which) => (e) => {
    draggingRef.current = which;
    document.body.classList.add("is-resizing");
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const [L, C, R] = sizes;

  return (
    <div className="resizable-shell" ref={containerRef}>
      <section className="resizable-pane" style={{ width: `${L}%` }}>
        {left}
      </section>

      <div
        className="resizable-handle"
        role="separator"
        aria-label="Redimensionar panel izquierdo"
        onPointerDown={startDrag("L")}
        title="Arrastrá para ajustar"
      />

      <section className="resizable-pane" style={{ width: `${C}%` }}>
        {center}
      </section>

      <div
        className="resizable-handle"
        role="separator"
        aria-label="Redimensionar panel derecho"
        onPointerDown={startDrag("R")}
        title="Arrastrá para ajustar"
      />

      <section className="resizable-pane" style={{ width: `${R}%` }}>
        {right}
      </section>
    </div>
  );
}
