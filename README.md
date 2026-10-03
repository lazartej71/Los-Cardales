# Los Cardales Fútbol

App web mobile-first del campeonato de fútbol amateur, con cinco categorías: Libre, +30, +35, +40 y +45.

- **Vista pública:** tabla de posiciones que se calcula sola, fixture con predio, cancha y hora de cada partido, y resultados por fecha. Nunca muestra expulsados, suspendidos ni teléfonos.
- **Instalar como app:** la vista pública y el panel se instalan por separado (cada uno con su manifiesto en `public/`).
- **Panel de administración:** se abre en `/admin` (por ejemplo `https://www.loscardalesfutbol.com/admin`; el link viejo `/#admin` lleva ahí). Desde ahí:
  - se arman los partidos de cada fecha;
  - en cada partido se cargan el resultado (o el W.O.), las amarillas, las rojas (con aviso al delegado por WhatsApp) y lo que pagó cada equipo;
  - en **Cuentas** se ve cuánto debe cada equipo y se anotan pagos sueltos y deudas anteriores;
  - se manejan los suspendidos, los equipos y delegados, y la configuración (incluido el valor del arancel).

## Cómo está armado

```
App React (Vite) ──► /api (Hono) ──► Supabase (Postgres + reglas RLS + login)
```

- **Servidor (`/api`):** valida cada operación y habla con Supabase usando la clave pública y la sesión del admin. Nunca usa la clave secreta.
- **Reglas de la base (RLS):** el público solo puede leer; las expulsiones y los delegados solo los ven los admins.
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
  componentes/, estilos/
server/              API (Hono): rutas, reglas de validación y acceso a Supabase
api/index.js         entrada del servidor en Vercel (vercel.json reescribe /api/*)
supabase/            esquema.sql, datos-iniciales.sql (generado), migraciones y su prueba (base.test.js)
scripts/             importación del Excel
```

## Base de datos

**Cargarla desde cero.** En el SQL Editor de Supabase, ejecutar en orden `supabase/esquema.sql`, `supabase/datos-iniciales.sql`, `supabase/migracion-2-cuentas.sql`, `supabase/migracion-3-predios.sql` y `supabase/migracion-4-cancha-6-cura-borges.sql`.

**Actualizar una base ya cargada.** Ejecutar solo las migraciones que falten, en orden. La 2 (`migracion-2-cuentas.sql`) agrega las tarjetas, el W.O. y las cuentas de los equipos. Solo suma columnas y tablas, así que no toca los datos. La 3 (`migracion-3-predios.sql`) agrega el predio, la cancha y la hora de cada partido; los partidos que ya estaban quedan sin lugar y se completan desde el panel. La 4 (`migracion-4-cancha-6-cura-borges.sql`) suma la cancha 6 de Cura Borges. Cada migración se corre antes de publicar el código que la usa.

**Probarla en la compu.** `npm test` incluye `supabase/base.test.js`, que corre los tres archivos en un Postgres local (PGlite) y revisa los permisos, las reglas y los triggers.

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

**Quitar a un admin:** `delete from public.administradores where user_id = (select id from auth.users where email = 'usuario@loscardalesfutbol.com');`

## Publicación

Vercel, conectado al repositorio de GitHub. Requiere cargar las dos variables `VITE_SUPABASE_*` en el proyecto de Vercel. Cada cambio que se sube a GitHub se publica solo.
