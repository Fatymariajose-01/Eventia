// Clase para errores de negocio y validación
class ErrorNegocio extends Error {
  constructor(mensaje, status = 400, detalles = undefined) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.status = status;
    if (detalles !== undefined) {
      this.detalles = detalles;
    }
  }
}

module.exports = { ErrorNegocio };
