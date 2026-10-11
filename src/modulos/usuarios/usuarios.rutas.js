const router = require('express').Router();
const servicio = require('./usuarios.servicio');

router.post('/', (req, res) => res.status(201).json(servicio.registrar(req.body)));
router.get('/:id', (req, res) => res.json(servicio.obtener(Number(req.params.id))));

module.exports = router;
