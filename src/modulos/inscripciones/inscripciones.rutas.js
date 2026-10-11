const router = require('express').Router();
const servicio = require('./inscripciones.servicio');

router.post('/', (req, res) => res.status(201).json(servicio.inscribir({
  usuario_id: Number(req.body.usuario_id), evento_id: Number(req.body.evento_id)
})));
router.get('/usuario/:id', (req, res) => res.json(servicio.deUsuario(Number(req.params.id))));

module.exports = router;
