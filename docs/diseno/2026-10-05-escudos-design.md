# Diseño: escudos de los equipos

Fecha: 2026-10-05. Estado: aprobado por el usuario en el chat, después de ver la maqueta sobre la simulación.

## Objetivo

Que la tabla de posiciones y los resultados muestren el escudo de cada equipo, y que el superadmin los suba desde el panel con la imagen grande que tenga, sin tener que achicarla antes.

## Decisiones tomadas con el usuario

| Tema | Decisión |
| --- | --- |
| Estilo | **Chapita**: el escudo va dentro de un círculo blanco, así se ven parejos aunque el logo tenga fondo blanco o formas distintas. |
| Dónde se ve | En la vista pública: **Posiciones** (entre la posición y el nombre) y **Resultados** (antes del nombre, en cada renglón). El **Fixture** queda como está. |
| Quién los carga | **Solo el superadmin**, desde el panel → **Equipos**. Franco ve Equipos como hoy, sin el bloque Escudo. |
| Cómo se cargan | De a uno, con vista previa antes de guardar. No hay carga de varios juntos. |
| Dónde se guardan | En **Supabase Storage** (carpeta pública `escudos`), no en la base: la base guarda solo el nombre del archivo. |

## Cómo se ve (vista pública)

- **Posiciones:** chapita de 28 px en la celda del equipo, antes del nombre. El nombre se sigue cortando con "…" si no entra.
- **Resultados:** la misma chapita antes del nombre, en los dos renglones de cada partido.
- **Equipo sin escudo:** sus iniciales en un círculo del mismo tamaño, para que la columna no quede despareja. Las iniciales son la primera letra de hasta dos palabras de 3 o más letras (BARRIO POLICIAL → BP, ALEX F.C → A). Si no hay ninguna palabra así, van las dos primeras letras del nombre.
- **Zona sin escudos:** si ningún equipo de la zona tiene escudo, Posiciones y Resultados se ven como hoy, sin chapitas ni iniciales. Así, mientras se cargan, no aparecen de golpe 98 círculos con iniciales.
- La imagen es decorativa (`alt=""`), porque el nombre está al lado. Lleva `width` y `height` para que la tabla no salte al cargar, y `loading="lazy"`.

## Cómo se carga (panel → Equipos)

En la tarjeta de cada equipo, debajo del título, el superadmin ve el bloque **Escudo**:

- **Sin escudo:** una ayuda ("Subí la imagen grande y la app la achica sola. Si podés, que sea PNG con fondo transparente.") y el botón **Subir escudo**.
- **Con escudo:** **Cambiar escudo** y **Quitar**. Quitar pide confirmación.
- **Vista previa:** después de elegir la imagen, se ve grande, con lo que pesaba y lo que pesa ahora (por ejemplo "2,4 MB → 9 KB"), y cómo queda en una fila de la tabla. Los botones son **Guardar escudo** y **Cancelar**.
- El título de la tarjeta muestra el escudo si lo tiene, para todos los que entran a Equipos. Si no tiene, sigue el ícono de la camiseta de hoy.
- Avisos: "Escudo guardado en BRANCA." y "Escudo quitado de BRANCA."

### Qué hace el navegador con la imagen

1. Acepta PNG, JPG o WebP de hasta 15 MB. Si no la puede abrir: "No pude abrir esa imagen. Probá con un PNG o un JPG."
2. **Recorta los bordes vacíos:** saca las filas y columnas de los bordes que son todas transparentes o casi blancas. Si la imagen queda vacía (por ejemplo, un logo blanco sobre transparente), usa la imagen entera.
3. **La achica** para que el lado más largo mida 128 px, sin deformarla. Si es más chica, no la agranda.
4. **La convierte** a WebP. Safari no sabe generar WebP y devuelve PNG; en ese caso se manda como PNG (pesa unos 15–30 KB, igual liviano).
5. Si después de todo eso pesa más de 100 KB (no debería pasar con 128 px), avisa y no la sube.

## Dónde se guarda

- **Supabase Storage**, carpeta (bucket) pública `escudos`, con límite de 100 KB por archivo y solo `image/webp` o `image/png`.
- Nombre del archivo con versión: `equipo-<id>-<momento>.<webp|png>`, por ejemplo `equipo-12-1728150000000.webp`. Se sube con `cacheControl` de 1 año: como el nombre cambia con cada versión, nadie ve un escudo viejo.
- Al cambiar o quitar un escudo, se borra el archivo anterior. Si el borrado falla, el escudo nuevo queda igual (sobra un archivo, no se rompe nada).
- La base guarda solo el nombre del archivo en `equipos.escudo`.

## Base de datos: migración 8 (`supabase/migracion-8-escudos.sql`)

- `equipos.escudo text`, con un `check` que solo acepta nombres como `equipo-12-1728150000000.webp` (o `.png`), o vacío.
- El bucket `escudos` en `storage.buckets` (público, 100 KB, WebP o PNG).
- Reglas sobre `storage.objects` para ese bucket: el superadmin puede subir, leer y borrar. Nadie más puede escribir. Ver los escudos no necesita regla: el bucket es público.
- Un trigger en `equipos` rechaza cambiar `escudo` si no es el superadmin ("Los escudos los cambia solo el superadmin."). El resto de la tabla sigue como hoy: Franco puede cambiar el nombre del equipo.
- El registro de actividad (migración 5) ya anota los cambios en `equipos`.
- Como las otras migraciones, si se corre dos veces falla al principio sin cambiar nada.

## API

- `PUT /api/admin/equipos/:id/escudo`, con `{ imagen: 'data:image/webp;base64,…' }` (o PNG):
  - Solo superadmin (403: "Los escudos los cambia solo el superadmin.").
  - El equipo tiene que existir (404).
  - Tiene que ser WebP o PNG de verdad (se revisan los primeros bytes, no solo lo que dice el texto) y pesar hasta 100 KB. Si no: "El escudo tiene que ser una imagen WebP o PNG de hasta 100 KB."
  - Sube el archivo, guarda el nombre en `equipos.escudo` y borra el anterior.
- `DELETE /api/admin/equipos/:id/escudo`: solo superadmin; deja `escudo` vacío y borra el archivo.
- `/api/publico` y `/api/admin/datos` devuelven en cada equipo `escudo`: la dirección pública completa de la imagen, o `null`. Las direcciones se arman en el servidor, sin pedidos extra a Supabase.
- **Tolerante:** el repositorio lee los equipos con `select('*')`. Si la migración 8 todavía no se corrió, `escudo` llega `null` y la página anda igual, sin escudos.

## Simulación

El repositorio en memoria guarda la imagen tal cual (`data:image/webp;base64,…`) en `escudo` y la devuelve así. Se sube, se cambia y se quita igual que en la real, sin tocar Supabase. Con "Ver como" admin o veedor no aparece el bloque.

## Registro de actividad

Un cambio en `equipos` que toca `escudo` se lee "Cambió el escudo de BRANCA", o "Quitó el escudo de BRANCA" si quedó vacío. Los demás cambios de equipos siguen como "Cambió los datos de BRANCA".

## Piezas

- `src/logica/escudos.js` (sin navegador, con pruebas): `iniciales(nombre)`, `hayEscudos(equipos)`, `recorteDeContenido({ data, width, height })` y `medidaFinal(ancho, alto, lado = 128)`.
- `src/logica/prepararEscudo.js` (solo navegador): abre el archivo, recorta, achica y convierte. Se prueba en la simulación con Chrome.
- `src/componentes/Escudo.jsx`: la chapita o las iniciales.
- `TablaPosiciones` recibe `conEscudos` y la tarjeta de resultados lo toma de `info`. Solo la vista pública los activa: las tablas del panel (Partidos y Ajustes) quedan como hoy.
- `src/vistas/admin/BloqueEscudo.jsx`: el bloque del panel, con sus tres estados.
- `useAcciones`: `subirEscudo` y `quitarEscudo`. `api`: `subirEscudo` y `quitarEscudo`.
- `server/reglas.js`: `validarEscudo`. `server/app.js`: las dos rutas. `server/repositorio.js` y `server/repositorioMemoria.js`: `subirEscudo` y `quitarEscudo`, y `escudo` en cada equipo.

## Pruebas

- **Lógica:** iniciales, recorte (transparente, blanco, vacía), medida final y `hayEscudos`.
- **API:** permisos (admin y veedor reciben 403), equipo inexistente, formato falso (texto que dice PNG pero no lo es), peso de más, subir, cambiar y quitar en la simulación.
- **Base (PGlite):** la migración 8 con un esquema `storage` de mentira. El superadmin sube y borra en `escudos` y el admin no, el `check` del nombre y el trigger que frena a Franco.
- **Pantallas:** la tabla y los resultados con escudo, con iniciales y sin nada (zona sin escudos), y el bloque del panel solo para el superadmin.
- **Recorrido en la simulación (Chrome, 390 px):** subir una imagen grande, ver la vista previa, guardarla, verla en Posiciones y Resultados, cambiarla y quitarla.

## Fuera de este cambio

- Escudos en el Fixture y en las listas de partidos del panel.
- Carga de varios escudos juntos.
- Quitar el fondo blanco de los logos (la chapita lo disimula).
