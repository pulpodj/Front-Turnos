// src/api/mockAuth.js
import { saveSessionToken } from "../utils/jwt.js";
import { httpJSON, setBackendToken } from "./http.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeMockJwt(payload, ttlSec = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const body = { iss: "gestor-turnos", iat: now, exp: now + ttlSec, ...payload };
  const b64 = (obj) => btoa(JSON.stringify(obj));
  return `${b64({ alg: "none", typ: "JWT" })}.${b64(body)}.`; // unsigned mock
}

/* ============================
   PACIENTE – Mock 2 pasos (DNI + código)
   ============================ */
export async function loginPacienteMock({
  dni,
  code,
  channel,
  previewOnly = false,
}) {
  // Simulamos un pequeño delay "realista"
  await sleep(500);

  // Paso 1: solo “envío” de código
  if (previewOnly) {
    return { preview: true };
  }

  // Paso 2: validación del código
  if (code !== "123456") {
    throw new Error("Código inválido");
  }

  const token = makeMockJwt(
    { sub: String(dni), role: "paciente", channel },
    2 * 3600
  );

  // Guardamos token de sesión del front
  saveSessionToken(token);
  // Si en el futuro el paciente también pega al backend,
  // podrías usar el mismo token:
  // setBackendToken(token);

  return { token, role: "paciente" };
}

/* ============================
   COLABORADOR – Backend real + fallback demo
   ============================ */
export async function loginColaboradorMock({ user, pass }) {
  // helper para no repetir configuración
  const doLogin = (path) =>
    httpJSON(path, {
      method: "POST",
      body: {
        usuario: user,
        clave: pass,
      },
      noAuth: true, // login NO lleva Bearer
    });

  try {
    let data;

    // 1) Primero probamos /API/login  (admin / login general)
    try {
      data = await doLogin("/API/login");
    } catch (errLogin) {
      console.warn(
        "Login en /API/login falló, probando /API/loginProfesional:",
        errLogin
      );
      // 2) Si falla, probamos /API/loginProfesional (médicos)
      data = await doLogin("/API/loginProfesional");
    }

    // Respuesta esperada:
    // { msg, token, user: { id, nombre, perfil?, ... }, iat }

    let token;
    if (typeof data === "string") {
      token = data;
    } else {
      token =
        data.token ||
        data.jwt ||
        data.accessToken ||
        data.access_token ||
        null;
    }

    if (!token) {
      throw new Error("El backend no devolvió token");
    }

    // Guardamos token para:
    // - llamadas al backend (Authorization: Bearer ...)
    // - sesión del front (lo decodamos con readSession)
    setBackendToken(token);
    saveSessionToken(token);

    // Sacamos el perfil desde data.user.perfil
    const perfil = (data.user?.perfil || "").toString().toLowerCase();

    // Si es "admin" → admin, el resto se considera médico
    const role = perfil === "admin" ? "admin" : "medico";

    console.log("loginColaboradorMock -> perfil:", perfil, "role:", role);

    return { token, role };
  } catch (err) {
    console.error("Error en login backend, probando fallback mock:", err);

    // 3) Fallback MOCK solo para entorno demo
    await sleep(400);

    // Si la pass NO es la demo, respetamos el error real
    if (pass !== "demo1234") {
      throw new Error(err?.message || "Credenciales inválidas");
    }

    // En modo demo:
    const role = user.toLowerCase().includes("med") ? "medico" : "admin";
    const token = makeMockJwt({ sub: user, role }, 4 * 3600);

    setBackendToken(token);
    saveSessionToken(token);

    return { token, role };
  }
}
// Agregar en src/api/mockAuth.js

export async function loginPacientePasswordMock({ user, pass }) {
  await sleep(450);

  // Mock simple: si no hay pass, falla
  if (!user || !pass) throw new Error("Usuario y contraseña obligatorios");

  // Si querés una credencial fija para test:
  // if (String(user) !== "12345678" || pass !== "1234") throw new Error("Credenciales inválidas");

  // IMPORTANTE: payload con idPaciente / id para que MisTurnos no rebote al login
  // Si querés, esto puede salir de un mock de pacientes luego. Por ahora fijo:
  const pacienteId = 1;

  const token = makeMockJwt(
    {
      sub: String(user),
      role: "paciente",
      idPaciente: pacienteId,
      id: pacienteId,
    },
    2 * 3600
  );

  saveSessionToken(token);

  return { token, role: "paciente" };
}
