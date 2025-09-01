const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/admin/login', authController.adminLogin);
router.get('/status', authController.getStatus);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
	// On success, redirect or send user info
	res.redirect('/'); // Or send JSON: res.json({ success: true, user: req.user });
});

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
	// On success, redirect or send user info
	res.redirect('/'); // Or send JSON: res.json({ success: true, user: req.user });
});

module.exports = router;