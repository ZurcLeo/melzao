const authService = require('../services/authService');

/**
 * Authentication Middleware
 * Provides JWT token verification and role-based access control
 */

/**
 * Authenticate JWT Token
 * Verifies the Bearer token and adds user data to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Token de acesso requerido',
        code: 'NO_TOKEN'
      });
    }

    const user = await authService.verifyToken(token);
    req.user = user;

    next();
  } catch (error) {
    let statusCode = 403;
    let errorCode = 'INVALID_TOKEN';

    if (error.message === 'Token expirado') {
      statusCode = 401;
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.message === 'Usuário não está ativo') {
      statusCode = 403;
      errorCode = 'USER_INACTIVE';
    }

    return res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
};

/**
 * Require specific roles
 * @param {Array<string>} allowedRoles - Array of allowed roles ['admin', 'host']
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`🚫 Acesso negado: ${req.user.email} tentou acessar recurso que requer roles [${allowedRoles.join(', ')}] mas tem role '${req.user.role}'`);

      return res.status(403).json({
        error: 'Acesso negado. Privilégios insuficientes.',
        code: 'INSUFFICIENT_PRIVILEGES',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Ensure user is active (additional check beyond token verification)
 * This middleware fetches fresh user data to ensure status is still active
 */
const requireActiveUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userDetails = await authService.getUserById(req.user.userId);

    if (!userDetails) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    if (userDetails.status !== 'active') {
      return res.status(403).json({
        error: 'Usuário inativo ou não aprovado',
        code: 'USER_INACTIVE',
        status: userDetails.status
      });
    }

    // Add full user details to request
    req.userDetails = userDetails;
    next();

  } catch (error) {
    console.error('Erro ao verificar status do usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Optional authentication - sets user if token is present and valid
 * Does not fail if no token is provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const user = await authService.verifyToken(token);
      req.user = user;
    }

    next();
  } catch (error) {
    // For optional auth, we don't return error, just continue without user
    next();
  }
};

/**
 * Middleware to ensure user can only access their own resources
 * Checks if req.params.userId matches the authenticated user ID
 */
const requireOwnership = (req, res, next) => {
  const targetUserId = parseInt(req.params.userId);
  const currentUserId = req.user.userId;

  // Admins can access any user's resources
  if (req.user.role === 'admin') {
    return next();
  }

  // Users can only access their own resources
  if (targetUserId !== currentUserId) {
    return res.status(403).json({
      error: 'Acesso negado. Você só pode acessar seus próprios recursos.',
      code: 'ACCESS_DENIED_OWNERSHIP'
    });
  }

  next();
};

/**
 * Rate limiting middleware for authentication endpoints
 * Prevents brute force attacks
 */
const authRateLimit = (() => {
  const attempts = new Map();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const key = `${clientIP}:${req.path}`;

    const now = Date.now();
    const clientAttempts = attempts.get(key) || { count: 0, lastAttempt: now };

    // Reset counter if window has passed
    if (now - clientAttempts.lastAttempt > WINDOW_MS) {
      clientAttempts.count = 0;
    }

    if (clientAttempts.count >= MAX_ATTEMPTS) {
      return res.status(429).json({
        error: 'Muitas tentativas. Tente novamente em 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((clientAttempts.lastAttempt + WINDOW_MS - now) / 1000)
      });
    }

    // Increment counter on failed attempts
    if (req.method === 'POST') {
      res.on('finish', () => {
        if (res.statusCode === 401 || res.statusCode === 400) {
          clientAttempts.count++;
          clientAttempts.lastAttempt = now;
          attempts.set(key, clientAttempts);
        } else if (res.statusCode === 200) {
          // Reset on successful login
          attempts.delete(key);
        }
      });
    }

    next();
  };
})();

/**
 * Middleware to log authentication events
 */
const logAuthEvents = (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    // Log authentication events
    if (req.path.includes('/login') && res.statusCode === 200) {
      console.log(`🔐 Login bem-sucedido: ${data.user?.email} (IP: ${req.ip})`);
    } else if (req.path.includes('/login') && res.statusCode === 401) {
      console.log(`🚫 Tentativa de login falhada: IP ${req.ip}`);
    } else if (req.path.includes('/register') && res.statusCode === 201) {
      console.log(`👤 Novo registro: ${req.body?.email} (IP: ${req.ip})`);
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireActiveUser,
  optionalAuth,
  requireOwnership,
  authRateLimit,
  logAuthEvents
};