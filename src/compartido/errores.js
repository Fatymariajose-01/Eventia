class ErrorNegocio extends Error {
  constructor(mensaje, status = 400) { super(mensaje); this.status = status; }
}
module.exports = { ErrorNegocio };
