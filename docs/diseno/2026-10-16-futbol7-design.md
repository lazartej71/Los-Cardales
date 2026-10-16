# Diseño: Fútbol 7 en la misma app

Fecha: 2026-10-16. Estado: **borrador para revisar**. Falta tu OK sobre las propuestas técnicas (A a H) y faltan los datos de Fútbol 7 (ver "Lo que falta para cerrar el diseño").

## Objetivo

Hoy la app maneja solo Fútbol 11 (Libre, +30, +35, +40 y +45). Se suma Fútbol 7 en el mismo sitio, el mismo panel y la misma base de Supabase:

- El público elige F11 o F7 con un toque y ve las categorías, zonas, tablas, fixture y resultados de esa modalidad.
- Franco (y los veedores, si se usan) cargan F7 con los mismos pasos que F11, con defensas para no cargar un resultado en la modalidad equivocada.
- Un club que juega las dos modalidades tiene una sola cuenta corriente, con el desglose por modalidad.
- Fútbol 11 sigue funcionando igual, con los mismos datos, ids, tablas, cuentas y pruebas.

## Lo que falta para cerrar el diseño

1. **Datos de Fútbol 7** (sección 7 del prompt): están todos sin completar. Sin ellos no se escribe la migración 10b. La respuesta sobre las **canchas** además cambia el diseño de la base (punto C).
2. **Los dos HTML de referencia** (`futbol7-mockups.html` y `prototipo-cardales.html`) no están en esta compu ni en el repo. Este borrador sale de la descripción del prompt. Al leerlos se ajustan los detalles visuales marcados como "a confirmar con las maquetas".
3. **Decisiones que necesitan tu OK** porque cambian lo pedido o lo que se construye:
   - D: la fecha en juego **por categoría**, no por modalidad. Además arregla un problema que ya existe hoy en Cargar.
   - G: el delegado, si es uno **por equipo** o uno por club.
   - La hoja de confirmación al guardar un resultado, si va **también en F11**.
   - La rama: el prompt pide `feature/futbol-7` y vos me pediste trabajar solo en `dev`.

## Decisiones tomadas con el usuario (del prompt)

| Tema | Decisión |
| --- | --- |
| Modalidad en la vista pública | Conmutador **F11 \| F7** en la cabecera, a la derecha del nombre del torneo. Un toque para cambiar. |
| Recordar la elección | El celular recuerda la última modalidad (`localStorage`, con el cuidado de `almacenLocal()`). La primera vez abre en F11. |
| Navegación | Se mantiene Categoría → Zona y la barra Posiciones / Fixture / Resultados. Las categorías dependen de la modalidad; la zona aparece solo si hay más de una. |
| Distinción visual | F11 conserva `--marca` (`#ffb21a`) y F7 usa `--info` (`#7cc8ff`). Una variable de acento cambia según la modalidad. Además, un chip con ícono junto al título de cada sección. Logo, botón primario, tipografías y radios no cambian. |
| Filtro del panel | Filtro de modalidad persistente debajo de la cabecera, guardado en `uiAdmin`. En Cargar solo F11 o F7; en Partidos, Cuentas, Suspendidos y Equipos, Todas, F11 o F7. |
| Anti-error de carga | Banner "Estás cargando en FÚTBOL 7", predios, canchas y equipos de la modalidad, hoja de confirmación antes de guardar y confirmación antes de descartar cambios sin guardar. |
| Veedores | Eligen la modalidad antes del predio y la cancha, y el celular recuerda la elección. |
| Cuentas | Una sola cuenta corriente por club, con desglose por modalidad. Al anotar un pago se elige a qué modalidad va. |
| Equipo y club | El club (identidad, cuenta, escudo y delegado) se distingue del equipo en una modalidad (zona y posiciones). Al dar de alta un equipo de F7 se puede vincular con un club que ya juega F11. |
| Permisos | No cambian: quien administra F11 administra F7. |
| Control | Los textos del registro dicen la modalidad. |
| Reglas de juego | Iguales a F11: 3, 1 y 0 puntos, W.O. 3 a 0, los mismos criterios de desempate y la tabla por categoría y zona. Las categorías de una modalidad nunca se mezclan con las de la otra. |
| Fuera | Resultados en vivo, notificaciones, estadísticas nuevas y dependencias nuevas (no hacen falta). |

## Decisiones técnicas propuestas (esperan tu OK)

### A. Secuencia de despliegue

| Paso | Qué | Por qué es seguro |
| --- | --- | --- |
| 1 | Correr **10a** en Supabase (solo estructura). | El código publicado no la nota. Lee las categorías con columnas fijas (`id, nombre, orden`) y la configuración también. Los equipos los lee con `select('*')`, pero los arma campo por campo (`normalizarEquipo`), así que las columnas nuevas no le llegan a la pantalla. Todo lo que ya existe queda como F11. |
| 2 | **Publicar** el código nuevo (pasar `dev` a `main`; eso lo hacés vos). | Sin categorías de F7 el sitio se ve igual que hoy. El conmutador no aparece mientras F7 no tenga categorías (ver "Lo que asumí"). |
| 3 | Correr **10b** (datos de F7). | Desde ese momento aparece el conmutador. Si se corriera antes de publicar, el sitio viejo mostraría dos "Libre": por eso va último. Además 10b falla si 10a no se corrió. |
| 4 | Subir los escudos de los equipos de F7 que no los heredan (G). | |

El código nuevo también anda **sin 10a**. La vista previa de `dev` usa la base real y se va a probar antes de correr nada. En ese caso lee la modalidad como `'f11'`, sin arancel de F7 y sin clubes, igual que hoy. Es el mismo criterio de las migraciones 3, 7, 8 y 9.

### B. Modalidad en la base

- `categorias.modalidad text not null default 'f11' check (modalidad in ('f11', 'f7'))`.
- Se cambia la unicidad: sale `unique (nombre)` y entra `unique (modalidad, nombre)`. Así puede haber una "Libre" en cada modalidad.
- Zonas, equipos y partidos **no** llevan la columna: la modalidad sale de la categoría (la zona tiene categoría, el equipo tiene zona y el partido tiene categoría). No se duplica el dato.
- Ids explícitos para F7, como en `datos-iniciales.sql`: categorías desde la 6 y zonas desde la 11. El `orden` sigue la numeración (6, 7…), así en las listas mezcladas F7 va después de F11.
- `validar_partido()` ya exige que los dos equipos sean de la categoría del partido y no estén dados de baja. Suma un control: la cancha tiene que ser de la modalidad del partido (punto C).
- En las listas que muestran las dos modalidades juntas (Todas en Partidos, Suspendidos y Cuentas, y los textos de Control), la categoría lleva la modalidad: "F7 · Libre". Donde ya se eligió la modalidad, queda "Libre".

### C. Canchas de F7: depende de tu respuesta

**C1. Si son canchas distintas de las de F11** (lo más simple):

- Cada cancha de F7 tiene un número propio que no choca con los de F11 (por ejemplo 21, 22, 23) y se muestra con su nombre ("F7-1", "F7-2"). `PREDIOS` suma la lista de canchas de F7 de cada predio, y la migración suma esos números a `partidos_cancha_check`. Si F7 se juega en un predio que no está, se suma ese predio.
- El trigger rechaza una cancha de F11 en un partido de F7 y al revés.
- El índice de cancha ocupada queda como está. Como los números no se repiten entre modalidades, F7 y F11 nunca chocan, y dentro de F7 controla por fecha como hoy.

**C2. Si son las mismas canchas, o mitades de una de F11:**

- El control de cancha ocupada compara el **número de fecha**, y F7 va a tener su propia numeración: la fecha 1 de F7 puede jugarse el mismo fin de semana que la fecha 6 de F11. Esto ya pasa dentro de F11: este fin de semana Libre juega la fecha 5 y el resto la 4. Para detectar un choque real hace falta saber **qué día** se juega cada fecha.
- Propuesta: una tabla `jornadas (categoria_id, fecha, dia)` que se completa al armar cada fecha. El control de cancha ocupada pasa a ser por día real, con un trigger en la base y la regla en la API.
- Si F7 usa mitades ("2A" y "2B" dentro de la 2), se agrega qué canchas de F7 ocupan cada cancha de F11.
- Si los horarios de F7 no coinciden con los turnos de F11 (por ejemplo 14:00 contra 13:40), hace falta la duración de cada partido para saber si se pisan.
- Es bastante más trabajo: toca el alta de partidos, la herramienta de programación y la base. Si es tu caso, lo cerramos aparte antes de implementar.

### D. Fecha en juego por categoría (en lugar de por modalidad)

- **Hallazgo con los datos reales del 16/10:** la fecha en juego única de Cargar y Veedores da **4**. Entonces muestra los 12 partidos de Libre de la fecha 4, que ya están cargados, y **no muestra los 12 de Libre de la fecha 5** de este fin de semana. Hoy Franco tiene que cargar esos partidos desde Partidos.
- Una fecha por modalidad no alcanza, porque dentro de F11 las categorías ya van desfasadas.
- Propuesta: `fechasEnJuego(partidos)` devuelve la fecha en juego de **cada categoría** (`fechaEnJuego` de sus partidos, la misma regla de hoy). En cada cancha, Cargar y Veedores muestran los partidos de la fecha en juego de su propia categoría. F7 queda separado solo, porque sus categorías son otras.
- Pantalla: el título deja de decir una sola fecha ("Cargar resultados · Fútbol 11"). Cada renglón suma la fecha a la categoría que ya muestra: "Libre · Fecha 5".
- La API usa lo mismo para los permisos del veedor (`esPartidoDeVeedor`), así que pantalla y servidor no se pueden desfasar.
- Una categoría sin fecha siguiente armada sigue mostrando su última fecha, toda en "Cargados" (como hoy).
- Se puede hacer **antes** de F7, como arreglo chico (ver "Etapas").

### E. Arancel por modalidad

- `configuracion.arancel_f7 integer` (de 0 a 10.000.000), que puede quedar vacío. Vacío quiere decir "el mismo que F11".
- `calcularCuentas` y `detalleCuenta` reciben, además del `arancel` de siempre, `arancelDe(partido)` (opcional), que da el arancel según la modalidad de la categoría del partido. Sin él se comportan igual que hoy, así que las cuentas y las pruebas de F11 no cambian.
- **Ajustes:** un segundo campo, "Arancel de Fútbol 7", con "Igual que Fútbol 11" tildado de entrada (guarda vacío). Lleva el mismo aviso de hoy: cambiarlo recalcula las cuentas de F7.
- El bloque Arancel del partido y la cuenta de cada equipo muestran el arancel de la modalidad del partido.
- No se toca nada cargado: el arancel de F11 sigue igual y los pagos no se modifican.

### F. Cuentas unificadas por club

- Tabla nueva `clubes (id, nombre)` y columna `equipos.club_id`, que puede quedar vacía y apunta a `clubes`. Solo se completa al vincular un equipo de F7 con uno de F11.
- Permisos de `clubes`: la lee cualquiera y la escriben solo los admins, como `equipos`. Los veedores no la escriben. Los cambios quedan en el registro de actividad.
- `movimientos` no cambia. Cada pago y cada deuda sigue colgando de un equipo, y de ahí sale la modalidad.
- **Lógica:** cada cuenta es un club (la suma de sus equipos) o un equipo sin club (como hoy), con el saldo total y el saldo de cada modalidad.
- **Cuentas (lista):** se usa el filtro de modalidad del panel, más la categoría con una opción "Todas".
  - Con Todas, cada renglón muestra el total y debajo "F11 $X · F7 $Y".
  - Con F11 o F7, muestra solo esa parte.
  - El total adeudado de arriba sigue el filtro.
- **Cuenta de un club:** el total arriba y una sección por equipo (modalidad y categoría), cada una con sus deudas anteriores, partidos y pagos sueltos.
  - "Anotar pago suelto" y "Anotar deuda anterior" piden a qué modalidad van.
  - Si el club tiene más de un equipo en esa modalidad, se elige el equipo.
- Un club puede tener varios equipos de F11, como BRANCA en Libre y BRANCA F.C en +35. Solo entran al club los equipos que se vinculan; los demás siguen con su cuenta propia, como hoy. Así las cuentas de F11 no cambian.

### G. Escudo y delegado de un club con dos equipos

**Escudo: se hereda al leer.** No se copia el archivo ni se comparte.

- Si un equipo con club no tiene escudo propio, la API le pone el del otro equipo del club que tenga uno, primero el de F11.
- No se toca Storage y no hay archivos compartidos. `subirEscudo` puede seguir borrando el archivo anterior sin romper otro equipo.
- Franco puede vincular equipos aunque los escudos los maneje solo el superadmin.
- Si el superadmin sube un escudo propio para el equipo de F7, gana ese.
- La API marca cuál es heredado (`escudoPropio`). En Equipos, el superadmin ve "Usa el escudo de BRANCA (F11)", con **Subir escudo propio**. **Quitar** solo aparece cuando el escudo es propio.

Alternativas descartadas:
- **Copiar el archivo:** Franco no puede escribir en Storage, así que vincular necesitaría al superadmin.
- **Contar referencias:** el trigger de la migración 8 no deja a Franco crear un equipo con escudo.

**Delegado: propongo uno por equipo** (como hoy) y que al vincular se copie el del equipo de F11 como punto de partida, que después se puede cambiar.

- Motivo: el plantel de F7 suele tener otro delegado, y el aviso de una roja de F7 tiene que llegarle al de F7.
- La alternativa es un delegado por club, que cambia la tabla `delegados` y el aviso.
- El prompt pone el delegado en el club, así que **esto necesita tu OK**.

### H. Datos ya cargados y tolerancia

- **Lectura:**
  - Categorías y configuración pasan a `select('*')`: si 10a no se corrió, la modalidad es `'f11'` y el arancel de F7 queda vacío.
  - Los equipos suman `clubId`, que queda vacío si la columna no existe.
  - `clubes` se lee con tolerancia: si la tabla no existe, la lista queda vacía, como `esVeedor()` cuando falta la migración 7.
  - `normalizarEquipo` y `normalizarPartido` siguen igual, más los campos nuevos.
- **Nombre repetido:** hoy se controla dentro de la categoría, y "Libre" de F7 es otra categoría. Por eso el mismo nombre en F7 y en F11 **ya** se acepta sin cambiar `validarEquipoNuevo`. El vínculo no depende del nombre: se elige el equipo de F11 de una lista.
- **Alta vinculada:** `POST /admin/equipos` acepta `{ zonaId, nombre, vincularCon }`, donde `vincularCon` es el id del equipo de F11.
  - Reglas: la zona es de F7, y el equipo de F11 existe, es de F11 y no está de baja.
  - Lo hace una función de la base, `crear_equipo_vinculado`, que corre con los permisos de quien la llama (valen las reglas RLS) y hace todo junto o nada:
    - crea el club si no existe, con el nombre del equipo de F11;
    - crea el equipo de F7;
    - deja a los dos con ese club;
    - copia el delegado.

## Qué se ve

### Vista pública

- **Cabecera:** el nombre del torneo y, a su derecha, el conmutador **F11 | F7**: botones con `aria-pressed`, de al menos 44 px de alto. En el celular van en la misma fila y el nombre se achica si no entra (a confirmar con las maquetas).
- **Cambiar de modalidad:**
  - Vuelve a la primera categoría de esa modalidad, a su primera zona y a la fecha en juego.
  - Se queda en la sección donde estaba (Posiciones, Fixture o Resultados).
  - Se guarda en el celular (`lc-modalidad`).
- **Acento:** la raíz de la vista lleva la modalidad (`data-modalidad`) y los estilos usan `--acento`, `--acento-fuerte`, `--acento-suave`, `--acento-borde`, `--acento-degrade` y `--sobre-acento`.
  - En F11 valen lo mismo que hoy (`--marca`, el degradé del logo, etc.), así que **F11 se ve idéntico**.
  - En F7 son los celestes (`--info`, `--info-suave` y un degradé celeste).
  - Se usan en la raya de la cabecera, el conmutador, los selectores activos, la barra inferior y "los puntos". Interpreto "los puntos" como la columna PTS de la tabla; lo confirmo con las maquetas.
- **Chip** junto al título de Posiciones, Fixture y Resultados: ícono de pelota y "FÚTBOL 7", o "FÚTBOL 11" en F11 (ver "Lo que asumí").
- **Contraste:** el celeste `#7cc8ff` sobre el fondo `#060a22` y el texto oscuro sobre celeste pasan AA con margen.
- **Foco:** hoy el anillo de foco es celeste (`--foco: #7cc8ff`). En F7, sobre un botón activo celeste, casi no se vería, así que en F7 el foco pasa a blanco.

### Panel

- **Filtro de modalidad** (componente nuevo `FiltroModalidad`): una fila debajo de la cabecera, arriba de las secciones.
  - Se guarda en `uiAdmin.modalidad` (`'todas'`, `'f11'` o `'f7'`), junto con la última modalidad concreta elegida.
  - Mientras F7 no tenga categorías, no aparece.
- **Cargar:**
  - Solo F11 o F7. Si se entra con Todas, pasa a la última modalidad elegida (F11 la primera vez) y avisa con el Toast: "Cargar no tiene Todas: estás en Fútbol 11."
  - Arriba, el banner "Estás cargando en FÚTBOL 7" (o 11) con el acento.
  - Se ven los predios y canchas de la modalidad, y en cada cancha sus partidos (D).
- **Hoja de confirmación** al guardar un resultado o un W.O. en `EditorPartido`:
  - Muestra la modalidad en grande, la categoría, las zonas, la fecha, la cancha y el marcador, con **Confirmar** y **Volver**.
  - Los pagos y las rojas no la piden.
  - Propongo que valga en Cargar, Partidos y Veedores, también en F11: un toque más por resultado (ver "Lo que falta…").
- **Cambios sin guardar:** si se tocaron los goles sin guardar y se cierra el partido, se cambia de cancha o se cambia de modalidad, aparece "¿Descartar el resultado sin guardar?".
- **Partidos, Cuentas, Suspendidos y Equipos:** Todas, F11 o F7 limita las categorías que se ofrecen. Con Todas aparecen las de las dos modalidades, las de F7 como "F7 · Libre". En Suspendidos, el filtro de categoría que ya tiene se arma con las categorías de la modalidad.
- **Equipos:**
  - Al agregar un equipo a una zona de F7 aparece el interruptor "Este club ya juega en Fútbol 11". Al prenderlo:
    - se elige el equipo de F11 en una lista con buscador (solo los que están en juego);
    - el nombre se propone igual y se puede cambiar.
  - La tarjeta de un equipo con club dice "Club: BRANCA · también juega Fútbol 11 (Libre)". Tiene **Desvincular** para corregir un vínculo mal hecho (ver "Lo que asumí").
- **Ajustes:** el arancel de F7 (E).
- **Control:** cada texto lleva la modalidad: "Cargó el resultado de X vs Y (F7 · Libre, fecha 2)" y "(F11 · Libre, fecha 5)". Por eso cambian algunas pruebas de `actividad.js`, y es un cambio justificado. Suma los textos "Vinculó X (F7) con el club BRANCA" y "Desvinculó…".
- **Veedores:**
  - Antes del predio eligen Fútbol 11 o Fútbol 7 con dos botones grandes, que muestran cuántos partidos tienen por cargar.
  - El celular recuerda la modalidad junto al predio y la cancha (`canchaGuardada.js` suma `modalidad`).
  - Si F7 no tiene categorías, ese paso no aparece.

## Base de datos

### Migración 10a: estructura (`supabase/migracion-10a-futbol7-estructura.sql`)

- `categorias.modalidad` con su check, y la unicidad `(modalidad, nombre)` en lugar de `(nombre)`.
- `configuracion.arancel_f7`.
- Tabla `clubes` con RLS: lectura pública y escritura solo de admins. Se suma `clubes` al trigger del registro de actividad.
- `equipos.club_id` (FK a `clubes`, puede quedar vacía).
- Función `crear_equipo_vinculado(zona_id, nombre, vincular_con)`: corre con los permisos de quien la llama, valida y hace todo junto.
- `validar_partido()`: la cancha tiene que ser de la modalidad. En C1, además, `partidos_cancha_check` suma los números de las canchas de F7.
- No toca datos. Si se corre dos veces, falla al principio ("already exists") sin cambiar nada.

### Migración 10b: datos de F7 (`supabase/migracion-10b-futbol7-datos.sql`)

- La genera un script versionado, `scripts/generar-futbol7.mjs`, a partir de un archivo de datos que queda en el repo: `datos/futbol7.csv`, con las columnas de la sección 7.
- El script lee los equipos actuales de F11 de la base real (solo lectura, clave pública), como `cargar-programacion.mjs`.
- **Contenido**, en una sola transacción:
  - categorías desde la 6 y zonas desde la 11;
  - equipos con id explícito desde el siguiente libre al generar el SQL;
  - clubes y vínculos con F11 (con la copia del delegado);
  - la tabla inicial, si F7 ya arrancó;
  - el fixture, si lo pasás.
- **Controles del script**, que no genera nada si hay errores:
  - nombres repetidos en una categoría de F7 (como `mismoNombre`);
  - categorías o zonas que no existen o están repetidas;
  - "(también F11)" sin un equipo de F11 con ese nombre exacto (muestra los parecidos, no adivina);
  - un equipo en dos zonas de la misma categoría.
- **Controles del SQL**, que no carga nada si alguno falla:
  - que 10a esté corrida;
  - que los ids de equipos estén libres (y al final, `setval` de la secuencia);
  - que cada equipo de F11 a vincular siga teniendo el id y el nombre esperados.
- Al final, el script imprime un resumen: equipos por categoría y zona, clubes vinculados y advertencias.

## Lógica (`src/logica/`)

- `modalidades.js` (nuevo):
  - la lista de modalidades;
  - la modalidad de una categoría, de un equipo y de un partido;
  - las categorías de una modalidad;
  - el nombre de una categoría con o sin la modalidad;
  - leer y guardar la modalidad elegida en el celular, con `try/catch`.
- `consultas.js`: `fechasEnJuego` por categoría (D).
- `veedores.js`: las listas del veedor por modalidad y con la fecha en juego de cada categoría.
- `cuentas.js`: `arancelDe` (E) y las cuentas por club con desglose por modalidad (F).
- `lugar.js`: canchas por modalidad (C1).
- `actividad.js`: la modalidad en los textos, y los vínculos con clubes.
- Herencia de escudos (G): una función pura que usan los dos repositorios.

## API (`server/`)

- `/api/publico`:
  - suma la modalidad de cada categoría y el arancel de F7;
  - los equipos llevan `clubId`, el escudo heredado y `escudoPropio`.
  - Crece con los datos de F7 (hoy pesa unos 44 KB). Conviene tenerlo en cuenta en el control de Egress que venís haciendo.
- `/api/admin/datos`: suma `clubes`.
- `POST /admin/equipos`: acepta `vincularCon` (H).
- `PATCH /admin/equipos/:id/club`: desvincula; sin veedores.
- `PATCH /admin/configuracion`: acepta `arancelF7`, que puede ser un número o vacío.
- Crear partido y cambiar el lugar: la cancha tiene que ser de la modalidad. El error sería "Elegí una cancha de Fútbol 7 de Los Cardales."
- Veedores: permisos con la fecha en juego de cada categoría (D).
- `repositorioMemoria.js`: lo mismo que la base real.

## Simulación

- Arranca, como hoy, con una copia de los datos reales.
- Mientras la base real no tenga F7 (antes de 10b), suma **datos de ejemplo de F7** solo en memoria. Tienen nombres claramente ficticios ("F7 A1", "F7 B2"…), como `datosEjemplo.js`:
  - una categoría con dos zonas y una fecha armada con lugar y hora;
  - un equipo vinculado a uno real de F11, para probar la cuenta unificada.
- Con F7 cargado en la base real, usa esos datos y no agrega ejemplos.
- "Ver como" sigue con los tres roles.

## Herramientas fuera del repo (`.superpowers/`)

- `cargar-programacion.mjs` reconoce la categoría por el título ("FECHA 5 LIBRES"). Con F7, "Libre" existe dos veces. Propongo que un título con "F7" vaya a F7 y que sin eso sea siempre F11, para que lo que manda hoy el organizador siga andando.
- `verificar-base.mjs` suma la modalidad y la fecha en juego por categoría.

## Pruebas (TDD)

- **Base (PGlite):**
  - 10a es inocua: las consultas del código viejo devuelven lo mismo y todo queda en F11.
  - `unique (modalidad, nombre)`: deja una "Libre" de F7 y no dos de la misma modalidad.
  - La cancha de la modalidad.
  - RLS de `clubes`.
  - `crear_equipo_vinculado`: todo o nada; el veedor no puede.
  - El arancel de F7.
  - 10b: carga, controles y vínculos.
  - Las dos fallan si se corren dos veces.
- **Lógica:**
  - modalidad de categoría, equipo y partido;
  - fecha en juego por categoría, con el caso real de Libre en la fecha 5 y el resto en la 4;
  - cuentas con arancel por modalidad y por club, donde el desglose suma el total y F11 sin club queda igual que antes;
  - herencia de escudos;
  - textos de Control;
  - canchas por modalidad.
- **API y reglas:**
  - alta vinculada y sus errores;
  - desvincular;
  - arancel de F7;
  - cancha de otra modalidad;
  - veedor fuera de la fecha en juego de su categoría;
  - lectura tolerante sin 10a.
- **Pantallas:**
  - conmutador y modalidad recordada;
  - acento y chip;
  - filtro del panel;
  - Cargar sin Todas y su aviso;
  - hoja de confirmación;
  - descartar cambios;
  - alta vinculada;
  - cuenta de un club;
  - Ajustes;
  - Veedores con la modalidad.
- **Las pruebas de F11 de hoy siguen pasando sin tocarlas.** Las excepciones justificadas son los textos de Control (D y la modalidad) y el título de Cargar.
- **A mano**, en `npm run simulacion`, con el celular (390 × 844) y la compu, y con los tres roles:
  - recorrer F7 en la vista pública;
  - cargar un resultado de F7 y ver que la tabla de F11 no cambia;
  - anotar un pago de F7 en un club.

## Etapas (un commit por etapa, `npm test` y `npm run lint` en cada una)

0. **Arreglo chico, si lo querés antes:** fecha en juego por categoría en Cargar y Veedores (D). Hace que aparezca Libre fecha 5. Se puede publicar solo.
1. Migración 10a y sus pruebas.
2. Lectura tolerante en los dos repositorios: modalidad, arancel de F7, clubes y herencia de escudos. Simulación con el ejemplo de F7.
3. Lógica: modalidades, cuentas por club y arancel, y textos de Control.
4. API y reglas: alta vinculada, desvincular, canchas por modalidad y arancel.
5. Vista pública: conmutador, recordar la modalidad, acento y chip.
6. Panel: filtro, Cargar (banner, confirmación y descartar), Partidos, Suspendidos, Equipos, Cuentas y Ajustes.
7. Veedores con la modalidad.
8. Script y migración 10b, cuando estén los datos.
9. README (orden de despliegue y la sección de F7) y cierre del documento.

## Publicación (orden exacto)

1. Correr `supabase/migracion-10a-futbol7-estructura.sql` en Supabase.
2. Publicar el código (pasar `dev` a `main`).
3. Correr `supabase/migracion-10b-futbol7-datos.sql`.
4. Subir los escudos de los equipos de F7 que no los heredan.

## Lo que asumí (revisalo)

- El conmutador **no aparece** mientras F7 no tenga categorías, así publicar el código antes de 10b no muestra una pestaña vacía. Con F7 cargado, está siempre visible.
- El chip y el banner dicen la modalidad **también en F11** ("FÚTBOL 11"), para no depender solo del color.
- Para mostrar las canchas de F7 uso "F7-1", "F7-2" (si es C1), hasta ver las maquetas.
- **Desvincular** va en el alcance: sin eso, un vínculo mal hecho por Franco se corrige solo por SQL.
- El club se crea con el nombre del equipo de F11. No se renombra desde el panel.
- Si vinculás un equipo de F7 con BRANCA (Libre), BRANCA F.C (+35) no entra al club salvo que también se vincule.

## Fuera de alcance

- Permisos por modalidad.
- Resultados en vivo, notificaciones y estadísticas nuevas.
- Armar el fixture de F7 automáticamente, salvo que lo pidas en la sección 7.
- Renombrar o borrar clubes desde el panel.
- Unir en un club equipos de F11 de distintas categorías sin un equipo de F7 de por medio.
