/**
 * Prueba la base completa en un Postgres local (PGlite): esquema.sql, datos-iniciales.sql y las
 * migraciones, en el orden en que se corren en Supabase. Simula lo que Supabase trae de fábrica:
 * el esquema auth, auth.uid() y los roles de la API (anon y authenticated).
 * Las pruebas comparten la base y corren en orden: cada una parte de lo que dejó la anterior.
 */

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

const leer = (archivo) => readFileSync(new URL(archivo, import.meta.url), 'utf8');
const ADMIN = '11111111-1111-1111-1111-111111111111';
const OTRO = '22222222-2222-2222-2222-222222222222';
const SUPER = '33333333-3333-3333-3333-333333333333';
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

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
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
  `);
  await db.exec(leer('./esquema.sql'));
  await db.exec(leer('./datos-iniciales.sql'));
  await db.exec(leer('./migracion-2-cuentas.sql'));
  await db.exec(leer('./migracion-3-predios.sql'));
  await db.exec(leer('./migracion-4-cancha-6-cura-borges.sql'));
  await db.exec(`
    insert into auth.users values ('${ADMIN}', 'admin@prueba.com'), ('${OTRO}', 'otro@prueba.com'),
      ('${SUPER}', 'ljdev@loscardalesfutbol.com');
    insert into public.administradores (user_id, nombre) values ('${ADMIN}', 'Prueba'), ('${SUPER}', 'Jorge');
  `);
  // La 5 va después de las cuentas: al final pasa a superadmin la de ljdev
  await db.exec(leer('./migracion-5-control.sql'));
  await db.exec(leer('./migracion-6-visitas.sql'));
}, 60000);

describe('carga inicial', () => {
  it('deja las 5 categorías, los 98 equipos y los 5 postergados', async () => {
    expect(
      await uno(`select
        (select count(*) from public.categorias)::int as categorias,
        (select count(*) from public.equipos)::int as equipos,
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

  it('un solo pago por equipo y partido', async () => {
    const otra = await comoAdmin(
      `insert into public.movimientos (equipo_id, partido_id, tipo, monto, metodo, fecha)
       values (1, ${partidoId}, 'pago', 10000, 'efectivo', '2026-10-15')`
    );
    expect(otra.error).toMatch(/movimientos_pago_partido_idx/);
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
