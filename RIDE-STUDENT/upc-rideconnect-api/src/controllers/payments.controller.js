const paymentService = require('../services/payment.service');

async function initiate(req, res, next) {
  try {
    const payment = await paymentService.initiatePayment({
      ...req.body,
      userId: req.user.userId
    });
    res.status(201).json({ payment });
  } catch (err) { next(err); }
}

async function getStatus(req, res, next) {
  try {
    const status = await paymentService.getPaymentStatus(parseInt(req.params.id));
    res.json(status);
  } catch (err) { next(err); }
}

module.exports = { initiate, getStatus };
