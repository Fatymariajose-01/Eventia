// Módulo Eventos: publicación, consulta, búsqueda y disponibilidad de cupos.
const db = require('../../compartido/db');
const { ErrorNegocio } = require('../../compartido/errores');
const usuarios = require('../usuarios/usuarios.servicio');

function publicar({ titulo, descripcion, ciudad, fecha, cupo_total, organizador_id }) {
  if (!titulo || !fecha || !cupo_total) throw new ErrorNegocio('Título, fecha y cupo son obligatorios');
  const org = usuarios.obtener(organizador_id);
  if (org.rol !== 'organizador') throw new ErrorNegocio('Solo un organizador puede publicar eventos', 403);
  const r = db.prepare(`INSERT INTO eventos (titulo, descripcion, ciudad, fecha, cupo_total, cupo_disponible, organizador_id)
                        VALUES (?,?,?,?,?,?,?)`).run(titulo, descripcion, ciudad, fecha, cupo_total, cupo_total, organizador_id);
  return obtener(r.lastInsertRowid);
}

function buscar(texto = '') {
  const t = `%${texto}%`;
  return db.prepare(`SELECT * FROM eventos WHERE titulo LIKE ? OR descripcion LIKE ? OR ciudad LIKE ?
                     ORDER BY fecha`).all(t, t, t);
}

function obtener(id) {
  const e = db.prepare('SELECT * FROM eventos WHERE id = ?').get(id);
  if (!e) throw new ErrorNegocio('Evento no encontrado', 404);
  return e;
}

function disponibilidad(id) {
  const e = obtener(id);
  return { evento_id: e.id, cupo_total: e.cupo_total, cupo_disponible: e.cupo_disponible, disponible: e.cupo_disponible > 0 };
}

// Descuenta un cupo de forma atómica: solo actualiza si todavía hay cupo.
function ocuparCupo(id) {
  const r = db.prepare('UPDATE eventos SET cupo_disponible = cupo_disponible - 1 WHERE id = ? AND cupo_disponible > 0').run(id);
  if (r.changes === 0) throw new ErrorNegocio('El evento ya no tiene cupos disponibles', 409);
}

module.exports = { publicar, buscar, obtener, disponibilidad, ocuparCupo };
