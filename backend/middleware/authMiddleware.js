import jwt from 'jsonwebtoken';

// Verifica se l'utente è loggato
export const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: true, message: 'Non autenticato' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Qui salviamo i dati dell'utente (id, role)
    next();
  } catch {
    return res.status(401).json({ error: true, message: 'Token non valido' });
  }
};

// Verifica se l'utente ha uno dei ruoli permessi
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: true, message: 'Accesso negato: permessi insufficienti' });
  }
  next();
};