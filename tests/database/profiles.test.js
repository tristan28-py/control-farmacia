import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
let db

// Solo este entorno de pruebas simula Auth. La migración usa auth.users/auth.uid reales.
async function asUser(id, run, role = 'authenticated') {
  return db.transaction(async (tx) => {
    await tx.exec('set local role ' + role)
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [id])
    return run(tx)
  })
}

describe('profiles: migración y permisos PostgreSQL', () => {
  before(async () => {
    db = new PGlite()
    await db.exec(`
      create role anon;
      create role authenticated;
      create role supabase_auth_admin;
      create schema auth;
      create table auth.users (
        id uuid primary key,
        raw_user_meta_data jsonb default '{}'::jsonb
      );
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema public, auth to anon, authenticated, supabase_auth_admin;
      grant insert on auth.users to supabase_auth_admin;
      insert into auth.users values
        ('${userA}', '{"full_name":"  Persona A  "}'),
        ('${userB}', '{}');
    `)
    const migration = await readFile(new URL('../../supabase/migrations/20260910000100_create_profiles.sql', import.meta.url), 'utf8')
    await db.exec(migration)
  })
  after(async () => { await db?.close() })

  it('activa RLS y crea únicamente los campos solicitados', async () => {
    const { rows } = await db.query("select relrowsecurity from pg_class where oid = 'public.profiles'::regclass")
    assert.equal(rows[0].relrowsecurity, true)
    const columns = await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='profiles' order by ordinal_position")
    assert.deepEqual(columns.rows.map((row) => row.column_name), ['id', 'full_name', 'created_at', 'updated_at'])
    const policies = await db.query("select cmd, qual, with_check from pg_policies where schemaname='public' and tablename='profiles' order by cmd")
    assert.equal(policies.rows.length, 2)
    assert.equal(policies.rows[0].cmd, 'SELECT')
    assert.equal(policies.rows[1].cmd, 'UPDATE')
    assert.match(policies.rows[1].qual, /auth.uid\(\)/)
    assert.match(policies.rows[1].with_check, /auth.uid\(\)/)
  })

  it('crea perfiles para usuarios existentes y conserva el nombre opcional', async () => {
    const { rows } = await db.query('select id, full_name from public.profiles order by id')
    assert.deepEqual(rows, [{ id: userA, full_name: 'Persona A' }, { id: userB, full_name: null }])
  })

  it('el trigger funciona con el rol de Auth y tolera metadata ausente o inválida', async () => {
    const samples = [
      ['cccccccc-cccc-4ccc-8ccc-cccccccccccc', { full_name: '  Persona nueva  ' }, 'Persona nueva'],
      ['dddddddd-dddd-4ddd-8ddd-dddddddddddd', {}, null],
      ['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', { full_name: { invalid: true } }, null],
      ['ffffffff-ffff-4fff-8fff-ffffffffffff', { full_name: 'x'.repeat(101) }, 'x'.repeat(100)],
    ]
    for (const [id, metadata, expected] of samples) {
      await asUser('', (tx) => tx.query('insert into auth.users values ($1, $2)', [id, JSON.stringify(metadata)]), 'supabase_auth_admin')
      const { rows } = await db.query('select full_name from public.profiles where id=$1', [id])
      assert.equal(rows[0].full_name, expected)
    }
  })

  it('A y B solo leen su propio perfil incluso sin filtro en la consulta', async () => {
    for (const id of [userA, userB]) {
      const { rows } = await asUser(id, (tx) => tx.query('select id from public.profiles'))
      assert.deepEqual(rows, [{ id }])
    }
    const result = await asUser(userA, (tx) => tx.query('select * from public.profiles where id=$1', [userB]))
    assert.deepEqual(result.rows, [])
  })

  it('el usuario solo actualiza su nombre y el servidor actualiza updated_at', async () => {
    const beforeUpdate = await db.query('select created_at, updated_at from public.profiles where id=$1', [userA])
    const { rows } = await asUser(userA, (tx) =>
      tx.query("update public.profiles set full_name='Nombre actualizado' returning id, created_at, updated_at"))
    assert.equal(rows.length, 1)
    assert.equal(rows[0].id, userA)
    assert.deepEqual(rows[0].created_at, beforeUpdate.rows[0].created_at)
    assert.ok(rows[0].updated_at > beforeUpdate.rows[0].updated_at)
    const attack = await asUser(userA, (tx) =>
      tx.query("update public.profiles set full_name='Ataque' where id=$1 returning id", [userB]))
    assert.deepEqual(attack.rows, [])
    const other = await db.query('select full_name from public.profiles where id=$1', [userB])
    assert.equal(other.rows[0].full_name, null)
  })

  it('bloquea cambiar id, created_at y updated_at desde el cliente', async () => {
    for (const assignment of [
      "id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'",
      "created_at='2000-01-01'",
      "updated_at='2000-01-01'",
    ]) {
      await assert.rejects(asUser(userA, (tx) => tx.query('update public.profiles set ' + assignment)), { code: '42501' })
    }
  })

  it('bloquea INSERT y DELETE del cliente', async () => {
    await assert.rejects(asUser(userA, (tx) => tx.query('insert into public.profiles (id) values ($1)', [userA])), { code: '42501' })
    await assert.rejects(asUser(userA, (tx) => tx.query('delete from public.profiles')), { code: '42501' })
  })

  it('bloquea al visitante anónimo y no muestra filas sin identidad', async () => {
    await assert.rejects(asUser('', (tx) => tx.query('select * from public.profiles'), 'anon'), { code: '42501' })
    const { rows } = await asUser('', (tx) => tx.query('select * from public.profiles'))
    assert.deepEqual(rows, [])
  })

  it('las funciones de trigger no tienen permiso de ejecución para clientes', async () => {
    const { rows } = await db.query(`
      select
        has_function_privilege('authenticated', 'public.create_profile_for_new_user()', 'execute') as can_create,
        has_function_privilege('anon', 'public.create_profile_for_new_user()', 'execute') as anon_create,
        has_function_privilege('authenticated', 'public.set_profile_updated_at()', 'execute') as can_touch
    `)
    assert.deepEqual(rows[0], { can_create: false, anon_create: false, can_touch: false })
  })

  it('valida el tamaño del nombre en la base y admite borrarlo', async () => {
    await assert.rejects(asUser(userA, (tx) =>
      tx.query('update public.profiles set full_name=$1', ['x'.repeat(101)])), { code: '23514' })
    const { rows } = await asUser(userA, (tx) =>
      tx.query('update public.profiles set full_name=null returning full_name'))
    assert.deepEqual(rows, [{ full_name: null }])
  })

  it('la FK impide perfiles huérfanos y elimina el perfil al borrar la cuenta', async () => {
    await assert.rejects(db.query("insert into public.profiles (id) values ('99999999-9999-4999-8999-999999999999')"), { code: '23503' })
    await db.query("delete from auth.users where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'")
    const { rows } = await db.query("select * from public.profiles where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'")
    assert.deepEqual(rows, [])
  })
})
