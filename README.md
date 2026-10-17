# Eventia API v2.0.0

Monolito modular desarrollado con Node.js, Express y SQLite (`better-sqlite3`), refactorizado con controles de seguridad basados en **OWASP API Security Top 10 (2023)**.

---

## Aviso Importante sobre la Base de Datos

> [!WARNING]
> Si existe un archivo `eventia.db` previo en el repositorio o entorno local, **debes eliminarlo** antes de iniciar la aplicación. El esquema de base de datos ha cambiado para incorporar restricciones de integridad, contraseñas cifradas y soporte de roles (`usuario`, `organizador`, `administrador`).

---

## Cómo Ejecutar

### 1. Prerrequisitos
- Node.js 18 o superior.
- npm.

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Configuración de Entorno
Copia el archivo de ejemplo `.env.example` a `.env`:
```bash
cp .env.example .env
```
Configura tu clave secreta `JWT_SECRET` y el puerto deseado (`PORT=3000`). Si no defines `JWT_SECRET` en desarrollo, se generará una clave aleatoria temporal de forma automática.

### 4. Ejecución del Servidor
```bash
npm start
```
La aplicación quedará disponible en:
- Frontend web: [http://localhost:3000](http://localhost:3000)
- Documentación interactiva Swagger UI: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### 5. Ejecución de Pruebas Automáticas de Seguridad
Las pruebas automatizadas utilizan el runner nativo de Node.js (`node:test`) sobre una base de datos en memoria (`:memory:`):
```bash
npm test
```

---

## Cuentas de Prueba Preconfiguradas

Al iniciar con una base de datos limpia, se inicializan automáticamente los siguientes usuarios y eventos de prueba:

| id | Nombre | Correo | Contraseña | Rol | Teléfono |
|---|---|---|---|---|---|
| 1 | Administrador | `admin@eventia.com` | `Admin123!` | `administrador` | *null* |
| 2 | Organizador Uno | `org@eventia.com` | `Organizador123!` | `organizador` | *null* |
| 3 | Organizador Dos | `org2@eventia.com` | `Organizador123!` | `organizador` | *null* |
| 4 | Ana López | `ana@correo.com` | `Usuario123!` | `usuario` | `44444444` |
| 5 | Carlos Pérez | `carlos@correo.com` | `Usuario123!` | `usuario` | `55555555` |

---

## Tabla de Endpoints y Permisos

| Método | Endpoint | Acceso / Permiso Requerido | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/login` | Público | Autenticación con correo y contraseña. Devuelve token JWT. Límite: 5 intentos fallidos / 15 min. |
| `POST` | `/api/usuarios` | Público | Registro de usuarios (siempre rol `usuario`). Rechaza propiedades no permitidas como `rol`. |
| `GET` | `/api/usuarios/me` | Autenticado | Devuelve los datos públicos del usuario autenticado (`id, nombre, correo`). |
| `GET` | `/api/usuarios/:id` | Mismo usuario o `administrador` | Consulta de perfil público. Nunca expone `password_hash`, `telefono` ni `rol`. |
| `GET` | `/api/usuarios` | `administrador` | Listado completo de usuarios registrados (`id, nombre, correo, rol`). |
| `PATCH` | `/api/usuarios/:id/rol` | `administrador` | Modificación de rol (`usuario` u `organizador`). Protege cuentas administradoras y la propia. |
| `GET` | `/api/eventos` | Público | Consulta y búsqueda de eventos (`?q=` truncado a 100 caracteres). |
| `GET` | `/api/eventos/:id` | Público | Consulta de un evento específico por su identificador. |
| `GET` | `/api/eventos/:id/disponibilidad` | Público | Consulta del estado de cupos de un evento. |
| `POST` | `/api/eventos` | `organizador` o `administrador` | Creación de evento. El organizador se asigna desde el token JWT. |
| `PUT` | `/api/eventos/:id` | Organizador dueño o `administrador` | Modificación parcial de evento. El cupo no puede ser menor a los inscritos. |
| `GET` | `/api/eventos/:id/inscripciones` | Organizador dueño o `administrador` | Lista de personas inscritas a un evento. |
| `POST` | `/api/eventos/:id/inscripciones` | `usuario` u `organizador` (no propio) | Inscripción atómica con control de cupos. Límite: 10 solicitudes / min por usuario. |
| `GET` | `/api/inscripciones/mias` | Autenticado | Lista las inscripciones del usuario actual. |
| `GET` | `/api/inscripciones/:id` | Dueño de inscripción, Organizador o `administrador` | Consulta de detalle de una inscripción (sin exponer correos de terceros). |
| `GET` | `/api/notificaciones/mias` | Autenticado | Lista de notificaciones del usuario autenticado. |
| `GET` | `/api-docs` | Público | Documentación interactiva Swagger UI según especificación OpenAPI 3.0.3. |

---

## Controles de Seguridad Implementados (OWASP API Security Top 10)

1. **API1:2023 - Broken Object Level Authorization (BOLA)**
   - Validación estricta de propiedad en base de datos: un usuario solo puede consultar sus propias inscripciones y perfil (`GET /api/inscripciones/:id`, `GET /api/usuarios/:id`).
   - Los organizadores únicamente pueden consultar inscritos o modificar eventos de los cuales son titulares (`PUT /api/eventos/:id`, `GET /api/eventos/:id/inscripciones`).
2. **API2:2023 - Broken Authentication**
   - Autenticación basada en JSON Web Tokens (JWT) firmados con algoritmo HS256 y expiración en 1 hora.
   - Verificación de existencia activa del usuario en cada petición autenticada.
   - Contraseñas almacenadas con hash mediante `bcryptjs` (salt rounds: 10).
   - Mitigación de enumeración de usuarios y timing attacks en `/api/auth/login` comparando contra hash ficticio en tiempos equivalentes ante credenciales inexistentes.
   - Almacenamiento del token exclusivamente en la memoria volátil de la aplicación frontend (sin persistencia en `localStorage` ni cookies vulnerables a XSS).
3. **API3:2023 - Broken Object Property Level Authorization**
   - Validación estricta con lista blanca (`soloCamposPermitidos`). Toda propiedad no permitida en la solicitud produce un error HTTP 400 con el detalle específico de la propiedad rechazada (ej. `rol`, `organizador_id`, `cupo_disponible`, `cantidad`).
   - Objeto de Transferencia de Datos (`aDTO`) en perfiles de usuario que excluye `password_hash`, `telefono` y `rol`.
4. **API4:2023 - Unrestricted Resource Consumption**
   - Límite de carga útil JSON fijado en 10 KB (`express.json({ limit: '10kb' })`) respondiendo HTTP 413 si se excede.
   - Limitador de tasa (Rate Limiting) en `/api/auth/login` con máximo 5 intentos fallidos por ventana de 15 minutos por IP y correo.
   - Limitador de tasa en inscripciones (`/api/eventos/:id/inscripciones`) de máximo 10 peticiones por minuto por usuario.
   - Paginación/recorte de parámetros de consulta (`q` recortado a 100 caracteres) y validaciones de rango numérico en cupos (1 a 10,000) y precios (0 a 100,000).
5. **API5:2023 - Broken Function Level Authorization (BFLA)**
   - Middleware de autorización por rol (`autorizarRoles`) para funciones privilegiadas de organizadores y administradores.
   - Protección contra escalamiento horizontal y vertical en el endpoint `PATCH /api/usuarios/:id/rol`: impide modificar roles de cuentas administradoras o auto-modificaciones.
6. **API6:2023 - Unrestricted Access to Sensitive Business Flows**
   - Transacción atómica en SQLite (`db.transaction`) con decremento condicional `UPDATE eventos SET cupo_disponible = cupo_disponible - 1 WHERE id = ? AND cupo_disponible > 0`. Garantiza que en concurrencia masiva nunca se exceda el cupo total.
   - Restricción única `UNIQUE(usuario_id, evento_id)` en la tabla `inscripciones` que impide doble inscripción.
   - Regla de negocio que impide a un organizador inscribirse a su propio evento.
7. **API8:2023 - Security Misconfiguration**
   - Supresión del encabezado `X-Powered-By` (`app.disable('x-powered-by')`).
   - Activación de integridad referencial de base de datos (`PRAGMA foreign_keys = ON`).
   - Manejador centralizado de excepciones que captura errores de sintaxis JSON (`entity.parse.failed`), exceso de tamaño (`entity.too.large`) y violaciones de unicidad (`SQLITE_CONSTRAINT_UNIQUE`), devolviendo respuestas HTTP 500 genéricas sin filtrar información interna ni trazas de ejecución.
8. **Prevención de Inyecciones (SQLi) y Cross-Site Scripting (XSS)**
   - Consultas SQL parametrizadas con `better-sqlite3` en todos los accesos a datos.
   - Sanitización y escape de entidades HTML (`&`, `<`, `>`, `"`, `'`) en el cliente antes de renderizar cadenas provenientes del servidor.
