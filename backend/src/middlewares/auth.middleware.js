import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.userRole = decoded.role || 'patient';
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Neautorizat, token eșuat' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Neautorizat, lipsește token-ul' });
  }
};

// Middleware: permite doar pacienților
export const patientOnly = (req, res, next) => {
  if (req.userRole !== 'patient') {
    return res.status(403).json({ message: 'Acces permis doar pacienților.' });
  }
  next();
};

// Middleware: permite doar medicilor
export const doctorOnly = (req, res, next) => {
  if (req.userRole !== 'doctor') {
    return res.status(403).json({ message: 'Acces permis doar medicilor.' });
  }
  next();
};
