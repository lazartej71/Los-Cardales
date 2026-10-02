# Diseño: predio, cancha y hora de cada partido

Fecha: 2026-10-02. Estado: diseño aprobado por el usuario en el chat; falta que revise este documento.

## Objetivo

Que cada partido diga dónde y a qué hora se juega, y que el público lo vea destacado en el fixture. Ejemplo:

> BRANCA vs BARRIO POLICIAL · Predio Los Cardales · Cancha 2 · 13:40

## Decisiones tomadas con el usuario

| Tema | Decisión |
| --- | --- |
| Día | No se carga: todos los partidos de una fecha se juegan el mismo día, y la fecha ya lo dice. |
| Predios | Solo dos, fijos en el código: **Los Cardales** y **Cura Borges**. |
| Canchas | Lista fija por predio. Los Cardales: 1, 2, 3, 4, 5, 6 y 7. Cura Borges: 1, 4, 5, 7, 8 y 9. Si un predio suma una cancha, se cambia una línea de código. |
| Hora | Se escribe a mano (por ejemplo `13:40`). |
| Obligatorio | Predio, cancha y hora se piden siempre al agregar un partido. |
| Cambios | Se pueden editar después de crear el partido (por si mueven un horario). |
| Cancha ocupada | No se puede cargar la misma cancha del mismo predio a la misma hora en la misma fecha. |
| Postergados | Se cargan igual, con su lugar y hora. Al postergarlos conservan esos datos, pero el público ve el lugar tachado y la etiqueta POSTERGADO. Al reprogramarlos se cambia el lugar y la hora y se les quita la postergación; siguen en su fecha original, como hoy. |
| Partidos ya cargados | Los que no tienen lugar ni hora (los postergados de la fecha 1, lo que haya en la fecha 2) se pueden completar desde el partido. Mientras tanto se muestran como hoy. |
| Vista pública | Una sola app. En el fixture, el lugar y la hora van destacados (etiqueta de color, no letra chica gris), y los partidos de cada fecha se ordenan por hora. |
| Publicación | Nada se sube a GitHub y la migración no se corre en Supabase hasta que el usuario lo pida. Se trabaja en la rama local `predios` y se prueba con `npm run simulacion`. |

## Datos

### Constantes (`src/datos/constantes.js`)

```js
export const PREDIOS = [
  { id: 'los_cardales', nombre: 'Los Cardales', canchas: [1, 2, 3, 4, 5, 6, 7] },
  { id: 'cura_borges', nombre: 'Cura Borges', canchas: [1, 4, 5, 7, 8, 9] },
];
```

La app, la API y la simulación usan esta lista. La migración repite los mismos valores en la base.

### Migración 3 (`supabase/migracion-3-predios.sql`)

Columnas nuevas en `partidos`, que pueden quedar vacías por los partidos ya cargados:

- `predio text`: `los_cardales` o `cura_borges`.
- `cancha smallint`: tiene que ser una de las canchas de ese predio.
- `hora time`: hora del partido.

Reglas de la base:

- Van los tres datos o ninguno.
- La cancha tiene que ser una de las del predio, con las mismas listas que en las constantes.
- Índice único sobre `(fecha, predio, cancha, hora)` solo para los partidos con lugar que no están postergados: una cancha no puede tener dos partidos a la misma hora en la misma fecha.

Como las otras migraciones, solo agrega cosas, no toca datos y, si se corre dos veces, falla al principio sin cambiar nada.

## API (`server/`)

- **Lectura pública y del panel:** los partidos traen además `predio`, `cancha` y `hora` (como `"13:40"`, sin segundos).
- **Crear partido** (`validarPartidoNuevo`): pide `predio`, `cancha` y `hora`. Errores posibles:
  - "Elegí el predio."
  - "Elegí una cancha de Los Cardales." (cuando la cancha no es de ese predio)
  - "Escribí la hora como 13:40."
  - "La cancha 2 de Los Cardales ya tiene un partido a las 13:40 en la fecha 2." (409)
- **Cambiar el lugar** (`validarCambioPartido`): un pedido con `predio`, `cancha` y `hora` cambia solo eso, con las mismas validaciones. Al revisar la cancha ocupada no cuenta el mismo partido.
- La cancha ocupada solo cuenta partidos no postergados. Así, el lugar de un postergado queda libre para otro partido.

Las validaciones de lugar y hora quedan en una función propia, para no repetirlas entre crear y cambiar.

## Panel

- **Agregar partido:** debajo del local y el visitante aparecen:
  - **Predio:** dos botones, Los Cardales y Cura Borges.
  - **Cancha:** una lista con solo las canchas del predio elegido. Si se cambia el predio y la cancha elegida no existe en el otro, se borra la elección.
  - **Hora:** un campo para escribirla, por ejemplo `13:40`.
- **Editor del partido:** un bloque **Lugar y hora** con los mismos tres campos y el botón **Guardar lugar**. En los partidos viejos sin lugar aparece vacío para completarlo.
- **Renglón del partido:** muestra `Los Cardales · C2 · 13:40` junto al estado.
- **Orden:** dentro de cada fecha, por hora; los que no tienen hora van al final.

## Vista pública

- **Fixture:** cada partido lleva una etiqueta destacada con el lugar y la hora: **Los Cardales · Cancha 2 · 13:40**.
- **Postergado:** la etiqueta del lugar aparece tachada y se mantiene la de POSTERGADO.
- **Sin lugar:** si un partido no tiene lugar ni hora, no lleva etiqueta.
- **Orden:** los partidos de cada fecha se ordenan por hora; los que no tienen hora van al final.
- **Resultados:** no cambian, porque el lugar importa antes de jugar.

## Simulación

- La base en memoria acepta los campos nuevos.
- Los partidos de ejemplo de la simulación traen lugar y hora, para ver cómo queda el fixture.

## Pruebas (TDD)

- **Reglas:** crear con y sin lugar, cancha de otro predio, hora mal escrita, cancha ocupada (y que no cuente la de un postergado), cambiar el lugar.
- **Base (PGlite):** la migración 3 corre después de la 2, hace cumplir las reglas (los tres o ninguno, cancha del predio, índice único) y falla al correrla dos veces.
- **Vista pública:** la etiqueta aparece, tachada en un postergado, y el orden es por hora.
- **Panel:** el formulario muestra solo las canchas del predio elegido.
- **A mano:** probarlo en `npm run simulacion`.

## Fuera de alcance

- Agregar o quitar predios o canchas desde el panel.
- Mover un postergado a otra fecha del fixture.
- **Caso raro:** un postergado que se reprograma para otro día sigue en su fecha original. Si se le pone la misma cancha y hora que otro partido de esa fecha, la API lo rechaza, aunque en realidad se jueguen en días distintos. Si pasa, se le carga otra hora (por ejemplo, un minuto distinta).
