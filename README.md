# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


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