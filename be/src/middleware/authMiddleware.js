import jwt from 'jsonwebtoken';

const normalizeRole = (role) => `${role || ''}`.toLowerCase();

export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded; // { userId, role, studentId }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (req.user && (role === 'institution_admin' || role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden: Institution Admin access required' });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (req.user && role === 'super_admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
  }
};

export const requireSelfStudentOrAdmin = (req, res, next) => {
  const role = normalizeRole(req.user?.role);

  if (role === 'institution_admin' || role === 'admin') {
    return next();
  }

  if (role === 'student' && req.user?.studentId === req.params.studentId) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden: Cannot access another student data' });
};
