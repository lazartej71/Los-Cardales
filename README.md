# Los Cardales Fútbol

App web mobile-first del campeonato de fútbol amateur, con dos modalidades:

- **Fútbol 11** (organiza Franco): Libre, +30, +35, +40 y +45.
- **Fútbol 7** (organiza Gaby): Libre (zonas A y B) y +30. Se suma con las migraciones 10a y 10b (ver "Fútbol 7").

- **Vista pública:** tabla de posiciones que se calcula sola, fixture con predio, cancha y hora de cada partido (y arriba, aparte, los postergados que se recuperan en un día especial), y resultados por fecha. Nunca muestra expulsados, suspendidos ni teléfonos.
- **Instalar como app:** la vista pública y el panel se instalan por separado (cada uno con su manifiesto en `public/`). El panel conviene instalarlo desde `admin.loscardalesfutbol.com`: en Android, si la app pública ya está instalada, Chrome no deja instalar `www…/admin` porque queda dentro de ella.
- **Panel de administración:** se abre en `/admin` (por ejemplo `https://www.loscardalesfutbol.com/admin`; el link viejo `/#admin` lleva ahí). Desde ahí:
  - se arman los partidos de cada fecha y se reprograman los postergados para el día especial en que se recuperan (día, predio, cancha y hora; siguen postergados hasta que se cargan y suman en su fecha original);
  - en cada partido se cargan el resultado (o el W.O.), las rojas (doble amarilla o directa, con aviso al delegado por WhatsApp) y lo que pagó cada equipo, en efectivo, por transferencia o en las dos partes;
  - en **Cuentas** se ve cuánto debe cada equipo y se anotan pagos sueltos y deudas anteriores;
  - se manejan los suspendidos, los equipos y delegados, y la configuración (incluido el valor del arancel).
- **Veedores:** con una cuenta de veedor, el panel muestra solo la pantalla **Veedores**. El veedor elige el predio y la cancha, y carga los partidos de esa cancha en la fecha en juego de cada categoría (si una va una fecha adelante, como Libre cuando recupera una fecha entera un feriado, se ven las dos): resultado, W.O., rojas y pago del arancel. Los postergados reprogramados van aparte, en el botón **Postergados**. No puede crear, borrar ni postergar partidos, ni entrar a las otras secciones.

## Cómo está armado

```
App React (Vite) ──► /api (Hono) ──► Supabase (Postgres + reglas RLS + login)
```

- **Servidor (`/api`):** valida cada operación y habla con Supabase usando la clave pública y la sesión del admin. Nunca usa la clave secreta.
- **Reglas de la base (RLS):** el público solo puede leer; las expulsiones y los delegados solo los ven los admins; los veedores tienen reglas propias, más limitadas.
- **Tabla de posiciones:** la calcula `calcularTabla()` (`src/logica/tabla.js`) a partir de los partidos, sumando la tabla inicial de la fecha 1, que se cargó sin el detalle de cada partido.

## Para trabajar en la compu

Necesita Node 20 o superior y un archivo `.env.local` en la raíz, que git ignora. Se arma copiando `.env.example` y completando los datos de Supabase:

```
VITE_SUPABASE_URL=https://qkvdwvmwajkwvfnvseso.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

```bash
npm install
npm run dev       # app y servidor juntos en http://localhost:5173
npm run simulacion  # práctica en http://localhost:5174: copia de los datos en memoria, no toca la base real
                    # (en el panel, el cartel de arriba tiene «Ver como»: superadmin, admin o veedor)
npm test          # pruebas
npm run lint      # revisión del código (oxlint)
npm run build     # versión de producción en dist/
npm run importar  # regenera supabase/datos-iniciales.sql desde el Excel
```

## Estructura

```
src/                 la app
  api/               pedidos a /api y login con Supabase
  hooks/             sesión, datos, cambios, /admin
  logica/            funciones puras: tabla, consultas, expulsiones, validaciones
  vistas/publico/    vista pública
  vistas/admin/      panel
  vistas/veedor/     pantalla de los veedores
  componentes/, estilos/
server/              API (Hono): rutas, reglas de validación y acceso a Supabase
api/index.js         entrada del servidor en Vercel (vercel.json reescribe /api/*)
supabase/            esquema.sql, datos-iniciales.sql (generado), migraciones y su prueba (base.test.js)
scripts/             importación del Excel y fuente de la imagen para compartir (tarjeta.html)
index.html, admin.html  las dos páginas (vista pública y panel), cada una con su tarjeta para compartir
```

## Base de datos

**Cargarla desde cero.** En el SQL Editor de Supabase, ejecutar en orden `supabase/esquema.sql`, `supabase/datos-iniciales.sql`, `supabase/migracion-2-cuentas.sql`, `supabase/migracion-3-predios.sql`, `supabase/migracion-4-cancha-6-cura-borges.sql`, `supabase/migracion-5-control.sql`, `supabase/migracion-6-visitas.sql`, `supabase/migracion-7-veedores.sql`, `supabase/migracion-8-escudos.sql`, `supabase/migracion-9-bajas.sql`, `supabase/migracion-10a-futbol7.sql` y `supabase/migracion-10b-futbol7-datos.sql`.

**Actualizar una base ya cargada.** Ejecutar solo las migraciones que falten, en orden. La 2 (`migracion-2-cuentas.sql`) agrega las tarjetas, el W.O. y las cuentas de los equipos. Solo suma columnas y tablas, así que no toca los datos. La 3 (`migracion-3-predios.sql`) agrega el predio, la cancha y la hora de cada partido; los partidos que ya estaban quedan sin lugar y se completan desde el panel. La 4 (`migracion-4-cancha-6-cura-borges.sql`) suma la cancha 6 de Cura Borges. La 5 (`migracion-5-control.sql`) agrega los roles de los admins y el registro de actividad, y pasa a superadmin la cuenta `ljdev`. La 6 (`migracion-6-visitas.sql`) cuenta cuántas personas entran por día. La 7 (`migracion-7-veedores.sql`) agrega el rol de veedor (con sus reglas en la base), el tipo de cada roja, el pago de un partido en dos partes (uno por medio de pago) y el día en que se recupera un postergado. La 8 (`migracion-8-escudos.sql`) agrega el escudo de cada equipo: la columna `equipos.escudo`, el bucket público `escudos` de Storage y las reglas para que solo el superadmin los suba, cambie o quite. La 9 (`migracion-9-bajas.sql`) agrega la baja de un equipo (`equipos.baja`): el dado de baja deja de aparecer en la tabla y no puede jugar partidos nuevos, pero lo ya jugado queda como está. Además da de baja a GOB GUTIERREZ, LA MALABIA y BARRIO BELGRANO, y crea CHIVERO F.C, LA AGUADITA y CLUB PASAJE UNIDOS en sus zonas. La 10a (`migracion-10a-futbol7.sql`) prepara Fútbol 7: la modalidad y el arancel de cada categoría, las canchas de Fútbol 7, la modalidad fija de cada cuenta y sus reglas (deja a `franco1` en Fútbol 11); no toca datos. La 10b (`migracion-10b-futbol7-datos.sql`) carga los datos de Fútbol 7 y **no se escribe a mano**: la genera `node scripts/generar-futbol7.mjs --cobrado-el AAAA-MM-DD` desde `datos/futbol7-equipos.csv` y `datos/futbol7-partidos.csv`. Cada migración se corre antes de publicar el código que la usa, salvo la 10b, que va después (ver "Fútbol 7").

**Probarla en la compu.** `npm test` incluye `supabase/base.test.js`, que corre el esquema, los datos y todas las migraciones en un Postgres local (PGlite) y revisa los permisos, las reglas y los triggers.

Los datos iniciales salen de `Excel/TABLAS GP FECHA N1.xlsx` (`npm run importar`):

- **Equipos:** solo los que figuran ahí; los demás no participan.
- **Fecha 1:** se carga como tabla inicial, con PJ, PG, PE, PP y goles por equipo.
- **Postergados:** los 5 partidos postergados de la fecha 1 quedan cargados como partidos.

**Crear una cuenta de admin:** en el panel se ingresa con un usuario (por ejemplo `franco1`) y la contraseña. Por dentro, la app lo convierte en el email `franco1@loscardalesfutbol.com`, que no necesita existir. Si alguien escribe un email completo, se usa tal cual.

1. En Supabase, **Authentication → Sign In / Providers**: el registro público (*Allow new users to sign up*) tiene que estar desactivado.
2. En **Authentication → Users → Add user → Create new user**, cargar como email `usuario@loscardalesfutbol.com` (en minúsculas) y la contraseña, con *Auto Confirm User*.
3. En el SQL Editor:
   ```sql
   insert into public.administradores (user_id, nombre)
   select id, 'Nombre de la persona' from auth.users where email = 'usuario@loscardalesfutbol.com';
   ```

**Roles:** cada admin es `admin` (el panel de siempre) o `superadmin` (además ve la pestaña **Control**: quién cargó qué y cuándo, y el acceso a las visitas). Para cambiarlo: `update public.administradores set rol = 'superadmin' where user_id = (select id from auth.users where email = 'usuario@loscardalesfutbol.com');`. El registro de actividad lo anota la base sola en cada cambio (también lo que se carga desde el SQL Editor, como "Supabase (SQL)") y solo lo lee el superadmin.

**Cuentas de veedor:** se crean igual que las de admin (pasos 1 y 2), pero en el paso 3 con el rol `veedor`:

```sql
insert into public.administradores (user_id, nombre, rol)
select id, 'Veedor Juan', 'veedor' from auth.users where email = 'veedor1@loscardalesfutbol.com';
```

El veedor ingresa con su usuario (`veedor1`). La base solo le deja cargar el resultado y el W.O. de un partido, agregar rojas y borrar las que todavía no tienen sanción, y manejar los pagos de los partidos; la API además lo limita a los partidos de la fecha en juego de cada categoría. Lo que carga queda en Control con su nombre.

**Visitas:** la pestaña Control muestra cuántas personas entraron hoy, ayer, en los últimos 7 días (con barras) y en total. Cada navegador avisa una sola vez por día al abrir la vista pública (no cuentan el panel ni la simulación) y en Supabase queda solo un número por día, sin datos de la persona. Para más detalle (países, dispositivos) está Vercel Web Analytics, activado en el proyecto los-cardales → **Analytics**.

**Escudos:** los sube el superadmin en **Equipos**. En la tarjeta de cada equipo toca **Subir escudo** y elige la imagen grande (PNG, JPG o WebP). La app recorta los bordes vacíos y la achica sola a 128 px antes de subirla, así queda en unos 10 KB. Antes de guardarla se ve cómo queda. Si el logo trae fondo propio (un JPG, o un PNG con fondo blanco), lo pone dentro de un círculo blanco para que no se vea un cuadrado. Los escudos se ven en Posiciones, Fixture, Resultados, los partidos del panel y Veedores. Mientras ningún equipo de una lista tiene escudo, esa lista se ve como siempre. Las imágenes van al bucket `escudos` de Supabase Storage y la base guarda solo el nombre del archivo.

**Fútbol 7.** Es parte del mismo sitio, panel y base. Cada categoría es de una modalidad (`categorias.modalidad`) y de ahí la heredan zonas, equipos y partidos.

- **Vista pública:** con Fútbol 7 cargado aparece el botón **F11 | F7** en la cabecera, y el celular recuerda la elección. En Fútbol 7 todo toma el celeste y la cabecera dice "Fútbol 7".
- **Cada cuenta ve su modalidad** (`administradores.modalidad`):
  - Franco (`f11`) ve y toca solo Fútbol 11, incluidas cuentas, delegados y suspendidos;
  - Gaby (`f7`) ve y toca solo Fútbol 7;
  - una cuenta sin modalidad (el superadmin) ve las dos y tiene el filtro Todas / Fútbol 11 / Fútbol 7 (en Cargar no hay Todas).

  La base lo controla también con sus reglas.
- **Aranceles:** Fútbol 11 usa el de Ajustes (lo cambia Franco). Fútbol 7 tiene uno por categoría (Libre $65.000 y +30 $60.000) y los cambia Gaby en Ajustes. Los criterios de desempate valen para las dos y los cambia solo el superadmin.
- **Canchas:** Fútbol 7 tiene canchas propias, que en pantalla se ven como "Cancha 1", "Cancha 2"…: Los Cardales 1 y 2, y Cura Borges 1, 2 y 3. En la base llevan 21 y más, así nunca chocan con las de Fútbol 11.
- **Antes de guardar un resultado o un W.O.**, una hoja muestra la modalidad bien grande para confirmar. Si se tocaron los goles y se cambia de cancha o de modalidad sin guardar, pregunta si se descarta.

**Publicar Fútbol 7 (en este orden):**

1. Correr `supabase/migracion-10a-futbol7.sql` en Supabase. El sitio publicado sigue igual.
2. Publicar el código (pasar a `main`). Sin datos de Fútbol 7, el sitio se ve como siempre.
3. Generar y correr `supabase/migracion-10b-futbol7-datos.sql`. Desde ahí aparece el botón F11 | F7.
4. Crear la cuenta de Gaby (pasos 1 y 2 de "Crear una cuenta de admin", con el usuario `gaby1`) y en el SQL Editor:
   ```sql
   insert into public.administradores (user_id, nombre, modalidad)
   select id, 'Gaby', 'f7' from auth.users where email = 'gaby1@loscardalesfutbol.com';
   ```
5. Subir los escudos de los equipos de Fútbol 7 (los sube el superadmin, en Equipos).

En la simulación (`npm run simulacion`), mientras la base real no tenga Fútbol 7, se suman en memoria los equipos de `datos/futbol7-equipos.csv` con una fecha de prueba. "Ver como" ofrece también "Organizador F11 (Franco)" y "Organizador F7 (Gaby)".

**Quitar a un admin:** `delete from public.administradores where user_id = (select id from auth.users where email = 'usuario@loscardalesfutbol.com');`

## Publicación

Vercel, conectado al repositorio de GitHub. Requiere cargar las dos variables `VITE_SUPABASE_*` en el proyecto de Vercel. Cada cambio que se sube a GitHub se publica solo.

**Al compartir el link** (WhatsApp, Facebook, X) se ve una tarjeta con el logo (`public/tarjeta.jpg`, 1200 × 630), el título y la descripción, que están fijos en `index.html` y `admin.html`. El panel lleva `noindex` y `robots.txt` lo deja afuera de los buscadores. WhatsApp y Facebook guardan un tiempo la vista previa de un link ya compartido; en Facebook se refresca con el *Sharing Debugger*.
