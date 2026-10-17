/**
 * Prueba la base completa en un Postgres local (PGlite): esquema.sql, datos-iniciales.sql y las
 * migraciones, en el orden en que se corren en Supabase. Simula lo que Supabase trae de fábrica:
 * el esquema auth, auth.uid(), los roles de la API (anon y authenticated) y las tablas de Storage.
 * Las pruebas comparten la base y corren en orden: cada una parte de lo que dejó la anterior.
 */

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { armarFutbol7, sqlFutbol7 } from '../scripts/futbol7.js';

const leer = (archivo) => readFileSync(new URL(archivo, import.meta.url), 'utf8');
const ADMIN = '11111111-1111-1111-1111-111111111111';
const OTRO = '22222222-2222-2222-2222-222222222222';
const SUPER = '33333333-3333-3333-3333-333333333333';
const VEEDOR = '44444444-4444-4444-4444-444444444444';
const FRANCO = '55555555-5555-5555-5555-555555555555';
const GABY = '66666666-6666-6666-6666-666666666666';
let db;
let partidoId;

const uno = async (consulta) => (await db.query(consulta)).rows[0];

// Corre una consulta como un rol de la API, con la sesión de `usuario` (o sin sesión)
async function como(rol, usuario, consulta) {
  await db.exec(`set role ${rol}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [usuario ?? '']);
  try {
    return { filas: (await db.query(consulta)).rows };
  } catch (error) {
    return { error: error.message };
  } finally {
    await db.exec('reset role');
  }
}
const comoAdmin = (consulta) => como('authenticated', ADMIN, consulta);

// Una base nueva con el esquema, los datos y las migraciones 2 a 9, como está hoy en Supabase
async function armarBase() {
  const base = new PGlite();
  await base.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
    -- Storage, como viene en Supabase: buckets y archivos, con RLS en los archivos
    create schema storage;
    create table storage.buckets (
      id text primary key, name text not null, public boolean not null default false,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets (id),
      name text not null
    );
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select on storage.buckets to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `);
  await base.exec(leer('./esquema.sql'));
  await base.exec(leer('./datos-iniciales.sql'));
  await base.exec(leer('./migracion-2-cuentas.sql'));
  await base.exec(leer('./migracion-3-predios.sql'));
  await base.exec(leer('./migracion-4-cancha-6-cura-borges.sql'));
  await base.exec(`
    insert into auth.users values ('${ADMIN}', 'admin@prueba.com'), ('${OTRO}', 'otro@prueba.com'),
      ('${SUPER}', 'ljdev@loscardalesfutbol.com');
    insert into public.administradores (user_id, nombre) values ('${ADMIN}', 'Prueba'), ('${SUPER}', 'Jorge');
  `);
  // La 5 va después de las cuentas: al final pasa a superadmin la de ljdev
  await base.exec(leer('./migracion-5-control.sql'));
  await base.exec(leer('./migracion-6-visitas.sql'));
  await base.exec(leer('./migracion-7-veedores.sql'));
  await base.exec(leer('./migracion-8-escudos.sql'));
  await base.exec(leer('./migracion-9-bajas.sql'));
  return base;
}

beforeAll(async () => {
  db = await armarBase();
}, 60000);

describe('carga inicial', () => {
  // La migración 9 da de baja a 3 equipos y suma 3: siguen 98 en juego
  it('deja las 5 categorías, los 98 equipos en juego y los 5 postergados', async () => {
    expect(
      await uno(`select
        (select count(*) from public.categorias)::int as categorias,
        (select count(*) from public.equipos where not baja)::int as equipos,
        (select count(*) from public.partidos where postergado)::int as postergados`)
    ).toEqual({ categorias: 5, equipos: 98, postergados: 5 });
  });

  it('sin sesión se leen los datos públicos pero no los privados', async () => {
    expect((await como('anon', null, 'select count(*)::int as n from public.categorias')).filas).toEqual([{ n: 5 }]);
    for (const tabla of ['expulsiones', 'delegados', 'administradores']) {
      expect((await como('anon', null, `select * from public.${tabla}`)).error).toMatch(/permission denied/);
    }
  });
});

describe('migración 2: tarjetas, W.O. y cuentas', () => {
  it('suma el arancel en 105.000 y ningún partido queda como W.O.', async () => {
    expect(await uno('select arancel from public.configuracion')).toEqual({ arancel: 105000 });
    expect(await uno('select count(*)::int as n from public.partidos where ausente is not null')).toEqual({ n: 0 });
  });

  it('sin sesión no se pueden leer ni escribir tarjetas ni movimientos', async () => {
    expect((await como('anon', null, 'select * from public.tarjetas')).error).toMatch(/permission denied/);
    expect((await como('anon', null, 'select * from public.movimientos')).error).toMatch(/permission denied/);
    const insertar = `insert into public.movimientos (equipo_id, tipo, monto, fecha) values (1, 'deuda_anterior', 10, '2026-10-01')`;
    expect((await como('anon', null, insertar)).error).toMatch(/permission denied/);
  });

  it('una cuenta que no es admin no ve ni anota nada', async () => {
    expect((await como('authenticated', OTRO, 'select * from public.movimientos')).filas).toEqual([]);
    const insertar = `insert into public.movimientos (equipo_id, tipo, monto, fecha) values (1, 'deuda_anterior', 10, '2026-10-01')`;
    expect((await como('authenticated', OTRO, insertar)).error).toMatch(/row-level security/);
  });

  it('el admin anota el pago y la amarilla de un partido jugado', async () => {
    const creado = await comoAdmin(
      `insert into public.partidos (categoria_id, fecha, local_id, visitante_id, goles_local, goles_visitante)
       values (1, 2, 1, 2, 2, 1) returning id`
    );
    partidoId = creado.filas[0].id;
    const pago = await comoAdmin(
      `insert into public.movimientos (equipo_id, partido_id, tipo, monto, metodo, fecha)
       values (1, ${partidoId}, 'pago', 95000, 'efectivo', '2026-10-15') returning monto, nota`
    );
    expect(pago.filas).toEqual([{ monto: 95000, nota: '' }]);
    const amarilla = await comoAdmin(
      `insert into public.tarjetas (partido_id, equipo_id, numero_camiseta) values (${partidoId}, 2, 7) returning nombre_jugador`
    );
    expect(amarilla.filas).toEqual([{ nombre_jugador: '' }]);
  });

  // Desde la migración 7, uno por cada medio de pago
  it('un solo pago en efectivo por equipo y partido', async () => {
    const otra = await comoAdmin(
      `insert into public.movimientos (equipo_id, partido_id, tipo, monto, metodo, fecha)
       values (1, ${partidoId}, 'pago', 10000, 'efectivo', '2026-10-15')`
    );
    expect(otra.error).toMatch(/movimientos_pago_partido/);
  });

  it('la amarilla tiene que ser de uno de los dos equipos del partido', async () => {
    const ajena = await comoAdmin(
      `insert into public.tarjetas (partido_id, equipo_id, numero_camiseta) values (${partidoId}, 3, 9)`
    );
    expect(ajena.error).toBe('El equipo de la tarjeta no jugó ese partido');
  });

  it('un W.O. tiene que ser 3 a 0 para el que se presentó', async () => {
    const mal = await comoAdmin(
      `update public.partidos set ausente = 'visitante', goles_local = 1, goles_visitante = 0 where id = ${partidoId}`
    );
    expect(mal.error).toMatch(/partidos_wo_check/);
    const bien = await comoAdmin(
      `update public.partidos set ausente = 'visitante', goles_local = 3, goles_visitante = 0 where id = ${partidoId}`
    );
    expect(bien.error).toBeUndefined();
  });

  it('no deja anotarle un pago al equipo que no se presentó', async () => {
    const pago = await comoAdmin(
      `insert into public.movimientos (equipo_id, partido_id, tipo, monto, metodo, fecha)
       values (2, ${partidoId}, 'pago', 105000, 'efectivo', '2026-10-15')`
    );
    expect(pago.error).toBe('El pago tiene que ser de un equipo que jugó ese partido');
  });

  it('el pago lleva método y la deuda anterior no lleva ni método ni partido', async () => {
    const sinMetodo = `insert into public.movimientos (equipo_id, tipo, monto, fecha) values (1, 'pago', 10, '2026-10-01')`;
    const deudaConMetodo = `insert into public.movimientos (equipo_id, tipo, monto, metodo, fecha)
      values (1, 'deuda_anterior', 10, 'efectivo', '2026-10-01')`;
    const deudaConPartido = `insert into public.movimientos (equipo_id, partido_id, tipo, monto, fecha)
      values (1, ${partidoId}, 'deuda_anterior', 10, '2026-10-01')`;
    for (const consulta of [sinMetodo, deudaConMetodo, deudaConPartido]) {
      expect((await comoAdmin(consulta)).error).toMatch(/movimientos_check/);
    }
    const deuda = await comoAdmin(
      `insert into public.movimientos (equipo_id, tipo, monto, fecha, nota) values (1, 'deuda_anterior', 10000, '2026-10-01', 'fecha 1')`
    );
    expect(deuda.error).toBeUndefined();
  });

  it('no se puede borrar un partido con pagos o tarjetas', async () => {
    expect((await comoAdmin(`delete from public.partidos where id = ${partidoId}`)).error).toMatch(/foreign key/);
  });

  it('si la migración se corre dos veces, falla al principio y no cambia nada', async () => {
    const antes = await uno('select count(*)::int as n from public.movimientos');
    await expect(db.exec(leer('./migracion-2-cuentas.sql'))).rejects.toThrow(/already exists/);
    await db.exec('rollback');
    expect(await uno('select count(*)::int as n from public.movimientos')).toEqual(antes);
  });
});

describe('migración 3: predio, cancha y hora', () => {
  // Dos partidos nuevos de la fecha 30, sin resultado
  const crear = (local, visitante, lugar) =>
    comoAdmin(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id, predio, cancha, hora)
      values (1, 30, ${local}, ${visitante}, ${lugar}) returning id`);

  it('los partidos que ya estaban quedan sin lugar ni hora', async () => {
    expect(await uno('select count(*)::int as n from public.partidos where predio is null and cancha is null and hora is null'))
      .toEqual(await uno('select count(*)::int as n from public.partidos'));
  });

  it('el admin carga un partido con lugar y hora', async () => {
    const { filas, error } = await crear(1, 2, `'los_cardales', 2, '13:40'`);
    expect(error).toBeUndefined();
    expect(await uno(`select predio, cancha, hora::text from public.partidos where id = ${filas[0].id}`)).toEqual({
      predio: 'los_cardales',
      cancha: 2,
      hora: '13:40:00',
    });
  });

  it('rechaza una cancha que no es del predio, un predio desconocido o el lugar a medias', async () => {
    expect((await crear(3, 4, `'los_cardales', 9, '13:40'`)).error).toMatch(/partidos_cancha_check/);
    expect((await crear(3, 4, `'otro', 1, '13:40'`)).error).toMatch(/partidos_(predio|cancha)_check/);
    expect((await crear(3, 4, `null, null, '13:40'`)).error).toMatch(/partidos_lugar_completo_check/);
    expect((await crear(3, 4, `'cura_borges', 9, '13:40'`)).error).toBeUndefined();
  });

  it('no deja dos partidos en la misma cancha a la misma hora, salvo que uno esté postergado', async () => {
    expect((await crear(5, 6, `'los_cardales', 2, '13:40'`)).error).toMatch(/partidos_cancha_ocupada_idx/);
    await comoAdmin(`update public.partidos set postergado = true where fecha = 30 and predio = 'los_cardales'`);
    expect((await crear(5, 6, `'los_cardales', 2, '13:40'`)).error).toBeUndefined();
  });

  it('si la migración se corre dos veces, falla al principio y no cambia nada', async () => {
    await expect(db.exec(leer('./migracion-3-predios.sql'))).rejects.toThrow(/already exists/);
    await db.exec('rollback');
    expect(await uno(`select count(*)::int as n from public.partidos where fecha = 30`)).toEqual({ n: 3 });
  });
});

describe('migración 4: cancha 6 de Cura Borges', () => {
  it('acepta la cancha 6 de Cura Borges y sigue rechazando canchas que no existen', async () => {
    const crear = (lugar) =>
      comoAdmin(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id, predio, cancha, hora)
        values (1, 31, 7, 8, ${lugar})`);
    expect((await crear(`'cura_borges', 2, '13:40'`)).error).toMatch(/partidos_cancha_check/);
    expect((await crear(`'cura_borges', 6, '13:40'`)).error).toBeUndefined();
  });
});

describe('migración 5: roles y registro de actividad', () => {
  const comoSuper = (consulta) => como('authenticated', SUPER, consulta);
  // Lo último que anotó el registro (como postgres, que no tiene RLS)
  const ultima = () => uno('select quien, accion, tabla, cambios, fila from public.actividad order by id desc limit 1');
  const cuantas = async () => (await uno('select count(*)::int as n from public.actividad')).n;
  let id;

  it('los admins quedan como admin y ljdev como superadmin', async () => {
    expect((await db.query('select nombre, rol from public.administradores order by nombre')).rows).toEqual([
      { nombre: 'Jorge', rol: 'superadmin' },
      { nombre: 'Prueba', rol: 'admin' },
    ]);
  });

  it('anota el alta de un partido con quién lo cargó', async () => {
    const { filas } = await comoAdmin(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id)
      values (1, 40, 9, 10) returning id`);
    id = filas[0].id;
    expect(await ultima()).toMatchObject({ quien: 'Prueba', accion: 'alta', tabla: 'partidos', cambios: null });
    expect((await ultima()).fila).toMatchObject({ id, local_id: 9, visitante_id: 10 });
  });

  it('anota qué columnas cambiaron, y nada si no cambió nada', async () => {
    await comoAdmin(`update public.partidos set goles_local = 2, goles_visitante = 1 where id = ${id}`);
    expect(await ultima()).toMatchObject({ accion: 'cambio', cambios: ['goles_local', 'goles_visitante'] });
    const antes = await cuantas();
    await comoAdmin(`update public.partidos set goles_local = 2 where id = ${id}`);
    expect(await cuantas()).toBe(antes);
  });

  it('anota la baja con la fila borrada', async () => {
    await comoAdmin(`delete from public.partidos where id = ${id}`);
    expect(await ultima()).toMatchObject({ accion: 'baja', tabla: 'partidos' });
    expect((await ultima()).fila).toMatchObject({ id, goles_local: 2 });
  });

  it('lo cargado desde el SQL Editor queda como Supabase (SQL)', async () => {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.exec(`update public.configuracion set arancel = 110000`);
    expect(await ultima()).toMatchObject({ quien: 'Supabase (SQL)', tabla: 'configuracion', cambios: ['arancel'] });
  });

  it('solo el superadmin lee el registro', async () => {
    expect((await comoAdmin('select count(*)::int as n from public.actividad')).filas).toEqual([{ n: 0 }]);
    expect((await comoSuper('select count(*)::int as n from public.actividad')).filas).toEqual([{ n: await cuantas() }]);
  });

  it('nadie puede escribir ni borrar el registro desde la app', async () => {
    for (const consulta of [
      `insert into public.actividad (quien, accion, tabla) values ('x', 'alta', 'partidos')`,
      'delete from public.actividad',
      `update public.actividad set quien = 'x'`,
    ]) {
      expect((await comoSuper(consulta)).error).toMatch(/permission denied/);
    }
  });

  it('si la migración se corre dos veces, falla al principio y no cambia nada', async () => {
    const antes = await cuantas();
    await expect(db.exec(leer('./migracion-5-control.sql'))).rejects.toThrow(/already exists/);
    await db.exec('rollback');
    expect(await cuantas()).toBe(antes);
  });
});

describe('migración 6: visitas', () => {
  const comoSuper = (consulta) => como('authenticated', SUPER, consulta);
  const hoy = `(now() at time zone 'America/Argentina/Buenos_Aires')::date`;

  it('cualquiera suma una visita al día de hoy (hora de Argentina)', async () => {
    for (let i = 0; i < 3; i++) expect((await como('anon', null, 'select public.sumar_visita()')).error).toBeUndefined();
    expect(await uno(`select personas from public.visitas where dia = ${hoy}`)).toEqual({ personas: 3 });
  });

  it('solo el superadmin lee las visitas', async () => {
    expect((await como('anon', null, 'select * from public.visitas')).error).toMatch(/permission denied/);
    expect((await comoAdmin('select count(*)::int as n from public.visitas')).filas).toEqual([{ n: 0 }]);
    expect((await comoSuper(`select personas from public.visitas where dia = ${hoy}`)).filas).toEqual([{ personas: 3 }]);
  });

  it('nadie cambia el número a mano desde la app', async () => {
    for (const consulta of ['update public.visitas set personas = 999', 'delete from public.visitas']) {
      expect((await comoSuper(consulta)).error).toMatch(/permission denied/);
      expect((await como('anon', null, consulta)).error).toMatch(/permission denied/);
    }
  });

  it('si la migración se corre dos veces, falla al principio y no cambia nada', async () => {
    await expect(db.exec(leer('./migracion-6-visitas.sql'))).rejects.toThrow(/already exists/);
    await db.exec('rollback');
    expect(await uno(`select personas from public.visitas where dia = ${hoy}`)).toEqual({ personas: 3 });
  });
});

describe('migración 7: veedores, rojas con tipo y pagos en dos partes', () => {
  const comoVeedor = (consulta) => como('authenticated', VEEDOR, consulta);
  const pago = (metodo, monto) =>
    `insert into public.movimientos (equipo_id, partido_id, tipo, monto, metodo, fecha)
     values (1, ${id}, 'pago', ${monto}, '${metodo}', '2026-10-15') returning id`;
  // Partido de la fecha 50 entre los equipos 1 y 2, sin resultado
  let id;

  beforeAll(async () => {
    await db.exec(`
      insert into auth.users values ('${VEEDOR}', 'veedor1@loscardalesfutbol.com');
      insert into public.administradores (user_id, nombre, rol) values ('${VEEDOR}', 'Veedor Juan', 'veedor');
    `);
    id = (await uno(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id)
      values (1, 50, 1, 2) returning id`)).id;
  });

  it('el veedor no es admin, y su fila dice que es veedor', async () => {
    expect((await comoVeedor('select public.es_admin() as admin, public.es_veedor() as veedor')).filas).toEqual([
      { admin: false, veedor: true },
    ]);
    expect((await comoVeedor('select rol from public.administradores')).filas).toEqual([{ rol: 'veedor' }]);
    expect((await comoAdmin('select public.es_admin() as admin, public.es_veedor() as veedor')).filas).toEqual([
      { admin: true, veedor: false },
    ]);
  });

  it('carga el resultado y el W.O. de un partido, lo deshace, y no cambia nada más', async () => {
    expect((await comoVeedor(`update public.partidos set goles_local = 2, goles_visitante = 1 where id = ${id}`)).error)
      .toBeUndefined();
    expect((await comoVeedor(`update public.partidos set ausente = 'visitante', goles_local = 3, goles_visitante = 0
      where id = ${id}`)).error).toBeUndefined();
    expect((await comoVeedor(`update public.partidos set ausente = null, goles_local = null, goles_visitante = null
      where id = ${id}`)).error).toBeUndefined();
    for (const cambio of ['fecha = 51', 'postergado = true', `predio = 'los_cardales', cancha = 1, hora = '10:00'`]) {
      expect((await comoVeedor(`update public.partidos set ${cambio} where id = ${id}`)).error).toBe(
        'Un veedor solo puede cargar el resultado o el W.O.'
      );
    }
    // Al admin no le cambia nada
    expect((await comoAdmin(`update public.partidos set fecha = 51 where id = ${id}`)).error).toBeUndefined();
    await comoAdmin(`update public.partidos set fecha = 50 where id = ${id}`);
  });

  it('no crea ni borra partidos', async () => {
    expect((await comoVeedor(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id)
      values (1, 52, 3, 4)`)).error).toMatch(/row-level security/);
    await comoVeedor(`delete from public.partidos where id = ${id}`);
    expect(await uno(`select count(*)::int as n from public.partidos where id = ${id}`)).toEqual({ n: 1 });
  });

  it('agrega rojas con tipo y borra solo las que no tienen sanción', async () => {
    const roja = (tipo) => `insert into public.expulsiones (partido_id, equipo_id, numero_camiseta, tipo)
      values (${id}, 1, 10, ${tipo}) returning id, tipo`;
    const directa = await comoVeedor(roja(`'directa'`));
    expect(directa.filas).toEqual([{ id: directa.filas[0].id, tipo: 'directa' }]);
    const doble = await comoVeedor(roja(`'doble_amarilla'`));
    expect(doble.error).toBeUndefined();
    expect((await comoVeedor(roja(`'otra'`))).error).toMatch(/expulsiones_tipo_check/);
    // Una roja vieja, sin tipo, sigue siendo válida
    expect((await comoAdmin(roja('null'))).error).toBeUndefined();
    // La sanción la pone el organizador: el veedor no puede cargar una roja que ya la traiga
    const conSancionDeEntrada = await comoVeedor(`insert into public.expulsiones
      (partido_id, equipo_id, numero_camiseta, tipo, fechas_suspension) values (${id}, 1, 11, 'directa', 0)`);
    expect(conSancionDeEntrada.error).toMatch(/row-level security/);
    const conCumplidas = await comoVeedor(`insert into public.expulsiones
      (partido_id, equipo_id, numero_camiseta, tipo, fechas_cumplidas) values (${id}, 1, 11, 'directa', 1)`);
    expect(conCumplidas.error).toMatch(/row-level security|expulsiones_check/);

    const [conSancion, sinSancion] = [directa.filas[0].id, doble.filas[0].id];
    await comoAdmin(`update public.expulsiones set fechas_suspension = 2 where id = ${conSancion}`);
    await comoVeedor(`update public.expulsiones set fechas_suspension = 0 where id = ${conSancion}`);
    await comoVeedor(`delete from public.expulsiones where id in (${conSancion}, ${sinSancion})`);
    expect((await db.query(`select id, fechas_suspension from public.expulsiones where id in (${conSancion}, ${sinSancion})`))
      .rows).toEqual([{ id: conSancion, fechas_suspension: 2 }]);
  });

  it('anota pagos de un partido en efectivo y por transferencia, uno de cada uno', async () => {
    const efectivo = await comoVeedor(pago('efectivo', 50000));
    expect(efectivo.error).toBeUndefined();
    expect((await comoVeedor(pago('transferencia', 55000))).error).toBeUndefined();
    expect((await comoVeedor(pago('efectivo', 1000))).error).toMatch(/movimientos_pago_partido_metodo_idx/);
    const pagoId = efectivo.filas[0].id;
    expect((await comoVeedor(`update public.movimientos set monto = 60000 where id = ${pagoId} returning monto`)).filas)
      .toEqual([{ monto: 60000 }]);
    await comoVeedor(`delete from public.movimientos where id = ${pagoId}`);
    expect(await uno(`select count(*)::int as n from public.movimientos where id = ${pagoId}`)).toEqual({ n: 0 });
  });

  it('no anota deudas anteriores ni pagos sueltos', async () => {
    const deuda = `insert into public.movimientos (equipo_id, tipo, monto, fecha) values (1, 'deuda_anterior', 10, '2026-10-01')`;
    const suelto = `insert into public.movimientos (equipo_id, tipo, monto, metodo, fecha)
      values (1, 'pago', 10, 'efectivo', '2026-10-01')`;
    for (const consulta of [deuda, suelto]) {
      expect((await comoVeedor(consulta)).error).toMatch(/row-level security/);
    }
  });

  it('lee las rojas y los pagos, pero no los teléfonos de los delegados ni las amarillas', async () => {
    const cuantos = async (tabla) => (await comoVeedor(`select count(*)::int as n from public.${tabla}`)).filas[0].n;
    expect(await cuantos('movimientos')).toBe((await uno('select count(*)::int as n from public.movimientos')).n);
    expect(await cuantos('expulsiones')).toBe((await uno('select count(*)::int as n from public.expulsiones')).n);
    await db.exec(`insert into public.delegados (equipo_id, nombre, telefono) values (1, 'Delegado', '5491112345678')
      on conflict (equipo_id) do nothing`);
    expect(await cuantos('delegados')).toBe(0);
    expect(await cuantos('tarjetas')).toBe(0);
    expect(await cuantos('actividad')).toBe(0);
  });

  it('lo que hace el veedor queda en el registro con su nombre', async () => {
    await comoVeedor(`update public.partidos set goles_local = 1, goles_visitante = 1 where id = ${id}`);
    expect(await uno('select quien, tabla, cambios from public.actividad order by id desc limit 1')).toEqual({
      quien: 'Veedor Juan',
      tabla: 'partidos',
      cambios: ['goles_local', 'goles_visitante'],
    });
  });

  it('si la migración se corre dos veces, falla al principio y no cambia nada', async () => {
    await expect(db.exec(leer('./migracion-7-veedores.sql'))).rejects.toThrow(/already exists/);
    await db.exec('rollback');
    expect((await comoVeedor('select public.es_veedor() as veedor')).filas).toEqual([{ veedor: true }]);
  });
});

describe('migración 7: postergados que se recuperan en un día especial', () => {
  const comoVeedor = (consulta) => como('authenticated', VEEDOR, consulta);
  const LUGAR = `predio = 'los_cardales', cancha = 2, hora = '13:40'`;
  const crear = async (fecha, local, visitante, extra = '') =>
    (await uno(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id${extra ? ', postergado' : ''})
      values (1, ${fecha}, ${local}, ${visitante}${extra ? ', true' : ''}) returning id`)).id;
  let reprogramado;
  let normal;

  it('un postergado se reprograma con día, predio, cancha y hora, y sigue postergado', async () => {
    reprogramado = await crear(55, 3, 4, 'postergado');
    const { filas, error } = await comoAdmin(`update public.partidos set dia = '2026-10-13', ${LUGAR}
      where id = ${reprogramado} returning postergado, dia::text`);
    expect(error).toBeUndefined();
    expect(filas).toEqual([{ postergado: true, dia: '2026-10-13' }]);
  });

  it('el día va solo con el lugar completo', async () => {
    const otro = await crear(56, 5, 6, 'postergado');
    expect((await comoAdmin(`update public.partidos set dia = '2026-10-13' where id = ${otro}`)).error).toMatch(
      /partidos_dia_check/
    );
  });

  it('dos partidos con día no van a la misma cancha el mismo día a la misma hora', async () => {
    const otro = await crear(57, 7, 8, 'postergado');
    const mismo = await comoAdmin(`update public.partidos set dia = '2026-10-13', ${LUGAR} where id = ${otro}`);
    expect(mismo.error).toMatch(/partidos_reprogramado_ocupado_idx/);
    const otraHora = await comoAdmin(`update public.partidos set dia = '2026-10-13', predio = 'los_cardales',
      cancha = 2, hora = '15:00' where id = ${otro}`);
    expect(otraHora.error).toBeUndefined();
  });

  it('jugado su día, no choca con un partido de su fecha en esa cancha a esa hora', async () => {
    normal = await crear(55, 9, 10);
    expect((await comoAdmin(`update public.partidos set ${LUGAR} where id = ${normal}`)).error).toBeUndefined();
    const jugado = await comoAdmin(`update public.partidos set goles_local = 2, goles_visitante = 1, postergado = false
      where id = ${reprogramado}`);
    expect(jugado.error).toBeUndefined();
    await comoAdmin(`update public.partidos set goles_local = null, goles_visitante = null, postergado = true
      where id = ${reprogramado}`);
  });

  it('el veedor carga el resultado de un reprogramado (deja de estar postergado) y lo puede quitar', async () => {
    const cargar = await comoVeedor(`update public.partidos set goles_local = 1, goles_visitante = 0, postergado = false
      where id = ${reprogramado}`);
    expect(cargar.error).toBeUndefined();
    const quitar = await comoVeedor(`update public.partidos set goles_local = null, goles_visitante = null,
      postergado = true where id = ${reprogramado}`);
    expect(quitar.error).toBeUndefined();
    expect(await uno(`select postergado, goles_local from public.partidos where id = ${reprogramado}`)).toEqual({
      postergado: true,
      goles_local: null,
    });
  });

  it('el veedor no posterga un partido normal, no cambia el día ni saca la postergación sin resultado', async () => {
    const NO = 'Un veedor solo puede cargar el resultado o el W.O.';
    for (const [cambio, id] of [
      ['postergado = true', normal],
      [`dia = '2026-10-20'`, reprogramado],
      ['postergado = false', reprogramado],
    ]) {
      expect((await comoVeedor(`update public.partidos set ${cambio} where id = ${id}`)).error, cambio).toBe(NO);
    }
  });
});
describe('migración 8: escudos', () => {
  const comoSuper = (consulta) => como('authenticated', SUPER, consulta);
  const subir = (nombre) => `insert into storage.objects (bucket_id, name) values ('escudos', '${nombre}') returning name`;
  const borrar = (nombre) => `delete from storage.objects where name = '${nombre}' returning name`;
  const NO = 'Los escudos los cambia solo el superadmin.';

  it('crea el bucket público de escudos: hasta 100 KB, WebP o PNG', async () => {
    expect(
      await uno(`select public, file_size_limit::int as limite, allowed_mime_types as tipos
        from storage.buckets where id = 'escudos'`)
    ).toEqual({ public: true, limite: 102400, tipos: ['image/webp', 'image/png'] });
  });

  it('solo el superadmin sube y borra escudos', async () => {
    expect((await comoSuper(subir('equipo-1-1.webp'))).filas).toEqual([{ name: 'equipo-1-1.webp' }]);
    expect((await comoAdmin(subir('equipo-1-2.webp'))).error).toMatch(/row-level security/);
    expect((await como('anon', null, subir('equipo-1-3.webp'))).error).toMatch(/row-level security/);
    expect((await comoAdmin(borrar('equipo-1-1.webp'))).filas).toEqual([]);
    expect((await comoSuper(borrar('equipo-1-1.webp'))).filas).toEqual([{ name: 'equipo-1-1.webp' }]);
  });

  it('solo el superadmin cambia el escudo de un equipo; el admin sigue cambiando el nombre', async () => {
    expect((await comoAdmin(`update public.equipos set escudo = 'equipo-1-5.webp' where id = 1`)).error).toBe(NO);
    const puesto = await comoSuper(`update public.equipos set escudo = 'equipo-1-5.webp' where id = 1 returning escudo`);
    expect(puesto.filas).toEqual([{ escudo: 'equipo-1-5.webp' }]);
    expect((await comoAdmin(`update public.equipos set nombre = nombre where id = 1`)).error).toBeUndefined();
    expect((await comoAdmin(`update public.equipos set escudo = null where id = 1`)).error).toBe(NO);
  });

  it('tampoco se crea un equipo con escudo si no es el superadmin', async () => {
    const crear = (escudo) => `insert into public.equipos (zona_id, nombre, escudo)
      values ((select min(id) from public.zonas), 'PRUEBA', ${escudo}) returning id`;
    expect((await comoAdmin(crear(`'equipo-1-9.webp'`))).error).toBe(NO);
    const sinEscudo = await comoAdmin(crear('null'));
    expect(sinEscudo.error).toBeUndefined();
    await comoAdmin(`delete from public.equipos where id = ${sinEscudo.filas[0].id}`);
  });

  it('desde el SQL Editor (rol postgres, sin sesión) se puede corregir un escudo', async () => {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    expect(await uno(`update public.equipos set escudo = null where id = 1 returning escudo`)).toEqual({ escudo: null });
  });

  it('el escudo es solo un nombre de archivo con versión', async () => {
    for (const malo of ['https://otro.com/logo.png', 'equipo-1.webp', 'equipo-1-5.gif']) {
      const cambio = await comoSuper(`update public.equipos set escudo = '${malo}' where id = 1`);
      expect(cambio.error, malo).toMatch(/equipos_escudo_check/);
    }
  });
});

describe('migración 9: equipos dados de baja', () => {
  const NO = 'No se puede armar un partido con un equipo dado de baja';

  it('da de baja a los tres que se van y crea los tres nuevos sin tabla inicial', async () => {
    expect((await db.query(`select id, nombre from public.equipos where baja order by id`)).rows).toEqual([
      { id: 20, nombre: 'BARRIO BELGRANO' },
      { id: 69, nombre: 'LA MALABIA' },
      { id: 88, nombre: 'GOB GUTIERREZ' },
    ]);
    const nuevos = (
      await db.query(`select e.zona_id, e.nombre, e.baja, t.equipo_id is not null as con_tabla
        from public.equipos e left join public.tabla_inicial t on t.equipo_id = e.id
        where e.id > 98 order by e.zona_id`)
    ).rows;
    expect(nuevos).toEqual([
      { zona_id: 2, nombre: 'CLUB PASAJE UNIDOS', baja: false, con_tabla: false },
      { zona_id: 7, nombre: 'LA AGUADITA', baja: false, con_tabla: false },
      { zona_id: 9, nombre: 'CHIVERO F.C', baja: false, con_tabla: false },
    ]);
  });

  it('no deja armar un partido nuevo con un equipo dado de baja', async () => {
    const crear = (local, visitante) =>
      comoAdmin(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id)
        values (4, 58, ${local}, ${visitante}) returning id`);
    expect((await crear(87, 88)).error).toBe(NO);
    const bien = await crear(87, 86);
    expect(bien.error).toBeUndefined();
    await comoAdmin(`delete from public.partidos where id = ${bien.filas[0].id}`);
  });

  it('un partido viejo de un equipo dado de baja se sigue pudiendo corregir, pero no cambiarle un equipo por otro dado de baja', async () => {
    // Como el W.O. real de la fecha 2: PROYECTO 3 - 0 GOB GUTIERREZ, cargado antes de la baja
    await db.exec(`update public.equipos set baja = false where id = 88`);
    const { id } = await uno(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id, goles_local, goles_visitante)
      values (4, 59, 87, 88, 3, 0) returning id`);
    await db.exec(`update public.equipos set baja = true where id = 88`);
    expect((await comoAdmin(`update public.partidos set goles_local = 2 where id = ${id}`)).error).toBeUndefined();
    expect((await comoAdmin(`update public.partidos set local_id = 69 where id = ${id}`)).error).toBe(NO);
    await db.exec(`delete from public.partidos where id = ${id}`);
  });

  it('admins agregan equipos y los dan de baja; el veedor no', async () => {
    const creado = await comoAdmin(`insert into public.equipos (zona_id, nombre) values (1, 'PRUEBA BAJA') returning id, baja`);
    expect(creado.filas).toEqual([{ id: expect.any(Number), baja: false }]);
    const id = creado.filas[0].id;
    const veedor = await como('authenticated', VEEDOR, `update public.equipos set baja = true where id = ${id} returning id`);
    expect(veedor.filas ?? []).toEqual([]);
    expect((await comoAdmin(`update public.equipos set baja = true where id = ${id} returning baja`)).filas).toEqual([
      { baja: true },
    ]);
    await db.exec(`delete from public.equipos where id = ${id}`);
  });

  it('falla si se corre dos veces', async () => {
    await expect(db.exec(leer('./migracion-9-bajas.sql'))).rejects.toThrow(/already exists/);
    await db.exec('rollback');
  });
});

// La 10a se corre acá y no en el beforeAll general: las pruebas de la migración 5 listan los admins
// y no esperan a Franco ni a Gaby. El Fútbol 7 de prueba (categoría 90) se borra al final, así la 10b
// encuentra libres sus ids.
describe('migración 10a: Fútbol 7', () => {
  const NO_MODALIDAD = 'La cancha tiene que ser de la modalidad del partido';

  beforeAll(async () => {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.exec(`
      insert into auth.users values ('${FRANCO}', 'franco1@loscardalesfutbol.com'), ('${GABY}', 'gaby1@loscardalesfutbol.com');
      insert into public.administradores (user_id, nombre) values ('${FRANCO}', 'Franco');
    `);
    await db.exec(leer('./migracion-10a-futbol7.sql'));
    await db.exec(`
      insert into public.administradores (user_id, nombre, modalidad) values ('${GABY}', 'Gaby', 'f7');
      insert into public.categorias (id, nombre, orden, modalidad, arancel) values (90, 'Libre', 90, 'f7', 65000);
      insert into public.zonas (id, categoria_id, nombre) values (90, 90, 'Zona A');
      insert into public.equipos (id, zona_id, nombre) values (900, 90, 'F7 UNO'), (901, 90, 'F7 DOS');
    `);
  });

  afterAll(async () => {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.exec(`
      delete from public.movimientos where equipo_id in (900, 901);
      delete from public.expulsiones where equipo_id in (900, 901);
      delete from public.tarjetas where equipo_id in (900, 901);
      delete from public.partidos where categoria_id = 90;
      delete from public.equipos where zona_id = 90;
      delete from public.zonas where categoria_id = 90;
      delete from public.categorias where id = 90;
    `);
  });

  describe('estructura', () => {
    // Un partido nuevo de la fecha 33 con lugar y hora
    const crear = (categoria, local, visitante, lugar, fecha = 33) =>
      comoAdmin(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id, predio, cancha, hora)
        values (${categoria}, ${fecha}, ${local}, ${visitante}, ${lugar}) returning id`);

    it('todo lo que había queda en F11, sin arancel propio', async () => {
      expect(
        await uno(`select count(*) filter (where modalidad = 'f11')::int as f11, count(*)::int as total,
          count(arancel)::int as con_arancel from public.categorias where id < 90`)
      ).toEqual({ f11: 5, total: 5, con_arancel: 0 });
    });

    it('puede haber una Libre en cada modalidad, pero no dos en la misma', async () => {
      expect(await uno(`select count(*)::int as n from public.categorias where nombre = 'Libre'`)).toEqual({ n: 2 });
      const otra = await como('authenticated', SUPER, `insert into public.categorias (id, nombre, orden, modalidad)
        values (91, 'Libre', 91, 'f7')`);
      expect(otra.error).toMatch(/categorias_modalidad_nombre_key/);
    });

    it('franco1 queda en F11 y el resto sin modalidad', async () => {
      expect((await db.query('select nombre, modalidad from public.administradores order by nombre')).rows).toEqual([
        { nombre: 'Franco', modalidad: 'f11' },
        { nombre: 'Gaby', modalidad: 'f7' },
        { nombre: 'Jorge', modalidad: null },
        { nombre: 'Prueba', modalidad: null },
        { nombre: 'Veedor Juan', modalidad: null },
      ]);
    });

    it('una cancha de F7 solo en un partido de F7, y al revés', async () => {
      expect((await crear(1, 1, 2, `'los_cardales', 21, '15:30'`)).error).toBe(NO_MODALIDAD);
      expect((await crear(90, 900, 901, `'cura_borges', 1, '15:30'`)).error).toBe(NO_MODALIDAD);
      expect((await crear(90, 900, 901, `'los_cardales', 23, '15:30'`)).error).toMatch(/partidos_cancha_check/);
      const bien = await crear(90, 900, 901, `'cura_borges', 23, '15:30'`);
      expect(bien.error).toBeUndefined();
      await db.exec(`delete from public.partidos where id = ${bien.filas[0].id}`);
    });

    it('una F7 y una F11 no chocan aunque compartan fecha y hora', async () => {
      const f11 = await crear(1, 1, 2, `'los_cardales', 2, '13:40'`, 34);
      expect(f11.error).toBeUndefined();
      const f7 = await crear(90, 900, 901, `'los_cardales', 22, '13:40'`, 34);
      expect(f7.error).toBeUndefined();
      await db.exec(`delete from public.partidos where id in (${f11.filas[0].id}, ${f7.filas[0].id})`);
    });

    it('el cambio de arancel de una categoría queda en el registro', async () => {
      await db.exec('update public.categorias set arancel = 70000 where id = 90');
      expect(await uno('select tabla, cambios from public.actividad order by id desc limit 1')).toEqual({
        tabla: 'categorias',
        cambios: ['arancel'],
      });
      await db.exec('update public.categorias set arancel = 65000 where id = 90');
    });

    it('si 10a se corre dos veces, falla al principio y no cambia nada', async () => {
      await expect(db.exec(leer('./migracion-10a-futbol7.sql'))).rejects.toThrow(/already exists/);
      await db.exec('rollback');
      expect(await uno(`select modalidad from public.administradores where nombre = 'Franco'`)).toEqual({
        modalidad: 'f11',
      });
    });
  });

  describe('permisos', () => {
    const comoFranco = (consulta) => como('authenticated', FRANCO, consulta);
    const comoGaby = (consulta) => como('authenticated', GABY, consulta);
    const comoSuper = (consulta) => como('authenticated', SUPER, consulta);
    const NO_F7 = 'Tu cuenta es de Fútbol 7: los ajustes de Fútbol 11 los cambia su organizador.';
    const NO_CRITERIOS = 'Los criterios de desempate los cambia solo el superadmin.';
    const pago = (equipo, partido) => `insert into public.movimientos (equipo_id, partido_id, tipo, monto, metodo, fecha)
      values (${equipo}, ${partido}, 'pago', 1000, 'efectivo', '2026-10-16') returning id`;
    // Un partido jugado de cada modalidad (fecha 35), cada uno con un pago y una roja del local
    let f11;
    let f7;

    beforeAll(async () => {
      await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
      const crear = async (categoria, local, visitante) =>
        (await uno(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id, goles_local, goles_visitante)
          values (${categoria}, 35, ${local}, ${visitante}, 1, 0) returning id`)).id;
      f11 = await crear(1, 1, 2);
      f7 = await crear(90, 900, 901);
      await db.exec(`
        ${pago(1, f11)}; ${pago(900, f7)};
        insert into public.expulsiones (partido_id, equipo_id, numero_camiseta) values (${f11}, 1, 4), (${f7}, 900, 4);
        insert into public.delegados (equipo_id, nombre) values (900, 'Delegado F7') on conflict (equipo_id) do nothing;
      `);
    });

    // Los equipos de las filas que la cuenta ve (de los partidos de la fecha 35 y los delegados de 1 y 900)
    const equiposQueVe = async (quien, tabla) => {
      const donde = tabla === 'delegados' ? 'equipo_id in (1, 900)' : `partido_id in (${f11}, ${f7})`;
      const { filas } = await quien(`select equipo_id from public.${tabla} where ${donde} order by equipo_id`);
      return filas.map((f) => Number(f.equipo_id));
    };

    it('Gaby no lee pagos, rojas ni delegados de F11, y sí los de F7', async () => {
      for (const tabla of ['movimientos', 'expulsiones', 'delegados']) {
        expect(await equiposQueVe(comoGaby, tabla), tabla).toEqual([900]);
      }
    });

    it('Franco no lee los de F7', async () => {
      for (const tabla of ['movimientos', 'expulsiones', 'delegados']) {
        expect(await equiposQueVe(comoFranco, tabla), tabla).toEqual([1]);
      }
    });

    it('Gaby no carga el resultado de F11 ni crea un partido de F11; sí los de F7', async () => {
      expect((await comoGaby(`update public.partidos set goles_local = 3 where id = ${f11} returning id`)).filas).toEqual([]);
      const nuevo = await comoGaby(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id)
        values (1, 36, 1, 2)`);
      expect(nuevo.error).toMatch(/row-level security/);
      expect((await comoGaby(`update public.partidos set goles_local = 2 where id = ${f7} returning id`)).filas).toHaveLength(1);
      expect(await uno(`select goles_local from public.partidos where id = ${f11}`)).toEqual({ goles_local: 1 });
    });

    it('Gaby no agrega un equipo en una zona de F11 ni pasa uno de F7 a F11', async () => {
      expect((await comoGaby(`insert into public.equipos (zona_id, nombre) values (1, 'INTRUSO')`)).error).toMatch(
        /row-level security/
      );
      expect((await comoGaby('update public.equipos set zona_id = 1 where id = 900')).error).toMatch(/row-level security/);
    });

    it('Gaby no anota un pago a un equipo de F11', async () => {
      expect((await comoGaby(pago(2, f11))).error).toMatch(/row-level security/);
    });

    it('cada uno cambia solo su arancel', async () => {
      expect((await comoGaby('update public.categorias set arancel = 70000 where id = 90 returning id')).filas).toHaveLength(1);
      expect((await comoGaby('update public.categorias set arancel = 70000 where id = 1 returning id')).filas).toEqual([]);
      expect((await comoGaby(`update public.categorias set nombre = 'X' where id = 90`)).error).toBe(
        'Desde tu cuenta solo se cambia el arancel de la categoría.'
      );
      expect((await comoGaby('update public.configuracion set arancel = 1')).error).toBe(NO_F7);
      expect((await comoFranco('update public.configuracion set arancel = 110000')).error).toBeUndefined();
      const otroOrden = `update public.configuracion set criterios_desempate = array['puntos', 'gf', 'dg', 'enfrentamiento']`;
      expect((await comoFranco(otroOrden)).error).toBe(NO_CRITERIOS);
      expect((await comoSuper(otroOrden)).error).toBeUndefined();
      await db.exec(`update public.configuracion set criterios_desempate = array['puntos', 'dg', 'gf', 'enfrentamiento'];
        update public.categorias set arancel = 65000 where id = 90`);
    });

    it('Franco y Gaby no crean categorías ni zonas', async () => {
      for (const quien of [comoFranco, comoGaby]) {
        expect((await quien(`insert into public.categorias (id, nombre, orden) values (92, 'Nueva', 92)`)).error).toMatch(
          /row-level security/
        );
        expect((await quien(`insert into public.zonas (id, categoria_id, nombre) values (92, 1, 'Zona Z')`)).error).toMatch(
          /row-level security/
        );
      }
    });

    it('el superadmin, el admin sin modalidad y el veedor siguen como antes', async () => {
      expect(await equiposQueVe(comoSuper, 'movimientos')).toEqual([1, 900]);
      const nuevos = [];
      for (const [categoria, local, visitante] of [[1, 3, 4], [90, 901, 900]]) {
        const creado = await comoAdmin(`insert into public.partidos (categoria_id, fecha, local_id, visitante_id)
          values (${categoria}, 37, ${local}, ${visitante}) returning id`);
        expect(creado.error).toBeUndefined();
        nuevos.push(creado.filas[0].id);
      }
      const veedor = await como('authenticated', VEEDOR, `update public.partidos set goles_local = 0, goles_visitante = 0
        where id = ${nuevos[1]} returning id`);
      expect(veedor.filas).toHaveLength(1);
      await db.exec(`delete from public.partidos where id in (${nuevos.join(', ')})`);
    });

    it('sin sesión se sigue leyendo todo lo público, también F7', async () => {
      expect((await como('anon', null, 'select count(*)::int as n from public.categorias')).filas).toEqual([{ n: 6 }]);
    });
  });
});

// La 10b de verdad se genera con los datos de Gaby (scripts/generar-futbol7.mjs). Acá se prueba el SQL que
// arma el generador con una Libre chica: se carga, se controla y se borra, así no ocupa los ids de la real.
describe('migración 10b: el SQL que arma el generador', () => {
  const equipos = ['UNO FC', "D'ALESSANDRO", 'TRES FC', 'SE FUE FC'].map((equipo) => ({
    categoria: 'Libre',
    zona: 'Zona A',
    equipo,
    baja: equipo === 'SE FUE FC' ? 'si' : '',
  }));
  const fila = (fecha, local, visitante, extra) => ({
    categoria: 'Libre', fecha: String(fecha), local, visitante, goles_local: '', goles_visitante: '', ausente: '',
    postergado: '', predio: 'Los Cardales', cancha: '1', hora: '15:30', ...extra,
  });
  const partidos = [
    fila(1, 'UNO FC', "D'ALESSANDRO", { goles_local: '2', goles_visitante: '1' }),
    fila(1, 'TRES FC', 'SE FUE FC', { ausente: 'visitante', predio: 'Cura Borges', cancha: '3' }),
    fila(2, 'UNO FC', 'TRES FC', { predio: '', cancha: '', hora: '', postergado: 'si' }),
  ];
  const armado = armarFutbol7({ equipos, partidos });
  const sql = sqlFutbol7(armado, { cobradoEl: '2026-10-16' });

  afterAll(async () => {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.exec(`
      delete from public.movimientos where partido_id in (select id from public.partidos where categoria_id in (6, 7));
      delete from public.partidos where categoria_id in (6, 7);
      delete from public.equipos where zona_id in (select id from public.zonas where categoria_id in (6, 7));
      delete from public.zonas where categoria_id in (6, 7);
      delete from public.categorias where id in (6, 7);
    `);
  });

  it('carga categoría, zona, equipos, partidos y los pagos de lo ya jugado', async () => {
    expect(armado.errores).toEqual([]);
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.exec(sql);
    expect(await uno(`select nombre, modalidad, arancel from public.categorias where id = 6`)).toEqual({
      nombre: 'Libre',
      modalidad: 'f7',
      arancel: 65000,
    });
    expect((await db.query(`select nombre, baja from public.equipos where zona_id = 11 order by nombre`)).rows).toEqual([
      { nombre: "D'ALESSANDRO", baja: false },
      { nombre: 'SE FUE FC', baja: true },
      { nombre: 'TRES FC', baja: false },
      { nombre: 'UNO FC', baja: false },
    ]);
    expect(
      (await db.query(`select fecha, goles_local, goles_visitante, ausente, postergado, predio, cancha
        from public.partidos where categoria_id = 6 order by fecha, id`)).rows
    ).toEqual([
      { fecha: 1, goles_local: 2, goles_visitante: 1, ausente: null, postergado: false, predio: 'los_cardales', cancha: 21 },
      { fecha: 1, goles_local: 3, goles_visitante: 0, ausente: 'visitante', postergado: false, predio: 'cura_borges', cancha: 23 },
      { fecha: 2, goles_local: null, goles_visitante: null, ausente: null, postergado: true, predio: null, cancha: null },
    ]);
    // Los dos del 2 a 1 y el que se presentó en el W.O.: todos con el arancel de su categoría, nadie debe
    expect(
      (await db.query(`select e.nombre, m.monto, m.metodo from public.movimientos m join public.equipos e on e.id = m.equipo_id
        where e.zona_id = 11 order by e.nombre`)).rows
    ).toEqual([
      { nombre: "D'ALESSANDRO", monto: 65000, metodo: 'efectivo' },
      { nombre: 'TRES FC', monto: 65000, metodo: 'efectivo' },
      { nombre: 'UNO FC', monto: 65000, metodo: 'efectivo' },
    ]);
  });

  it('si se corre dos veces, falla al principio y no cambia nada', async () => {
    await expect(db.exec(sql)).rejects.toThrow(/duplicate key/);
    await db.exec('rollback');
    expect(await uno(`select count(*)::int as n from public.equipos where zona_id = 11`)).toEqual({ n: 4 });
  });

  it('sin la 10a no carga nada', () => {
    expect(sql.indexOf('Falta correr la migración 10a')).toBeLessThan(sql.indexOf('insert into'));
  });
});

describe('migración 10a sin la cuenta de Franco', () => {
  // Si franco1 no está (o tiene otro email), quedaría sin modalidad y vería la plata de Fútbol 7
  it('falla y no cambia nada', async () => {
    const otra = await armarBase();
    await expect(otra.exec(leer('./migracion-10a-futbol7.sql'))).rejects.toThrow(/franco1/);
    await otra.exec('rollback');
    const columna = await otra.query(`select count(*)::int as n from information_schema.columns
      where table_name = 'categorias' and column_name = 'modalidad'`);
    expect(columna.rows).toEqual([{ n: 0 }]);
  }, 60000);
});

describe('migración 10b: los datos de Gaby', () => {
  beforeAll(async () => {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.exec(leer('./migracion-10b-futbol7-datos.sql'));
  });

  it('carga las dos categorías de F7 con sus 23 equipos, sin bajas', async () => {
    expect(
      (await db.query(`select c.nombre as categoria, z.nombre as zona, count(e.id)::int as equipos,
          count(*) filter (where e.baja)::int as bajas
        from public.categorias c join public.zonas z on z.categoria_id = c.id join public.equipos e on e.zona_id = z.id
        where c.modalidad = 'f7' group by c.id, c.nombre, z.id, z.nombre order by z.id`)).rows
    ).toEqual([
      { categoria: 'Libre', zona: 'Zona A', equipos: 7, bajas: 0 },
      { categoria: 'Libre', zona: 'Zona B', equipos: 8, bajas: 0 },
      { categoria: '+30', zona: 'Zona única', equipos: 8, bajas: 0 },
    ]);
  });

  it('carga las fechas 1 a 3: 25 con resultado (2 W.O.) y 5 postergados, en canchas de F7', async () => {
    expect(
      await uno(`select count(*)::int as total, count(goles_local)::int as con_resultado,
          count(ausente)::int as wo, count(*) filter (where postergado)::int as postergados,
          count(*) filter (where cancha is not null and cancha < 21)::int as canchas_de_f11
        from public.partidos where categoria_id in (6, 7)`)
    ).toEqual({ total: 30, con_resultado: 25, wo: 2, postergados: 5, canchas_de_f11: 0 });
  });

  it('lo jugado queda cobrado: ningún equipo de F7 debe', async () => {
    const deudas = await db.query(`
      select e.nombre,
        coalesce((select sum(c.arancel) from public.partidos p join public.categorias c on c.id = p.categoria_id
          where p.goles_local is not null and not p.postergado
            and ((p.local_id = e.id and p.ausente is distinct from 'local')
              or (p.visitante_id = e.id and p.ausente is distinct from 'visitante'))), 0)
        - coalesce((select sum(m.monto) from public.movimientos m where m.equipo_id = e.id), 0) as saldo
      from public.equipos e join public.zonas z on z.id = e.zona_id where z.categoria_id in (6, 7)`);
    expect(deudas.rows.filter((f) => Number(f.saldo) !== 0)).toEqual([]);
    expect(await uno(`select count(*)::int as n from public.movimientos m join public.equipos e on e.id = m.equipo_id
      join public.zonas z on z.id = e.zona_id where z.categoria_id in (6, 7)`)).toEqual({ n: 48 });
  });

  it('si se corre dos veces, falla al principio y no cambia nada', async () => {
    await expect(db.exec(leer('./migracion-10b-futbol7-datos.sql'))).rejects.toThrow(/duplicate key/);
    await db.exec('rollback');
    expect(await uno(`select count(*)::int as n from public.partidos where categoria_id in (6, 7)`)).toEqual({ n: 30 });
  });
});
