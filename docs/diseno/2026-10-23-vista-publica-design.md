# Diseño: la vista pública, más limpia y más interactiva

Fecha: 2026-10-23. Estado: **aprobado por el usuario el 23/10**. Rama: `dev`. Se trabaja solo la vista pública (`/`); el panel (`/admin`) no cambia.

## Por qué

La vista pública se usa sobre todo en celular. Hoy tiene cuatro problemas y dos pedidos:

- El conmutador **F11 | F7** está apretado contra el título "Copa GP", en la misma fila. Compite con el nombre y no se entiende que es un cambio de modalidad.
- Debajo de la tabla hay una caja con una frase por desempate ("PUERTO ARGENTINO queda arriba de MARTIN BERHO por diferencia de gol."). Ocupa un lugar que se puede aprovechar mejor y, con varios empates, crece más que la tabla.
- En celular la tabla muestra 10 columnas (Pos, Equipo, PJ, PG, PE, PP, GF, GC, DG, Pts): entra, pero está cargada.
- Es una página para mirar y no tiene nada para tocar.
- **Pedido:** poner las redes del campeonato (Facebook, Instagram y WhatsApp) y, para eso, un pie.
- **Pedido de Franco:** sumar los sponsors del campeonato. **Todavía sin confirmar: queda fuera de esta etapa** (ver "Fuera de esta etapa").

Se miraron en celular las tablas de la Champions League, la Premier League, Promiedos, FotMob y el sitio oficial de la Liga Profesional. Lo que se tomó de ellas está en cada punto de "Qué se hace".

## Objetivos, no-objetivos y anti-objetivos

**Objetivos**

- Que cambiar entre Fútbol 11 y Fútbol 7 se entienda a primera vista y se toque fácil con el pulgar.
- Que la tabla se lea sin esfuerzo en un celular de 360 px de ancho.
- Que cada jugador encuentre rápido **su** equipo y cuándo y dónde juega.
- Que las redes del campeonato estén al alcance.

**No-objetivos**

- No se toca el panel de administración, la base de datos, la API ni las reglas de cálculo de la tabla.
- No se agregan dependencias ni librerías.
- No se cambian los colores, las tipografías ni los radios del sitio: se mantiene la identidad actual (noche, degradé del logo, Russo One y Barlow).
- No hay cuentas ni inicio de sesión para el público.

**Anti-objetivos (sería un fracaso aunque "funcione")**

- Que se pierda información que hoy se ve: la tabla completa tiene que seguir estando a un toque.
- Que algo se rompa para quien usa solo Fútbol 11: **sin Fútbol 7 cargado, la vista se ve como siempre** (hoy hay una prueba que lo exige y se mantiene).
- Que algo nuevo tape contenido o choque con la barra inferior fija de Posiciones / Fixture / Resultados.
- Que el público tenga que entender cosas técnicas ("DG", siglas sueltas) sin una referencia a mano.

## Restricciones

- **Celular primero.** Se diseña para 360 px y se verifica hasta 960 px y más (el sitio ya cambia de diseño en 960 px).
- Todo lo que se toca mide **44 px o más** de alto y tiene foco visible (ya existe `:focus-visible`). Los controles con dos estados usan `aria-pressed`, como el resto del sitio.
- Se respeta `prefers-reduced-motion` (ya hay una regla global).
- La barra inferior fija mide 64 px (`--nav-alto`) y solo existe en celular. Nada que quede al final de la página puede quedar tapado por ella.
- Los textos van en español rioplatense con voseo ("Seguí al campeonato", "Tocá tu equipo").
- Las pruebas existentes (hoy 428) siguen pasando. Lo nuevo lleva sus pruebas, en el estilo del proyecto (funciones puras en `src/logica/` y `renderToString` para los componentes).
- Cada paso termina con un commit y un push a `dev`. El pasaje de `dev` a `main` lo hace o lo pide el usuario.

## Qué se hace

### 1. Cambio de modalidad: dos botones anchos

Reemplaza al conmutador "F11 | F7" de la cabecera. Elegido por el usuario entre tres opciones (botones anchos, pestañas pegadas a la cabecera y título con menú).

- El título queda **solo y centrado** debajo del logo. Abajo, a todo el ancho de la cabecera, dos botones: **Fútbol 11** y **Fútbol 7** (nombres completos, no "F11" y "F7").
- Es un control segmentado: contenedor con borde y fondo `--superficie`, radio 14 px, 4 px de relleno, botones de 46 px de alto. El activo lleva el degradé del botón y la sombra del acento, igual que las categorías de la barra de abajo. En Fútbol 7 el acento ya cambia a celeste por `data-modalidad`, y esto no se toca.
- Sigue recordando la elección en el celular (`guardarModalidad`) y sigue apareciendo **solo si hay Fútbol 7 cargado**.
- **Decisión mía (cambia lo del 16/10):** el título pasa a ser siempre el nombre del campeonato ("Copa GP"), también en Fútbol 7. Antes decía "Fútbol 7" en esa modalidad; ahora el botón activo ya lo dice y se repetiría. Si se prefiere lo anterior, es cambiar una línea.
- Para distinguirse de la barra de categorías (que también es un control segmentado, dos filas más abajo) los botones de modalidad van dentro de la cabecera, sobre el fondo de la portada, con letra de 16 px en peso 700 y sin mayúsculas.

### 2. Tabla de posiciones

**2a. Tres vistas en celular**

Un control segmentado de tres botones arriba de la tabla (mismo estilo que el punto 1, de 44 px de alto):

| Vista | Columnas |
| --- | --- |
| **Resumen** (abre por defecto en celular) | Pos, Equipo, PJ, DG, Pts |
| **Completa** | Las de hoy: Pos, Equipo, PJ, PG, PE, PP, GF, GC, DG, Pts |
| **Racha** | Pos, Equipo, los últimos resultados (V, E, D en círculos de color), Pts |

- En pantallas anchas (960 px o más) se ve siempre la completa y el control no aparece.
- Racha: hasta los **últimos 5 partidos jugados** del equipo en esa tabla, del más viejo al más nuevo. Ganado: verde (`--exito`). Empatado: gris (`--tinta-suave`). Perdido: rojo (`--roja`). Cada círculo lleva la letra (no se depende solo del color). Un partido ganado por W.O. cuenta como V y uno perdido por W.O., como D; un **W.O. doble** y los partidos sin resultado o postergados **no cuentan**. Lo que trae la tabla inicial (fecha 1 cargada sin detalle) no tiene partidos individuales: esa fecha no aparece en la racha. Sin partidos jugados, el renglón muestra "–".
- Como sale de los partidos ya cargados, no hace falta tocar la base.
- Fuentes: Premier League (Short / Full / Form) y FotMob (solo partidos, diferencia de gol y puntos).

**2b. Flechitas de movimiento**

Junto al número de posición, ▲ (verde) o ▼ (rojo) si el equipo subió o bajó respecto de la tabla **antes de la última fecha con resultados** (la misma que hoy dice "Hasta la fecha N" en el título). Si no cambió de puesto, o hay una sola fecha jugada, no se muestra nada. Tienen texto para lectores de pantalla ("Subió 1 puesto"). Aplican a las tres vistas. Fuente: Champions League.

**2c. El desempate se explica una sola vez**

- En la vista pública **desaparecen las notas por pareja** (`NotasDesempate`).
- Debajo de la tabla queda **una frase fija**, de letra chica y color suave, sin caja ni ícono, armada con los criterios que configuró el organizador (`db.configuracion.criteriosDesempate`) y reutilizando los textos de `CRITERIOS[...].motivo`. Con los criterios por defecto:
  > Si dos equipos empatan en puntos, se ordenan por diferencia de gol, después por goles a favor y después por el resultado entre ellos.
- Si el organizador reordena los criterios, la frase sigue ese orden. Con un solo criterio no se muestra frase.
- Ninguna de las tablas consultadas aclara los empates fila por fila: la columna DG ya los muestra y la regla se dice una vez al pie.
- **Decisión mía:** el panel conserva `NotasDesempate` (en Resultados y en la vista previa de Ajustes), porque ahí las notas sirven para ver el efecto de los criterios. Solo cambia la vista pública.

### 3. Mi equipo

- **Marcar:** cada equipo de la tabla tiene una estrella para tocar. Un toque lo marca y otro lo desmarca. Se guarda **solo en el celular** (`localStorage`, con el mismo cuidado de `leerModalidadGuardada`: sin almacenamiento o si falla, simplemente no se recuerda). Sin cuentas ni datos nuevos en Supabase.
- **Un equipo por modalidad** (decisión mía): un jugador puede jugar F11 y F7. Se guarda algo como `{ f11: 12, f7: 31 }` en una sola clave nueva (`lc-mi-equipo`).
- **Tarjeta "Tu equipo"**, arriba de la tabla en Posiciones, solo cuando la modalidad que se está viendo es la del equipo marcado. Muestra el nombre, su puesto y sus puntos en su tabla, y su **próximo partido**: el primero sin resultado y no postergado, por fecha y hora. Formato: "Fecha 5 · Los Cardales · Cancha 3 · 16:30 · vs La Previa" (se arma con `textoLugar`). Un toque en la tarjeta lleva a la categoría y la zona del equipo.
  - **El día no se muestra:** la base no guarda el día de los partidos comunes (solo el de los postergados que se reprograman, y ese ya lo muestra `textoLugar`). En las maquetas aparecía "Sábado 25/10" y era un invento: lo que existe es el número de fecha.
  - Sin partido por jugar: "No tiene partidos por jugar". Con el partido postergado y sin lugar: "Partido postergado, a confirmar".
- **Resaltado:** el equipo marcado se ve resaltado en la tabla (fondo `--marca-suave`, nombre en `--marca-fuerte`) y en el Fixture y en Resultados (borde izquierdo de marca en su partido).
- Si el equipo marcado ya no existe o está dado de baja, se ignora sin avisos ni errores.
- La estrella **no puede achicar el nombre del equipo** en 360 px (hoy el nombre se corta con "…"): su ubicación exacta (al lado de la posición, a la derecha de los puntos o toda la fila tocable) la resuelve quien construya, con el mínimo de 44 px de área tocable.
- Fuente: FotMob ("Follow").

### 4. Pie con las redes

- Al final de la vista pública (también cuando todavía no hay categorías cargadas), con espacio para que la barra inferior fija no lo tape.
- Cinta de 3 px con el degradé del logo arriba, fondo `--superficie`. Un texto corto ("Seguí al campeonato") y tres botones redondos de 48 px o más, **con el nombre debajo**: Facebook, Instagram y WhatsApp. WhatsApp va en verde (`--whatsapp`, ya existe). Abajo: "© 2026 Los Cardales" (el año sale de la fecha actual).
- Los íconos son SVG propios en `Icono.jsx`, sin dependencias.
- Los enlaces abren en otra pestaña con `rel="noopener noreferrer"`.
- Las direcciones, que pasó el usuario el 23/10:
  - Facebook: `https://www.facebook.com/loscardalesfutbol`
  - Instagram: `https://www.instagram.com/loscardalesfut/`
  - WhatsApp: +54 9 381 449 0189, que se abre como `https://wa.me/5493814490189`.
- Si alguna dirección queda vacía, ese botón no se muestra: no hay botones muertos.
- Van como constantes en `src/datos/constantes.js`, no en la base (no cambian seguido).
- Fuentes: Liga Profesional y Champions League (redes en el pie).

## Fuera de esta etapa

- **Sponsors.** Franco todavía no confirmó cuántos son ni cómo se cargan. Se dejó pensado el bloque: **un sponsor principal solo y grande y los demás en una grilla de dos columnas, con su rubro debajo, cada logo con un enlace**, al final de la página y antes del pie (como la Premier League y la Liga Profesional), no en la cabecera. Falta decidir si se cargan desde el panel (una tabla nueva y subida de imágenes) o si van fijos en el código. El pie se arma dejando ese lugar libre.
- **Simulador "¿y si…?"** (como el de la Champions): **descartado por el usuario**, porque la gente no sabría usarlo.
- **Rankings** (tarjetas, goleadores, como en Promiedos): no se pidieron. Además la vista pública hoy nunca muestra datos de jugadores.
- **El día de cada partido en "Mi equipo":** requeriría guardar la fecha del calendario de cada fecha del campeonato. No está hecho.

## Orden de construcción

Cuatro pasos, cada uno con su commit y su push a `dev`:

1. Cabecera (punto 1).
2. Tabla: vistas, flechitas y frase de desempate (punto 2).
3. Mi equipo (punto 3).
4. Pie con las redes (punto 4).

## Lo que se deja a quien construya

- Los textos exactos de accesibilidad y de las frases de apoyo, en el tono del sitio.
- Las medidas finas (espacios, tamaños de los círculos de la racha, la forma de la estrella), dentro de los tokens que ya existen.
- Transiciones mínimas (el cambio de vista, el indicador del botón activo), sin movimiento al cargar la página.
- Dónde se calcula cada cosa (racha, movimiento, próximo partido y frase) y su nombre, mientras sea lógica pura y con pruebas.
- Actualizar el README y `docs/diseno/2026-10-16-futbol7-design.md` donde digan que el conmutador va a la derecha del nombre o que en F7 el título dice "Fútbol 7".

## Qué falta

Del lado del usuario, nada para esta etapa: el usuario dio las direcciones de las redes y aprobó el documento el 23/10, incluidas las decisiones que había tomado yo (título "Copa GP" también en F7, notas de desempate que se mantienen en el panel y un equipo marcado por modalidad). Queda pendiente la confirmación de Franco sobre los sponsors, que abre una etapa aparte.
