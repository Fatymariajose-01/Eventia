// Utilidades de validación para entradas y parámetros
const { ErrorNegocio } = require('./errores');

function soloCamposPermitidos(body, permitidos) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ErrorNegocio('El cuerpo de la solicitud debe ser un objeto JSON', 400);
  }
  const noPermitidos = Object.keys(body).filter((k) => !permitidos.includes(k));
  if (noPermitidos.length > 0) {
    const detalles = noPermitidos.map((k) => `Propiedad no permitida: ${k}`);
    throw new ErrorNegocio('Datos inválidos', 400, detalles);
  }
}

function lanzarSiHayErrores(errores) {
  if (errores && errores.length > 0) {
    throw new ErrorNegocio('Datos inválidos', 400, errores);
  }
}

function esTexto(v, min, max) {
  if (typeof v !== 'string') return false;
  const trimmed = v.trim();
  return trimmed.length >= min && trimmed.length <= max;
}

function esFechaFutura(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  if (fecha.getFullYear() !== y || fecha.getMonth() + 1 !== m || fecha.getDate() !== d) {
    return false;
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha >= hoy;
}

function esEnteroEnRango(v, min, max) {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function esIdValido(v) {
  if (v === null) return true;
  if (typeof v === 'number') {
    return Number.isInteger(v) && v > 0;
  }
  if (typeof v === 'string') {
    return /^[1-9]\d*$/.test(v.trim());
  }
  return false;
}

module.exports = {
  soloCamposPermitidos,
  lanzarSiHayErrores,
  esTexto,
  esFechaFutura,
  esEnteroEnRango,
  esIdValido,
};
