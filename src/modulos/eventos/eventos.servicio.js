// Módulo Eventos: publicación, modificación, consulta, disponibilidad e inscripciones
const db = require('../../compartido/db');
const { ErrorNegocio } = require('../../compartido/errores');
const {
  soloCamposPermitidos,
  lanzarSiHayErrores,
  esTexto,
  esFechaFutura,
  esEnteroEnRango,
  esIdValido,
} = require('../../compartido/validacion');
const notificaciones = require('../notificaciones/notificaciones.servicio');

function buscar(texto = '') {
  const q = String(texto || '').slice(0, 100);
  const t = `%${q}%`;
  return db
    .prepare(
      `SELECT * FROM eventos
       WHERE titulo LIKE ? OR descripcion LIKE ? OR ciudad LIKE ?
       ORDER BY fecha`
    )
    .all(t, t, t);
}

function obtener(id) {
  if (!esIdValido(id)) {
    throw new ErrorNegocio('Datos inválidos', 400, ['El id debe ser un entero positivo']);
  }
  const idNum = Number(id);
  const e = db.prepare('SELECT * FROM eventos WHERE id = ?').get(idNum);
  if (!e) {
    throw new ErrorNegocio('Evento no encontrado', 404);
  }
  return e;
}

function disponibilidad(id) {
  const e = obtener(id);
  return {
    evento_id: e.id,
    cupo_total: e.cupo_total,
    cupo_disponible: e.cupo_disponible,
    disponible: e.cupo_disponible > 0,
  };
}

function validarCamposEvento(body, esCreacion = false) {
  soloCamposPermitidos(body, ['titulo', 'descripcion', 'ciudad', 'fecha', 'cupo', 'precio']);

  const errores = [];

  // Título
  if (esCreacion && (body.titulo === undefined || body.titulo === null || body.titulo === '')) {
    errores.push('El campo titulo es obligatorio');
  } else if (body.titulo !== undefined) {
    if (!esTexto(body.titulo, 3, 150)) {
      errores.push('El título debe tener entre 3 y 150 caracteres');
    }
  }

  // Descripción
  if (body.descripcion !== undefined && body.descripcion !== null) {
    if (typeof body.descripcion !== 'string' || body.descripcion.length > 1000) {
      errores.push('La descripción debe ser texto de máximo 1000 caracteres');
    }
  }

  // Ciudad
  if (body.ciudad !== undefined && body.ciudad !== null) {
    if (!esTexto(body.ciudad, 2, 100)) {
      errores.push('La ciudad debe tener entre 2 y 100 caracteres');
    }
  }

  // Fecha
  if (esCreacion && (body.fecha === undefined || body.fecha === null || body.fecha === '')) {
    errores.push('El campo fecha es obligatorio');
  } else if (body.fecha !== undefined) {
    if (!esFechaFutura(body.fecha)) {
      errores.push('La fecha debe tener formato AAAA-MM-DD y no puede estar en el pasado');
    }
  }

  // Cupo
  if (esCreacion && (body.cupo === undefined || body.cupo === null)) {
    errores.push('El campo cupo es obligatorio');
  } else if (body.cupo !== undefined) {
    if (!esEnteroEnRango(body.cupo, 1, 10000)) {
      errores.push('El cupo debe ser un número entero entre 1 y 10000');
    }
  }

  // Precio
  if (esCreacion && (body.precio === undefined || body.precio === null)) {
    errores.push('El campo precio es obligatorio');
  } else if (body.precio !== undefined) {
    if (typeof body.precio !== 'number' || isNaN(body.precio) || body.precio < 0 || body.precio > 100000) {
      errores.push('El precio debe ser un número mayor o igual a 0');
    }
  }

  lanzarSiHayErrores(errores);
}

function publicar(body, usuarioActual) {
  validarCamposEvento(body, true);

  const titulo = body.titulo.trim();
  const descripcion = body.descripcion !== undefined && body.descripcion !== null ? body.descripcion.trim() : null;
  const ciudad = body.ciudad !== undefined && body.ciudad !== null ? body.ciudad.trim() : null;
  const fecha = body.fecha;
  const cupo = body.cupo;
  const precio = body.precio;
  const organizadorId = usuarioActual.id;

  const resultado = db
    .prepare(
      `INSERT INTO eventos (titulo, descripcion, ciudad, fecha, precio, cupo_total, cupo_disponible, organizador_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(titulo, descripcion, ciudad, fecha, precio, cupo, cupo, organizadorId);

  return obtener(resultado.lastInsertRowid);
}

function modificar(id, body, usuarioActual) {
  if (!esIdValido(id)) {
    throw new ErrorNegocio('Datos inválidos', 400, ['El id debe ser un entero positivo']);
  }
  const idNum = Number(id);

  const eventoActual = db.prepare('SELECT * FROM eventos WHERE id = ?').get(idNum);
  if (!eventoActual) {
    throw new ErrorNegocio('Evento no encontrado', 404);
  }

  if (usuarioActual.rol !== 'administrador' && eventoActual.organizador_id !== usuarioActual.id) {
    throw new ErrorNegocio('No tienes permiso para modificar este evento', 403);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ErrorNegocio('El cuerpo de la solicitud debe ser un objeto JSON', 400);
  }

  if (Object.keys(body).length === 0) {
    throw new ErrorNegocio('Datos inválidos', 400, ['Debe enviar al menos un campo para modificar']);
  }

  validarCamposEvento(body, false);

  let nuevoDisponible = eventoActual.cupo_disponible;
  if (body.cupo !== undefined) {
    const inscritos = eventoActual.cupo_total - eventoActual.cupo_disponible;
    if (body.cupo < inscritos) {
      throw new ErrorNegocio(`El cupo no puede ser menor que las ${inscritos} inscripciones existentes`, 409);
    }
    nuevoDisponible = body.cupo - inscritos;
  }

  const campos = [];
  const valores = [];

  if (body.titulo !== undefined) {
    campos.push('titulo = ?');
    valores.push(body.titulo.trim());
  }
  if (body.descripcion !== undefined) {
    campos.push('descripcion = ?');
    valores.push(body.descripcion === null ? null : body.descripcion.trim());
  }
  if (body.ciudad !== undefined) {
    campos.push('ciudad = ?');
    valores.push(body.ciudad === null ? null : body.ciudad.trim());
  }
  if (body.fecha !== undefined) {
    campos.push('fecha = ?');
    valores.push(body.fecha);
  }
  if (body.precio !== undefined) {
    campos.push('precio = ?');
    valores.push(body.precio);
  }
  if (body.cupo !== undefined) {
    campos.push('cupo_total = ?');
    valores.push(body.cupo);
    campos.push('cupo_disponible = ?');
    valores.push(nuevoDisponible);
  }

  valores.push(idNum);
  db.prepare(`UPDATE eventos SET ${campos.join(', ')} WHERE id = ?`).run(...valores);

  return obtener(idNum);
}

function listarInscritos(id, usuarioActual) {
  if (!esIdValido(id)) {
    throw new ErrorNegocio('Datos inválidos', 400, ['El id debe ser un entero positivo']);
  }
  const idNum = Number(id);

  const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(idNum);
  if (!evento) {
    throw new ErrorNegocio('Evento no encontrado', 404);
  }

  if (usuarioActual.rol !== 'administrador' && evento.organizador_id !== usuarioActual.id) {
    throw new ErrorNegocio('No tienes permiso para consultar las inscripciones de este evento', 403);
  }

  return db
    .prepare(
      `SELECT u.id, u.nombre, u.correo, i.fecha_inscripcion
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.usuario_id
       WHERE i.evento_id = ?
       ORDER BY i.id`
    )
    .all(idNum);
}

const inscribirTx = db.transaction((usuarioId, eventoId) => {
  const yaInscrito = db.prepare('SELECT id FROM inscripciones WHERE usuario_id = ? AND evento_id = ?').get(usuarioId, eventoId);
  if (yaInscrito) {
    throw new ErrorNegocio('Ya estás inscrito en este evento', 409);
  }

  const rCupo = db.prepare('UPDATE eventos SET cupo_disponible = cupo_disponible - 1 WHERE id = ? AND cupo_disponible > 0').run(eventoId);
  if (rCupo.changes === 0) {
    throw new ErrorNegocio('El evento ya no tiene cupos disponibles', 409);
  }

  const rIns = db.prepare('INSERT INTO inscripciones (usuario_id, evento_id) VALUES (?, ?)').run(usuarioId, eventoId);
  return rIns.lastInsertRowid;
});

function inscribirEnEvento(id, body, usuarioActual) {
  if (!esIdValido(id)) {
    throw new ErrorNegocio('Datos inválidos', 400, ['El id debe ser un entero positivo']);
  }
  const idNum = Number(id);

  soloCamposPermitidos(body ?? {}, []);

  const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(idNum);
  if (!evento) {
    throw new ErrorNegocio('Evento no encontrado', 404);
  }

  if (evento.organizador_id === usuarioActual.id) {
    throw new ErrorNegocio('No puedes inscribirte en un evento que organizas', 403);
  }

  const inscripcionId = inscribirTx(usuarioActual.id, idNum);
  notificaciones.enviarConfirmacion(usuarioActual, evento);

  return {
    inscripcion_id: inscripcionId,
    evento_id: idNum,
    mensaje: 'Inscripción realizada',
    disponibilidad: disponibilidad(idNum),
  };
}

module.exports = {
  buscar,
  obtener,
  disponibilidad,
  publicar,
  modificar,
  listarInscritos,
  inscribirEnEvento,
};
