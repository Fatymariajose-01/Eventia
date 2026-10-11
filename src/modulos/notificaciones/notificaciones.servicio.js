// Módulo Notificaciones: en el MVP registra la confirmación y la muestra en consola.
// Más adelante se puede reemplazar por un servicio de correo sin tocar los demás módulos.
const db = require('../../compartido/db');

function enviarConfirmacion(usuario, evento) {
  const mensaje = `Hola ${usuario.nombre}, tu inscripción a "${evento.titulo}" (${evento.fecha}) fue confirmada.`;
  db.prepare('INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?,?)').run(usuario.id, mensaje);
  console.log(`[NOTIFICACIÓN -> ${usuario.correo}] ${mensaje}`);
}

function deUsuario(usuario_id) {
  return db.prepare('SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY id DESC').all(usuario_id);
}

module.exports = { enviarConfirmacion, deUsuario };
