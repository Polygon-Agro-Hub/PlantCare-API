const jwt = require('jsonwebtoken');
const db = require('../startup/database');

const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'No token provided',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
    }
    
    req.user = decoded;
    next();
  });
};

module.exports = auth;
