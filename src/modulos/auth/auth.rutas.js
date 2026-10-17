// Rutas de autenticación
const router = require('express').Router();
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const servicio = require('./auth.servicio');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_MAX_INTENTOS) || 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const correo = (req.body && req.body.correo ? String(req.body.correo).toLowerCase() : '');
    return `${ipKeyGenerator(req.ip)}:${correo}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    });
  },
});

router.post('/login', loginLimiter, (req, res, next) => {
  try {
    const resultado = servicio.login(req.body);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
