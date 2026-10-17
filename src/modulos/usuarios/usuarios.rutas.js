// Rutas del módulo de usuarios
const router = require('express').Router();
const servicio = require('./usuarios.servicio');
const { autenticar, autorizarRoles } = require('../../compartido/auth');

router.post('/', (req, res, next) => {
  try {
    const usuarioCreado = servicio.registrar(req.body);
    res.status(201).json(usuarioCreado);
  } catch (error) {
    next(error);
  }
});

router.get('/me', autenticar, (req, res) => {
  res.json(servicio.aDTO(req.usuario));
});

router.get('/:id', autenticar, (req, res, next) => {
  try {
    const usuario = servicio.obtenerPorId(req.params.id, req.usuario);
    res.json(usuario);
  } catch (error) {
    next(error);
  }
});

router.get('/', autenticar, autorizarRoles('administrador'), (req, res, next) => {
  try {
    res.json(servicio.listar());
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/rol', autenticar, autorizarRoles('administrador'), (req, res, next) => {
  try {
    const resultado = servicio.cambiarRol(req.params.id, req.body, req.usuario);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
