// Punto de entrada del monolito modular de Eventia.
const express = require('express');
const path = require('path');
const notificaciones = require('./modulos/notificaciones/notificaciones.servicio');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/usuarios', require('./modulos/usuarios/usuarios.rutas'));
app.use('/api/eventos', require('./modulos/eventos/eventos.rutas'));
app.use('/api/inscripciones', require('./modulos/inscripciones/inscripciones.rutas'));
app.get('/api/notificaciones/usuario/:id', (req, res) => res.json(notificaciones.deUsuario(Number(req.params.id))));

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

const PUERTO = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PUERTO, () => console.log(`Eventia MVP corriendo en http://localhost:${PUERTO}`));
}
module.exports = app;
