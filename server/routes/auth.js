const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateToken, authRateLimit, logAuthEvents } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// Apply rate limiting and logging to all auth routes
router.use(authRateLimit);
router.use(logAuthEvents);

/**
 * @route POST /auth/register
 * @desc Register a new host user
 * @access Public
 */
router.post('/register', validate('register'), async (req, res) => {
  try {
    const { email, password, name } = req.body;

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
router.post('/login', validate('login'), async (req, res) => {
  try {
    const { email, password } = req.body;

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
router.post('/change-password', authenticateToken, validate('changePassword'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

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
 * @route PUT /auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', authenticateToken, validate('updateProfile'), async (req, res) => {
  try {
    const { name, email } = req.body;

    const result = await authService.updateProfile(req.user.userId, { name, email });

    // Retornar dados atualizados do usuário
    const updatedUser = await authService.getUserById(req.user.userId);

    res.json({
      success: true,
      message: result.message,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.created_at,
        lastLogin: updatedUser.last_login
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);

    let errorCode = 'PROFILE_UPDATE_FAILED';
    let statusCode = 400;

    if (error.message.includes('já está em uso')) {
      errorCode = 'EMAIL_IN_USE';
      statusCode = 409;
    } else if (error.message.includes('inválido')) {
      errorCode = 'INVALID_DATA';
      statusCode = 400;
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
router.post('/forgot-password', validate('forgotPassword'), async (req, res) => {
  try {
    const { email } = req.body;

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