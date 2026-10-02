# Diseño: app del campeonato con datos reales (Supabase + servidor en Vercel)

Fecha: 2026-10-01. Estado: aprobado por el usuario para empezar.

## Objetivo

Pasar del prototipo con datos de ejemplo en memoria a la app real del campeonato, que ya jugó la fecha 1:

- Los datos viven en Supabase y los ven todos.
- Los admins cargan resultados, partidos y expulsiones desde el panel.
- La app queda publicada en Vercel para jugadores y familias.

## Decisiones tomadas con el usuario

| Tema | Decisión |
| --- | --- |
| Base de datos | Supabase, proyecto en São Paulo (`qkvdwvmwajkwvfnvseso`). |
| Arquitectura | Servidor intermedio propio (`/api`) en el mismo proyecto, publicado en Vercel. |
| Admins | Varias cuentas (email y contraseña), todas con los mismos permisos. Sin registro público. |
| Torneos | Uno solo: no se guarda historial de torneos. |
| Equipos | Los que figuran en "TABLAS GP FECHA N1.xlsx", con la zona que figura ahí. Los que solo aparecen en "ZONAS COPA GP.xlsx" no participan. |
| Fecha 1 | No hay resultados por partido: entra como **tabla inicial** por equipo (PJ, PG, PE, PP, GF, GC). |
| Fixture | No está definido: los admins arman los partidos de cada fecha desde el panel. |
| Categorías | Libre, +30, +35, +40, +45 (en el Excel: LIB, M30, M35, S40, M45). |
| Acceso al panel | Sin botón en la portada: se entra con `#admin` al final de la dirección. |
| Publicación | Vercel conectado a un repositorio privado de GitHub del usuario. |

## Arquitectura

```
App React (Vite) ──fetch──► /api (Hono, función de Vercel) ──supabase-js──► Supabase (Postgres + RLS + Auth)
        └──────────── login con Supabase Auth (solo para obtener la sesión) ────────────┘
```

- **App:** la misma interfaz de hoy. Pide los datos a `/api` y la tabla de posiciones la sigue calculando `calcularTabla()` en el navegador.
- **Servidor (`server/`):** una app Hono con dos responsabilidades:
  - Valida cada operación: sesión de admin, goles enteros de 0 a 99, los dos equipos de un partido son de la misma categoría, el equipo de una expulsión jugó ese partido, etc.
  - Habla con Supabase usando la **clave pública** más el **token de la sesión del admin**, así que las reglas RLS se aplican también ahí. No se usa la clave secreta en ningún lado.
- **En Vercel:** `api/index.js` exporta `{ fetch }` y `vercel.json` reescribe `/api/*` hacia esa función.
- **En desarrollo:** un plugin de Vite pasa `/api/*` a la misma app Hono (con `@hono/node-server`), así que `npm run dev` levanta todo junto.
- **Variables de entorno:**
  - `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` se usan en el navegador (solo para el login) y en el servidor.
  - El servidor las lee de `process.env`. En desarrollo, `vite.config.js` las carga desde `.env.local`.

## Modelo de datos (Postgres)

| Tabla | Columnas | Lectura |
| --- | --- | --- |
| `categorias` | `id`, `nombre`, `orden` | pública |
| `zonas` | `id`, `categoria_id`, `nombre` ("Zona A", "Zona única") | pública |
| `equipos` | `id`, `zona_id`, `nombre` | pública |
| `tabla_inicial` | `equipo_id` (pk), `pj`, `pg`, `pe`, `pp`, `gf`, `gc` | pública |
| `partidos` | `id`, `categoria_id`, `fecha`, `local_id`, `visitante_id`, `goles_local`, `goles_visitante`, `postergado` | pública |
| `delegados` | `equipo_id` (pk), `nombre`, `telefono` | **solo admins** |
| `expulsiones` | `id`, `partido_id`, `equipo_id`, `numero_camiseta`, `nombre_jugador`, `fechas_suspension`, `fechas_cumplidas`, `creado_en` | **solo admins** |
| `configuracion` | `id` = 1, `nombre_campeonato`, `criterios_desempate` (text[]) | pública |
| `administradores` | `user_id` (→ `auth.users`), `nombre` | cada uno ve solo su fila |

Reglas:

- **Partidos de la categoría, no de la zona.** Las zonas impares cruzan equipos entre zonas (en la fecha 1, La Magia de la zona B de +30 jugó contra C.A Jamaica de la zona C). Un trigger controla que los dos equipos sean de la categoría del partido, y además: local distinto de visitante, goles los dos cargados o los dos vacíos.
- **Partido postergado:** conserva su fecha original y no suma hasta que tenga resultado. Al cargar el resultado deja de estar postergado.
- **Delegados aparte:** están en su propia tabla para que los teléfonos nunca lleguen al público.
- **`es_admin()`:** función `security definer` que consulta `administradores`. Todas las escrituras y las tablas privadas la exigen.
- **RLS en todas las tablas:**
  - las públicas: `select` para todos; `insert`, `update` y `delete` solo con `es_admin()`;
  - las privadas: todo solo con `es_admin()`.

## Cálculo de la tabla

`calcularTabla(equipos, partidos, criterios, tablaInicial)`:

1. Arranca cada fila con los valores de `tabla_inicial` (los puntos salen de PG×3 + PE).
2. Suma los partidos con resultado en los que juega un equipo de la zona. En un partido entre zonas, suma solo para el equipo de la zona.
3. Ordena con los criterios configurables, igual que hoy. El resultado entre ellos usa los partidos cargados; la fecha 1 no tiene detalle, así que no participa.

## Servidor: rutas

| Método y ruta | Quién | Qué hace |
| --- | --- | --- |
| `GET /api/publico` | todos | Categorías, zonas, equipos, tabla inicial, partidos y configuración. Caché corta en Vercel. |
| `GET /api/admin/datos` | admin | Lo público más delegados y expulsiones. |
| `POST /api/admin/partidos` | admin | Crea un partido (categoría, fecha, local, visitante). |
| `PATCH /api/admin/partidos/:id` | admin | Carga o quita el resultado, o marca postergado. |
| `DELETE /api/admin/partidos/:id` | admin | Borra un partido sin expulsiones. |
| `POST /api/admin/expulsiones` | admin | Carga una expulsión. |
| `PATCH /api/admin/expulsiones/:id` | admin | Cambia fechas de suspensión o cumplidas. |
| `DELETE /api/admin/expulsiones/:id` | admin | Borra una expulsión cargada por error. |
| `PATCH /api/admin/equipos/:id` | admin | Nombre del equipo, y nombre y teléfono del delegado. |
| `PATCH /api/admin/configuracion` | admin | Nombre del campeonato y criterios de desempate. |

Los errores vuelven como `{ error: "mensaje para la persona" }` con 400, 401, 403 o 404.

## Cambios en la app

- **Datos:**
  - Un hook `useDatos` reemplaza al reducer en memoria: pide `/api/publico`, o `/api/admin/datos` si hay sesión de admin.
  - Después de cada cambio vuelve a pedir los datos.
  - La vista pública se refresca sola cada 60 segundos y al volver a la pestaña.
  - Hay estados de carga y de error, con "Reintentar".
- **Zonas desde la base:** el selector de zona se oculta cuando la categoría tiene una sola zona.
- **Fixture y resultados públicos:**
  - Muestran los partidos en los que juega algún equipo de la zona.
  - Los postergados se marcan como tales.
  - En la fecha 1 aparece una nota: "La fecha 1 se cargó como tabla inicial".
- **Panel, Resultados:**
  - Se filtra por categoría y fecha.
  - Lista los partidos de esa fecha, indicando la zona de cada equipo.
  - Permite agregar un partido (local y visitante de cualquier zona de la categoría), cargar o quitar el resultado, marcarlo postergado y borrarlo.
- **Panel, Equipos:** nombre del equipo, y delegado y teléfono (tabla `delegados`).
- **Panel, otros:**
  - Expulsiones y Ajustes, igual que hoy pero contra la API.
  - Se quitan "Restaurar datos de ejemplo", las notas de prototipo y las credenciales de prueba.
- **Login:** email y contraseña con Supabase Auth. La sesión queda guardada en el navegador y se cierra con "Cerrar sesión".

## Carga inicial de datos

`scripts/importar-excel.mjs` lee `Excel/TABLAS GP FECHA N1.xlsx` y genera `supabase/datos-iniciales.sql`, con categorías, zonas, 98 equipos, la tabla inicial, la configuración y los partidos postergados de la fecha 1:

- +30: La Fusión vs Gardelitos, y Grandecito F.C vs La Primera.
- +45: Los Rústicos vs Porteros, La 78 del DK vs Choperos F.C, y 28 de Agosto vs Ecuador.

Correcciones de tipeo al importar:

- "ECUAD0R" pasa a "ECUADOR".
- Pasaje Rosales y Arsenal F.C (+35) quedan con PJ 1: sus goles cierran con un solo partido entre ellos (3 a 0).
- El GC "O" de Pasaje Rosales pasa a 0.
- La diferencia de gol se calcula, no se copia: así la de Santa Rosa (+6 en el Excel) queda bien.
- PG, PE y PP salen de los puntos con PJ 1: 3 es PG, 1 es PE y 0 es PP.

El esquema (`supabase/esquema.sql`) y los datos se ejecutan en el SQL Editor de Supabase: el usuario pega cada archivo.

## Pruebas

- **Unitarias (Vitest):**
  - `calcularTabla` con tabla inicial y con partidos entre zonas;
  - validaciones del servidor;
  - cada ruta de la API con un acceso a datos falso (`app.request()`), incluidos los rechazos sin sesión y sin permisos de admin.
- **Importación:** los totales generados coinciden con el Excel (puntos y goles por equipo).
- **RLS contra la base real**, usando la clave pública sin sesión:
  - no se pueden leer `expulsiones` ni `delegados`;
  - no se puede insertar ni modificar nada;
  - sí se puede leer lo público.
- **Recorrido en Chrome a 390 px:** la vista pública con los 98 equipos, sin desbordes ni errores en consola.

## Fuera de alcance por ahora

- Generar el fixture automáticamente.
- Historial de torneos.
- Fichas de jugadores.
- Notificaciones automáticas, porque WhatsApp sigue siendo con el botón.
- Editar la tabla inicial desde el panel: si hace falta, se corrige por SQL o se agrega después.

## Puntos a confirmar con el usuario (no bloquean)

- **Nombre del campeonato:** se carga "Copa GP" por los nombres de los archivos, y se cambia en Ajustes.
- **La Juntada y Santo Domingo (+30 A)** tienen PJ 0 pero no figuran como postergados. Si fue un partido postergado, se agrega desde el panel.
