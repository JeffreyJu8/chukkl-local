// middleware/auth.js

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ message: 'You are not logged in' });
}

module.exports = { isAuthenticated };
