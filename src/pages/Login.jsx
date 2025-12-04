// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard.jsx";
import { isValidCode, isValidDNI } from "../utils/validators.js";
import { loginPacienteMock, loginColaboradorMock } from "../api/mockAuth.js";
import bgVideo from "../assets/BG_Login.mp4";

export default function Login() {
  const [mode, setMode] = useState("paciente"); // 'paciente' | 'colaborador'

  // ==== ESTADO PACIENTE ====
  const [dni, setDni] = useState("");
  const [channel, setChannel] = useState("sms"); // 'sms' | 'wsp'
  const [step, setStep] = useState(1); // 1 = pedir código, 2 = validar código
  const [code, setCode] = useState("");

  // ==== ESTADO COLABORADOR ====
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  // ==== ESTADO GLOBAL ====
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nav = useNavigate();
  const loc = useLocation();

  // Reset al cambiar de modo
  useEffect(() => {
    setError("");
    setStep(1);
    setCode("");
    setUser("");
    setPass("");
  }, [mode]);

  /* ==============================
   * PACIENTE – PASO 1 (enviar código)
   * ============================== */
  const goNextPaciente = async () => {
    setError("");

    if (!isValidDNI(dni)) {
      setError("DNI inválido");
      return;
    }
    if (!channel) {
      setError("Seleccioná SMS o WhatsApp");
      return;
    }

    setLoading(true);
    try {
      // previewOnly = true → el mock NO valida código ni nada,
      // solo simula el envío del código.
      await loginPacienteMock({
        dni,
        code: "000000",
        channel,
        previewOnly: true,
      });
      setStep(2);
    } catch (e) {
      console.error(e);
      setError(e.message || "No se pudo enviar el código");
    } finally {
      setLoading(false);
    }
  };

  /* ==============================
   * PACIENTE – PASO 2 (validar código)
   * ============================== */
  const submitPaciente = async (e) => {
    e.preventDefault();
    setError("");

    if (!isValidDNI(dni)) {
      setError("DNI inválido");
      return;
    }
    if (!isValidCode(code)) {
      setError("Código inválido (ej: 123456)");
      return;
    }

    setLoading(true);
    try {
      const session = await loginPacienteMock({ dni, code, channel });
      const from = loc.state?.from?.pathname;
      const dest =
        from || (session.role === "paciente" ? "/mis-turnos" : "/agenda");

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
   * (backend real + fallback mock)
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

      // Admin → Secretaría, Médico → Agenda
      const dest =
        from || (role === "admin" ? "/abm/turnos" : "/agenda");

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
      {/* video de fondo DETRÁS de la card */}
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
          <>
            {step === 1 ? (
              <form className="form" autoComplete="off" noValidate>
                <label>
                  DNI
                  <input
                    inputMode="numeric"
                    placeholder="Ej: 12345678"
                    value={dni}
                    onChange={(e) =>
                      setDni(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="DNI del paciente"
                  />
                </label>

                <label>
                  Canal de verificación
                  <div
                    className="choice-row"
                    role="radiogroup"
                    aria-label="Canal de verificación"
                  >
                    <label className="radio">
                      <input
                        type="radio"
                        name="channel"
                        value="sms"
                        checked={channel === "sms"}
                        onChange={() => setChannel("sms")}
                      />
                      <span
                        className="material-symbols-rounded"
                        aria-hidden
                      >
                        sms
                      </span>
                      SMS
                    </label>
                    <label className="radio">
                      <input
                        type="radio"
                        name="channel"
                        value="wsp"
                        checked={channel === "wsp"}
                        onChange={() => setChannel("wsp")}
                      />
                      <span
                        className="material-symbols-rounded"
                        aria-hidden
                      >
                        chat
                      </span>
                      WhatsApp
                    </label>
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
                  type="button"
                  className={`primary ${loading ? "loading" : ""}`}
                  disabled={loading || !isValidDNI(dni) || !channel}
                  onClick={goNextPaciente}
                >
                  {loading ? "Enviando código…" : "Siguiente"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={submitPaciente}
                className="form"
                autoComplete="one-time-code"
                noValidate
              >
                <div className="inline-header">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setStep(1);
                      setCode("");
                      setError("");
                    }}
                  >
                    <span
                      className="material-symbols-rounded"
                      aria-hidden
                    >
                      arrow_back
                    </span>
                    Volver
                  </button>
                  <div className="muted">
                    DNI: {dni} · {channel.toUpperCase()}
                  </div>
                </div>

                <label>
                  Código recibido
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={code}
                    maxLength={6}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, ""))
                    }
                    aria-label="Código"
                  />
                  <small className="muted">
                    En mock <b>123456</b> siempre funciona.
                  </small>
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
                  disabled={loading || !isValidCode(code)}
                >
                  {loading ? "Ingresando…" : "Ingresar"}
                </button>
              </form>
            )}
          </>
        ) : (
          <form
            onSubmit={submitColaborador}
            className="form"
            autoComplete="off"
            noValidate
          >
            <label>
              Usuario
              <input
                placeholder="nombre.apellido"
                value={user}
                onChange={(e) => setUser(e.target.value.trim())}
                autoCapitalize="none"
                aria-label="Usuario del colaborador"
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                aria-label="Contraseña"
              />
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
