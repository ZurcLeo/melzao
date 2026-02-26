const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateToken, requireRole, requireActiveUser } = require('../middleware/auth');
const Database = require('../databaseAdapter');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));
router.use(requireActiveUser);

/**
 * @route GET /admin/users/pending
 * @desc Get all users pending approval
 * @access Admin
 */
router.get('/users/pending', async (req, res) => {
  try {
    const pendingUsers = await authService.getPendingUsers();

    res.json({
      success: true,
      users: pendingUsers,
      count: pendingUsers.length
    });

  } catch (error) {
    console.error('Erro ao buscar usuários pendentes:', error);
    res.status(500).json({
      error: 'Erro ao buscar usuários pendentes',
      code: 'FETCH_PENDING_USERS_FAILED'
    });
  }
});

/**
 * @route GET /admin/users
 * @desc Get all users with filtering and pagination
 * @access Admin
 */
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      role,
      search
    } = req.query;

    let query = `
      SELECT id, email, name, role, status, created_at, approved_at, last_login
      FROM users
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (role) {
      query += ` AND role = ?`;
      params.push(role);
    }

    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const Database = require('../database');
    const users = await Database.all(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE 1=1
    `;
    const countParams = [];

    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }
    if (role) {
      countQuery += ` AND role = ?`;
      countParams.push(role);
    }
    if (search) {
      countQuery += ` AND (name LIKE ? OR email LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await Database.get(countQuery, countParams);
    const total = countResult.total;

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({
      error: 'Erro ao buscar usuários',
      code: 'FETCH_USERS_FAILED'
    });
  }
});

/**
 * @route PUT /admin/users/:id/approve
 * @desc Approve a pending user
 * @access Admin
 */
router.put('/users/:id/approve', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const adminId = req.user.userId;

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID do usuário inválido',
        code: 'INVALID_USER_ID'
      });
    }

    const result = await authService.approveUser(userId, adminId);

    res.json({
      success: true,
      message: result.message,
      user: result.user
    });

  } catch (error) {
    console.error('Erro ao aprovar usuário:', error);

    let statusCode = 500;
    let errorCode = 'USER_APPROVAL_FAILED';

    if (error.message.includes('não encontrado') || error.message.includes('não está pendente')) {
      statusCode = 404;
      errorCode = 'USER_NOT_FOUND_OR_NOT_PENDING';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route PUT /admin/users/:id/deactivate
 * @desc Deactivate an active user
 * @access Admin
 */
router.put('/users/:id/deactivate', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID do usuário inválido',
        code: 'INVALID_USER_ID'
      });
    }

    // Prevent admin from deactivating themselves
    if (userId === req.user.userId) {
      return res.status(400).json({
        error: 'Não é possível desativar sua própria conta',
        code: 'CANNOT_DEACTIVATE_SELF'
      });
    }

    const result = await authService.deactivateUser(userId);

    res.json({
      success: true,
      message: result.message,
      user: result.user
    });

  } catch (error) {
    console.error('Erro ao desativar usuário:', error);

    let statusCode = 500;
    let errorCode = 'USER_DEACTIVATION_FAILED';

    if (error.message.includes('não encontrado') || error.message.includes('não está ativo')) {
      statusCode = 404;
      errorCode = 'USER_NOT_FOUND_OR_NOT_ACTIVE';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route PUT /admin/users/:id/reactivate
 * @desc Reactivate an inactive user
 * @access Admin
 */
router.put('/users/:id/reactivate', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID do usuário inválido',
        code: 'INVALID_USER_ID'
      });
    }

    const Database = require('../database');
    const result = await Database.run(`
      UPDATE users
      SET status = 'active'
      WHERE id = ? AND status = 'inactive'
    `, [userId]);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado ou não está inativo',
        code: 'USER_NOT_FOUND_OR_NOT_INACTIVE'
      });
    }

    const user = await authService.getUserById(userId);
    console.log(`✅ Usuário reativado: ${user.email} por admin ${req.user.email}`);

    res.json({
      success: true,
      message: 'Usuário reativado com sucesso',
      user
    });

  } catch (error) {
    console.error('Erro ao reativar usuário:', error);
    res.status(500).json({
      error: 'Erro ao reativar usuário',
      code: 'USER_REACTIVATION_FAILED'
    });
  }
});

/**
 * @route DELETE /admin/users/:id
 * @desc Delete a user (only if no associated data)
 * @access Admin
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID do usuário inválido',
        code: 'INVALID_USER_ID'
      });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.userId) {
      return res.status(400).json({
        error: 'Não é possível deletar sua própria conta',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    const result = await authService.deleteUser(userId);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Erro ao deletar usuário:', error);

    let statusCode = 500;
    let errorCode = 'USER_DELETION_FAILED';

    if (error.message.includes('não encontrado')) {
      statusCode = 404;
      errorCode = 'USER_NOT_FOUND';
    } else if (error.message.includes('administrador')) {
      statusCode = 400;
      errorCode = 'CANNOT_DELETE_ADMIN';
    } else if (error.message.includes('dados associados')) {
      statusCode = 400;
      errorCode = 'USER_HAS_ASSOCIATED_DATA';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route GET /admin/stats
 * @desc Get comprehensive system statistics
 * @access Admin
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await authService.getSystemStats();

    // Add additional stats from game data
    const Database = require('../database');

    // Recent activity stats
    const recentActivity = await Database.all(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at > datetime('now', '-7 days')) as new_users_week,
        (SELECT COUNT(*) FROM game_sessions WHERE started_at > datetime('now', '-7 days')) as games_week,
        (SELECT COUNT(*) FROM questions WHERE created_at > datetime('now', '-7 days')) as new_questions_week,
        (SELECT COUNT(*) FROM participants WHERE joined_at > datetime('now', '-7 days')) as participants_week
    `);

    // Top hosts by sessions
    const topHosts = await Database.all(`
      SELECT
        u.name,
        u.email,
        COUNT(gs.id) as session_count
      FROM users u
      LEFT JOIN game_sessions gs ON u.id = gs.user_id
      WHERE u.role = 'host' AND u.status = 'active'
      GROUP BY u.id
      ORDER BY session_count DESC
      LIMIT 5
    `);

    // Question stats by category
    const questionsByCategory = await Database.all(`
      SELECT
        category,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
      FROM questions
      GROUP BY category
      ORDER BY count DESC
    `);

    const enrichedStats = {
      ...stats,
      recent_activity: recentActivity[0] || {},
      top_hosts: topHosts,
      questions_by_category: questionsByCategory
    };

    res.json({
      success: true,
      stats: enrichedStats,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro ao buscar estatísticas do sistema',
      code: 'FETCH_STATS_FAILED'
    });
  }
});

/**
 * @route GET /admin/activity
 * @desc Get system activity logs
 * @access Admin
 */
router.get('/activity', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const Database = require('../database');

    // Get recent registrations
    const recentRegistrations = await Database.all(`
      SELECT id, email, name, created_at, status
      FROM users
      ORDER BY created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // Get recent game sessions
    const recentSessions = await Database.all(`
      SELECT
        gs.session_id,
        gs.started_at,
        gs.ended_at,
        gs.status,
        u.name as host_name,
        COUNT(p.id) as participant_count
      FROM game_sessions gs
      LEFT JOIN users u ON gs.user_id = u.id
      LEFT JOIN participants p ON gs.session_id = p.session_id
      GROUP BY gs.id
      ORDER BY gs.started_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({
      success: true,
      activity: {
        recent_registrations: recentRegistrations,
        recent_sessions: recentSessions
      }
    });

  } catch (error) {
    console.error('Erro ao buscar atividade do sistema:', error);
    res.status(500).json({
      error: 'Erro ao buscar atividade do sistema',
      code: 'FETCH_ACTIVITY_FAILED'
    });
  }
});

/**
 * @route GET /api/admin/level-honey-config
 * @desc Get honey values for all 10 levels
 */
router.get('/level-honey-config', async (req, res) => {
  try {
    const rows = await Database.all(
      'SELECT level, honey_value FROM level_honey_config ORDER BY level'
    );
    res.json({ success: true, levels: rows });
  } catch (error) {
    console.error('Erro ao buscar configuração de níveis:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração de níveis' });
  }
});

/**
 * @route PUT /api/admin/level-honey-config/:level
 * @desc Update honey value for a specific level (1–10)
 */
router.put('/level-honey-config/:level', async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    const honeyValue = parseInt(req.body.honeyValue);

    if (isNaN(level) || level < 1 || level > 10) {
      return res.status(400).json({ error: 'Nível deve ser entre 1 e 10' });
    }
    if (isNaN(honeyValue) || honeyValue < 1) {
      return res.status(400).json({ error: 'Valor de honey deve ser pelo menos 1' });
    }

    const dbType = Database.getDatabaseType();
    if (dbType === 'postgres') {
      await Database.run(
        `INSERT INTO level_honey_config (level, honey_value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (level) DO UPDATE
           SET honey_value = EXCLUDED.honey_value,
               updated_by  = EXCLUDED.updated_by,
               updated_at  = NOW()`,
        [level, honeyValue, req.user.id]
      );
    } else {
      await Database.run(
        `INSERT INTO level_honey_config (level, honey_value, updated_by, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(level) DO UPDATE SET
           honey_value = excluded.honey_value,
           updated_by  = excluded.updated_by,
           updated_at  = CURRENT_TIMESTAMP`,
        [level, honeyValue, req.user.id]
      );
    }

    console.log(`🍯 Nível ${level} atualizado para ${honeyValue} honey por user ${req.user.id}`);
    res.json({ success: true, level, honeyValue });
  } catch (error) {
    console.error('Erro ao atualizar nível:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração do nível' });
  }
});

module.exports = router;