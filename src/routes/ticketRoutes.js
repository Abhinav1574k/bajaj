const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  updateTicket,
  deleteTicket,
  getTicketStats,
  seedTickets
} = require('../controllers/ticketController');

// Stats and seed routes must be placed before dynamic /:id parameter routes
router.get('/stats', getTicketStats);
router.post('/seed', seedTickets);

router.route('/')
  .post(createTicket)
  .get(getTickets);

router.route('/:id')
  .patch(updateTicket)
  .delete(deleteTicket);

module.exports = router;
