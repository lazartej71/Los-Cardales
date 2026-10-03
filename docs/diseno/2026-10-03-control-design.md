# Diseño: cuenta superadmin, registro de actividad y visitas

Fecha: 2026-10-03. Estado: diseño aprobado por el usuario en el chat; falta que revise este documento.

## Objetivo

Que la cuenta del desarrollador (ljdev) tenga control de todo el sitio:

- Ver quién cargó o cambió cada cosa y cuándo.
- Ver cuánta gente visita la página.

La cuenta de Franco (franco1, el organizador) sigue viendo exactamente lo mismo que hoy.

## Decisiones tomadas con el usuario

| Tema | Decisión |
| --- | --- |
| Roles | Dos: `admin` (Franco, y cualquier admin que exista) y `superadmin` (ljdev). |
| Registro de actividad | Cada alta, cambio o baja queda anotado con quién, cuándo y qué. Se muestra **qué se hizo**, sin el valor anterior (opción B). |
| Qué se registra | Partidos (incluye resultado, W.O., postergación y lugar), tarjetas, rojas, pagos y deudas, equipos y delegados, y ajustes. También lo que se cargue por el SQL Editor. |
| Quién lo ve | Solo el superadmin. Nadie lo puede modificar ni borrar desde la app. |
| Visitas | Vercel Web Analytics (opción A). Se mira en Vercel; el panel tiene un botón que lleva ahí. |
| Para después | Crear o dar de baja admins desde el panel (necesita la clave secreta de Supabase en el servidor). |

## Base de datos: migración 5 (`supabase/migracion-5-control.sql`)

### Roles

- `administradores` suma `rol text not null default 'admin' check (rol in ('admin', 'superadmin'))`. Todos los admins que ya estaban quedan como `admin`.
- Función `es_superadmin()`, como `es_admin()`: `security definer`, mira la fila de `auth.uid()`.
- La migración termina con el `update` que pasa a superadmin la cuenta `ljdev@loscardalesfutbol.com`.

### Tabla `actividad`

| Columna | Qué guarda |
| --- | --- |
| `id` | Número del registro. |
| `creado_en` | Cuándo (`timestamptz`, `now()`). |
| `user_id` | La cuenta que hizo el cambio (`auth.uid()`), o vacío si se hizo desde el SQL Editor. |
| `quien` | El nombre del admin en ese momento, o `Supabase (SQL)` si no hay cuenta. |
| `accion` | `alta`, `cambio` o `baja`. |
| `tabla` | `partidos`, `tarjetas`, `expulsiones`, `movimientos`, `equipos`, `delegados` o `configuracion`. |
| `fila` | El renglón como quedó (`jsonb`). En una baja, como estaba antes de borrarse. |
| `cambios` | En un cambio, qué columnas cambiaron (`text[]`). Por ejemplo `{goles_local, goles_visitante}`. |

La guarda la función `registrar_actividad()`:

- Es un trigger `after insert or update or delete` en cada una de esas tablas.
- Es `security definer`, así puede escribir aunque nadie tenga permiso de insertar en `actividad`.
- Un `update` que no cambia nada no se registra.

### Permisos y retención

- `actividad` tiene RLS. Solo el superadmin la puede **leer**. Nadie tiene permiso de escribir, cambiar ni borrar: solo escribe el trigger.
- Se guarda para siempre. En todo el torneo serían unos pocos miles de renglones.

Como las otras migraciones, si se corre dos veces falla al principio sin cambiar nada.

## Texto de cada registro (`src/logica/actividad.js`)

`describirActividad(entrada, db) → { quien, cuando, texto }`. Arma la frase con los nombres que tiene el panel. Ejemplos:

| Registro | Texto |
| --- | --- |
| alta de un partido | Agregó el partido BRANCA vs BARRIO POLICIAL (Libre, fecha 2) |
| cambio con goles | Cargó el resultado de BRANCA vs BARRIO POLICIAL (Libre, fecha 2) |
| cambio con goles en null | Quitó el resultado de … |
| cambio en `ausente` | Marcó W.O. en … |
| cambio en `postergado` | Postergó … / Quitó la postergación de … |
| cambio en predio, cancha u hora | Cambió el lugar y la hora de … |
| baja de un partido | Borró el partido … |
| tarjetas | Cargó / borró la amarilla del N° 10 de BRANCA en … |
| expulsiones | Cargó la roja del N° 10 de BRANCA en … / Cambió la sanción de … / Borró la roja … |
| movimientos | Anotó un pago de $105.000 de BRANCA (efectivo) / Anotó una deuda anterior de … / Cambió / borró … |
| equipos y delegados | Cambió los datos de BRANCA / Cambió el delegado de BRANCA |
| configuracion | Cambió los ajustes (arancel) |

Si el equipo o el partido ya no existe, usa el nombre guardado en `fila` o dice "un partido borrado".

## API

- `GET /admin/datos` suma `rol: 'admin' | 'superadmin'`. Lo lee el repositorio con la fila propia de `administradores`, que la regla de hoy ya deja leer.
- `GET /admin/actividad?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`:
  - Devuelve hasta 500 registros, del más nuevo al más viejo.
  - Las fechas son días de Argentina.
  - Si la cuenta no es superadmin, responde 403 con "Esta sección es solo para el superadmin.".
- **Simulación:** la cuenta es siempre superadmin. La base en memoria anota la actividad con la misma forma (`quien: 'Simulación'`) en cada alta, cambio o baja, así la pantalla se prueba sin Supabase.

## Panel: pestaña Control (solo superadmin)

- En el menú de abajo aparece **Control** como sexta pestaña, solo si `rol === 'superadmin'`. Franco no la ve.
- **Resumen de hoy:** por persona, cuántos resultados, tarjetas, rojas y pagos cargó hoy.
- **Actividad:**
  - Filtro de día: Hoy, Ayer u otra fecha.
  - Filtro de persona: Todos, o cada nombre que aparece.
  - Lista con la hora, quién y el texto.
  - Botón Actualizar.
- **Visitas:** botón **Ver visitas en Vercel**, que abre las estadísticas del proyecto en una pestaña nueva.

## Visitas (Vercel Web Analytics)

- Se suma el paquete `@vercel/analytics` y se llama a `inject()` en `src/main.jsx`, salvo en la simulación.
- No usa cookies ni guarda datos personales.
- El usuario lo activa en Vercel, en el proyecto los-cardales: **Analytics → Enable**.
- El plan gratis tiene un límite de eventos por mes.

## Pruebas (TDD)

- **Base (PGlite):** el rol por defecto es `admin`. El trigger anota alta, cambio y baja con `quien` y `cambios`, y no anota un `update` sin cambios. Un admin común no puede leer `actividad` y el superadmin sí. Nadie puede insertar ni borrar en `actividad`. La migración falla si se corre dos veces.
- **Lógica:** `describirActividad` para cada caso de la tabla de arriba.
- **API:** `/admin/datos` trae el rol. `/admin/actividad` da 403 a un admin y devuelve la lista al superadmin. La memoria anota la actividad.
- **Panel:** la pestaña Control aparece solo con rol superadmin. El resumen y la lista muestran los textos.
- **A mano:** en `npm run simulacion`, cargar un resultado y verlo en Control.

## Publicación

El usuario corre la migración 5 en Supabase **antes** de publicar el código, y activa Analytics en Vercel.

## Fuera de alcance

- Crear o borrar cuentas de admin desde el panel.
- Ver el valor anterior de un cambio.
- Contador de visitas dentro del panel.
