const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.token;
    if (authHeader) {
        const token = authHeader.split(" ")[1];

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                const error = new Error('Token is invalid!');
                error.statusCode = 403;
                throw error;
            } else {
                req.user = user;
                next();
            }
        });
    } else {
        const error = new Error('You are not allowed!');
        error.statusCode = 403;
        throw error;
    }
}

const verifyTokenAuthorization = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.id === req.params.id || req.user.isAdmin) {
            next();
        } else {
            const error = new Error('You are not allowed!');
            error.statusCode = 403;
            throw error;
        }
    });
}

const verifyTokenAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.isAdmin) {
            next();
        } else {
            const error = new Error('You are not allowed!');
            error.statusCode = 403;
            throw error;
        }
    });
}

module.exports = { verifyToken, verifyTokenAuthorization, verifyTokenAdmin };