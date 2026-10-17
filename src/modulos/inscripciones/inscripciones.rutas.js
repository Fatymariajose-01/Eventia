// Rutas del módulo de inscripciones
const router = require('express').Router();
const servicio = require('./inscripciones.servicio');
const { autenticar } = require('../../compartido/auth');

router.get('/mias', autenticar, (req, res, next) => {
  try {
    res.json(servicio.misInscripciones(req.usuario.id));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', autenticar, (req, res, next) => {
  try {
    res.json(servicio.obtenerPorId(req.params.id, req.usuario));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
