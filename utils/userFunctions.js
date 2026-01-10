/**
 * Helper functions for authentication and role checks.
 * Updated to use Prisma (PostgreSQL) instead of SQLite.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Passport local authentication callback
 */
async function authenticateUser(email, password, done) {
  try {
    // 1. Find the user in the Postgres database
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      return done(null, false, { message: 'Incorrect email.' });
    }

    // 2. Check the password
    // NOTE: For now, we compare plain text because the seed user 
    // has a plain text password ("securePassword123"). 
    // In the future, we will bring bcrypt back here.
    if (password === user.password) {
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
  // If the user is authenticated, let them pass
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // If not, redirect them to the login page we just made
  res.redirect('/login');
}

/**
 * Middleware to require admin privileges
 */
function isAdmin(req, res, next) {
  // Simple check: Is the logged-in user the admin?
  if (req.user && req.user.email === 'admin@lamplighter.com') {
    return next();
  }
  res.status(403).send('Access denied');
}

module.exports = {
  authenticateUser,
  ensureAuthenticated,
  isAdmin
};