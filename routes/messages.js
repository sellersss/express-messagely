const { SECRET_KEY } = require('../config');
const express = require('express');
const jwt = require('jsonwebtoken');
const {
  authenticateJWT,
  ensureLoggedIn,
  ensureCorrectUser
} = require('../middleware/auth');

const ExpressError = require('../expressError');
const User = require('../models/user');
const Message = require('../models/message');

const router = new express.Router();

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get('/:id', ensureLoggedIn, async (req, res, next) => {
  try {
    const message = await Message.get(req.params.id);
    if (req.user === message.to_user.username || req.user === message.from_user.username) {
      return res.json({ message });
    }
    throw new ExpressError('You are not authorized to view this message!');
  } catch (e) {
    return next(e);
  }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post('/', ensureLoggedIn, async (req, res, next) => {
  try {
    const message = await Message.create(req.body);
    if (message) {
      return res.json({ message: message });
    }
  } catch (e) {
    return next(e);
  }
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post('/:id/read', ensureLoggedIn, async (req, res, next) => {
  try {
    const message = await Message.get(req.params.id);
    if (req.user === message.to_user.username) {
      const readMessage = await Message.markRead(req.params.id);
      return res.json({ readMessage });
    }
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
