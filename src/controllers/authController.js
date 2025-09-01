const User = require('../models/user');

exports.register = async (req, res) => {
    console.log('[DEBUG] Registration attempt:', req.body);
    try {
        if (!req.body.email || !req.body.password || !req.body.name) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const existingUser = User.getByEmail(req.body.email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        const user = User.create(req.body);
        req.session.userId = user.id;
        
        console.log('[DEBUG] User created:', user);
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                tier: user.tier
            }
        });
    } catch (err) {
        console.error('[DEBUG] Registration error:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.login = async (req, res) => {
    console.log('[DEBUG] Login attempt:', req.body);
    try {
        const user = User.getByEmail(req.body.email);
        
        if (!user || user.password !== req.body.password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        req.session.userId = user.id;
        console.log('[DEBUG] User logged in:', user);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                tier: user.tier,
                tierProgress: User.getProgressToNextTier(user.id)
            }
        });
    } catch (err) {
        console.error('[DEBUG] Login error:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.json({ success: true });
};

exports.adminLogin = async (req, res) => {
    console.log('[DEBUG] Admin login attempt');
    try {
        const { email, password } = req.body;
        const user = User.getByEmail(email);

        if (!user || user.tier !== 999) {
            console.log('[DEBUG] Admin login failed: Not an admin user');
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        if (password !== user.password) {
            console.log('[DEBUG] Admin login failed: Invalid password');
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        req.session.isAdmin = true;
        req.session.userId = user.id;
        console.log('[DEBUG] Admin login successful');

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                tier: user.tier
            }
        });
    } catch (err) {
        console.error('[DEBUG] Admin login error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.checkAdmin = (req, res, next) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(403).json({ 
            success: false, 
            message: 'Not authorized' 
        });
    }
    next();
};

exports.getStatus = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({ success: false });
        }

        const user = User.getById(req.session.userId);
        if (!user) {
            return res.json({ success: false });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                tier: user.tier,
                tierProgress: User.getProgressToNextTier(user.id)
            }
        });
    } catch (err) {
        console.error('Status check error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};