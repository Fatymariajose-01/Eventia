// Punto de entrada del monolito modular de Eventia.
const express = require('express');
const path = require('path');
const fs = require('fs');
const YAML = require('yaml');
const swaggerUi = require('swagger-ui-express');
const notificaciones = require('./modulos/notificaciones/notificaciones.servicio');
const { autenticar } = require('./compartido/auth');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Documentación Swagger / OpenAPI
const openapiPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
const openapiContenido = fs.readFileSync(openapiPath, 'utf8');
const swaggerDocument = YAML.parse(openapiContenido);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rutas de la API
app.use('/api/auth', require('./modulos/auth/auth.rutas'));
app.use('/api/usuarios', require('./modulos/usuarios/usuarios.rutas'));
app.use('/api/eventos', require('./modulos/eventos/eventos.rutas'));
app.use('/api/inscripciones', require('./modulos/inscripciones/inscripciones.rutas'));
app.get('/api/notificaciones/mias', autenticar, (req, res) => {
  res.json(notificaciones.deUsuario(req.usuario.id));
});

// Cualquier otra ruta bajo /api que no coincida
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err)) {
    return res.status(400).json({ error: 'JSON mal formado' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud es demasiado grande' });
  }

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'El registro ya existe' });
  }

  const status = err.status || (err.statusCode ? err.statusCode : null);

  if (!status || status === 500) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }

  const respuesta = { error: err.message || 'Error en la solicitud' };
  if (err.detalles) {
    respuesta.detalles = err.detalles;
  }
  return res.status(status).json(respuesta);
});

const PUERTO = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PUERTO, () => console.log(`Eventia corriendo en http://localhost:${PUERTO}`));
}

module.exports = app;
