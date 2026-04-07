const router = require('express').Router();
const ctrl = require('../controllers/room.controller');

router.post('/create', ctrl.createRoom);
router.get('/all', ctrl.getRooms);
router.put('/update/:id', ctrl.updateRoom);
router.delete('/delete/:id', ctrl.deleteRoom);
router.put('/:id/status', ctrl.changeRoomStatus);
router.get('/details', ctrl.getRoomByCompanyAndId);

module.exports = router;