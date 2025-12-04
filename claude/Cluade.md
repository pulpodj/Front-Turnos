✅ PROMPT COMPLETO PARA CLAUDE — SISTEMA DE GESTIÓN DE TURNOS

(copiar y pegar tal cual)

🧠 Contexto general del proyecto

Este es un sistema de gestión de turnos médicos con tres perfiles:

Secretaría

Profesionales

Pacientes

Está desarrollado en React + Vite, con componentes propios (Agenda, ABM, Calendario, etc.) y un backend en PostgreSQL + API REST que expone los datos reales.

La UI está diseñada con una línea estética moderna, limpia, con tarjetas, colores pastel y un layout de tres columnas:

Izquierda: ABM / Pagos

Centro: Agenda semanal

Derecha: Calendario

Además, existe un login con carga visual, validación y token JWT.

📌 Qué necesito que revises y corrijas

Necesito que revises toda la estructura del proyecto (front) y realices las correcciones necesarias, manteniendo el estilo, las decisiones visuales y la lógica del sistema.

A continuación detallo exactamente qué fallas hay en cada módulo y qué espero como resultado.

🧩 1. SECRETARÍA – Errores detectados
❌ Errores actuales:

Los campos del ABM se desbordan, salen del contenedor y quedan por detrás de la grilla.

El calendario no marca el día actual ni tiene selector visual claro.

El panel de pagos muestra solo el título “Pagos”, pero no renderiza los campos del formulario.

El layout parece estar mal ordenado en z-index / flex / width, generando solapamiento.

✅ Debe quedar así:

El panel de ABM y Pagos debe tener un máximo ancho fijo, con scroll interno si hace falta.

La grilla de turnos NUNCA debe solaparse con el ABM.

El calendario debe mostrar:

Día actual resaltado (colores del sistema)

Botón o interacción clara de selección

El panel de pagos debe funcionar completo (movimientos + tipos):

Crear

Listar

Buscar por ID

Editar

Eliminar

🧩 2. MÉDICOS – Errores detectados
❌ Errores actuales:

El calendario tampoco tiene indicador de día actual ni selección visible.

El diseño se corta por la derecha (overflow o width mal definido).

Los colores de las cards de turnos se desordenan (no siguen la paleta).

NO se puede hacer click en un turno para ver:

Datos del paciente

Datos del turno

Modal de edición

Panel superior de paciente (que ya está creado)

✅ Debe quedar así:

Agenda totalmente funcional con clic sobre turnos.

Panel superior mostrando datos clínicos del paciente:

Obra social

Alergias

Enfermedades crónicas

Grupo sanguíneo

Contacto de emergencia

Notas

Cartas con bordes y colores consistentes con la paleta del proyecto.

Calendario con día actual resaltado y selector funcional.

Layout sin cortes laterales.

🧩 3. PACIENTES – Errores detectados
❌ Errores:

En el login, el botón aparece vacío (sin texto).

Al ingresar, la pantalla del paciente está vacía (sin contenido ni UI base).

✅ Debe quedar así:

Botón del login con texto visible ("Ingresar" o similar).

Vista del paciente con:

Historial de turnos

Datos personales

Posibles movimientos económicos (opcional)

Diseño consistente con el resto del sistema

Al menos un layout básico funcional para que no entre a una pantalla vacía.

📦 4. Requisitos generales

Claude, respetar estrictamente:

✔ Paleta de colores
--c-primary: #2684fe;
--c-secondary: #e1eeff;
--c-bg: #ffffff;
--c-extra-1: #fff6d9;
--c-extra-2: #edf6ff;
--c-extra-3: #7ef7bf;
--c-extra-4: #ffd9ff;

✔ Layout en tres columnas

Izquierda: ABM / Pagos
Centro: Agenda
Derecha: Calendario

✔ Compatibilidad con Vite, React 18 y componentes existentes
✔ No romper componentes que ya funcionan

Si debe reescribirlos, rehacerlos con la misma funcionalidad ampliada.

✔ Mantener lógica de semana:

Semana laboral: Lunes a Viernes

HORAS = 8 a 17

✔ Mantener integración con backend:

CRUD Pacientes

CRUD Profesionales

CRUD Turnos

CRUD Movimientos

CRUD Tipos de Movimientos

🛠️ 5. Qué espero como OUTPUT
🎯 Claude debe entregar:

Los archivos completos corregidos, listos para copiar y pegar
NO parches ni extractos dispersos.

Componentes corregidos:

Secretaria.jsx

MedicoAgenda.jsx

ABMPanel.jsx

PagosPanel.jsx

PatientInfo.jsx

ScheduleGrid.jsx

WeekCalendar.jsx

Login.jsx (o donde esté la UI del login)

Paciente.jsx o la pantalla equivalente del paciente

CSS corregido

Ajustes en styles.css y styles.extra.css

Nuevas clases si hacen falta

Corrección de overflow, grids, widths, gaps y z-index

Mejoras en:

Calendario (día actual + selector)

Click en cards

Panel de pagos

Layout de la secretaria

Ancho/scroll correcto de ABM

Pantalla paciente funcional

Sin cambiar la esencia visual que ya estamos usando.

⭐ 6. Cierre

Claude:
Corregí todos los errores listados arriba sin romper el diseño ni la lógica existente, manteniendo la arquitectura del proyecto y reescribiendo los archivos completos cuando sea necesario.