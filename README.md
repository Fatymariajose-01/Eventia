# Eventia - MVP

Monolito modular hecho con Node.js, Express y SQLite.

## Cómo ejecutar
1. Instalar Node.js 18 o superior.
2. En esta carpeta: `npm install`
3. `npm start`
4. Abrir http://localhost:3000

## Flujo principal implementado
Consultar evento -> visualizar disponibilidad -> realizar inscripción -> actualizar cupo -> notificación de confirmación.

## Endpoints
- POST /api/usuarios                      Registrar usuario
- GET  /api/eventos?q=texto               Consultar y buscar eventos
- POST /api/eventos                       Publicar evento (organizador)
- GET  /api/eventos/:id/disponibilidad    Ver cupos
- POST /api/inscripciones                 Inscribirse { usuario_id, evento_id }
- GET  /api/inscripciones/usuario/:id     Mis inscripciones
- GET  /api/notificaciones/usuario/:id    Confirmaciones enviadas
