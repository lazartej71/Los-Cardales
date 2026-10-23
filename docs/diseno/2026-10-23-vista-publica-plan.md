# Plan: la vista pública, más limpia y más interactiva

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** cabecera con dos botones anchos de modalidad, tabla pública con tres vistas, flechitas y una sola frase de desempate, "Mi equipo" y un pie con las redes del campeonato.

**Arquitectura:** toda la lógica nueva va en funciones puras en `src/logica/` (racha, movimiento de puestos, frase de desempate, Mi equipo), con sus pruebas. Los componentes de la vista pública solo las llaman. `TablaPosiciones` suma props opcionales: sin ellas se ve igual que hoy, y así el panel no cambia. El estado nuevo (vista de la tabla y Mi equipo) vive en `uiPublica` de `App.jsx`, como la modalidad.

**Tecnología:** React 19, Vite 8, Vitest 5 (`renderToString`), CSS propio con los tokens de `src/estilos/base.css`, oxlint.

**Diseño:** [`docs/diseno/2026-10-23-vista-publica-design.md`](2026-10-23-vista-publica-design.md). El plan se apoya en él: leé los dos.

## Restricciones generales

- Celular primero: se diseña para **360 px** de ancho; los cortes del sitio siguen en **480 px** y **960 px**.
- Todo lo que se toca mide **44 px o más** de alto, tiene foco visible y, si tiene dos estados, usa `aria-pressed`.
- **Sin dependencias nuevas.** No se toca la base, la API ni el panel (el panel conserva `NotasDesempate`).
- Se usan los tokens de color, tipografía y radio que ya existen en `base.css`. Lo resaltado usa las variables de acento (`--acento*`), así en Fútbol 7 toma el celeste.
- **Sin Fútbol 7 cargado, la cabecera se ve como siempre** (sin botones de modalidad ni chip).
- Textos en español rioplatense con voseo.
- Se respeta `prefers-reduced-motion` (la regla global ya existe). Nada se mueve al cargar la página.
- Texto armado con variables dentro de JSX: **en una sola plantilla** (`` {`© ${anio} Los Cardales`} ``). Si no, `renderToString` mete comentarios entre las partes y las pruebas fallan.
- Las 621 pruebas de base siguen pasando. `npm run lint` sale con 0 y sin avisos nuevos (hoy hay 4, todos en `CamposLugar.jsx`).
- Cada tarea termina con un commit en español y un push a `dev`. **Sin líneas `Co-Authored-By` ni menciones a Claude o Anthropic.** El pase de `dev` a `main` lo hace o lo pide el usuario.

## Para revisar con atención

Lo más probable que falle en manos de la gente y que las pruebas automáticas no cubren:

1. **Celular de 360 px en la vista Completa:** flechita, escudo y nombre largo juntos. El nombre se corta con "…", pero nada se pisa y las columnas fijas siguen alineadas. Lo verifica la Tarea 5, paso de navegador.
2. **El pie tapado por la barra inferior** en un iPhone con zona segura. Lo verifica la Tarea 8, paso de navegador.
3. **Pantalla ancha con la vista Racha elegida** (alguien eligió Racha en el celular y giró la tablet): tiene que verse la tabla completa, sin columna de racha ni control de vistas. Lo verifica la Tarea 5, paso de navegador.
4. **Celular sin almacenamiento** (ventana privada o sitio bloqueado): la estrella igual funciona durante la visita y nada se rompe. Lo cubre la Tarea 6 (`almacenRoto` y `null`).
5. **Fútbol 7:** el equipo marcado, el resaltado y los botones de modalidad toman el celeste, no el naranja. Lo verifica la Tarea 7, paso de navegador.

Aceptado y sin arreglo: un postergado viejo que se juega después de la última fecha cuenta, para las flechitas, como si se hubiera jugado en su fecha original.

---

### Tarea 1: Cabecera con dos botones anchos

**Archivos:**
- Modificar: `src/componentes/ConmutadorModalidad.jsx`
- Modificar: `src/vistas/publico/VistaPublica.jsx:88-103` (cabecera) y el comentario del encabezado del archivo
- Modificar: `src/estilos/base.css:158-177` (`.cabecera__fila` y `.conmutador`)
- Modificar: `src/vistas/publico/VistaPublica.test.jsx:287-312`
- Modificar: `README.md:106` y `README.md:121`; `docs/diseno/2026-10-16-futbol7-design.md:53`, `:56` y `:206`

**Interfaces:**
- Produce: `ConmutadorModalidad({ valor, onCambiar })`, con la misma firma. Cada botón muestra `m.nombre` ("Fútbol 11", "Fútbol 7") y ya no lleva `aria-label`.

- [ ] **Paso 1: Cambiar las pruebas de Fútbol 7 para que pidan lo nuevo**

En `describe('Fútbol 11 y Fútbol 7')`:

```jsx
it('en Fútbol 7 muestra sus categorías y equipos, con el nombre del campeonato y el acento de F7', () => {
  const html = dibujar(conFutbol7(), { modalidad: 'f7' });
  expect(html).toContain('data-modalidad="f7"');
  expect(html).toMatch(/<h1 class="cabecera__titulo">Campeonato de Fútbol<\/h1>/);
  expect(html).toMatch(/aria-pressed="true"[^>]*>Fútbol 7</);
  expect(html).toMatch(/aria-pressed="false"[^>]*>Fútbol 11</);
  expect(html).toContain('F7 A1');
  expect(html).not.toContain('Libre A1');
  expect(html).not.toContain('+35');
  expect(html).toContain('FÚTBOL 7');
});
```

En la prueba de Fútbol 11 con F7 cargado, reemplazar `/aria-label="Fútbol 11" aria-pressed="true"/` por `/aria-pressed="true"[^>]*>Fútbol 11</`. La prueba "sin Fútbol 7 cargado se ve como siempre" no cambia: sigue pidiendo que no aparezcan `conmutador` ni `cabecera__fila`.

- [ ] **Paso 2: Correr y ver que falla**

Run: `npx vitest run src/vistas/publico/VistaPublica.test.jsx`
Expected: FAIL en las dos pruebas de modalidad (el título todavía dice "Fútbol 7" y los botones dicen "F11" / "F7").

- [ ] **Paso 3: Implementar**

- `ConmutadorModalidad`: el texto de cada botón es `m.nombre` y se saca el `aria-label` por botón. Se conservan `role="group"`, `aria-label="Modalidad"` en el contenedor y las clases `conmutador` y `conmutador__btn`.
- `VistaPublica`: una sola cabecera para los dos casos: logo, `<h1 className="cabecera__titulo">{db.configuracion.nombreCampeonato}</h1>` y, solo si `conFutbol7`, el conmutador debajo. Se borran la rama doble y `cabecera__fila`.
- `base.css`: borrar las reglas de `.cabecera__fila`. Nuevo `.conmutador`: `display: flex; gap: 4px; width: min(100%, 420px); margin-top: 14px; padding: 4px; background: var(--superficie); border: 1px solid var(--linea-fuerte); border-radius: 14px`. Nuevo `.conmutador__btn`: `flex: 1 1 0; min-height: 46px; border: 0; border-radius: 10px; background: transparent; color: var(--tinta-suave); font-family: var(--fuente); font-size: 16px; font-weight: 700`. El activo: `background: var(--acento-boton); color: var(--sobre-acento); box-shadow: 0 4px 16px var(--acento-sombra)`. Se mantiene el `:hover` con `color: var(--tinta)`.

- [ ] **Paso 4: Correr y ver que pasa**

Run: `npx vitest run src/vistas/publico/VistaPublica.test.jsx`
Expected: PASS

- [ ] **Paso 5: Actualizar los documentos**

- `README.md:106`: "con Fútbol 7 cargado aparecen debajo del nombre del campeonato dos botones, **Fútbol 11** y **Fútbol 7**, y el celular recuerda la elección. En Fútbol 7 todo toma el celeste; el título sigue siendo el nombre del campeonato."
- `README.md:121`: "Desde ahí aparecen los botones Fútbol 11 y Fútbol 7."
- En `2026-10-16-futbol7-design.md`, líneas 53, 56 y 206: agregar al final "(Cambió el 23/10: dos botones anchos debajo del nombre, y el título es siempre el del campeonato. Ver `2026-10-23-vista-publica-design.md`.)"

- [ ] **Paso 6: Mirarlo en el navegador**

Run: `npm run simulacion` (abre http://localhost:5174/).
Expected, a 360 × 800 y a 1280 × 800: logo, título solo en su renglón y abajo los dos botones a lo ancho, de 46 px. Tocar Fútbol 7 pasa todo al celeste (también el botón activo) y el título no cambia. Con el teclado, el foco se ve en los dos botones.

- [ ] **Paso 7: Commit y push**

```bash
git add src/componentes/ConmutadorModalidad.jsx src/vistas/publico/VistaPublica.jsx src/estilos/base.css src/vistas/publico/VistaPublica.test.jsx README.md docs/diseno/2026-10-16-futbol7-design.md
git commit -m "feat(publico): la modalidad se elige con dos botones anchos debajo del nombre"
git push origin dev
```

---

### Tarea 2: Racha de un equipo

**Archivos:**
- Crear: `src/logica/racha.js`
- Crear: `src/logica/racha.test.js`

**Interfaces:**
- Produce: `rachaDeEquipo(equipoId: number, partidos: Partido[], max = 5): Array<'V'|'E'|'D'>`, del más viejo al más nuevo. Recibe los partidos **ya ordenados** por fecha y hora, como los devuelve `partidosDeEquipos`.

- [ ] **Paso 1: Escribir la prueba**

```js
import { describe, expect, it } from 'vitest';
import { rachaDeEquipo } from './racha.js';

const p = (id, fecha, localId, visitanteId, golesLocal, golesVisitante, extra = {}) => ({
  id, categoriaId: 1, fecha, localId, visitanteId, golesLocal, golesVisitante, postergado: false, ausente: null, ...extra,
});

// Equipo 1: V, E, D, V (W.O.), [W.O. doble], V, E, [pendiente], [postergado]
const partidos = [
  p(1, 1, 1, 2, 2, 0),
  p(2, 2, 3, 1, 1, 1),
  p(3, 3, 1, 4, 0, 1),
  p(4, 4, 5, 1, 0, 3, { ausente: 'local' }),
  p(5, 5, 1, 6, 0, 0, { ausente: 'ambos' }),
  p(6, 6, 1, 7, 3, 1),
  p(7, 7, 8, 1, 2, 2),
  p(8, 8, 1, 9, null, null),
  p(9, 9, 1, 2, null, null, { postergado: true }),
];

describe('rachaDeEquipo', () => {
  it('devuelve los últimos 5 resultados, del más viejo al más nuevo', () => {
    expect(rachaDeEquipo(1, partidos)).toEqual(['E', 'D', 'V', 'V', 'E']);
  });

  it('el W.O. cuenta por el resultado cargado; el W.O. doble, los pendientes y los postergados no cuentan', () => {
    expect(rachaDeEquipo(1, partidos, 10)).toEqual(['V', 'E', 'D', 'V', 'V', 'E']);
  });

  it('mira cada partido desde el lado del equipo', () => {
    expect(rachaDeEquipo(2, partidos)).toEqual(['D']);
  });

  it('sin partidos jugados devuelve una lista vacía', () => {
    expect(rachaDeEquipo(9, partidos)).toEqual([]);
  });
});
```

- [ ] **Paso 2: Correr y ver que falla**

Run: `npx vitest run src/logica/racha.test.js`
Expected: FAIL (no existe `./racha.js`).

- [ ] **Paso 3: Implementar `rachaDeEquipo` en `src/logica/racha.js`**

Toma los partidos donde juega el equipo que tienen resultado (`tieneResultado`) y no son W.O. doble (`esWoDoble`), los dos de `./tabla.js`. Con los goles del lado del equipo da V, E o D, y devuelve los últimos `max`. Un comentario arriba del archivo, como en el resto de `src/logica/`.

- [ ] **Paso 4: Correr y ver que pasa**

Run: `npx vitest run src/logica/racha.test.js`
Expected: PASS

- [ ] **Paso 5: Commit y push**

```bash
git add src/logica/racha.js src/logica/racha.test.js
git commit -m "feat(logica): racha de los últimos partidos de un equipo"
git push origin dev
```

---

### Tarea 3: Movimiento de puestos

**Archivos:**
- Modificar: `src/logica/consultas.js` (nueva `ultimaFechaJugada`)
- Modificar: `src/logica/consultas.test.js`
- Modificar: `src/vistas/publico/Secciones.jsx:32-33` (usa `ultimaFechaJugada`)
- Crear: `src/logica/movimiento.js`
- Crear: `src/logica/movimiento.test.js`

**Interfaces:**
- Produce: `ultimaFechaJugada(partidos: Partido[], conTablaInicial: boolean): number`, la fecha más alta con algún resultado. Es 1 si solo está la tabla inicial y 0 si no hay nada jugado. Es el mismo cálculo que hoy hace `SeccionPosiciones`.
- Produce: `movimientosDePuestos(filas, { equipos, partidos, criterios, tablaInicial, ultimaFecha }): Map<equipoId, number>`. El valor es positivo si el equipo subió esa cantidad de puestos y negativo si bajó. Los que no se movieron no están en el `Map`.

- [ ] **Paso 1: Escribir las pruebas**

En `consultas.test.js`, sumar `ultimaFechaJugada` al import y:

```js
describe('ultimaFechaJugada', () => {
  const jugado = (fecha) => ({ id: fecha, fecha, golesLocal: 1, golesVisitante: 0 });
  const pendiente = (fecha) => ({ id: 100 + fecha, fecha, golesLocal: null, golesVisitante: null });

  it('es la fecha más alta con algún resultado', () => {
    expect(ultimaFechaJugada([jugado(2), jugado(3), pendiente(4)], false)).toBe(3);
  });

  it('con solo la tabla inicial es la fecha 1, y sin nada jugado es 0', () => {
    expect(ultimaFechaJugada([pendiente(2)], true)).toBe(1);
    expect(ultimaFechaJugada([pendiente(2)], false)).toBe(0);
  });
});
```

`movimiento.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { CRITERIOS_POR_DEFECTO } from '../datos/constantes.js';
import { movimientosDePuestos } from './movimiento.js';
import { calcularTabla } from './tabla.js';

// ALFA gana la fecha 1; en la fecha 2 GAMA le gana 2 a 0 y lo pasa por diferencia de gol
const equipos = [
  { id: 1, zonaId: 10, nombre: 'ALFA' },
  { id: 2, zonaId: 10, nombre: 'BETA' },
  { id: 3, zonaId: 10, nombre: 'GAMA' },
];
const partidos = [
  { id: 1, categoriaId: 5, fecha: 1, localId: 1, visitanteId: 2, golesLocal: 1, golesVisitante: 0, postergado: false },
  { id: 2, categoriaId: 5, fecha: 2, localId: 3, visitanteId: 1, golesLocal: 2, golesVisitante: 0, postergado: false },
];
const contexto = (ultimaFecha) => ({ equipos, partidos, criterios: CRITERIOS_POR_DEFECTO, tablaInicial: [], ultimaFecha });

describe('movimientosDePuestos', () => {
  it('compara con la tabla de antes de la última fecha con resultados', () => {
    const filas = calcularTabla(equipos, partidos, CRITERIOS_POR_DEFECTO);
    expect(movimientosDePuestos(filas, contexto(2))).toEqual(new Map([[3, 1], [1, -1]]));
  });

  it('con una sola fecha jugada no hay movimientos', () => {
    const filas = calcularTabla(equipos, partidos.slice(0, 1), CRITERIOS_POR_DEFECTO);
    expect(movimientosDePuestos(filas, contexto(1)).size).toBe(0);
  });
});
```

- [ ] **Paso 2: Correr y ver que fallan**

Run: `npx vitest run src/logica/consultas.test.js src/logica/movimiento.test.js`
Expected: FAIL (no existen `ultimaFechaJugada` ni `./movimiento.js`).

- [ ] **Paso 3: Implementar**

- `ultimaFechaJugada` en `consultas.js`: `Math.max(conTablaInicial ? 1 : 0, ...fechas con resultado)`. En `SeccionPosiciones` reemplaza el cálculo de `ultima` (líneas 32-33), sin cambiar lo que se ve.
- `movimientosDePuestos` en `movimiento.js`: con `ultimaFecha <= 1` devuelve un `Map` vacío. Si no, arma la tabla anterior con `calcularTabla(equipos, partidos.filter((p) => p.fecha < ultimaFecha), criterios, tablaInicial)` y guarda `puestoAnterior - puestoActual` cuando no es 0.

- [ ] **Paso 4: Correr y ver que pasan**

Run: `npx vitest run src/logica/consultas.test.js src/logica/movimiento.test.js src/vistas/publico/VistaPublica.test.jsx`
Expected: PASS (VistaPublica sigue diciendo "Hasta la fecha N" igual que antes).

- [ ] **Paso 5: Commit y push**

```bash
git add src/logica/consultas.js src/logica/consultas.test.js src/logica/movimiento.js src/logica/movimiento.test.js src/vistas/publico/Secciones.jsx
git commit -m "feat(logica): cuántos puestos subió o bajó cada equipo desde la fecha anterior"
git push origin dev
```

---

### Tarea 4: Frase de desempate

**Archivos:**
- Crear: `src/logica/desempate.js`
- Crear: `src/logica/desempate.test.js`

**Interfaces:**
- Produce: `fraseDesempate(criterios: string[]): string | null`. Arma la frase con `CRITERIOS[c].nombre` (el primero, en minúscula) y `CRITERIOS[c].motivo` (los demás), de `../datos/constantes.js`. Ignora los criterios desconocidos. Devuelve `null` si quedan menos de dos.

- [ ] **Paso 1: Escribir la prueba**

```js
import { describe, expect, it } from 'vitest';
import { CRITERIOS_POR_DEFECTO } from '../datos/constantes.js';
import { fraseDesempate } from './desempate.js';

describe('fraseDesempate', () => {
  it('con los criterios por defecto', () => {
    expect(fraseDesempate(CRITERIOS_POR_DEFECTO)).toBe(
      'Si dos equipos empatan en puntos, se ordenan por diferencia de gol, después por goles a favor y después por el resultado entre ellos.'
    );
  });

  it('sigue el orden que eligió el organizador', () => {
    expect(fraseDesempate(['puntos', 'enfrentamiento', 'dg'])).toBe(
      'Si dos equipos empatan en puntos, se ordenan por el resultado entre ellos y después por diferencia de gol.'
    );
    expect(fraseDesempate(['puntos', 'gf'])).toBe('Si dos equipos empatan en puntos, se ordenan por goles a favor.');
  });

  it('con un solo criterio no hay frase', () => {
    expect(fraseDesempate(['puntos'])).toBeNull();
    expect(fraseDesempate(['puntos', 'inventado'])).toBeNull();
  });
});
```

- [ ] **Paso 2: Correr y ver que falla**

Run: `npx vitest run src/logica/desempate.test.js`
Expected: FAIL (no existe `./desempate.js`).

- [ ] **Paso 3: Implementar `fraseDesempate` en `src/logica/desempate.js`**

Separadores: el primer motivo va después de "se ordenan", los del medio con ", después " y el último con " y después ".

- [ ] **Paso 4: Correr y ver que pasa**

Run: `npx vitest run src/logica/desempate.test.js`
Expected: PASS

- [ ] **Paso 5: Commit y push**

```bash
git add src/logica/desempate.js src/logica/desempate.test.js
git commit -m "feat(logica): frase única con el orden de desempate"
git push origin dev
```

---

### Tarea 5: Tabla pública con tres vistas, flechitas y la frase

**Archivos:**
- Modificar: `src/componentes/TablaPosiciones.jsx`
- Crear: `src/componentes/TablaPosiciones.test.jsx`
- Modificar: `src/vistas/publico/Secciones.jsx` (`SeccionPosiciones`)
- Modificar: `src/vistas/publico/VistaPublica.jsx`
- Modificar: `src/App.jsx:57-64` (`uiPublica`)
- Modificar: `src/estilos/componentes.css` (tabla) y `src/estilos/base.css` (variante `seg--vistas`)
- Modificar: `src/vistas/publico/VistaPublica.test.jsx`

**Interfaces:**
- Consume: `rachaDeEquipo` (Tarea 2), `ultimaFechaJugada` y `movimientosDePuestos` (Tarea 3), `fraseDesempate` (Tarea 4).
- Produce: `TablaPosiciones({ filas, resaltar, etiqueta, vista, rachas, movimientos })`. Las tres props nuevas son opcionales:
  - `vista`: `'resumen' | 'completa' | 'racha'`;
  - `rachas`: `Map<equipoId, Array<'V'|'E'|'D'>>`;
  - `movimientos`: `Map<equipoId, number>`.
  Sin `vista`, el HTML no lleva `data-vista`, ni columna de racha, ni flechitas: el panel se ve igual.
- Produce: `SeccionPosiciones` suma `vista`, `onVista`, `rachas` y `movimientos`.
- Produce: `ui.vistaTabla` (`'resumen'` por defecto en `App.jsx`; `VistaPublica` usa `ui.vistaTabla ?? 'resumen'`).

- [ ] **Paso 1: Escribir las pruebas**

`src/componentes/TablaPosiciones.test.jsx` (el panel no cambia):

```jsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../datos/datosEjemplo.js';
import { equiposDeZona, partidosDeEquipos } from '../logica/consultas.js';
import { calcularTabla } from '../logica/tabla.js';
import { NotasDesempate, TablaPosiciones } from './TablaPosiciones.jsx';

const db = crearDatosEjemplo();
const equipos = equiposDeZona(db.equipos, 1);
const filas = calcularTabla(equipos, partidosDeEquipos(db.partidos, equipos), db.configuracion.criteriosDesempate);

describe('TablaPosiciones en el panel', () => {
  it('sin vista se ve como siempre', () => {
    const html = renderToString(<TablaPosiciones filas={filas} />);
    expect(html).toContain('class="tabla"');
    for (const nuevo of ['data-vista', 'col-racha', 'Subió', 'Bajó']) expect(html).not.toContain(nuevo);
  });

  it('las notas de desempate siguen en el panel', () => {
    const html = renderToString(<NotasDesempate filas={filas} criterios={db.configuracion.criteriosDesempate} />);
    expect(html).toContain('Libre A3 queda arriba de Libre A1 por diferencia de gol.');
  });
});
```

En `VistaPublica.test.jsx`, un `describe('tabla pública')` nuevo:

```jsx
describe('tabla pública', () => {
  it('abre en Resumen, con el selector de vistas', () => {
    const html = dibujar(crearDatosEjemplo());
    expect(html).toContain('aria-label="Vista de la tabla"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Resumen</);
    expect(html).toContain('data-vista="resumen"');
  });

  it('en Racha muestra los últimos resultados de cada equipo', () => {
    const html = dibujar(crearDatosEjemplo(), { vistaTabla: 'racha' });
    expect(html).toContain('data-vista="racha"');
    expect(html).toContain('aria-label="Últimos resultados: ganó, empató"');
    expect(html).toContain('class="racha__r racha__r--v"');
  });

  it('una sola frase de desempate reemplaza a las notas', () => {
    const html = dibujar(crearDatosEjemplo());
    expect(html).toContain(
      'Si dos equipos empatan en puntos, se ordenan por diferencia de gol, después por goles a favor y después por el resultado entre ellos.'
    );
    expect(html).not.toContain('queda arriba de');
  });

  it('las flechitas dicen quién subió y quién bajó desde la fecha anterior', () => {
    const db = {
      ...zonaUnica,
      equipos: [
        { id: 1, zonaId: 10, nombre: 'ALFA' },
        { id: 2, zonaId: 10, nombre: 'BETA' },
        { id: 3, zonaId: 10, nombre: 'GAMA' },
      ],
      tablaInicial: [],
      partidos: [
        { id: 1, categoriaId: 5, fecha: 1, localId: 1, visitanteId: 2, golesLocal: 1, golesVisitante: 0, postergado: false },
        { id: 2, categoriaId: 5, fecha: 2, localId: 3, visitanteId: 1, golesLocal: 2, golesVisitante: 0, postergado: false },
      ],
    };
    const html = dibujar(db);
    expect(html).toContain('Subió 1 puesto');
    expect(html).toContain('Bajó 1 puesto');
  });
});
```

- [ ] **Paso 2: Correr y ver que fallan**

Run: `npx vitest run src/componentes/TablaPosiciones.test.jsx src/vistas/publico/VistaPublica.test.jsx`
Expected: FAIL en las cuatro de "tabla pública". Las dos del panel ya pasan: fijan lo que no tiene que cambiar.

- [ ] **Paso 3: Implementar `TablaPosiciones`**

- Clases en celdas y encabezados: `col-detalle` en PG, PE, PP, GF y GC; `col-resumen` en PJ y DG. Van siempre: sin `data-vista` no hay CSS que las use.
- Con `vista`: el `div.tabla-scroll` lleva `data-vista={vista}`.
- Con `vista === 'racha'` y `rachas`: una columna antes de Pts, con el encabezado `<abbr title="Últimos partidos">Últimos</abbr>` en un `th.col-racha`, y en cada fila un `td.col-racha` con `<span className="racha" aria-label="Últimos resultados: ganó, empató">`. Adentro, un `span.racha__r.racha__r--v|e|d` por resultado, con la letra y `aria-hidden="true"`. Sin resultados: "–" y `aria-label="Sin partidos jugados"`.
- Con `movimientos`: en `td.col-pos`, después del círculo, `<span className="mov mov--sube|mov--baja" aria-hidden="true">▲|▼</span>` más `<span className="visualmente-oculto">` con `` `Subió ${n} ${n === 1 ? 'puesto' : 'puestos'}` `` o "Bajó…". Una sola plantilla.

- [ ] **Paso 4: Implementar `SeccionPosiciones`, `VistaPublica` y `App`**

- `SeccionPosiciones`: debajo de la cabecera de la sección, `<div className="vistas-tabla">` con `<Segmentado variante="vistas" etiquetaGrupo="Vista de la tabla" …>` y las opciones Resumen, Completa y Racha (valores `'resumen'`, `'completa'` y `'racha'`). Pasa `vista`, `rachas` y `movimientos` a la tabla. `NotasDesempate` se cambia por `<p className="frase-desempate">{frase}</p>` (solo si `fraseDesempate(criterios)` no es `null`).
- `VistaPublica`: `vistaTabla = ui.vistaTabla ?? 'resumen'`. Con `useMemo`, `rachas` (un `Map` de cada fila a `rachaDeEquipo(id, partidos)`) y `movimientos` (`movimientosDePuestos(filas, { equipos, partidos, criterios, tablaInicial: db.tablaInicial, ultimaFecha: ultimaFechaJugada(partidos, conTablaInicial) })`). `onVista={(v) => cambiar({ vistaTabla: v })}`.
- `App.jsx`: `vistaTabla: 'resumen'` en el estado inicial de `uiPublica`.

- [ ] **Paso 5: Estilos**

- `base.css`, junto a las otras variantes de `.seg`: `.seg--vistas .seg__btn { min-height: 44px; font-family: var(--fuente); font-size: 15px; font-weight: 700; letter-spacing: 0; text-transform: none; }`.
- `componentes.css`:
  - `.vistas-tabla { margin-bottom: 12px; }`.
  - Dentro de `@media (max-width: 959px)`: `[data-vista="resumen"] .col-detalle` y `[data-vista="racha"] :is(.col-detalle, .col-resumen)` con `display: none`.
  - Dentro de `@media (min-width: 960px)`: `.vistas-tabla` y `.tabla .col-racha` con `display: none`.
  - `.racha { display: inline-flex; gap: 3px; }` y `.racha__r`: círculo de 18 px con la letra (11 px, peso 800). V en `--exito`, E en `--tinta-suave` y D en `--roja`, con el texto `--sobre-roja` en D y `--fondo` en V y E.
  - `.mov`: 10 px, `margin-left: 2px`; `.mov--sube` en `--exito` y `.mov--baja` en `--roja`. En `max-width: 479px`, dentro de `[data-vista]`: `.col-pos` pasa a 42 px de ancho con 6 px de relleno a la izquierda, y `.col-equipo` corre su `left` a 42 px. Así la flechita no pisa el nombre.
  - `.frase-desempate { margin-top: 10px; font-size: 13px; color: var(--tinta-suave); }`. Se borran `.notas` solo si ya no las usa nadie: **el panel las sigue usando, así que quedan**.

- [ ] **Paso 6: Correr todo**

Run: `npm test` y `npm run lint`
Expected: todas las pruebas pasan (621 de base más las nuevas) y el lint sale con 0, sin avisos nuevos.

- [ ] **Paso 7: Mirarlo en el navegador**

Run: `npm run simulacion`
Expected:
- A 360 × 800, Resumen muestra Pos, Equipo, PJ, DG y Pts; Completa, las 10 columnas como hoy; Racha, los círculos y Pts.
- Con un nombre largo, escudo y flechita juntos, el nombre se corta con "…" y nada se pisa. Al deslizar la tabla en Completa, las columnas fijas siguen alineadas.
- A 1280 × 800, con Racha elegida antes en el celular: se ve la completa, sin columna de racha ni control de vistas.
- La frase de desempate aparece una vez, debajo de la tabla.

- [ ] **Paso 8: Commit y push**

```bash
git add src/componentes/TablaPosiciones.jsx src/componentes/TablaPosiciones.test.jsx src/vistas/publico/Secciones.jsx src/vistas/publico/VistaPublica.jsx src/App.jsx src/estilos/componentes.css src/estilos/base.css src/vistas/publico/VistaPublica.test.jsx
git commit -m "feat(publico): tabla con vistas Resumen, Completa y Racha, flechitas y una sola frase de desempate"
git push origin dev
```

---

### Tarea 6: Lógica de Mi equipo

**Archivos:**
- Crear: `src/logica/miEquipo.js`
- Crear: `src/logica/miEquipo.test.js`

**Interfaces:**
- Produce (todo en `src/logica/miEquipo.js`):
  - `leerMiEquipoGuardado(almacen): { f11: number | null, f7: number | null }`. Lee la clave `'lc-mi-equipo'` (JSON). Un valor que no es un entero positivo vale `null`. Sin almacenamiento, si falla o con JSON roto, los dos valen `null`.
  - `guardarMiEquipo(almacen, miEquipo): void`. Nunca tira error.
  - `alternarMiEquipo(miEquipo, modalidad: 'f11' | 'f7', equipoId: number)`. Devuelve un objeto nuevo: si ese equipo ya estaba marcado lo desmarca; si no, lo marca y reemplaza al anterior de esa modalidad.
  - `proximoPartido(partidos: Partido[], equipoId: number): Partido | null`. Recibe los partidos ordenados como `partidosDeEquipos`. Devuelve el primer partido del equipo sin resultado y no postergado; si no hay, el primero postergado sin resultado; si no, `null`.
  - `textoProximoPartido(partido, equipoId, nombreDe: (id) => string): string`.
  - `resumenMiEquipo(db, equipoId, modalidad): { equipo, zona, fila, proximo } | null`. Es `null` si el equipo no existe, está dado de baja, no tiene zona o es de otra modalidad (`modalidadDeEquipo`). `fila` sale de `calcularTabla` de su zona, con los criterios de `db.configuracion` y `db.tablaInicial`. `proximo` sale de `proximoPartido` sobre `partidosDeEquipos(db.partidos, equiposDeZona(...))`.

- [ ] **Paso 1: Escribir la prueba**

```js
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../datos/datosEjemplo.js';
import { conFutbol7 } from '../datos/datosEjemploFutbol7.js';
import {
  alternarMiEquipo, guardarMiEquipo, leerMiEquipoGuardado, proximoPartido, resumenMiEquipo, textoProximoPartido,
} from './miEquipo.js';

// Las mismas ayudas que modalidades.test.js
function almacenFalso(inicial = {}) {
  const datos = { ...inicial };
  return { datos, getItem: (clave) => datos[clave] ?? null, setItem: (clave, valor) => { datos[clave] = valor; } };
}
const almacenRoto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
const NINGUNO = { f11: null, f7: null };

describe('Mi equipo guardado en el celular', () => {
  it('guarda y lee un equipo por modalidad', () => {
    const almacen = almacenFalso();
    expect(leerMiEquipoGuardado(almacen)).toEqual(NINGUNO);
    guardarMiEquipo(almacen, { f11: 12, f7: null });
    expect(almacen.datos['lc-mi-equipo']).toBe('{"f11":12,"f7":null}');
    expect(leerMiEquipoGuardado(almacen)).toEqual({ f11: 12, f7: null });
  });

  it('con datos rotos, sin almacenamiento o si falla, no hay equipo y nada se rompe', () => {
    expect(leerMiEquipoGuardado(almacenFalso({ 'lc-mi-equipo': '{roto' }))).toEqual(NINGUNO);
    expect(leerMiEquipoGuardado(almacenFalso({ 'lc-mi-equipo': '{"f11":"x","f7":-3}' }))).toEqual(NINGUNO);
    expect(leerMiEquipoGuardado(almacenRoto)).toEqual(NINGUNO);
    expect(leerMiEquipoGuardado(null)).toEqual(NINGUNO);
    expect(() => guardarMiEquipo(almacenRoto, { f11: 1, f7: null })).not.toThrow();
  });

  it('un toque marca, otro desmarca, y marcar otro reemplaza al de esa modalidad', () => {
    expect(alternarMiEquipo({ f11: null, f7: 5 }, 'f11', 12)).toEqual({ f11: 12, f7: 5 });
    expect(alternarMiEquipo({ f11: 12, f7: 5 }, 'f11', 12)).toEqual({ f11: null, f7: 5 });
    expect(alternarMiEquipo({ f11: 12, f7: 5 }, 'f11', 7)).toEqual({ f11: 7, f7: 5 });
  });
});

describe('próximo partido', () => {
  const p = (id, fecha, extra = {}) => ({
    id, fecha, localId: 1, visitanteId: 2, golesLocal: null, golesVisitante: null, postergado: false,
    predio: null, cancha: null, hora: null, dia: null, ...extra,
  });
  const nombreDe = (id) => ({ 1: 'Puerto Argentino', 2: 'La Previa' })[id];

  it('es el primero sin resultado y sin postergar; si solo quedan postergados, el primero de ellos', () => {
    const jugado = p(1, 1, { golesLocal: 1, golesVisitante: 0 });
    const postergado = p(2, 2, { postergado: true });
    expect(proximoPartido([jugado, postergado, p(3, 3), p(4, 4)], 1).id).toBe(3);
    expect(proximoPartido([jugado, postergado], 1).id).toBe(2);
    expect(proximoPartido([jugado], 1)).toBeNull();
    expect(proximoPartido([p(5, 3, { localId: 7, visitanteId: 8 })], 1)).toBeNull();
  });

  it('dice la fecha, el lugar y el rival', () => {
    const lugar = { predio: 'los_cardales', cancha: 3, hora: '16:30' };
    expect(textoProximoPartido(p(1, 5, lugar), 1, nombreDe)).toBe('Fecha 5 · Los Cardales · Cancha 3 · 16:30 · vs La Previa');
    expect(textoProximoPartido(p(1, 6, { localId: 2, visitanteId: 1 }), 1, nombreDe)).toBe('Fecha 6 · vs La Previa');
  });

  it('un postergado dice de qué fecha es y cuándo se juega, o que falta confirmar', () => {
    const lugar = { predio: 'los_cardales', cancha: 2, hora: '10:00' };
    expect(textoProximoPartido(p(1, 2, { ...lugar, postergado: true }), 1, nombreDe)).toBe(
      'Postergado de la fecha 2, a confirmar · vs La Previa'
    );
    expect(textoProximoPartido(p(1, 2, { ...lugar, postergado: true, dia: '2026-10-12' }), 1, nombreDe)).toBe(
      'Postergado de la fecha 2 · Lunes 12/10 · Los Cardales · Cancha 2 · 10:00 · vs La Previa'
    );
  });
});

describe('resumenMiEquipo', () => {
  it('trae el equipo, su puesto y sus puntos en su zona, y el próximo partido', () => {
    const r = resumenMiEquipo(crearDatosEjemplo(), 1, 'f11');
    expect(r.equipo.nombre).toBe('Libre A1');
    expect(r.zona.id).toBe(1);
    expect([r.fila.pos, r.fila.pts]).toEqual([2, 4]);
    expect([r.proximo.fecha, r.proximo.visitanteId]).toEqual([3, 4]);
  });

  it('nada si el equipo no existe, está dado de baja o es de la otra modalidad', () => {
    const db = crearDatosEjemplo();
    expect(resumenMiEquipo(db, 999, 'f11')).toBeNull();
    db.equipos = db.equipos.map((e) => (e.id === 1 ? { ...e, baja: true } : e));
    expect(resumenMiEquipo(db, 1, 'f11')).toBeNull();
    expect(resumenMiEquipo(conFutbol7(), 101, 'f11')).toBeNull();
    expect(resumenMiEquipo(conFutbol7(), 101, 'f7').equipo.nombre).toBe('F7 A1');
  });
});
```

- [ ] **Paso 2: Correr y ver que falla**

Run: `npx vitest run src/logica/miEquipo.test.js`
Expected: FAIL (no existe `./miEquipo.js`).

- [ ] **Paso 3: Implementar `src/logica/miEquipo.js`**

`textoProximoPartido` une con " · " estas partes:
- un partido común: `Fecha N`, después `textoLugar(partido)` (si no está vacío) y `vs Rival`;
- un postergado sin `dia`: `Postergado de la fecha N, a confirmar` y `vs Rival` (el lugar viejo ya no vale);
- un postergado con `dia`: `Postergado de la fecha N`, después `textoLugar(partido)` (ya trae el día) y `vs Rival`.

El rival es el otro lado del partido. Para leer y guardar se copia el cuidado de `leerModalidadGuardada` y `guardarModalidad`.

- [ ] **Paso 4: Correr y ver que pasa**

Run: `npx vitest run src/logica/miEquipo.test.js`
Expected: PASS

- [ ] **Paso 5: Commit y push**

```bash
git add src/logica/miEquipo.js src/logica/miEquipo.test.js
git commit -m "feat(logica): Mi equipo guardado en el celular y su próximo partido"
git push origin dev
```

---

### Tarea 7: Mi equipo en la pantalla

**Archivos:**
- Modificar: `src/componentes/Icono.jsx` (ícono `estrella`)
- Modificar: `src/componentes/TablaPosiciones.jsx` (estrella y fila marcada)
- Crear: `src/vistas/publico/TarjetaMiEquipo.jsx`
- Modificar: `src/vistas/publico/Secciones.jsx` (tarjeta, ayuda, resaltado en Fixture y Resultados)
- Modificar: `src/vistas/publico/VistaPublica.jsx`
- Modificar: `src/App.jsx` (`uiPublica.miEquipo`)
- Modificar: `src/estilos/componentes.css`
- Modificar: `src/vistas/publico/VistaPublica.test.jsx`

**Interfaces:**
- Consume: todo lo que produce la Tarea 6.
- Produce:
  - `TablaPosiciones` suma `miEquipoId` (número o `null`) y `onMiEquipo(equipoId)`. Con `onMiEquipo`, cada nombre va en `span.equipo-celda` (escudo si hay, nombre en `span.equipo-celda__nombre`) y termina en un `button.estrella`. La fila marcada lleva `fila--mia`.
  - `TarjetaMiEquipo({ resumen, nombreDe, onIr })`.
  - `SeccionPosiciones` suma `resumenEquipo` (lo que devuelve `resumenMiEquipo`, o `null`), `miEquipoId`, `onMiEquipo` y `onIrAMiEquipo`. `SeccionFixture` y `SeccionResultados` suman `miEquipoId`.
  - `ui.miEquipo` (`App.jsx` lo inicia con `leerMiEquipoGuardado(almacenLocal())`; `VistaPublica` usa `ui.miEquipo ?? { f11: null, f7: null }`).

- [ ] **Paso 1: Escribir las pruebas**

En `VistaPublica.test.jsx`, cambiar la última línea de "si ningún equipo de la zona tiene escudo, la tabla se ve como siempre": `expect(html).not.toContain('equipo-celda')` pasa a ser `expect(html).not.toContain('class="escudo')`, porque la estrella usa `equipo-celda` también sin escudos. Y sumar:

```jsx
describe('Mi equipo', () => {
  const conMiEquipo = (id) => ({ miEquipo: { f11: id, f7: null } });

  it('cada equipo tiene su estrella y, sin equipo marcado, se explica para qué sirve', () => {
    const html = dibujar(crearDatosEjemplo());
    expect(html).toContain('aria-label="Seguir a Libre A1"');
    expect(html).toContain('Tocá la estrella de tu equipo para seguirlo.');
    expect(html).not.toContain('Tu equipo');
  });

  it('con un equipo marcado: tarjeta con su puesto y su próximo partido, y la fila resaltada', () => {
    const html = dibujar(crearDatosEjemplo(), conMiEquipo(1));
    expect(html).toContain('Tu equipo');
    expect(html).toContain('2.º · 4 puntos');
    expect(html).toContain('Fecha 3 · vs Libre A4');
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Dejar de seguir a Libre A1"|aria-label="Dejar de seguir a Libre A1"[^>]*aria-pressed="true"/);
    expect(html).toContain('fila--mia');
    expect(html).not.toContain('Tocá la estrella de tu equipo para seguirlo.');
  });

  it('resalta su partido en el fixture y en resultados', () => {
    expect(dibujar(crearDatosEjemplo(), { ...conMiEquipo(1), seccion: 'fixture' })).toContain('partido--mio');
    expect(dibujar(crearDatosEjemplo(), { ...conMiEquipo(1), seccion: 'resultados', fecha: 1 })).toContain('resultado--mio');
  });

  it('sin tarjeta si el equipo marcado es de la otra modalidad o se dio de baja', () => {
    expect(dibujar(conFutbol7(), { modalidad: 'f11', miEquipo: { f11: null, f7: 101 } })).not.toContain('Tu equipo');
    const db = crearDatosEjemplo();
    db.equipos = db.equipos.map((e) => (e.id === 1 ? { ...e, baja: true } : e));
    expect(dibujar(db, conMiEquipo(1))).not.toContain('Tu equipo');
  });
});
```

- [ ] **Paso 2: Correr y ver que fallan**

Run: `npx vitest run src/vistas/publico/VistaPublica.test.jsx`
Expected: FAIL en las cuatro de "Mi equipo". La de escudos ya pasa con el cambio.

- [ ] **Paso 3: Implementar**

- `Icono.jsx`: `estrella: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />`. La versión llena sale del CSS, no de otro ícono.
- `TablaPosiciones`: `button.estrella` (`type="button"`) con `aria-pressed`, `aria-label` igual a `Seguir a ${nombre}` o `Dejar de seguir a ${nombre}`, `<Icono nombre="estrella" tamano={18} />` y `onClick={() => onMiEquipo(id)}`.
- `TarjetaMiEquipo`: un `button.mi-equipo` (`type="button"`, `onClick={onIr}`) con "Tu equipo", el nombre, `` `${fila.pos}.º · ${fila.pts} ${fila.pts === 1 ? 'punto' : 'puntos'}` `` y `textoProximoPartido(...)`, o "No tiene partidos por jugar" si `proximo` es `null`.
- `SeccionPosiciones`: la tarjeta va arriba del selector de vistas, solo si `resumenEquipo` no es `null`. Sin equipo marcado, debajo de la frase de desempate va `<p className="frase-desempate">Tocá la estrella de tu equipo para seguirlo.</p>`.
- `SeccionFixture`: el `li` de un partido del equipo marcado lleva `partido--mio`. `TarjetaResultado` suma `resultado--mio` en el `article`.
- `VistaPublica`:
  - `miEquipo = ui.miEquipo ?? { f11: null, f7: null }` y `miEquipoId = miEquipo[modalidad]`;
  - `resumen = useMemo(() => (miEquipoId ? resumenMiEquipo(db, miEquipoId, modalidad) : null), …)`;
  - `onMiEquipo`: `alternarMiEquipo`, después `cambiar({ miEquipo: nuevo })` y `guardarMiEquipo(almacen, nuevo)`;
  - `onIrAMiEquipo`: `cambiar({ categoriaId: resumen.zona.categoriaId, zonaId: resumen.zona.id, fecha: null })`.
- `App.jsx`: `miEquipo: leerMiEquipoGuardado(almacenLocal())` en el estado inicial de `uiPublica`.

- [ ] **Paso 4: Estilos en `componentes.css`**

- `.estrella`: sin borde ni fondo, color `--linea-fuerte`; área tocable de 44 × 44 px con márgenes negativos (`margin-block: -12px; margin-right: -10px`), así la fila no crece. Con `[aria-pressed="true"]`: color `--acento` y `svg { fill: currentColor; }`. En `max-width: 479px`, `[data-vista="completa"] .estrella { display: none; }`, porque esa vista no tiene lugar (ver "Decisión del plan").
- `.fila--mia > *`: fondo `--acento-suave`; `.fila--mia .col-equipo`: color `--acento-fuerte`.
- `.mi-equipo`: ancho completo, alineado a la izquierda, `display: grid; gap: 2px`, `padding: 10px 12px`, `margin-bottom: 12px`, `border: 1px solid var(--acento-borde)`, `border-left: 4px solid var(--acento)`, `border-radius: var(--radio-chico)`, fondo `--acento-suave`. El nombre en peso 700 y 16 px; el próximo partido en `--acento-fuerte`, 14 px.
- `li.partido--mio` (relleno a la izquierda de 10 px) y `.resultado--mio`: borde izquierdo de 3 px en `--acento`.

- [ ] **Paso 5: Correr todo**

Run: `npm test` y `npm run lint`
Expected: todo pasa; el lint sale con 0 y sin avisos nuevos.

- [ ] **Paso 6: Mirarlo en el navegador**

Run: `npm run simulacion`
Expected, a 360 × 800:
- Al tocar la estrella aparece la tarjeta arriba y la fila se resalta. Al recargar, sigue marcado.
- Tocar la tarjeta desde otra categoría lleva a la zona del equipo.
- En Fútbol 7, la tarjeta, la estrella llena y el resaltado son celestes.
- En Completa no hay estrella, pero la fila marcada sigue resaltada.
- En una ventana privada la estrella funciona mientras dura la visita.

- [ ] **Paso 7: Commit y push**

```bash
git add src/componentes/Icono.jsx src/componentes/TablaPosiciones.jsx src/vistas/publico/TarjetaMiEquipo.jsx src/vistas/publico/Secciones.jsx src/vistas/publico/VistaPublica.jsx src/App.jsx src/estilos/componentes.css src/vistas/publico/VistaPublica.test.jsx
git commit -m "feat(publico): Mi equipo, con la estrella en la tabla, su próximo partido y su partido resaltado"
git push origin dev
```

---

### Tarea 8: Pie con las redes

**Archivos:**
- Modificar: `src/datos/constantes.js` (`REDES`)
- Modificar: `src/componentes/Icono.jsx` (íconos `facebook`, `instagram` y `whatsapp`)
- Crear: `src/componentes/PieSitio.jsx`
- Crear: `src/componentes/PieSitio.test.jsx`
- Modificar: `src/vistas/publico/VistaPublica.jsx`
- Modificar: `src/estilos/base.css` (`.publico__main` y `.pie`)
- Modificar: `src/vistas/publico/VistaPublica.test.jsx`
- Modificar: `README.md:8`

**Interfaces:**
- Produce: `REDES` en `constantes.js`:

```js
// Redes del campeonato (las pasó el usuario el 23/10). Una sin url no se muestra en el pie.
export const REDES = [
  { id: 'facebook', nombre: 'Facebook', url: 'https://www.facebook.com/loscardalesfutbol' },
  { id: 'instagram', nombre: 'Instagram', url: 'https://www.instagram.com/loscardalesfut/' },
  { id: 'whatsapp', nombre: 'WhatsApp', url: 'https://wa.me/5493814490189' },
];
```

- Produce: `PieSitio({ redes = REDES, anio })`. Sin `anio`, usa el año de `hoyEnArgentina()` (`src/logica/cuentas.js`).

- [ ] **Paso 1: Escribir las pruebas**

`src/componentes/PieSitio.test.jsx`:

```jsx
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { REDES } from '../datos/constantes.js';
import { PieSitio } from './PieSitio.jsx';

describe('PieSitio', () => {
  it('muestra las tres redes, que abren en otra pestaña, y el año', () => {
    const html = renderToString(<PieSitio anio={2026} />);
    expect(html).toContain('Seguí al campeonato');
    expect(html).toContain('href="https://www.facebook.com/loscardalesfutbol"');
    expect(html).toContain('href="https://www.instagram.com/loscardalesfut/"');
    expect(html).toContain('href="https://wa.me/5493814490189"');
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(3);
    expect(html).toContain('© 2026 Los Cardales');
  });

  it('una red sin dirección no aparece', () => {
    const html = renderToString(<PieSitio anio={2026} redes={[{ ...REDES[0], url: '' }, REDES[1]]} />);
    expect(html).not.toContain('Facebook');
    expect(html).toContain('Instagram');
  });
});
```

En `VistaPublica.test.jsx`, en la prueba "avisa si todavía no hay categorías cargadas", sumar `expect(dibujar(vacia)).toContain('Seguí al campeonato')`. En "muestra la tabla de la primera zona…", sumar `expect(html).toContain('Seguí al campeonato')`.

- [ ] **Paso 2: Correr y ver que fallan**

Run: `npx vitest run src/componentes/PieSitio.test.jsx src/vistas/publico/VistaPublica.test.jsx`
Expected: FAIL (no existe `PieSitio.jsx` y el pie no aparece).

- [ ] **Paso 3: Implementar**

- `Icono.jsx`: `facebook`, `instagram` y `whatsapp` con trazos simples al estilo de los demás (viewBox 24, trazo 2). No hace falta copiar los logos oficiales al detalle: el nombre va escrito debajo.
- `PieSitio`: `<footer className="pie">` con:
  - `<p className="pie__titulo">Seguí al campeonato</p>`;
  - `<ul className="pie__redes">` solo con las redes que tienen `url`, cada una como `<a className={`pie__red pie__red--${id}`} href={url} target="_blank" rel="noopener noreferrer">`, con `<span className="pie__icono"><Icono nombre={id} tamano={22} /></span>` y el nombre;
  - `<p className="pie__copy">{`© ${anio} Los Cardales`}</p>`.
- `VistaPublica`: `<PieSitio />` al final de `.publico`, en las dos ramas (con y sin categorías).

- [ ] **Paso 4: Estilos en `base.css`**

- El espacio para la barra inferior pasa de `.publico__main` al pie. `.publico__main` queda con `padding-block: 16px 24px` en celular, y `.publico:has(.nav-inferior) .pie` lleva `padding-bottom: calc(var(--nav-alto) + 24px + env(safe-area-inset-bottom, 0px))`. En 960 px o más, el pie lleva un relleno normal (la barra no existe).
- `.pie`: arriba, una cinta de 3 px con `--acento-degrade` (como `.cabecera::after`), fondo `--superficie`, texto centrado y `padding-top: 20px`. `.pie__titulo` en `--fuente-titulo`, 14 px, mayúsculas, como los títulos de sección.
- `.pie__redes`: lista sin viñetas, `display: flex; justify-content: center; gap: 20px`. `.pie__red`: columna con el ícono y el nombre (12.5 px, `--tinta-suave`) y sin subrayado. `.pie__icono`: círculo de 48 px con fondo `--superficie-2` y borde `--linea-fuerte`. `.pie__red--whatsapp .pie__icono`: fondo `--whatsapp` y color `--sobre-whatsapp`.
- `.pie__copy`: 12.5 px, `--tinta-suave`, `margin-top: 16px`.

- [ ] **Paso 5: README**

`README.md:8`: sumar a la línea de la vista pública "Arriba, los botones Fútbol 11 y Fútbol 7; la tabla tiene vistas Resumen, Completa y Racha, flechitas de quién subió o bajó y una frase con el orden de desempate; cada persona puede marcar **su equipo** (queda guardado en su celular) y al final está el pie con Facebook, Instagram y WhatsApp."

- [ ] **Paso 6: Correr todo y armar el sitio**

Run: `npm test`, `npm run lint` y `npm run build`
Expected: todas las pruebas pasan; el lint sale con 0 y sin avisos nuevos; el build termina sin errores.

- [ ] **Paso 7: Mirarlo en el navegador**

Run: `npm run simulacion`
Expected:
- A 360 × 800, bajando hasta el final, el pie se ve entero arriba de la barra inferior. Los tres botones miden 48 px y WhatsApp es verde.
- Cada enlace abre en otra pestaña la red que corresponde. WhatsApp abre el chat con +54 9 381 449 0189.
- A 1280 × 800, el pie va al final sin espacio de más.

- [ ] **Paso 8: Commit y push**

```bash
git add src/datos/constantes.js src/componentes/Icono.jsx src/componentes/PieSitio.jsx src/componentes/PieSitio.test.jsx src/vistas/publico/VistaPublica.jsx src/estilos/base.css src/vistas/publico/VistaPublica.test.jsx README.md
git commit -m "feat(publico): pie con Facebook, Instagram y WhatsApp"
git push origin dev
```

---

## Decisión del plan (no estaba en el diseño)

- **En la vista Completa, en celulares de menos de 480 px, la estrella no aparece.** Con 10 columnas no hay lugar para ella sin achicar más el nombre, que el diseño pide no tocar. Se marca desde Resumen o Racha (Resumen es la vista que abre), y la fila marcada se ve resaltada en las tres vistas.
- **Texto del próximo partido postergado:** "Postergado de la fecha 2, a confirmar · vs La Previa" en lugar de "Partido postergado, a confirmar", para que se sepa de qué fecha es (igual que el fixture, que dice "Postergado de la fecha 1").
- **Ayuda para descubrir la estrella:** sin equipo marcado, debajo de la tabla dice "Tocá la estrella de tu equipo para seguirlo." Ocupa una línea del lugar que dejan las notas.
- **Colores de acento en vez de los de marca:** el diseño nombra `--marca-suave` y `--marca-fuerte` para el resaltado de Mi equipo, y el degradé del logo para la cinta del pie. El plan usa `--acento-suave`, `--acento-fuerte` y `--acento-degrade`. En Fútbol 11 dan exactamente lo mismo, y en Fútbol 7 pasan al celeste, como la cinta de la cabecera.
