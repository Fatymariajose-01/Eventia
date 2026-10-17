// Rutas del módulo de eventos
const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const servicio = require('./eventos.servicio');
const { autenticar, autorizarRoles } = require('../../compartido/auth');

const inscripcionesLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.INSCRIPCIONES_MAX_POR_MINUTO) || 10,
  keyGenerator: (req) => `usuario:${req.usuario.id}`,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiadas solicitudes de inscripción. Intenta de nuevo en un minuto.',
    });
  },
});

router.get('/', (req, res, next) => {
  try {
    res.json(servicio.buscar(req.query.q));
  } catch (error) {
    next(error);
  }
});

router.post('/', autenticar, autorizarRoles('organizador', 'administrador'), (req, res, next) => {
  try {
    const evento = servicio.publicar(req.body, req.usuario);
    res.status(201).json(evento);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    res.json(servicio.obtener(req.params.id));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', autenticar, autorizarRoles('organizador', 'administrador'), (req, res, next) => {
  try {
    const evento = servicio.modificar(req.params.id, req.body, req.usuario);
    res.json(evento);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/disponibilidad', (req, res, next) => {
  try {
    res.json(servicio.disponibilidad(req.params.id));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/inscripciones', autenticar, (req, res, next) => {
  try {
    res.json(servicio.listarInscritos(req.params.id, req.usuario));
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/inscripciones',
  autenticar,
  autorizarRoles('usuario', 'organizador'),
  inscripcionesLimiter,
  (req, res, next) => {
    try {
      const resultado = servicio.inscribirEnEvento(req.params.id, req.body, req.usuario);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
