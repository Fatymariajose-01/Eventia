const router = require('express').Router();
const servicio = require('./eventos.servicio');

router.get('/', (req, res) => res.json(servicio.buscar(req.query.q)));
router.post('/', (req, res) => res.status(201).json(servicio.publicar(req.body)));
router.get('/:id', (req, res) => res.json(servicio.obtener(Number(req.params.id))));
router.get('/:id/disponibilidad', (req, res) => res.json(servicio.disponibilidad(Number(req.params.id))));

module.exports = router;
