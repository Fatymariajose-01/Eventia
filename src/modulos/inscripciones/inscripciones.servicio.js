// Módulo Inscripciones: inscribe usuarios, controla cupos y lista inscripciones.
const db = require('../../compartido/db');
const { ErrorNegocio } = require('../../compartido/errores');
const usuarios = require('../usuarios/usuarios.servicio');
const eventos = require('../eventos/eventos.servicio');
const notificaciones = require('../notificaciones/notificaciones.servicio');

// La inscripción y la actualización del cupo ocurren en UNA transacción:
// si algo falla, no queda una inscripción sin cupo descontado (ni al revés).
const inscribirTx = db.transaction((usuario_id, evento_id) => {
  if (db.prepare('SELECT id FROM inscripciones WHERE usuario_id = ? AND evento_id = ?').get(usuario_id, evento_id)) {
    throw new ErrorNegocio('El usuario ya está inscrito en este evento', 409);
  }
  eventos.ocuparCupo(evento_id);
  const r = db.prepare('INSERT INTO inscripciones (usuario_id, evento_id) VALUES (?,?)').run(usuario_id, evento_id);
  return r.lastInsertRowid;
});

function inscribir({ usuario_id, evento_id }) {
  const usuario = usuarios.obtener(usuario_id);
  const evento = eventos.obtener(evento_id);
  const id = inscribirTx(usuario.id, evento.id);
  notificaciones.enviarConfirmacion(usuario, evento);
  return { inscripcion_id: id, mensaje: 'Inscripción realizada', disponibilidad: eventos.disponibilidad(evento.id) };
}

function deUsuario(usuario_id) {
  usuarios.obtener(usuario_id);
  return db.prepare(`SELECT i.id, i.fecha_inscripcion, e.titulo, e.fecha, e.ciudad
                     FROM inscripciones i JOIN eventos e ON e.id = i.evento_id
                     WHERE i.usuario_id = ? ORDER BY e.fecha`).all(usuario_id);
}

module.exports = { inscribir, deUsuario };
