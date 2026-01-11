/**
 * Helper functions for authentication and role checks.
 * Uses Prisma (PostgreSQL) and Bcrypt (Security).
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

/**
 * Passport local authentication callback
 */
async function authenticateUser(email, password, done) {
  try {
    // 1. Find the user
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      return done(null, false, { message: 'Incorrect email.' });
    }

    // 2. Check the password securely
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      return done(null, user);
    } else {
      return done(null, false, { message: 'Incorrect password.' });
    }
  } catch (err) {
    return done(err);
  }
}

/**
 * Middleware to require logged in user
 */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

/**
 * Middleware to require admin privileges
 */
function isAdmin(req, res, next) {
  // Hardcoded admin check for now
  if (req.user && req.user.email === 'andrew.cummins@eastdurham.ac.uk') {
    return next();
  }
  res.status(403).send('Access denied. Admin privileges required.');
}

module.exports = {
  authenticateUser,
  ensureAuthenticated,
  isAdmin
};