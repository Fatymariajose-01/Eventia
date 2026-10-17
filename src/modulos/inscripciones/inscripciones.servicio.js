// Módulo Inscripciones: consulta de inscripciones de usuarios
const db = require('../../compartido/db');
const { ErrorNegocio } = require('../../compartido/errores');
const { esIdValido } = require('../../compartido/validacion');

function misInscripciones(usuarioId) {
  return db
    .prepare(
      `SELECT i.id, i.evento_id, e.titulo AS titulo_evento, e.fecha AS fecha_evento, e.ciudad, i.fecha_inscripcion
       FROM inscripciones i
       JOIN eventos e ON e.id = i.evento_id
       WHERE i.usuario_id = ?
       ORDER BY e.fecha`
    )
    .all(usuarioId);
}

function obtenerPorId(id, usuarioActual) {
  if (!esIdValido(id)) {
    throw new ErrorNegocio('Datos inválidos', 400, ['El id debe ser un entero positivo']);
  }
  const idNum = Number(id);

  const ins = db
    .prepare(
      `SELECT i.id, i.usuario_id, i.evento_id, i.fecha_inscripcion,
              e.titulo AS titulo_evento, e.fecha AS fecha_evento, e.organizador_id
       FROM inscripciones i
       JOIN eventos e ON e.id = i.evento_id
       WHERE i.id = ?`
    )
    .get(idNum);

  if (!ins) {
    throw new ErrorNegocio('Inscripción no encontrada', 404);
  }

  const esDuenio = ins.usuario_id === usuarioActual.id;
  const esOrganizador = ins.organizador_id === usuarioActual.id;
  const esAdmin = usuarioActual.rol === 'administrador';

  if (!esDuenio && !esOrganizador && !esAdmin) {
    throw new ErrorNegocio('No tienes permiso para consultar esta inscripción', 403);
  }

  return {
    id: ins.id,
    evento_id: ins.evento_id,
    titulo_evento: ins.titulo_evento,
    fecha_evento: ins.fecha_evento,
    fecha_inscripcion: ins.fecha_inscripcion,
  };
}

module.exports = {
  misInscripciones,
  obtenerPorId,
};
