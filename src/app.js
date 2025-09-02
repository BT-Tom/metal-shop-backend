require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('./models/user');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const variantRoutes = require('./routes/variantRoutes');
const cartRoutes = require('./routes/cartRoutes');
const tierRoutes = require('./routes/tierRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Configure CORS to allow requests from the production frontend and allow credentials (cookies)
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.metalbroker.com.au';
const allowedOrigins = [FRONTEND_URL];
app.use(cors({
    origin: function(origin, callback) {
        // Allow non-browser requests (e.g., curl, server-to-server) when origin is undefined
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: Origin not allowed'), false);
    },
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'metalshopsecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        // In production we need secure cookies and cross-site cookies for cross-origin frontend
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser((id, done) => {
    const user = User.getById(id);
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
    let user = User.getByProviderId('google', profile.id);
    if (!user) {
        user = User.create({
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
            name: profile.displayName,
            password: null,
            provider: 'google',
            providerId: profile.id
        });
    }
    return done(null, user);
}));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    profileFields: ['id', 'displayName', 'emails']
}, (accessToken, refreshToken, profile, done) => {
    let user = User.getByProviderId('facebook', profile.id);
    if (!user) {
        user = User.create({
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
            name: profile.displayName,
            password: null,
            provider: 'facebook',
            providerId: profile.id
        });
    }
    return done(null, user);
}));

app.use(express.static(path.join(__dirname, '../public')));


// Register variants route first after static middleware
app.use('/api/variants', variantRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/tiers', tierRoutes);
app.use('/api/users', userRoutes);
const flashingPricingRoutes = require('./routes/flashingPricingRoutes');
app.use('/api/flashing-pricing', flashingPricingRoutes);
const flashingRoutes = require('./routes/flashingRoutes');
app.use('/api/flashing', flashingRoutes);
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Metal Shop server running on port ${PORT}`);
});