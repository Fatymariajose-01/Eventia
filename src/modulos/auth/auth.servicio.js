// Módulo Auth: lógica de autenticación e inicio de sesión
const bcrypt = require('bcryptjs');
const db = require('../../compartido/db');
const { ErrorNegocio } = require('../../compartido/errores');
const { soloCamposPermitidos, lanzarSiHayErrores } = require('../../compartido/validacion');
const { generarToken } = require('../../compartido/auth');

const DUMMY_HASH = '$2b$10$3m3dJIlIKZxQDTww4awp3uLEvav6lZTFEWSElUeLxFh25Rodyegye';

function login(body) {
  soloCamposPermitidos(body, ['correo', 'password']);

  const errores = [];
  if (!body.correo || typeof body.correo !== 'string' || !body.correo.trim()) {
    errores.push('El correo es obligatorio');
  }
  if (!body.password || typeof body.password !== 'string') {
    errores.push('La contraseña es obligatoria');
  }
  lanzarSiHayErrores(errores);

  const correoNormalizado = body.correo.trim().toLowerCase();
  const usuario = db.prepare('SELECT id, nombre, correo, rol, password_hash FROM usuarios WHERE correo = ?').get(correoNormalizado);

  const hashAComparar = usuario ? usuario.password_hash : DUMMY_HASH;
  const esValida = bcrypt.compareSync(body.password, hashAComparar);

  if (!usuario || !esValida) {
    throw new ErrorNegocio('Correo o contraseña incorrectos', 401);
  }

  const token = generarToken(usuario);
  return {
    token,
    tipo: 'Bearer',
    expira_en: 3600,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
    },
  };
}

module.exports = { login };
