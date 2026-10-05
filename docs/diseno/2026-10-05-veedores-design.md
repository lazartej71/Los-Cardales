# Diseño: cuentas de veedores, rojas con tipo y pago en dos partes

Fecha: 2026-10-05. Estado: aprobado por el usuario en el chat (partes 1 y 2); se prueba en la simulación antes de subirlo.

## Objetivo

Que los veedores carguen desde la cancha lo que pasa en cada partido: resultado (o W.O.), rojas y pago del arancel, sin poder tocar nada más. De paso:

- Las rojas dicen si fueron por doble amarilla o directas.
- Se dejan de cargar amarillas.
- Un equipo puede pagar el arancel de un partido en dos partes: una en efectivo y otra por transferencia.

## Decisiones tomadas con el usuario

| Tema | Decisión |
| --- | --- |
| Pantalla del veedor | Una sola sección, **Veedores**: elige el predio, después la cancha, y ve solo los partidos de esa cancha. Tiene un botón fijo arriba para volver a elegir otra cancha. |
| Qué partidos ve | Los de esa cancha en la fecha en juego, ordenados por hora y sin los postergados. También un postergado que se recupera en esa cancha, mientras no tenga resultado. |
| Qué carga | Resultado, W.O. ("no se presentó"), rojas y pago del arancel. |
| Correcciones | Puede cambiar o quitar el resultado, deshacer un W.O., borrar una roja que todavía no tiene sanción y cambiar o quitar un pago, siempre en los partidos que ve. |
| Lo que no puede | Crear, borrar o postergar partidos, cambiar el lugar o la hora, poner sanciones, avisar por WhatsApp, y entrar a Cuentas, Suspendidos, Equipos, Ajustes o Control. |
| Amarillas | Se dejan de cargar en **toda la app**. Las ya cargadas siguen apareciendo en el partido y se pueden borrar. |
| Rojas | Al cargarlas se elige **Doble amarilla** o **Roja directa** (obligatorio, para todos). Las viejas quedan sin tipo. |
| Pago en dos partes | En toda la app. Cada equipo, en cada partido, puede tener un pago en efectivo y otro por transferencia. Se muestra el total del día. |
| Seguridad | La restricción va también en la base (RLS y triggers), no solo en la pantalla. |

## Base de datos: migración 7 (`supabase/migracion-7-veedores.sql`)

- **Rol veedor:** `administradores.rol` acepta `'veedor'`. Función `es_veedor()` (`security definer`, como `es_superadmin()`).
- **`es_admin()`** pasa a ser verdadera solo para `admin` y `superadmin`. Así, todas las reglas de antes dejan afuera al veedor sin tocarlas una por una.
- **Lo que puede el veedor**, con reglas propias:
  - `partidos`: solo `update`. Un trigger (`validar_cambio_veedor`) rechaza cualquier cambio que no sea en `goles_local`, `goles_visitante` o `ausente`.
  - `expulsiones`: leer todas, agregar y borrar las que no tienen sanción (`fechas_suspension is null`). No las cambia.
  - `movimientos`: leer todos (para ver si un equipo debe de antes), y agregar, cambiar y borrar **pagos de un partido**. No anota deudas anteriores ni pagos sueltos.
  - Nada en `delegados`, `tarjetas`, `actividad`, `visitas` ni `configuracion` (esta última solo la lee, como el público).
- **Tipo de roja:** `expulsiones.tipo text check (tipo in ('doble_amarilla', 'directa'))`. Puede quedar vacío por las rojas viejas.
- **Pago en dos partes:** el índice único `movimientos_pago_partido_idx (partido_id, equipo_id)` se cambia por `movimientos_pago_partido_metodo_idx (partido_id, equipo_id, metodo)`. Queda un pago por medio de pago, por equipo y partido.
- El registro de actividad (migración 5) ya anota lo que hace el veedor con su nombre.
- Como las otras migraciones, si se corre dos veces falla al principio sin cambiar nada.

## Fecha en juego

`fechaEnJuego(fechas)` pasa a ser:

1. La última fecha que tiene algún resultado.
2. Si esa fecha ya está completa (todos sus partidos no postergados tienen resultado) y hay una fecha siguiente armada, la siguiente.
3. Si todavía no hay resultados, la primera fecha con partidos pendientes, como antes.

Así, un postergado de la fecha 1 que se reprograma no hace volver la fecha en juego a la 1. Vale también para la vista pública. Para los veedores se calcula con los partidos de todas las categorías juntas.

## Lógica (`src/logica/veedores.js`)

- `fechaDeVeedores(partidos)`: la fecha en juego de todo el torneo.
- `partidosDeCancha(partidos, predio, cancha)`: los que ve el veedor, ordenados por hora.
- `esPartidoDeVeedor(partidos, partido)`: si un partido está en alguna de esas listas. La usan la pantalla y la API.
- `resumenCancha(partidos, predio, cancha)`: cuántos partidos hay y cuántos falta cargar, para los botones.

## API

- El paso de sesión deja entrar a admins y veedores. El rol queda guardado para cada pedido (`admin`, `superadmin` o `veedor`) y `/admin/datos` lo devuelve.
- Con rol `veedor`:
  - `PATCH /partidos/:id`: solo goles (o quitarlos) y W.O., y solo en partidos que ve.
  - `POST /expulsiones`: en partidos que ve. `DELETE /expulsiones/:id`: si la roja es de un partido que ve y no tiene sanción.
  - `POST`, `PATCH` y `DELETE /movimientos`: solo pagos de partidos que ve.
  - Todo lo demás responde 403: "Tu cuenta de veedor no puede hacer esto."
- `POST /expulsiones` pide `tipo` (`doble_amarilla` o `directa`) a todos: "Elegí si la roja fue por doble amarilla o directa."
- Se quita `POST /tarjetas` (ya no se cargan amarillas). `DELETE /tarjetas/:id` queda para borrar las viejas.
- Pagos: un segundo pago del mismo medio en el mismo partido da 409 ("ya tiene un pago en efectivo anotado en este partido"). Con el otro medio se acepta.

## Panel

- **Veedor:** sin menú de abajo. Pantalla **Veedores · Fecha N**:
  1. Predio: Los Cardales y Cura Borges, cada uno con "N partidos · M por cargar".
  2. Cancha: las canchas del predio con el mismo resumen; las que no tienen partidos se ven apagadas.
  3. Partidos: barra fija arriba con "← Cambiar cancha" y el lugar elegido. Dos grupos, **Por cargar** y **Cargados**. Cada renglón se abre con el editor del veedor: resultado, W.O., rojas y arancel, sin Postergar, Borrar, Lugar y hora ni aviso por WhatsApp.
  - El celular recuerda el último predio y cancha (`localStorage`, con `try/catch`).
- **Rojas (todos):** el botón "+ Amarilla" desaparece. El formulario de la roja pide el tipo con dos botones. La lista dice "Roja directa · N° 10" o "Doble amarilla · N° 10" ("Roja · N° 10" las viejas). Una roja sin sanción se puede borrar desde el partido.
- **Arancel (todos):** dos campos por equipo, Efectivo y Transferencia, y el total del día. Un solo botón **Guardar pago** crea, cambia o borra cada parte según corresponda, con un solo aviso.
- **Cuentas:** el pago de un partido se ve como "$50.000 efectivo + $55.000 transferencia".
- **Suspendidos, aviso por WhatsApp y Control** muestran el tipo de roja.

## Simulación

- El cartel de la simulación tiene un selector **Ver como: superadmin / admin / veedor**. Cambia la sesión simulada y la base en memoria responde con ese rol.
- Lo que carga cada uno queda en Control como "Simulación (veedor)", "Simulación (admin)", etc.

## Pruebas (TDD)

- **Base (PGlite):** el veedor no es admin; cambia goles y W.O. pero nada más de un partido; no crea ni borra partidos; agrega rojas y borra solo las que no tienen sanción; anota, cambia y borra pagos de partidos pero no deudas ni pagos sueltos; no lee delegados ni amarillas. Dos pagos del mismo partido con medios distintos se aceptan y con el mismo no. El tipo de roja se controla. La migración falla si se corre dos veces.
- **Lógica:** fecha en juego con un postergado recuperado; partidos y resumen de cada cancha; pagos en dos partes en la cuenta.
- **Reglas y API:** tipo de roja obligatorio; segundo pago del mismo medio; permisos del veedor por ruta y por partido.
- **Panel:** los tres pasos del veedor; editor del veedor sin lo que no le corresponde; rojas con tipo; arancel con dos medios.
- **A mano:** en `npm run simulacion`, como veedor, cargar un partido completo con pago en dos partes.

## Publicación

1. Correr la migración 7 en Supabase **antes** de publicar el código.
2. Crear las cuentas de veedor como las de admin, pero con `rol = 'veedor'`.

## Fuera de alcance

- Asignar a cada veedor un predio o una cancha fija.
- Un veedor que corrige un partido recuperado ya cargado: después de cargarlo sale de su lista (lo corrige el organizador).
- Crear o dar de baja veedores desde el panel.
