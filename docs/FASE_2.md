# Fase 2: perfiles y RLS

## Estado y alcance

El código de esta fase incorpora lectura y edición del nombre. El correo procede
de Supabase Auth. No se crean funcionalidades de fases posteriores.

**La migración debe aplicarse en tu Supabase antes de usar el perfil.** Las
pruebas locales ejecutan el SQL en PostgreSQL embebido (PGlite), con una
representación mínima de Auth; no crean tablas en el proyecto remoto.

## Aplicar la base de datos

1. Abre el proyecto correcto en Supabase y entra en **SQL Editor**.
2. Comprueba si existe una tabla anterior:

   ```sql
   select to_regclass('public.profiles');
   ```

3. Si devuelve `null`, abre y ejecuta el contenido completo de
   [la migración](../supabase/migrations/20260910000100_create_profiles.sql).
   Si la tabla ya existe, revisa su estructura y políticas antes de continuar:
   esta migración no elimina ni reemplaza tablas existentes.
4. Verifica que la ejecución terminó correctamente. El script es transaccional:
   un error impide aplicar una parte del cambio.
5. Inicia la aplicación con `npm run dev` y vuelve a cargar tu cuenta.

No hace falta cambiar `.env`, desactivar RLS ni proporcionar una clave privada
al frontend. No compartas contraseñas de base de datos ni claves administrativas
en el chat.

## Qué crea la migración

- `profiles.id`: UUID, clave primaria y FK a `auth.users.id`, con borrado en cascada.
- `full_name`: texto opcional, hasta 100 caracteres.
- `created_at` y `updated_at`: fechas con zona horaria, no nulas, generadas por PostgreSQL.
- RLS para SELECT y UPDATE del perfil cuyo `id` coincide con `auth.uid()`.
- UPDATE con `USING` y `WITH CHECK`.
- Permiso de actualización solamente sobre `full_name`. El cliente no puede
  editar el identificador ni las fechas, insertar filas o borrar perfiles.
- Trigger de actualización que establece `updated_at` en el servidor.
- Trigger de alta en `auth.users` que inserta el perfil automáticamente.
- Creación inicial de perfiles para las cuentas que ya existían en la fase 1.

El nombre inicial se toma de `raw_user_meta_data.full_name` únicamente si es texto.
Se quitan espacios en los extremos, se limita a 100 caracteres y se guarda
`null` si está vacío o no existe. Un objeto o dato inesperado en la metadata no
debe impedir el registro de una cuenta.

La función de creación usa `SECURITY DEFINER`, nombres de objetos calificados y
`search_path = ''`. Los clientes no tienen permiso para ejecutarla directamente.
El trigger puede usarla al registrarse el usuario.

Tras la creación, el nombre editable se guarda en `profiles`. No se sincroniza
de vuelta a metadata ni se añade un email duplicado a la tabla.

## Comprobar la configuración

En SQL Editor puedes inspeccionar, sin modificar nada:

```sql
select relrowsecurity
from pg_class
where oid = 'public.profiles'::regclass;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles';

select
  has_table_privilege('authenticated', 'public.profiles', 'select') as can_select,
  has_table_privilege('authenticated', 'public.profiles', 'insert') as can_insert,
  has_table_privilege('authenticated', 'public.profiles', 'delete') as can_delete,
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'update') as can_update_name,
  has_column_privilege('authenticated', 'public.profiles', 'id', 'update') as can_update_id;
```

El resultado esperado es RLS activo y privilegios
`true, false, false, true, false`, respectivamente.

El SQL Editor suele operar con un rol administrativo que puede omitir RLS:
ver filas de A y B desde allí **no demuestra** que un usuario normal pueda
leerlas. La comprobación de aislamiento debe usar una sesión autenticada normal.

## Prueba manual con usuarios A y B

1. Usa dos perfiles de navegador o una ventana normal y otra privada.
2. Inicia sesión como A. Deben aparecer su correo y su nombre.
3. Edita el nombre, pulsa **Guardar cambios** y comprueba la confirmación.
4. Recarga: el nombre guardado debe mantenerse.
5. Inicia sesión como B en la otra ventana. Solo debe ver y editar su perfil.
6. Crea una cuenta de prueba nueva y confirma su correo según la configuración
   de Auth. Debe tener perfil sin ninguna inserción desde React.
7. Opcionalmente borra el nombre: es válido dejarlo vacío.

Para probar un acceso cruzado, usa A en la aplicación de desarrollo local,
abre las herramientas del navegador y ejecuta:

```js
const { supabase } = await import('/src/lib/supabase.js')
const idB = 'REEMPLAZAR_POR_UUID_DE_B'

// No debe devolver el perfil de B.
await supabase.from('profiles').select('id, full_name').eq('id', idB)

// No debe actualizar ninguna fila ni cambiar el nombre de B.
await supabase.from('profiles')
  .update({ full_name: 'Prueba de aislamiento' })
  .eq('id', idB)
  .select('id, full_name')

// Incluso sin filtro, A solo debe recibir su propia fila.
await supabase.from('profiles').select('id, full_name')
```

Las dos primeras consultas deben devolver `data: []`; la última, únicamente A.
Comprueba después desde B que su nombre se mantiene. El UUID de B puede obtenerse
desde Authentication → Users con acceso administrativo.

Este ejemplo de importación corresponde a Vite en desarrollo con `base: '/'`;
no está destinado al bundle de producción. Usa la sesión del navegador: nunca
una clave `service_role` para comprobar los permisos de un usuario.

## Pruebas automáticas

```sh
npm run lint
npm run build
npm run test:db
npm test
```

Para Playwright instala Chromium con `npx playwright install chromium`, o usa
Edge instalado en Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm test
```

- `tests/database/profiles.test.js` ejecuta la migración en PostgreSQL embebido.
  Verifica los triggers, usuarios previos, FK, RLS entre A/B y permisos por columna.
- `tests/profiles.spec.js` verifica la interfaz, cargas, guardado, borrado del
  nombre opcional, errores, recargas y cambio de usuario.
- `tests/auth.spec.js` conserva las regresiones de la fase 1.
- Las pruebas de navegador simulan HTTP de Supabase y revisan los errores de
  consola en el flujo exitoso. Los casos que simulan fallos HTTP generan las
  respuestas de error esperadas del navegador.

La dependencia PGlite se usa solamente en pruebas; la aplicación sigue usando
Supabase/PostgreSQL. Estas pruebas no sustituyen aplicar y verificar la migración
en el proyecto remoto.

## Archivos principales

- `src/components/ProfileForm.jsx`: consulta con `user.id`, estados de carga,
  formulario y guardado únicamente de `full_name`.
- `src/components/HomeView.jsx`: integra el perfil y actualiza el saludo al guardar.
- `src/App.jsx`: reinicia la vista al cambiar el usuario autenticado; las
  solicitudes anteriores se cancelan para no mostrar datos de otra cuenta.
- `supabase/migrations/20260910000100_create_profiles.sql`: esquema y permisos.

La seguridad reside en PostgreSQL. El filtro de React limita la consulta, pero
son los privilegios y RLS los que impiden accesos cruzados mediante solicitudes
hechas fuera de la interfaz.

Referencias:
[gestión de perfiles y triggers](https://supabase.com/docs/guides/auth/managing-user-data),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y
[permisos por columna](https://supabase.com/docs/guides/database/postgres/column-level-security).
