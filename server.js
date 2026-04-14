/**
 * LampLighter: Institutional Memory (SLT Edition)
 * Server Entry Point
 */

const path = require('path');
const express = require('express');
const app = express();

// Security Headers
const helmet = require('helmet');
app.use(helmet({ contentSecurityPolicy: false }));

// Setup View Engine
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Mock User for Stateless Demo (No Login Required)
app.use((req, res, next) => {
    req.user = { id: 1, email: 'SLT Admin', Admin: true };
    res.locals.currentUser = req.user;
    next();
});

// Home Route
app.get('/', (req, res) => {
    res.render('home', { user: req.user });
});

// API Routes
const apiRoutes = require('./routes/api.js');
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✔ LampLighter: SLT Edition running on port ${PORT}`);
});

module.exports = app;