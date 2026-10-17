// Módulo Notificaciones: en el MVP registra la confirmación y la muestra en consola (excepto en test)
const db = require('../../compartido/db');

function enviarConfirmacion(usuario, evento) {
  const mensaje = `Hola ${usuario.nombre}, tu inscripción a "${evento.titulo}" (${evento.fecha}) fue confirmada.`;
  db.prepare('INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)').run(usuario.id, mensaje);
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[NOTIFICACIÓN -> ${usuario.correo}] ${mensaje}`);
  }
}

function deUsuario(usuarioId) {
  return db.prepare('SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY id DESC').all(usuarioId);
}

module.exports = { enviarConfirmacion, deUsuario };
