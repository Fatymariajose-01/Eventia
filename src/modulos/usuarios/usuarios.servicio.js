// Módulo Usuarios: registro, perfil y administración de usuarios
const bcrypt = require('bcryptjs');
const db = require('../../compartido/db');
const { ErrorNegocio } = require('../../compartido/errores');
const {
  soloCamposPermitidos,
  lanzarSiHayErrores,
  esTexto,
  esIdValido,
} = require('../../compartido/validacion');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function aDTO(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
  };
}

function registrar(body) {
  soloCamposPermitidos(body, ['nombre', 'correo', 'password']);

  const errores = [];
  if (!esTexto(body.nombre, 2, 100)) {
    errores.push('El nombre debe tener entre 2 y 100 caracteres');
  }

  if (typeof body.correo !== 'string' || body.correo.length > 150 || !EMAIL_REGEX.test(body.correo.trim())) {
    errores.push('El correo no tiene un formato válido');
  }

  const pass = body.password;
  const esPassValido =
    typeof pass === 'string' &&
    pass.length >= 8 &&
    pass.length <= 72 &&
    /[a-zA-Z]/.test(pass) &&
    /[0-9]/.test(pass);

  if (!esPassValido) {
    errores.push('La contraseña debe tener entre 8 y 72 caracteres e incluir letras y números');
  }

  lanzarSiHayErrores(errores);

  const correoNormalizado = body.correo.trim().toLowerCase();
  const existe = db.prepare('SELECT id FROM usuarios WHERE correo = ?').get(correoNormalizado);
  if (existe) {
    throw new ErrorNegocio('No fue posible completar el registro con ese correo', 409);
  }

  const hash = bcrypt.hashSync(body.password, 10);
  const resultado = db
    .prepare('INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES (?, ?, ?, ?)')
    .run(body.nombre.trim(), correoNormalizado, hash, 'usuario');

  return {
    id: resultado.lastInsertRowid,
    nombre: body.nombre.trim(),
    correo: correoNormalizado,
    rol: 'usuario',
  };
}

function obtenerPorId(id, solicitante) {
  if (!esIdValido(id)) {
    throw new ErrorNegocio('Datos inválidos', 400, ['El id debe ser un entero positivo']);
  }

  const idNum = Number(id);
  if (solicitante.rol !== 'administrador' && solicitante.id !== idNum) {
    throw new ErrorNegocio('No tienes permiso para realizar esta operación', 403);
  }

  const u = db.prepare('SELECT id, nombre, correo FROM usuarios WHERE id = ?').get(idNum);
  if (!u) {
    throw new ErrorNegocio('Usuario no encontrado', 404);
  }

  return aDTO(u);
}

function listar() {
  return db.prepare('SELECT id, nombre, correo, rol FROM usuarios ORDER BY id').all();
}

function cambiarRol(id, body, solicitante) {
  if (!esIdValido(id)) {
    throw new ErrorNegocio('Datos inválidos', 400, ['El id debe ser un entero positivo']);
  }
  const idNum = Number(id);

  soloCamposPermitidos(body, ['rol']);
  if (!body.rol || !['usuario', 'organizador'].includes(body.rol)) {
    throw new ErrorNegocio('Datos inválidos', 400, ['El rol debe ser "usuario" u "organizador"']);
  }

  const target = db.prepare('SELECT id, nombre, correo, rol FROM usuarios WHERE id = ?').get(idNum);
  if (!target) {
    throw new ErrorNegocio('Usuario no encontrado', 404);
  }

  if (target.rol === 'administrador' || target.id === solicitante.id) {
    throw new ErrorNegocio('No se puede cambiar el rol de una cuenta administradora', 403);
  }

  db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run(body.rol, idNum);

  return {
    id: target.id,
    nombre: target.nombre,
    correo: target.correo,
    rol: body.rol,
  };
}

module.exports = {
  aDTO,
  registrar,
  obtenerPorId,
  listar,
  cambiarRol,
};
