// Módulo Usuarios: registro y consulta de usuarios.
const db = require('../../compartido/db');
const { ErrorNegocio } = require('../../compartido/errores');

function registrar({ nombre, correo, rol = 'asistente' }) {
  if (!nombre || !correo) throw new ErrorNegocio('Nombre y correo son obligatorios');
  if (db.prepare('SELECT id FROM usuarios WHERE correo = ?').get(correo)) {
    throw new ErrorNegocio('El correo ya está registrado', 409);
  }
  const r = db.prepare('INSERT INTO usuarios (nombre, correo, rol) VALUES (?,?,?)').run(nombre, correo, rol);
  return obtener(r.lastInsertRowid);
}

function obtener(id) {
  const u = db.prepare('SELECT id, nombre, correo, rol FROM usuarios WHERE id = ?').get(id);
  if (!u) throw new ErrorNegocio('Usuario no encontrado', 404);
  return u;
}

module.exports = { registrar, obtener };
