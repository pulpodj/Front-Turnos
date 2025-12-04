// src/ui/LoadingOverlay.jsx
export default function LoadingOverlay({ text = "Ingresando…", Animation = null }) {
  return (
    <div className="loading-overlay" role="alert" aria-live="assertive" aria-busy="true">
      <div className="loading-panel card">
        <div className="loading-anim">
          {Animation ? (
            <Animation />
          ) : (
            <div className="spinner" aria-hidden />
          )}
        </div>
        <div className="loading-text">{text}</div>
        <div className="loading-sub">Por favor, aguarde…</div>
      </div>
    </div>
  );
}
