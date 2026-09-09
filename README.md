# Control Farmacia

Aplicación de control personal de tratamientos construida con React, Vite,
JavaScript y Supabase. Esta entrega se limita a la **fase 1: autenticación**.

## Funciones de esta fase

- Registro por correo y contraseña, con nombre opcional.
- Inicio y cierre de sesión.
- Restauración de la sesión al recargar y sincronización entre pestañas.
- Solicitud de recuperación por correo y formulario para una nueva contraseña.
- Confirmación visible del cambio de contraseña antes de continuar.
- Mensajes en español, validación de contraseñas y bloqueo de solicitudes repetidas.

El nombre se guarda en los metadatos de Supabase Auth. Todavía no se crea una
tabla `profiles`, ni tablas de tratamientos, ni funciones de las fases siguientes.

## Ejecutar el proyecto

Usa Node.js 22.13 o superior compatible con las dependencias (Node.js 24 también
está admitido). Instala las dependencias con:

```sh
npm ci
```

Si ya existe `.env`, conserva su configuración. Para otra instalación, copia
`.env.example` a `.env` y completa:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

```sh
npm run dev
```

Abre la dirección que indique Vite. Reinicia el servidor después de cambiar
variables de entorno. Si falta la configuración, la aplicación muestra un
estado de acceso no disponible en lugar de fallar con una pantalla vacía.

Las variables `VITE_*` se incluyen en el navegador. Aquí corresponde únicamente
la clave pública `anon` (o una clave publicable), nunca `service_role`, `sb_secret_*`
ni secretos de otros servicios. `.env` está excluido de Git.

## Configuración necesaria en Supabase

En **Authentication → URL Configuration**, configura el **Site URL** de tu
aplicación y permite las direcciones de retorno. Por ejemplo, si usas el puerto
5173 y la raíz del sitio:

- `http://localhost:5173/` para confirmar el correo.
- `http://localhost:5173/?auth=recovery` para recuperar la contraseña.

Si usas `127.0.0.1`, otro puerto, un subdirectorio o un dominio de producción,
añade las direcciones exactas correspondientes. La aplicación calcula el retorno
con el origen actual y el `base` de Vite.

Mantén el proveedor Email habilitado. Con confirmación por correo habilitada,
el registro indica al usuario que debe revisar su bandeja; si está deshabilitada,
Supabase puede devolver una sesión directamente y la aplicación la acepta.

Los formularios exigen al menos 8 caracteres al crear o cambiar una contraseña.
Configura también la política del servidor en Supabase: la validación del
navegador mejora la experiencia, pero la política real la impone el servidor.
El login no impone este mínimo para no bloquear cuentas existentes.

Estas opciones se configuran en Supabase; el código no cambia automáticamente
la política de contraseñas, las direcciones autorizadas ni el servicio de correo.

## Cómo se organiza la autenticación

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/supabase.js` | Un único cliente con persistencia, renovación y detección de enlaces. |
| `src/lib/authRedirect.js` | Direcciones de retorno y marcador de recuperación sin guardar tokens adicionales. |
| `src/lib/authMessages.js` | Mensajes comprensibles por código de error y mínimo del formulario. |
| `src/context/AuthProvider.jsx` | Sesión, eventos y operaciones de Supabase Auth. |
| `src/hooks/useAuth.js` | Acceso al contexto desde los componentes. |
| `src/components/auth/AuthView.jsx` | Formularios de acceso y recuperación. |
| `src/components/HomeView.jsx` | Cuenta activa y cierre de sesión con manejo de errores. |

`INITIAL_SESSION` restaura la sesión y los eventos posteriores la mantienen
sincronizada. `PASSWORD_RECOVERY` abre el cambio de contraseña. El marcador
`?auth=recovery` conserva esa pantalla al recargar, pero no concede una sesión:
la actualización requiere que Supabase autentique al usuario.

La recuperación termina al pulsar **Continuar a mi cuenta**, después del éxito.
**Cancelar y cerrar sesión** descarta la sesión de recuperación. El cierre usa
el alcance `local`: cierra la sesión de este navegador y sus pestañas, sin cerrar
las sesiones de otros dispositivos.

La sesión del cliente permite presentar la interfaz. Cuando se incorporen datos
privados, sus permisos deberán imponerse en PostgreSQL mediante RLS; ocultar una
pantalla en React no sustituye esos permisos.

## Verificación

```sh
npm run lint
npm run build
npx playwright install chromium
npm test
```

En Windows puedes usar Edge ya instalado sin descargar Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm test
```

Playwright inicia Vite en `http://127.0.0.1:4175` con variables ficticias y simula
las respuestas HTTP de Supabase. Las pruebas **no envían correos ni crean o
modifican cuentas reales**. Comprueban el registro, errores, recuperación,
persistencia, cierre entre pestañas y envíos repetidos. El puerto 4175 debe estar
libre. Los resultados y trazas están excluidos de Git.

Para comprobar la integración real con un correo de prueba propio:

1. Registra una cuenta y confirma el enlace recibido.
2. Inicia sesión y recarga la página.
3. Solicita recuperar la contraseña y abre el enlace.
4. Recarga la pantalla de recuperación, cambia la contraseña y continúa.
5. Cierra sesión y comprueba el acceso con la nueva contraseña.

Esa comprobación verifica también las direcciones de retorno, entrega del correo
y políticas del proyecto remoto, que no se pueden validar con respuestas simuladas.

## Qué aprendemos en esta fase

La sesión debe tener una sola fuente de estado. Una recuperación requiere tanto
validar el enlace como completar el cambio de contraseña. Los errores y estados
de espera forman parte del flujo, y las pruebas deben incluir recargas y fallos,
además del caso exitoso.

Referencias oficiales:
[recuperación de contraseña](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail),
[eventos de autenticación](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) y
[direcciones de retorno](https://supabase.com/docs/guides/auth/redirect-urls).
