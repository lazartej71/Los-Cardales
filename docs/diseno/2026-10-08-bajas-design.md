# Diseño: equipos que se dan de baja y equipos nuevos

Fecha: 2026-10-08. Estado: aprobado por el usuario en el chat; hecho y probado en la simulación el 2026-10-08.

## Objetivo

Que un equipo que deja el torneo salga de la tabla sin borrar lo que ya se jugó, y que otro entre en su lugar arrancando con 0 PJ. Que el panel permita hacerlo sin SQL.

Casos de ahora (el organizador manda la programación de la fecha 3 con los equipos nuevos):

| Categoría | Zona | Sale | Entra |
| --- | --- | --- | --- |
| +40 | Zona C | GOB GUTIERREZ (id 88) | CHIVERO F.C |
| +40 | Zona A | LA MALABIA (id 69) | LA AGUADITA |
| Libre | Zona B | BARRIO BELGRANO (id 20) | CLUB PASAJE UNIDOS |

GOB GUTIERREZ y LA MALABIA no se presentaron nunca (0 a 3 en la fecha 1 y W.O. en la fecha 2). BARRIO BELGRANO sí jugó (0 a 0 en la fecha 1 y 0 a 3 con Los Andes en la fecha 2).

## Decisiones tomadas con el usuario

| Tema | Decisión |
| --- | --- |
| Lo ya jugado | **Se mantiene todo.** Los rivales conservan puntos, goles y partidos jugados contra el que se va (incluidos los W.O. y la tabla inicial de la fecha 1). |
| Cómo sale un equipo | Se **da de baja**: no se borra ni se renombra. Renombrarlo le pasaría al nuevo los PJ y los resultados del viejo; borrarlo obligaría a borrar sus partidos y los rivales perderían esos puntos. |
| Cómo entra el nuevo | Como un equipo más de la zona, sin tabla inicial: arranca con 0 PJ. |
| Quién lo hace | Admins y superadmin (vos y Franco), desde **Equipos**. Los veedores no. |
| Deshacer | Un equipo dado de baja se puede volver a dar de alta. |
| Partidos pendientes | No se puede dar de baja un equipo con partidos sin resultado (incluye postergados): primero se les carga el resultado o se borran. |
| Nombres repetidos | Al agregar, no se acepta un nombre que ya tenga otro equipo de la misma categoría, esté o no dado de baja (sin distinguir mayúsculas, acentos ni espacios de más). |

## Qué se ve

- **Vista pública, Posiciones:** los dados de baja no tienen fila. Los nuevos aparecen con 0 PJ.
- **Vista pública, Fixture y Resultados:** sin cambios. Las fechas 1 y 2 siguen mostrando a los equipos que se fueron.
- **Panel, tablas** (Partidos y Ajustes, las dos que usan `calcularTabla`): igual que la pública.
- **Panel, Equipos:**
  - Arriba de la lista, **Agregar equipo**: un campo para el nombre y un botón. Se crea en la categoría y zona elegidas en el filtro. Aviso: "Agregaste CHIVERO F.C a +40 · Zona C."
  - En cada equipo, un botón **Dar de baja** con la confirmación del panel (como al quitar un escudo): "¿Dar de baja a GOB GUTIERREZ? Deja de aparecer en la tabla; sus partidos jugados quedan como están." Si tiene partidos sin resultado no se da de baja: "GOB GUTIERREZ tiene 1 partido sin resultado. Cargale el resultado o borralo antes de darlo de baja."
  - Al final, **Dados de baja (N)**, plegado, con el nombre de cada uno y el botón **Volver a dar de alta**.
- **Panel, Nuevo partido:** no ofrece equipos dados de baja.
- **Panel, Cuentas:** siguen apareciendo, con la marca "De baja", por si deben plata.
- **Panel, Control:** "Agregó el equipo CHIVERO F.C", "Dio de baja a GOB GUTIERREZ", "Volvió a dar de alta a GOB GUTIERREZ".

## Base de datos: migración 9 (`supabase/migracion-9-bajas.sql`)

- `equipos.baja boolean not null default false`.
- `validar_partido()` (esquema) suma un control: al crear un partido, o al cambiarle un equipo, ninguno de los dos puede estar dado de baja ("No se puede armar un partido con un equipo dado de baja"). Los partidos viejos se siguen pudiendo corregir.
- Los tres casos de arriba: da de baja los ids 88, 69 y 20 (controlando que el nombre sea el esperado, si no, falla sin cambiar nada) y crea los tres equipos nuevos en sus zonas (7, 9 y 2).
- Las reglas de acceso de `equipos` no cambian: admins y superadmin ya pueden crear y cambiar equipos; el veedor no.
- Como las otras migraciones, si se corre dos veces falla al principio sin cambiar nada.
- Orden: correr la migración antes de publicar el código. Mientras tanto, los equipos nuevos ya aparecen con 0 PJ y los dados de baja siguen apareciendo (el código viejo no conoce la columna).

## Lógica

- `calcularTabla` deja afuera a los equipos con `baja`. Los partidos contra ellos siguen sumando a los rivales.
- `src/logica/bajas.js` (nuevo), compartido por la pantalla y la API:
  - `partidosPendientes(partidos, equipoId)`: los partidos de ese equipo sin resultado (pendientes y postergados; un W.O. ya tiene resultado).
  - `textoPendientes(nombre, cantidad)`: el aviso de por qué no se puede dar de baja todavía.
  - `mismoNombre(a, b)`: compara nombres sin mayúsculas, acentos ni espacios de más.
- `describirActividad`: textos de alta de equipo y de cambio de `baja`.

## API

- `POST /admin/equipos` `{ zonaId, nombre }` → `201 { id }`. Sin veedores. Errores: "Elegí una zona válida.", "Escribí el nombre del equipo (hasta 60 letras).", "Ya hay un equipo CHIVERO F.C en +40." (409).
- `PUT /admin/equipos/:id/baja` `{ baja: true | false }`. Sin veedores. Errores: "Ese equipo no existe." (404) y el de partidos pendientes (409).
- `validarPartidoNuevo` rechaza equipos dados de baja: "GOB GUTIERREZ está dado de baja."
- `/api/publico` y `/admin/datos` devuelven `baja` en cada equipo.
- La simulación (`repositorioMemoria`) hace lo mismo.

## Herramienta `cargar-programacion.mjs`

Lee `baja` y no reconoce a los equipos dados de baja: si la programación nombra a uno, lo marca como problema y no arma el SQL.

## Pruebas (TDD)

- **Tabla:** un dado de baja no tiene fila; su rival conserva los puntos; un nuevo sin tabla inicial arranca en 0.
- **Lógica:** `partidosPendientes` con resultado, sin resultado, postergado y W.O.; textos de actividad.
- **Reglas y API:** agregar (zona inválida, nombre vacío o largo, repetido en la categoría, repetido en otra categoría sí se acepta); dar de baja con y sin pendientes; volver a dar de alta; veedor rechazado; partido nuevo con equipo dado de baja.
- **Base (PGlite):** la columna, el control de `validar_partido` al crear y al corregir un partido viejo, y los tres casos de la migración.
- **Panel:** agregar equipo, dar de baja con confirmación, el aviso de pendientes, la lista de dados de baja y volver a dar de alta; Nuevo partido sin los dados de baja.
- **A mano:** en `npm run simulacion`, dar de baja a un equipo, agregar otro y ver la tabla pública y la del panel.

## Fuera de alcance

- Borrar un equipo o cambiarlo de zona.
- Que el nuevo herede algo del que se va (escudo, delegado, cuenta).
- Controlar nombres repetidos al renombrar un equipo existente.
