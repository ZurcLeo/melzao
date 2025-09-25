const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateToken, authRateLimit, logAuthEvents } = require('../middleware/auth');

// Apply rate limiting and logging to all auth routes
router.use(authRateLimit);
router.use(logAuthEvents);

/**
 * @route POST /auth/register
 * @desc Register a new host user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validação básica
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, senha e nome são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const result = await authService.registerUser({
      email,
      password,
      name
    });

    res.status(201).json({
      success: true,
      message: result.message,
      userId: result.userId,
      status: result.status
    });

  } catch (error) {
    console.error('Erro no registro:', error);

    // Error codes for client handling
    let errorCode = 'REGISTRATION_FAILED';
    let statusCode = 400;

    if (error.message.includes('Email já está em uso')) {
      errorCode = 'EMAIL_EXISTS';
    } else if (error.message.includes('Email inválido')) {
      errorCode = 'INVALID_EMAIL';
    } else if (error.message.includes('Senha')) {
      errorCode = 'INVALID_PASSWORD';
    } else if (error.message.includes('Nome')) {
      errorCode = 'INVALID_NAME';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route POST /auth/login
 * @desc Authenticate user and return JWT token
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e senha são obrigatórios',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const result = await authService.authenticateUser(email, password);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token: result.token,
      user: result.user
    });

  } catch (error) {
    console.error('Erro no login:', error);

    let errorCode = 'LOGIN_FAILED';
    let statusCode = 401;

    if (error.message.includes('aguardando aprovação')) {
      errorCode = 'USER_PENDING_APPROVAL';
      statusCode = 403;
    } else if (error.message.includes('desativado')) {
      errorCode = 'USER_DEACTIVATED';
      statusCode = 403;
    } else if (error.message.includes('Credenciais inválidas')) {
      errorCode = 'INVALID_CREDENTIALS';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route GET /auth/verify
 * @desc Verify JWT token and return user info
 * @access Private
 */
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: {
      id: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    }
  });
});

/**
 * @route POST /auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'Todos os campos de senha são obrigatórios',
        code: 'MISSING_PASSWORD_FIELDS'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'Nova senha e confirmação não coincidem',
        code: 'PASSWORD_MISMATCH'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: 'Nova senha deve ser diferente da atual',
        code: 'SAME_PASSWORD'
      });
    }

    const result = await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);

    let errorCode = 'PASSWORD_CHANGE_FAILED';
    let statusCode = 400;

    if (error.message.includes('atual incorreta')) {
      errorCode = 'INVALID_CURRENT_PASSWORD';
      statusCode = 401;
    } else if (error.message.includes('pelo menos 8 caracteres')) {
      errorCode = 'WEAK_PASSWORD';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route POST /auth/forgot-password
 * @desc Generate password reset token
 * @access Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email é obrigatório',
        code: 'MISSING_EMAIL'
      });
    }

    const result = await authService.generatePasswordResetToken(email);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Erro ao gerar token de reset:', error);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'Se o email existir, um link de redefinição será enviado'
    });
  }
});

/**
 * @route GET /auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * @route POST /auth/refresh
 * @desc Refresh JWT token (extend expiration)
 * @access Private
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generate new token with fresh expiration
    const newToken = await authService.authenticateUser(req.user.email, null, true);

    res.json({
      success: true,
      token: newToken.token,
      message: 'Token renovado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({
      error: 'Erro ao renovar token',
      code: 'TOKEN_REFRESH_FAILED'
    });
  }
});

module.exports = router;