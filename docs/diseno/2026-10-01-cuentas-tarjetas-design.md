# Diseño: tarjetas, W.O. y cuentas de los equipos

Fecha: 2026-10-01. Estado: aprobado por el usuario (diseño y documento escrito).

## Objetivo

Que en cada partido se cargue todo junto: resultado, tarjetas y lo que pagó cada equipo. Con eso, la app lleva sola la cuenta de lo que debe cada equipo.

- **Quién lo usa:** desde la fecha 2 lo carga el organizador del campeonato, que no es técnico. Por eso las pantallas tienen que ser simples y con pocos pasos.
- **Fecha 1:** el desarrollador le va a pedir al organizador las deudas de la fecha 1, y se cargan como "deuda anterior".

## Decisiones tomadas con el usuario

| Tema | Decisión |
| --- | --- |
| Arancel | Cada equipo lo paga en cada partido que juega. Hay un solo valor por torneo, en Ajustes; hoy es $105.000. |
| Cuándo se cobra | Cuando el partido tiene resultado, o en cuanto ese equipo anota un pago de ese partido: la organización cobra al terminar, a veces antes de cargar el resultado. Un partido postergado no genera deuda, y uno sin resultado tampoco mientras el equipo no haya pagado. (Ajustado con el usuario el 2026-10-02.) |
| W.O. | El equipo que no se presentó no paga ni genera deuda. El otro gana 3 a 0 (3 puntos) y paga su arancel. |
| Cómo se lleva la plata | Cuenta corriente por equipo: lo cargado (aranceles y deudas anteriores) menos lo pagado. Nunca se pisa nada, así que queda el historial completo. |
| Pagos | Se anotan en el partido (uno por equipo) o como pago suelto. Cada pago tiene método: **efectivo** (viene marcado) o **transferencia**. |
| Deudas de la fecha 1 | Se cargan como "deuda anterior" cuando el organizador pase los datos. |
| Amarillas | Por jugador (número de camiseta y nombre si se sabe). Son solo registro: no suspenden. |
| Rojas | Son las expulsiones de siempre, con su suspensión, pero ahora se cargan desde el partido. El aviso por WhatsApp lo manda el admin cuando él quiere. |
| Privacidad | La plata y las tarjetas las ven solo los admins. |
| Panel | La pestaña **Expulsión** del menú de abajo pasa a ser **Cuentas**. |

## Cómo se usa

### El partido en el panel (Partidos y resultados)

Cada partido es un solo bloque con tres partes:

```
┌ BRANCA  vs  BARRIO POLICIAL ─────────────────────────┐
│ Resultado   [ 2 ]  –  [ 1 ]   [Guardar]              │
│ ¿No se presentó alguien? ▸                           │
│                                                      │
│ Tarjetas ▾                       2 amarillas · 1 roja│
│   BRANCA:  🟨 N° 7 · 🟥 N° 10 (Pérez)  [Avisar ✆]     │
│            [+ Amarilla] [+ Roja]                     │
│   BARRIO POLICIAL:  🟨 N° 4                          │
│            [+ Amarilla] [+ Roja]                     │
│                                                      │
│ Arancel ($105.000 por equipo) ▾                      │
│   BRANCA          pagó [ 95.000 ] (•Efectivo ○Transf.)│
│                   [Completo] [Guardar]  debe $10.000 │
│   BARRIO POLICIAL pagó [105.000 ] (•Efectivo ○Transf.)│
│                   [Completo] [Guardar]  al día       │
└──────────────────────────────────────────────────────┘
```

**Resultado**
- Se carga igual que hoy.
- **¿No se presentó alguien?** deja elegir cuál de los dos equipos faltó. Al elegirlo:
  - el resultado pasa a ser 3 a 0 para el otro equipo;
  - en la vista pública se ve como "3 – 0 (W.O.)".
- **Quitar resultado** borra también el W.O.
- Si después se cargan goles a mano, el partido deja de ser W.O.

**Tarjetas**
- Están cerradas. Cuando se cierran, muestran un resumen ("2 amarillas · 1 roja").
- **+ Amarilla** pide el número de camiseta (1 a 99) y el nombre, que es opcional.
  - Una amarilla mal cargada se borra (no se edita).
- **+ Roja** pide lo mismo y crea una expulsión como las de hoy, que aparece en **Suspendidos**. Ahí se deciden las fechas de suspensión.
  - Junto a cada roja queda el botón para mandar el aviso por WhatsApp al delegado, con el mismo mensaje de siempre.
  - Si el equipo no tiene el WhatsApp del delegado cargado, se avisa que hay que cargarlo en **Equipos**.

**Arancel**
- Para cada equipo hay un monto, el método de pago, un botón **Completo** (que pone el valor del arancel en el monto) y **Guardar**.
- Al lado se ve cómo queda la cuenta total del equipo: "debe $10.000", "al día" o "a favor $5.000".
- Si se borra el monto y se guarda, se quita el pago de ese partido.
- El pago se puede anotar antes de cargar el resultado. En cuanto se anota, el arancel de ese partido se le cobra a ese equipo: por ejemplo, si pagó $90.000, queda "debe $15.000".
- Si un equipo no se presentó, su casilla queda apagada con la leyenda "no se presentó: no paga".
- Si se paga una parte en efectivo y otra por transferencia, una se anota en el partido y la otra como pago suelto en **Cuentas**.

### Cuentas (pestaña nueva)

```
CUENTAS                      [Libre] +30 +35 +40 +45
Deben en Libre: $35.000       ☑ Solo los que deben
┌──────────────────────────────────────────┐
│ BRANCA                    debe $10.000 › │
│ LA PLAZA                  debe $25.000 › │
└──────────────────────────────────────────┘
```

**La lista**
- Se elige la categoría con los mismos botones que en el resto del panel.
- Arriba está el total adeudado de la categoría, y la opción "solo los que deben" viene tildada.
- Cada equipo muestra "debe" en rojo, "al día" en verde o "a favor", y se abre con un toque.

**La cuenta de un equipo**

```
BRANCA                                        debe $10.000
  Deuda anterior · fecha 1                    $10.000
  Fecha 2 vs Barrio Policial   pagó $95.000 de $105.000 · efectivo
  Fecha 3 vs La Plaza          pagó $115.000 de $105.000 · transferencia
  Fecha 4 vs Trula F.C         sin pago · se cobra cuando se juegue
  15/10 · pago suelto · transferencia         $10.000
  [Anotar pago suelto]  [Anotar deuda anterior]
```

El orden es siempre el mismo:
1. Las deudas anteriores.
2. Los partidos del equipo, por número de fecha, cada uno con lo que pagó.
3. Los pagos sueltos, por fecha del calendario.

Se muestran todos los partidos del equipo. Los que no se cobran dicen por qué: "postergado", "no se presentó: no paga" o "se cobra cuando se juegue".

**Pagos sueltos y deudas anteriores**
- **Anotar pago suelto** pide el monto, el método, la fecha (viene la de hoy) y una nota opcional, por ejemplo "pagó el delegado".
- **Anotar deuda anterior** pide el monto y una nota, por ejemplo "fecha 1".
- Un pago suelto o una deuda anterior se pueden borrar, con un aviso de confirmación antes.
- Lo pagado en un partido se corrige en el partido.

### Ajustes

Se agrega el campo **Arancel por equipo y partido**, en pesos.
- Como el arancel es uno solo por torneo, cambiarlo recalcula todas las cuentas.
- Debajo del campo va el aviso: "Cambiarlo recalcula todas las cuentas del torneo".

### Vista pública

- Un W.O. se muestra como "3 – 0" con la etiqueta **W.O.** y la leyenda "no se presentó *equipo*".
- La tabla de posiciones lo cuenta como un 3 a 0 común, sin cambios en el cálculo.
- Nada de la plata ni de las tarjetas aparece en la vista pública.

## La cuenta de cada equipo

La calcula una sola función pura, `calcularCuentas()` en `src/logica/cuentas.js`. La usan el editor del partido y la pantalla Cuentas.

**Qué se le cobra a un equipo**
- **Por partido:** el arancel, si el partido no está postergado, el equipo no es el que faltó en un W.O., y el partido tiene resultado o ese equipo ya anotó un pago de ese partido.
- **Deudas anteriores:** el monto de cada una.

**Qué se le descuenta:** cada pago, sea del partido o suelto.

**El saldo** es lo cobrado menos lo pagado:
- mayor que 0 → **debe**;
- igual a 0 → **al día**;
- menor que 0 → **a favor**, por ejemplo si pagó por adelantado un partido que después se postergó.

Ejemplo, con un arancel de $105.000:

| Movimiento | Cobrado | Pagado | Saldo |
| --- | --- | --- | --- |
| Deuda anterior (fecha 1) | 10.000 | – | debe 10.000 |
| Fecha 2, jugado, pagó 95.000 | 105.000 | 95.000 | debe 20.000 |
| Fecha 3, jugado, pagó 115.000 | 105.000 | 115.000 | debe 10.000 |
| Pago suelto | – | 10.000 | al día |
| Fecha 4, postergado, pagó 105.000 | – | 105.000 | a favor 105.000 |

## Modelo de datos (Postgres)

Todo va en un archivo nuevo, `supabase/migracion-2-cuentas.sql`, que se ejecuta una vez en el SQL Editor y dentro de una transacción.
- No modifica ni borra datos existentes: solo agrega columnas y tablas.
- Si se ejecuta dos veces, falla al principio ("already exists") y no cambia nada.
- Antes de entregarlo se prueba en PGlite, como `esquema.sql`.

**Columnas nuevas**
- `configuracion.arancel integer not null default 105000`, de 0 a 10.000.000.
- `partidos.ausente text`, que puede ser `'local'`, `'visitante'` o null. Una regla nueva de la base exige que, si hay ausente, el partido no esté postergado y el resultado sea 3 a 0 a favor del otro equipo.

**Tablas nuevas** (privadas: RLS "Solo admins", igual que `expulsiones`)

`tarjetas`, solo amarillas (las rojas siguen en `expulsiones`):
- `id`
- `partido_id` → partidos
- `equipo_id` → equipos
- `numero_camiseta` (1 a 99)
- `nombre_jugador` (texto, hasta 60, por defecto vacío)
- `creado_en`

Un trigger exige que el equipo haya jugado ese partido.

`movimientos`, la cuenta corriente:
- `id`
- `equipo_id` → equipos
- `partido_id` → partidos, o null
- `tipo`: `'pago'` o `'deuda_anterior'`
- `monto`: entero, de 1 a 10.000.000
- `metodo`: `'efectivo'` o `'transferencia'`; obligatorio en los pagos y vacío en las deudas anteriores
- `fecha` (date): la manda la app; viene con el día de hoy en hora argentina y se puede cambiar en los pagos sueltos
- `nota` (texto, hasta 100)
- `creado_en`

Reglas de la tabla:
- Una deuda anterior no tiene partido.
- Hay como máximo un pago por equipo y partido (índice único parcial).
- Un trigger exige que, en un pago de partido, el equipo haya jugado ese partido y no sea el que faltó.

**Borrado de partidos:** `tarjetas` y `movimientos` apuntan a `partidos` sin borrado en cascada. Un partido con expulsiones, tarjetas o pagos no se puede borrar, y el servidor explica qué hay que quitar primero.

**Permisos:** grants para `authenticated` en las dos tablas nuevas y sus secuencias. `anon` no tiene acceso.

## Servidor: cambios en las rutas

Todas las rutas son de admin, salvo la pública.

| Ruta | Qué hace |
| --- | --- |
| `GET /api/publico` | Suma `ausente` en cada partido y `arancel` en la configuración. Sigue sin expulsiones, tarjetas, pagos ni teléfonos. |
| `GET /api/admin/datos` | Suma `tarjetas` y `movimientos`. |
| `PATCH /api/admin/partidos/:id` | Acepta además `{ ausente: 'local' \| 'visitante' }`, que guarda el 3 a 0 y saca el postergado. Cargar goles o quitar el resultado borra el ausente. Responde 409 si el equipo que faltó tiene un pago anotado en ese partido. |
| `DELETE /api/admin/partidos/:id` | Responde 409 si el partido tiene expulsiones, tarjetas o pagos. |
| `POST /api/admin/tarjetas`, `DELETE /api/admin/tarjetas/:id` | Agregar y borrar amarillas. |
| `POST /api/admin/movimientos` | Anota un pago (de partido o suelto) o una deuda anterior. |
| `PATCH /api/admin/movimientos/:id` | Corrige monto, método, fecha o nota. |
| `DELETE /api/admin/movimientos/:id` | Borra un movimiento. |
| `PATCH /api/admin/configuracion` | Acepta además `arancel`. |

Las reglas nuevas van en `server/reglas.js`, con mensajes en castellano para el organizador:
- montos enteros y positivos;
- método obligatorio en los pagos;
- fecha válida;
- nota de hasta 100 caracteres;
- número de camiseta de 1 a 99;
- el equipo jugó ese partido;
- un solo pago por equipo y partido, que responde 409;
- no se le anota pago a un equipo que no se presentó.

## Cambios en la app

- **`EditorPartido`:** suma el W.O. y dos bloques nuevos en archivos propios, `BloqueTarjetas.jsx` y `BloqueArancel.jsx`.
- **Aviso por WhatsApp:** `AvisoWhatsApp` sale de `AdminCargarExpulsion.jsx` a un archivo propio, para usarlo dentro del partido.
- **Pantalla Expulsión:** se elimina `AdminCargarExpulsion`, junto con el estado `avisosRecientes` del panel.
- **Pantalla Cuentas:** es nueva, en `AdminCuentas.jsx` (la lista) y `CuentaEquipo.jsx` (la cuenta de un equipo y sus formularios).
- **Menú de abajo:** queda Partidos · Cuentas · Suspendidos · Equipos · Ajustes.
- **Acciones del panel (`useAcciones`):** suma marcar W.O., agregar y borrar tarjeta, y anotar, corregir y borrar movimiento.
- **Pesos:** se muestran con `formatearPesos()`, por ejemplo "$105.000", con el punto de miles de Argentina.
- **Vista pública:** el W.O. se muestra en el fixture, en los resultados y en el marcador.

## Simulación

La base en memoria (`server/repositorioMemoria.js`) suma `tarjetas` y `movimientos`, con sus valores por defecto y sus secuencias.
- Arranca vacía en las dos tablas, y con el arancel que tenga la base real.
- Así, en `npm run simulacion` se puede practicar todo lo nuevo sin tocar la base real.

## Seguridad

Se mantienen las dos capas de siempre: las reglas del servidor y RLS en la base.
- Las tablas nuevas no tienen ningún permiso para `anon`.
- La API pública arma su respuesta columna por columna, así que nunca incluye tablas privadas.
- El valor del arancel sí viaja en la API pública: no es un dato privado, porque lo conocen todos los equipos, y la simulación lo necesita. La vista pública no lo muestra.
- Se verifica en vivo, sin sesión: leer `tarjetas` y `movimientos` tiene que dar "permission denied".

## Pruebas

En cada parte, primero se escribe la prueba y se ve fallar, y después se programa.

- **`calcularCuentas`:** cada fila del ejemplo de arriba, más el W.O. (el ausente no paga y el otro sí), el pago adelantado de un partido postergado, el pendiente con pago y un arancel cambiado que recalcula.
- **Reglas:** cada regla nueva, con el caso válido y cada caso rechazado.
- **API:** rutas nuevas y modificadas, permisos (401 y 403) y que la pública no traiga tarjetas ni movimientos.
- **Base en memoria:** las tablas nuevas y lo que devuelve el panel.
- **Pantallas:** editor con W.O., tarjetas y arancel; Cuentas (lista, filtro y cuenta de un equipo); W.O. en la vista pública.
- **Migración:** `esquema.sql`, `datos-iniciales.sql` y la migración en PGlite, con la carga, los permisos de `anon` y de un no admin, los triggers, los checks y el índice único.
- **Recorrido completo:** en la simulación, con Chrome a 390 px:
  - cargar un partido con amarilla, roja y pago parcial;
  - cargar un W.O.;
  - anotar un pago suelto y una deuda anterior;
  - revisar las cuentas.

  Sin desbordes ni errores de consola, y comprobando al final que la base real no cambió.
- **En vivo, después de que el usuario corra la migración:** los permisos de `anon` en las tablas nuevas, y que `/api/publico` traiga `ausente` y no traiga datos privados.

## Fuera de alcance por ahora

- Acumulación de amarillas y suspensiones automáticas.
- Avisos de deuda por WhatsApp.
- Un resumen de caja: total cobrado por método o por fecha.
- Más de un pago por equipo en el mismo partido (para eso está el pago suelto).
- Editar una tarjeta (se borra y se vuelve a cargar).
- Historial de torneos anteriores, y un arancel distinto por partido o por categoría.

## Puntos a confirmar (no bloquean)

- Las deudas de la fecha 1, que las tiene el organizador.
- El texto exacto de las leyendas ("no se presentó: no paga", "se cobra cuando se juegue"), que se puede ajustar al revisar las pantallas.
