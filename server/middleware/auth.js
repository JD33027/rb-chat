const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Check if token is in Bearer format
  if (!token.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'Token format is not Bearer' });
  }

  try {
    // Verify token
    const tokenWithoutBearer = token.slice(7); // Remove 'Bearer ' prefix
    const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);

    // Attach user ID to the request object
    req.userId = decoded.userId;
    next(); // Proceed to the next middleware/route handler
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

module.exports = auth;

