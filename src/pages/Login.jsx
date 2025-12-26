// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard.jsx";
import { isValidDNI } from "../utils/validators.js";
import {
  loginPacientePasswordMock,
  loginColaboradorMock,
} from "../api/mockAuth.js";
import bgVideo from "../assets/BG_Login.mp4";

export default function Login() {
  const [mode, setMode] = useState("paciente"); // 'paciente' | 'colaborador'

  // ==== ESTADO PACIENTE ====
  const [pacUser, setPacUser] = useState(""); // DNI (o usuario si lo cambiás)
  const [pacPass, setPacPass] = useState("");
  const [showPacPass, setShowPacPass] = useState(false);

  // ==== ESTADO COLABORADOR ====
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showColPass, setShowColPass] = useState(false);

  // ==== ESTADO GLOBAL ====
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nav = useNavigate();
  const loc = useLocation();

  // Reset al cambiar de modo
  useEffect(() => {
    setError("");
    setLoading(false);

    setPacUser("");
    setPacPass("");
    setShowPacPass(false);

    setUser("");
    setPass("");
    setShowColPass(false);
  }, [mode]);

  /* ==============================
   * PACIENTE – DNI + pass
   * ============================== */
  const submitPaciente = async (e) => {
    e.preventDefault();
    setError("");

    if (!isValidDNI(pacUser)) {
      setError("Usuario inválido");
      return;
    }
    if (!pacPass) {
      setError("La contraseña es obligatoria");
      return;
    }

    setLoading(true);
    try {
      const session = await loginPacientePasswordMock({
        user: pacUser,
        pass: pacPass,
      });

      const from = loc.state?.from?.pathname;
      const dest = from || (session.role === "paciente" ? "/mis-turnos" : "/agenda");
      nav(dest, { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "No se pudo iniciar sesión. Verificá los datos y probá nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==============================
   * COLABORADOR – user + pass
   * ============================== */
  const submitColaborador = async (e) => {
    e.preventDefault();
    setError("");

    if (!user || !pass) {
      setError("Usuario y contraseña son obligatorios");
      return;
    }

    setLoading(true);
    try {
      const session = await loginColaboradorMock({ user, pass });
      const role = session?.role || "medico";
      const from = loc.state?.from?.pathname;

      const dest = from || (role === "admin" ? "/abm/turnos" : "/agenda");
      nav(dest, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <video
        className="auth-bg-video"
        src={bgVideo}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      />

      <div className="auth-bg-dim" />

      <GlassCard className="login-card">
        <header className="auth-header">
          <h1>Bienvenido</h1>
          <p className="muted">Ingresá como Paciente o Colaborador.</p>

          <div className="segmented" style={{ gap: 10 }}>
            <button
              type="button"
              className={mode === "paciente" ? "active" : ""}
              onClick={() => setMode("paciente")}
            >
              <span className="material-symbols-rounded" aria-hidden>
                person
              </span>{" "}
              Paciente
            </button>
            <button
              type="button"
              className={mode === "colaborador" ? "active" : ""}
              onClick={() => setMode("colaborador")}
            >
              <span className="material-symbols-rounded" aria-hidden>
                badge
              </span>{" "}
              Colaborador
            </button>
          </div>
        </header>

        {mode === "paciente" ? (
          <form onSubmit={submitPaciente} className="form" autoComplete="off" noValidate>
            <label>
              Usuario
              <input
                placeholder="usuario"
                value={pacUser}
                onChange={(e) => setPacUser(e.target.value.trim())}
                autoCapitalize="none"
                inputMode="numeric"
                aria-label="usuario del paciente"
              />
            </label>

            <label>
              Contraseña
              <div className="pwd-wrap">
                <input
                  type={showPacPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={pacPass}
                  onChange={(e) => setPacPass(e.target.value)}
                  aria-label="Contraseña del paciente"
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  onClick={() => setShowPacPass((s) => !s)}
                  aria-label={showPacPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showPacPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <span className="material-symbols-rounded" aria-hidden>
                    {showPacPass ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </label>

            {error && (
              <div className="error" role="alert">
                <span className="material-symbols-rounded" aria-hidden>
                  error
                </span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`primary ${loading ? "loading" : ""}`}
              disabled={loading || !isValidDNI(pacUser) || !pacPass}
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitColaborador} className="form" autoComplete="off" noValidate>
            <label>
              Usuario
              <input
                placeholder="usuario"
                value={user}
                onChange={(e) => setUser(e.target.value.trim())}
                autoCapitalize="none"
                aria-label="Usuario del colaborador"
              />
            </label>

            <label>
              Contraseña
              <div className="pwd-wrap">
                <input
                  type={showColPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  aria-label="Contraseña"
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  onClick={() => setShowColPass((s) => !s)}
                  aria-label={showColPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showColPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <span className="material-symbols-rounded" aria-hidden>
                    {showColPass ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </label>

            {error && (
              <div className="error" role="alert">
                <span className="material-symbols-rounded" aria-hidden>
                  error
                </span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`primary ${loading ? "loading" : ""}`}
              disabled={loading || !user || !pass}
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
