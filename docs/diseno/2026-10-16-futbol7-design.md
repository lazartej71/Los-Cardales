# Diseño: Fútbol 7 en la misma app

Fecha: 2026-10-16. Estado: **aprobado por el usuario el 16/10 e implementado en `feature/futbol-7`**, incluida la migración 10b con los datos de Gaby (17/10). Falta publicarlo en el orden del README. Incluye las respuestas del usuario del 16/10 y los datos que pasó Gaby (equipos, canchas y arancel). Faltan tu OK sobre el documento, la confirmación de las canchas y lo ya jugado de F7 (ver "Lo que falta para cerrar el diseño").

## Objetivo

Hoy la app maneja solo Fútbol 11 (Libre, +30, +35, +40 y +45). Se suma Fútbol 7 en el mismo sitio, el mismo panel y la misma base de Supabase. Cada modalidad tiene su propio organizador:

- **Fútbol 11:** lo organiza **Franco**, como hasta ahora.
- **Fútbol 7:** lo organiza **Gaby**, que cobra lo suyo y no comparte la plata con Franco.

Qué se busca:

- El público elige F11 o F7 con un toque y ve las categorías, zonas, tablas, fixture y resultados de esa modalidad.
- Cada organizador ve y toca **solo su modalidad**, incluida la plata. El superadmin (ljdev) ve todo.
- Fútbol 11 sigue funcionando igual, con los mismos datos, ids, tablas, cuentas y pruebas.

## Lo que falta para cerrar el diseño

1. ~~Confirmar las canchas~~: **confirmado el 16/10**, son canchas de F7 aparte de las de F11 (C1).
2. **Lo ya jugado de F7**, para la migración 10b (no hace falta para programar). Ya se jugaron las fechas 1, 2 y 3, y el usuario tiene los resultados. Falta:
   - los partidos y resultados de las fechas 1, 2 y 3, con los pendientes (FECHA LIBRE FC vs CRUZEIRO FC de la fecha 1);
   - en qué fecha entró BOBBY F.C en lugar de EL CHAÑAR.
   - El arancel de esas tres fechas **ya lo cobró Gaby** (16/10): 10b carga cada partido jugado con el pago de los dos equipos, así nadie queda debiendo.
3. **Los dos HTML de referencia** (`futbol7-mockups.html` y `prototipo-cardales.html`): no están en esta compu ni en el repo. Este documento sale de la descripción del prompt, y los detalles visuales marcados "a confirmar con las maquetas" se ajustan si aparecen.
4. **Tu OK sobre este documento.**

## Datos de Fútbol 7 (de Gaby, 16/10)

Es un campeonato aparte del de F11: sus equipos no se vinculan con los de F11 aunque algún nombre se repita (por ejemplo CITY FC o SAN RAMÓN).

| Categoría | Zona | Equipos | Arancel por partido |
| --- | --- | --- | --- |
| Libre | A | LA COLOMBIA FC, SAN RAMÓN FC, MALA JUNTA, PJE LOLA MORA, BAJO LA PÓLVORA, LOS PIBES FC, CRUZEIRO FC | $65.000 |
| Libre | B | LOS AMIGOS, TRIANGULITO FC, LA JUJUY FC, LA BANDA DE ROJAS, EL BAJO FC, LAPRIDA FC, LA 330 FC, SMATA FC | $65.000 |
| +30 | Única | SAN RAMÓN, LA FLORIDA, EL CHAÑAR, B° SAN MARTIN, 20 DE JUNIO, EL BOSQUE FC, BOBBY FC, CITY FC | $60.000 |

Corregido el 17/10 con el PDF de resultados de las fechas 1 a 3:

- **+30:** el que sale es SPORTIVO EL CHAÑAR, que no jugó ningún partido, así que no se carga. Entra BOBBY FC en su lugar (el nombre se entendió por audio: a confirmar). EL CHAÑAR sigue en el campeonato.
- **FECHA LIBRE FC no es un equipo:** es el descanso de la zona A, que tiene 7 equipos. Sus "partidos" no se cargan. Si resultara un equipo de verdad, Gaby lo agrega desde Equipos.
- **Resultados** en `datos/futbol7-partidos.csv`: 30 partidos (25 con resultado, 2 de ellos por W.O.). Los 5 pendientes se cargan como postergados y sin lugar, como los de F11, así la fecha en juego no vuelve atrás.
- **Fecha 2:** LOS PIBES FC vs CRUZEIRO FC figura en la misma cancha y hora que otro partido. Se carga sin lugar hasta saber la cancha real.
- **Canchas:** Cura Borges 1, 2 y 3; Los Cardales 1 y 2. Los sábados, a las 15:30 y 16:30 (lo visto en la fecha 1).
- **Ya arrancó:** se jugaron las fechas 1 (sábado 10/10/2026), 2 y 3. En la fecha 1, FECHA LIBRE FC vs CRUZEIRO FC quedó sin día (pendiente). 10b carga cada partido con su resultado (no como tabla inicial), así la tabla, el fixture y los resultados de F7 se ven completos.

## Decisiones tomadas con el usuario

Del prompt, salvo lo que se cambió el 16/10 (marcado):

| Tema | Decisión |
| --- | --- |
| Modalidad en la vista pública | Conmutador **F11 \| F7** en la cabecera, a la derecha del nombre. Un toque para cambiar. (Cambió el 23/10: dos botones anchos debajo del nombre, y el título es siempre el del campeonato. Ver `2026-10-23-vista-publica-design.md`.) |
| Recordar la elección | El celular recuerda la última modalidad (`localStorage`, con el cuidado de `almacenLocal()`). La primera vez abre en F11. |
| Navegación | Se mantiene Categoría → Zona y la barra Posiciones / Fixture / Resultados. Las categorías dependen de la modalidad; la zona aparece solo si hay más de una. |
| Nombre (16/10) | Fútbol 7 es parte del mismo campeonato y no tiene nombre propio. En F7 la cabecera dice "Fútbol 7"; en F11 sigue el nombre del campeonato (hoy "Copa GP"). (Cambió el 23/10: dos botones anchos debajo del nombre, y el título es siempre el del campeonato. Ver `2026-10-23-vista-publica-design.md`.) |
| Distinción visual | F11 conserva `--marca` (`#ffb21a`) y F7 usa `--info` (`#7cc8ff`). Una variable de acento cambia según la modalidad. Hay un chip con ícono junto al título de cada sección. Logo, botón primario, tipografías y radios no cambian. |
| **Permisos (cambia el 16/10)** | Cada organizador ve y toca **solo su modalidad**: Franco, F11; Gaby, F7. Eso incluye partidos, equipos, cuentas, suspendidos y su arancel. El superadmin ve todo. La restricción va **también en la base** (reglas RLS), como con los veedores. El prompt decía "sin permisos por modalidad"; cambió porque son dos organizadores. |
| **Cuentas (cambia el 16/10)** | **Separadas:** cada equipo tiene su cuenta, como hoy en F11, y cada organizador cobra lo suyo. **No** hay cuenta única por club ni vínculo entre clubes: un club que juega las dos modalidades tiene un equipo en cada una, sin relación en la base. |
| Arancel (16/10, datos de Gaby) | F11 sigue con un arancel único ($105.000 hoy). En F7 cambia **por categoría**: Libre $65.000 y +30 $60.000. Cada organizador cambia el suyo (punto E). |
| Filtro del panel | El superadmin tiene el filtro Todas / F11 / F7, debajo de la cabecera. En Cargar no hay Todas. Franco y Gaby no lo ven: su panel ya está fijo en su modalidad. |
| Anti-error de carga | Banner "Estás cargando en FÚTBOL 7", predios, canchas y equipos de la modalidad, y confirmación antes de descartar cambios sin guardar. |
| Hoja de confirmación (16/10) | Antes de guardar un resultado o un W.O., con la modalidad en grande. Va en **F11 y en F7**: un toque más por resultado. |
| Delegado (16/10) | Uno por equipo, como hoy. |
| Fecha en juego (16/10) | **Por categoría.** Ya está hecho y publicado (etapa 0, ver D). |
| Veedores | Hoy no se usan. Si se usan, la cuenta de veedor también puede quedar fija en una modalidad (la misma columna que los organizadores). |
| Control | Lo ve solo el superadmin. Los textos del registro dicen la modalidad. |
| Reglas de juego | Iguales a F11: 3, 1 y 0 puntos, W.O. 3 a 0, los mismos criterios de desempate y la tabla por categoría y zona. Las categorías de una modalidad nunca se mezclan con las de la otra. |
| Rama (16/10) | Fútbol 7 se trabaja en **`feature/futbol-7`**. `dev` queda libre para arreglos urgentes. |
| Fuera | Resultados en vivo, notificaciones, estadísticas nuevas y dependencias nuevas (no hacen falta). |

## Decisiones técnicas propuestas (esperan tu OK)

### A. Secuencia de despliegue

| Paso | Qué | Por qué es seguro |
| --- | --- | --- |
| 1 | Correr **10a** en Supabase: estructura y permisos. | El código publicado no la nota. Lee las categorías y la configuración con columnas fijas. Los equipos los lee con `select('*')`, pero los arma campo por campo (`normalizarEquipo`). Todo lo que ya existe queda como F11. |
| 2 | **Publicar** el código nuevo (pasar a `main`). | Sin categorías de F7 el sitio se ve igual que hoy. El conmutador no aparece mientras F7 no tenga categorías. |
| 3 | Correr **10b** (datos de F7). | Desde ese momento aparece el conmutador. Si se corriera antes de publicar, el sitio viejo mostraría dos "Libre": por eso va último. 10b falla si 10a no se corrió. |
| 4 | Crear la cuenta de Gaby con la modalidad `f7` (pasos del README). | |
| 5 | Subir los escudos de los equipos de F7. | |

**Ojo con Franco:** 10a deja la cuenta `franco1` fija en F11. Desde ese momento, con el código viejo todavía publicado, Franco puede seguir cargando F11 como siempre. Lo único que pierde es cambiar los criterios de desempate (ver "Lo que asumí").

El código nuevo también anda **sin 10a**. La vista previa usa la base real y se va a probar antes de correr nada. En ese caso lee la modalidad como `'f11'`, el arancel de cada categoría vacío y las cuentas sin modalidad fija, igual que hoy. Es el mismo criterio de las migraciones 3, 7, 8 y 9.

### B. Modalidad en la base

- `categorias.modalidad text not null default 'f11' check (modalidad in ('f11', 'f7'))`.
- Se cambia la unicidad: sale `unique (nombre)` y entra `unique (modalidad, nombre)`. Así puede haber una "Libre" en cada modalidad.
- Zonas, equipos y partidos **no** llevan la columna: la modalidad sale de la categoría (la zona tiene categoría, el equipo tiene zona y el partido tiene categoría). No se duplica el dato.
- Ids explícitos para F7, como en `datos-iniciales.sql`: categorías desde la 6 y zonas desde la 11. El `orden` sigue la numeración (6, 7…), así en las listas del superadmin F7 va después de F11.
- `validar_partido()` ya exige que los dos equipos sean de la categoría del partido y no estén dados de baja. Suma un control: la cancha tiene que ser de la modalidad del partido (punto C).
- En las listas que muestran las dos modalidades juntas (el superadmin con Todas, y los textos de Control), la categoría lleva la modalidad: "F7 · Libre". Donde ya se eligió la modalidad, queda "Libre".
- Como los nombres de equipo se controlan dentro de cada categoría, el mismo nombre en F7 y en F11 ya se acepta sin tocar `validarEquipoNuevo`.

### C. Canchas de F7: C1 (canchas propias), confirmado

Gaby pasó Cura Borges 1, 2 y 3, y Los Cardales 1 y 2. **El 16/10 el usuario confirmó que son canchas de F7, distintas de las de F11** aunque compartan número: la cancha 1 de Cura Borges de F7 no es la cancha 1 de Cura Borges de F11.

**C1. Canchas distintas de las de F11** (lo elegido):

- Cada cancha de F7 tiene en la base un número propio que no choca con los de F11: Los Cardales 21 y 22, Cura Borges 21, 22 y 23. En pantalla se muestran como Gaby las nombra ("Cancha 1", "Cancha 2"…), porque en F7 ya está claro que son de F7. En las listas con las dos modalidades (superadmin con Todas, Control) llevan la modalidad, como propuso el usuario: "Cura Borges · Cancha 1 (7)" y "Cura Borges · Cancha 1 (11)".
- `PREDIOS` suma a cada predio su lista de canchas de F7 (número en la base y nombre), y la migración suma esos números a `partidos_cancha_check`.
- El trigger rechaza una cancha de F11 en un partido de F7 y al revés.
- El índice de cancha ocupada queda como está. Como los números no se repiten entre modalidades, F7 y F11 nunca chocan, y dentro de F7 controla por fecha como hoy.

**C2. Las mismas canchas, o mitades de una de F11** (descartado el 16/10; queda como referencia):

- El control de cancha ocupada compara el **número de fecha**, y F7 va a tener su propia numeración: la fecha 1 de F7 puede jugarse el mismo fin de semana que la fecha 6 de F11. Esto ya pasa dentro de F11 (Libre fecha 5 con el resto en la 4). Para detectar un choque real hace falta saber **qué día** se juega cada fecha.
- Propuesta: una tabla `jornadas (categoria_id, fecha, dia)` que se completa al armar cada fecha. El control de cancha ocupada pasa a ser por día real, con un trigger en la base y la regla en la API.
- Si F7 usa mitades ("2A" y "2B" dentro de la 2), se agrega qué canchas de F7 ocupan cada cancha de F11.
- Si los horarios de F7 no coinciden con los turnos de F11 (14:00 contra 13:40), hace falta la duración de cada partido para saber si se pisan.
- Además, con dos organizadores, un choque lo puede provocar uno sin ver los partidos del otro. El mensaje tendría que avisar "esa cancha ya la usa Fútbol 11 a esa hora" sin mostrar detalles de la otra modalidad.
- Es bastante más trabajo. Si es el caso, se cierra aparte antes de implementar.

### D. Fecha en juego por categoría: hecho

**Aprobado, hecho y publicado el 2026-10-16** (etapa 0, commit `8a80a40`, en `main`).

- Funciones nuevas: `fechaEnJuegoPorCategoria` (`consultas.js`), y `fechasDeVeedores` y `listaDeFechas` (`veedores.js`).
- Con fechas distintas, en Cargar y Veedores el título dice "Fechas 4 y 5" y cada renglón "Libre · Fecha 5". Con una sola fecha, todo se ve como antes.
- Motivo: con Libre en la fecha 5 y el resto en la 4, la fecha en juego única daba 4, y los 12 partidos de Libre de la fecha 5 no aparecían en Cargar.

Con F7 se suma la modalidad: cada categoría de F7 tiene su fecha en juego, sin cambios extra. El título pasa a "Cargar resultados · Fútbol 7", con las fechas en cada renglón.

### E. Arancel: único en F11, por categoría en F7

Gaby cobra distinto según la categoría (Libre $65.000, +30 $60.000), así que el arancel de F7 va en la categoría y no en `configuracion`:

- `categorias.arancel integer` (de 0 a 10.000.000), que puede quedar vacío.
  - En F11 queda vacío: vale `configuracion.arancel`, como hoy ($105.000). Nada cambia para Franco.
  - En F7, 10b carga 65.000 en Libre y 60.000 en +30.
  - Una categoría de F7 **no** usa el arancel de F11 si está vacía: con dos cajas, si Franco cambia el suyo, cambiaría el de Gaby. Mientras esté vacía, sus partidos no generan deuda, y en Ajustes Gaby ve "Cargá el arancel de +30".
- `calcularCuentas` y `detalleCuenta` reciben, además del `arancel` de siempre, `arancelDe(partido)` (opcional), que da el arancel de la categoría del partido. Sin él se comportan igual que hoy, así que las cuentas y las pruebas de F11 no cambian.
- **Ajustes:**
  - Franco ve el arancel de F11, como hoy.
  - Gaby ve uno por categoría de F7 (Libre y +30).
  - El superadmin ve todos.
  - Cada uno lleva el aviso de hoy: cambiarlo recalcula las cuentas de esa categoría (o de F11).
- El bloque Arancel del partido y la cuenta de cada equipo muestran el arancel de la categoría del partido.
- No se toca nada cargado: el arancel de F11 sigue igual y los pagos no se modifican.
- Si algún día F11 quisiera aranceles por categoría, sirve la misma columna.

### F. Cuentas por modalidad (sin club)

- **No cambia la base de las cuentas.** `movimientos` sigue colgando de un equipo, y de ahí sale la modalidad. No hay tabla de clubes.
- Franco ve las cuentas de F11 y Gaby las de F7. Las reglas de la base (I) no les dejan leer ni anotar pagos de la otra modalidad.
- **Cuentas (lista):** la misma pantalla de hoy, con las categorías de la modalidad de la cuenta. El superadmin, con Todas, ve las categorías de las dos.
- Un club que juega las dos modalidades aparece como dos equipos distintos, uno en cada modalidad, cada uno con su cuenta.

### G. Escudos y delegados

- **Escudos:** como hoy. Cada equipo de F7 tiene su escudo, y lo sube el superadmin desde Equipos (Gaby y Franco no suben escudos). Si un club ya tiene escudo en F11, se sube la misma imagen. No hay escudo heredado ni archivos compartidos, así que `subirEscudo` sigue igual.
- **Delegados:** uno por equipo, como hoy. Gaby carga los de F7 desde Equipos.

### H. Datos ya cargados y tolerancia

- **Lectura:**
  - Categorías y configuración pasan a `select('*')`: si 10a no se corrió, la modalidad es `'f11'` y el arancel de cada categoría queda vacío (vale el de `configuracion`, como hoy).
  - La modalidad de la cuenta se lee como el rol: si la columna no existe, la cuenta ve todo, como hoy.
  - `normalizarEquipo` y `normalizarPartido` no cambian.
- **Equipo nuevo:** `POST /admin/equipos` no cambia de forma. La regla nueva es que la zona tiene que ser de la modalidad de la cuenta (I).

### I. Permisos por modalidad (nuevo)

**Base (10a):**

- `administradores.modalidad text`, que puede quedar vacía, con `check (modalidad in ('f11', 'f7'))`.
  - Vacía quiere decir que ve las dos: el superadmin, o cualquier admin sin restricción.
  - 10a deja a `franco1` en `'f11'`. La cuenta de Gaby se crea después con `'f7'`.
- **Funciones** (`security definer`, como `es_admin()`):
  - `modalidad_admin()`: la modalidad de quien consulta, o vacío.
  - `puede_categoria(categoria_id)`, `puede_zona(zona_id)`, `puede_equipo(equipo_id)` y `puede_partido(partido_id)`: si la cuenta puede tocar esa fila. Es verdadero si la cuenta no tiene modalidad, o si la modalidad de la fila es la suya.
- **Reglas RLS:** a las reglas de hoy ("Solo admins modifican", "Solo admins", y las de veedores) se les suma ese control:
  - `partidos`: por su categoría.
  - `equipos`: por su zona. Al dar de alta un equipo todavía no tiene id: se controla la zona elegida, y en un cambio también la zona nueva.
  - `tabla_inicial` y `delegados`: por el equipo.
  - `expulsiones`, `tarjetas` y `movimientos`: por el equipo y por el partido.
  - `zonas`: solo las cuentas sin modalidad (nadie las cambia desde la app).
  - `categorias`: cambiar solo las de su modalidad, y un trigger deja que una cuenta con modalidad cambie **solo el arancel**. Crear, borrar o cambiar otra columna: solo las cuentas sin modalidad.
  - En las tablas privadas el control vale **también para leer**: Gaby no ve los pagos, deudas, delegados ni rojas de F11, y Franco no ve los de F7.
- **`configuracion`:** un trigger deja cambiar cada columna solo a quien corresponde:
  - el arancel de F11 y el nombre del campeonato: cuentas de F11 o sin modalidad;
  - los criterios de desempate, que valen para las dos: solo cuentas sin modalidad.

**API:**

- `/admin/datos` suma la modalidad de la cuenta, como ya suma el rol.
- Las reglas del servidor revisan la modalidad antes de cada cambio, con mensajes claros. Por ejemplo: "Tu cuenta es de Fútbol 7: no puede cambiar partidos de Fútbol 11."
- La base además lo frena (RLS). Como la API habla con Supabase con la sesión de quien entra, `leerAdmin` ya devuelve solo lo privado de su modalidad.

**Panel:**

- Con una cuenta de modalidad fija no aparece el filtro de modalidad, y se ven solo sus categorías, sus equipos, sus cuentas y sus suspendidos.
- Ajustes muestra solo lo que esa cuenta puede cambiar.
- Control y los escudos siguen siendo solo del superadmin.

**Simulación:** "Ver como" suma "Organizador F11 (Franco)" y "Organizador F7 (Gaby)".

## Qué se ve

### Vista pública

- **Cabecera:** el nombre y, a su derecha, el conmutador **F11 | F7**: botones con `aria-pressed`, de al menos 44 px de alto. (Cambió el 23/10: dos botones anchos debajo del nombre, y el título es siempre el del campeonato. Ver `2026-10-23-vista-publica-design.md`.)
  - En el celular van en la misma fila y el nombre se achica si no entra (a confirmar con las maquetas).
  - En F7, el nombre dice "Fútbol 7".
- **Cambiar de modalidad:**
  - Vuelve a la primera categoría de esa modalidad, a su primera zona y a la fecha en juego.
  - Se queda en la sección donde estaba (Posiciones, Fixture o Resultados).
  - Se guarda en el celular (`lc-modalidad`).
- **Acento:** la raíz de la vista lleva la modalidad (`data-modalidad`) y los estilos usan `--acento`, `--acento-fuerte`, `--acento-suave`, `--acento-borde`, `--acento-degrade` y `--sobre-acento`.
  - En F11 valen lo mismo que hoy, así que **F11 se ve idéntico**.
  - En F7 son los celestes (`--info`, `--info-suave` y un degradé celeste).
  - Se usan en la raya de la cabecera, el conmutador, los selectores activos, la barra inferior y "los puntos". Interpreto "los puntos" como la columna PTS de la tabla; lo confirmo con las maquetas.
- **Chip** junto al título de Posiciones, Fixture y Resultados: ícono de pelota y "FÚTBOL 7", o "FÚTBOL 11" en F11.
- **Contraste:** el celeste `#7cc8ff` sobre el fondo `#060a22` y el texto oscuro sobre celeste pasan AA con margen.
- **Foco:** hoy el anillo de foco es celeste (`--foco: #7cc8ff`). En F7, sobre un botón activo celeste, casi no se vería, así que en F7 pasa a blanco.

### Panel

- **Franco (F11) y Gaby (F7):** el panel queda fijo en su modalidad, sin filtro.
  - Arriba, el banner "Estás cargando en FÚTBOL 11" o "…FÚTBOL 7", con el acento.
  - La cabecera muestra la cuenta y su rol: "Franco · Organizador F11".
- **Superadmin:** el filtro Todas / F11 / F7 debajo de la cabecera, guardado en `uiAdmin.modalidad`, junto con la última modalidad concreta elegida.
  - En Cargar no hay Todas: si se entra con Todas, pasa a la última modalidad elegida (F11 la primera vez) y avisa con el Toast: "Cargar no tiene Todas: estás en Fútbol 11."
  - Mientras F7 no tenga categorías, el filtro no aparece.
- **Cargar:** se ven los predios y canchas de la modalidad, y en cada cancha los partidos de la fecha en juego de cada categoría (D).
- **Hoja de confirmación** al guardar un resultado o un W.O. en `EditorPartido`:
  - Muestra la modalidad en grande, la categoría, las zonas, la fecha, la cancha y el marcador, con **Confirmar** y **Volver**.
  - Vale en Cargar, Partidos y Veedores, en F11 y en F7. Los pagos y las rojas no la piden.
- **Cambios sin guardar:** si se tocaron los goles sin guardar y se cierra el partido, se cambia de cancha o se cambia de modalidad, aparece "¿Descartar el resultado sin guardar?".
- **Partidos, Cuentas, Suspendidos y Equipos:** se ofrecen las categorías de la modalidad de la cuenta. El superadmin, con Todas, ve las de las dos, las de F7 como "F7 · Libre". En Suspendidos, el filtro de categoría que ya tiene se arma igual.
- **Ajustes:** cada cuenta ve solo lo que puede cambiar (I).
- **Control:** cada texto lleva la modalidad: "Cargó el resultado de X vs Y (F7 · Libre, fecha 2)" y "(F11 · Libre, fecha 5)". Por eso cambian algunas pruebas de `actividad.js`, y es un cambio justificado.
- **Veedores, si se usan:**
  - con una cuenta fija en una modalidad, se ve solo esa;
  - sin modalidad, eligen F11 o F7 antes del predio con dos botones grandes, y el celular recuerda la elección (`canchaGuardada.js` suma `modalidad`).

## Base de datos

### Migración 10a: estructura y permisos (`supabase/migracion-10a-futbol7-estructura.sql`)

- `categorias.modalidad` con su check, y la unicidad `(modalidad, nombre)` en lugar de `(nombre)`.
- `categorias.arancel`, que puede quedar vacía (en F11 queda vacía).
- `administradores.modalidad`, que puede quedar vacía. Al final, `franco1` queda en `'f11'`.
- Funciones de permisos, reglas RLS con la modalidad y el trigger de columnas de `configuracion` (I).
- `validar_partido()`: la cancha tiene que ser de la modalidad. En C1, además, `partidos_cancha_check` suma los números de las canchas de F7.
- No toca datos del campeonato. Si se corre dos veces, falla al principio ("already exists") sin cambiar nada.

### Migración 10b: datos de F7 (`supabase/migracion-10b-futbol7-datos.sql`)

- La genera un script versionado, `scripts/generar-futbol7.mjs`, a partir de un archivo de datos que queda en el repo: `datos/futbol7.csv`, con categoría, zona y equipo.
- **Contenido**, en una sola transacción:
  - categorías desde la 6 y zonas desde la 11;
  - equipos con id explícito desde el siguiente libre al generar el SQL;
  - el arancel de cada categoría de F7 (Libre 65.000 y +30 60.000);
  - la tabla inicial, si F7 ya arrancó;
  - el fixture, si Gaby lo pasa.
- **Controles del script**, que no genera nada si hay errores:
  - nombres repetidos en una categoría de F7 (como `mismoNombre`);
  - categorías o zonas que no existen o están repetidas;
  - un equipo en dos zonas de la misma categoría.
- **Controles del SQL**, que no carga nada si alguno falla:
  - que 10a esté corrida;
  - que los ids de equipos estén libres (y al final, `setval` de la secuencia).
- Al final, el script imprime un resumen: equipos por categoría y zona, y advertencias.

## Lógica (`src/logica/`)

- `modalidades.js` (nuevo):
  - la lista de modalidades;
  - la modalidad de una categoría, de un equipo y de un partido;
  - las categorías de una modalidad;
  - si una cuenta puede tocar una categoría;
  - el nombre de una categoría con o sin la modalidad;
  - leer y guardar la modalidad elegida en el celular, con `try/catch`.
- `veedores.js`: las listas del veedor y de Cargar, por modalidad.
- `cuentas.js`: `arancelDe` (E).
- `lugar.js`: canchas por modalidad (C1).
- `actividad.js`: la modalidad en los textos.

## API (`server/`)

- `/api/publico`:
  - suma la modalidad y el arancel de cada categoría;
  - crece con los datos de F7 (hoy pesa unos 44 KB), a tener en cuenta en el control de Egress.
- `/api/admin/datos`: suma la modalidad de la cuenta.
- Reglas con permisos por modalidad en partidos, equipos, bajas, rojas, pagos, deudas y configuración. Un veedor con modalidad, igual.
- `PATCH /admin/categorias/:id`: nueva, solo para el arancel de una categoría (un número o vacío). La cuenta tiene que ser de la modalidad de la categoría, o sin modalidad.
- Crear partido y cambiar el lugar: la cancha tiene que ser de la modalidad. El error sería "Elegí una cancha de Fútbol 7 de Los Cardales."
- `repositorioMemoria.js`: lo mismo que la base real, con la modalidad de cada rol simulado.

## Simulación

- Arranca, como hoy, con una copia de los datos reales.
- Mientras la base real no tenga F7 (antes de 10b), suma **F7 solo en memoria** con las categorías, zonas, equipos, canchas y aranceles reales de Gaby (los de `datos/futbol7.csv`), más una fecha de prueba armada con lugar y hora para poder cargar resultados.
- Con F7 cargado en la base real, usa esos datos y no agrega ejemplos.
- "Ver como": superadmin, organizador F11, organizador F7 y veedor.

## Herramientas fuera del repo (`.superpowers/`)

- `cargar-programacion.mjs` reconoce la categoría por el título ("FECHA 5 LIBRES"). Con F7, "Libre" existe dos veces. Propongo que un título con "F7" vaya a F7 y que sin eso sea siempre F11, para que lo que manda hoy Franco siga andando.
- `verificar-base.mjs` suma la modalidad y la fecha en juego por categoría.

## Pruebas (TDD)

- **Base (PGlite):**
  - 10a es inocua: las consultas del código viejo devuelven lo mismo y todo queda en F11.
  - `unique (modalidad, nombre)`.
  - La cancha de la modalidad.
  - **Permisos:**
    - Gaby (f7) no lee ni cambia nada privado de F11, y no carga un resultado de F11;
    - Franco (f11), lo mismo con F7;
    - el superadmin, todo;
    - cada uno cambia solo su arancel, y los criterios solo la cuenta sin modalidad.
  - 10b: carga y controles.
  - Las dos fallan si se corren dos veces.
- **Lógica:**
  - modalidad de categoría, equipo y partido;
  - permisos por modalidad;
  - cuentas con arancel por modalidad, con F11 igual que antes;
  - textos de Control;
  - canchas por modalidad.
- **API y reglas:**
  - cada ruta con una cuenta de F7 sobre F11 y al revés (403 con su mensaje);
  - arancel de F7;
  - cancha de otra modalidad;
  - lectura tolerante sin 10a.
- **Pantallas:**
  - conmutador y modalidad recordada;
  - acento y chip;
  - panel fijo para Franco y Gaby y filtro del superadmin;
  - Cargar sin Todas;
  - hoja de confirmación;
  - descartar cambios;
  - Ajustes según la cuenta.
- **Las pruebas de F11 de hoy siguen pasando sin tocarlas.** La excepción justificada son los textos de Control, que suman la modalidad.
- **A mano**, en `npm run simulacion`, con el celular (390 × 844) y la compu, y con los cuatro roles:
  - recorrer F7 en la vista pública;
  - cargar un resultado de F7 como Gaby y ver que la tabla de F11 no cambia;
  - comprobar que Gaby no ve las cuentas de Franco.

## Etapas (un commit por etapa, `npm test` y `npm run lint` en cada una)

0. **Hecho y publicado el 2026-10-16:** fecha en juego por categoría en Cargar y Veedores (D).
1. Migración 10a (estructura y permisos) y sus pruebas.
2. Lectura tolerante en los dos repositorios (modalidad de categorías, de la cuenta y arancel de F7). Simulación con el ejemplo de F7 y los roles nuevos.
3. Lógica: modalidades, permisos, arancel por modalidad y textos de Control.
4. API y reglas: permisos por modalidad, canchas por modalidad y arancel.
5. Vista pública: conmutador, recordar la modalidad, acento, chip y nombre.
6. Panel: panel fijo por cuenta, filtro del superadmin, Cargar (banner, confirmación y descartar), Partidos, Suspendidos, Equipos, Cuentas y Ajustes.
7. Veedores con la modalidad.
8. Script y migración 10b, cuando estén los datos de Gaby.
9. README (orden de despliegue, cuenta de Gaby y la sección de F7) y cierre del documento.

## Publicación (orden exacto)

1. Correr `supabase/migracion-10a-futbol7-estructura.sql` en Supabase.
2. Publicar el código (pasar a `main`).
3. Correr `supabase/migracion-10b-futbol7-datos.sql`.
4. Crear la cuenta de Gaby (por ejemplo `gaby1`), con `rol = 'admin'` y `modalidad = 'f7'`.
5. Subir los escudos de los equipos de F7.

## Lo que asumí (revisalo)

- El conmutador **no aparece** mientras F7 no tenga categorías, así publicar el código antes de 10b no muestra una pestaña vacía. Con F7 cargado, está siempre visible.
- El chip y el banner dicen la modalidad **también en F11** ("FÚTBOL 11"), para no depender solo del color.
- Las canchas de F7 se muestran como las nombra Gaby ("Cancha 1"), y con "(7)" y "(11)" solo donde se ven las dos modalidades juntas.
- El arancel de F7 es por equipo y por partido, como el de F11.
- **Los criterios de desempate los cambia solo el superadmin**, porque valen para las dos modalidades. Hoy también los puede cambiar Franco: deja de poder.
- El nombre del campeonato ("Copa GP") es el de F11: lo cambian Franco y el superadmin. F7 no tiene nombre (dice "Fútbol 7").
- Un choque de canchas entre F7 y F11 (solo si es C2) se avisa sin mostrar los partidos de la otra modalidad.

## Fuera de alcance

- Cuenta única por club, vínculo entre clubes y escudo heredado: se descartó el 16/10 porque cada organizador cobra lo suyo.
- Permisos por categoría (solo por modalidad).
- Crear las cuentas de los organizadores desde el panel: se crean como hoy, con los pasos del README.
- Resultados en vivo, notificaciones y estadísticas nuevas.
- Armar el fixture de F7 automáticamente, salvo que Gaby lo pida.
