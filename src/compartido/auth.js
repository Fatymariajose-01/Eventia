// Módulo de autenticación y autorización mediante JWT
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');
const { ErrorNegocio } = require('./errores');

let secretGenerado = null;
function obtenerSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET debe estar definido en el entorno de producción');
  }
  if (!secretGenerado) {
    secretGenerado = crypto.randomBytes(32).toString('hex');
    console.warn('Aviso: JWT_SECRET no definido. Se generó una clave temporal para desarrollo.');
  }
  return secretGenerado;
}

function generarToken(usuario) {
  return jwt.sign(
    { sub: String(usuario.id), rol: usuario.rol },
    obtenerSecret(),
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ErrorNegocio('Autenticación requerida', 401));
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(new ErrorNegocio('Autenticación requerida', 401));
  }

  try {
    const payload = jwt.verify(token, obtenerSecret(), { algorithms: ['HS256'] });
    const usuario = db.prepare('SELECT id, nombre, correo, rol FROM usuarios WHERE id = ?').get(payload.sub);
    if (!usuario) {
      return next(new ErrorNegocio('Token inválido o expirado', 401));
    }
    req.usuario = usuario;
    next();
  } catch (error) {
    return next(new ErrorNegocio('Token inválido o expirado', 401));
  }
}

function autorizarRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(new ErrorNegocio('No tienes permiso para realizar esta operación', 403));
    }
    next();
  };
}

module.exports = {
  generarToken,
  autenticar,
  autorizarRoles,
};
