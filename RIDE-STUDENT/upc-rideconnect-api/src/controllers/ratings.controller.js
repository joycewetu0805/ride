const ratingService = require('../services/rating.service');

async function submit(req, res, next) {
  try {
    const rating = await ratingService.submitRating({
      ...req.body,
      raterId: req.user.userId
    });
    res.status(201).json({ rating });
  } catch (err) { next(err); }
}

async function getUserRatings(req, res, next) {
  try {
    const ratings = await ratingService.getUserRatings(parseInt(req.params.userId));
    res.json({ ratings });
  } catch (err) { next(err); }
}

module.exports = { submit, getUserRatings };
