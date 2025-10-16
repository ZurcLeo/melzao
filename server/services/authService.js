const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const Database = require('../database');

/**
 * AuthService
 * Handles user authentication, registration, and JWT token management
 */
class AuthService {
  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be defined in environment variables');
    }
    this.JWT_SECRET = process.env.JWT_SECRET;
    this.SALT_ROUNDS = 12;
    this.TOKEN_EXPIRY = '24h';
  }

  /**
   * Register a new user (host)
   */
  async registerUser(userData) {
    const { email, password, name } = userData;

    // Validações
    if (!this.isValidEmail(email)) {
      throw new Error('Email inválido');
    }

    if (!this.isValidPassword(password)) {
      throw new Error('Senha deve ter pelo menos 8 caracteres');
    }

    if (!name || name.trim().length < 2) {
      throw new Error('Nome deve ter pelo menos 2 caracteres');
    }

    // Verificar se email já existe
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('Email já está em uso');
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Criar usuário com status 'pending'
    const result = await Database.run(`
      INSERT INTO users (email, password_hash, name, role, status)
      VALUES (?, ?, ?, ?, ?)
    `, [
      email.toLowerCase().trim(),
      passwordHash,
      name.trim(),
      'host',
      'pending'
    ]);

    console.log(`👤 Novo usuário registrado (ID: ${result.id})`);

    return {
      userId: result.id,
      message: 'Usuário criado. Aguardando aprovação do administrador.',
      status: 'pending'
    };
  }

  /**
   * Authenticate user and return JWT token
   */
  async authenticateUser(email, password) {
    const user = await this.getUserByEmail(email);

    // Always execute bcrypt.compare to prevent timing attacks
    const userHash = user?.password_hash || await bcrypt.hash('dummy', this.SALT_ROUNDS);
    const isValidPassword = await bcrypt.compare(password, userHash);

    if (!user || !isValidPassword) {
      throw new Error('Credenciais inválidas');
    }

    if (user.status !== 'active') {
      const statusMessages = {
        'pending': 'Usuário aguardando aprovação do administrador',
        'inactive': 'Usuário foi desativado pelo administrador'
      };
      throw new Error(statusMessages[user.status] || 'Status do usuário inválido');
    }

    // Gerar JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      this.JWT_SECRET,
      { expiresIn: this.TOKEN_EXPIRY }
    );

    // Atualizar último login
    await this.updateUserLastLogin(user.id);

    console.log(`🔐 Login realizado (ID: ${user.id}, Role: ${user.role})`);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: new Date().toISOString()
      }
    };
  }

  /**
   * Verify JWT token and return user data
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);

      // Verificar se usuário ainda existe e está ativo
      const user = await Database.get(`
        SELECT id, email, name, role, status
        FROM users
        WHERE id = ?
      `, [decoded.userId]);

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      if (user.status !== 'active') {
        throw new Error('Usuário não está ativo');
      }

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Token inválido');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Token expirado');
      }
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, profileData) {
    const { name, email } = profileData;

    // Validações
    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      throw new Error('Nome deve ter pelo menos 2 caracteres');
    }

    if (email && !this.isValidEmail(email)) {
      throw new Error('Email inválido');
    }

    // Verificar se email já existe (se está sendo alterado)
    if (email) {
      const currentUser = await this.getUserById(userId);
      if (currentUser.email !== email.toLowerCase().trim()) {
        const existingUser = await this.getUserByEmail(email);
        if (existingUser) {
          throw new Error('Email já está em uso por outro usuário');
        }
      }
    }

    // Construir query dinamicamente
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (email) {
      updates.push('email = ?');
      values.push(email.toLowerCase().trim());
    }

    if (updates.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    values.push(userId);

    await Database.run(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `, values);

    console.log(`👤 Perfil atualizado para usuário ID: ${userId}`);
    return { message: 'Perfil atualizado com sucesso' };
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await Database.get(`
      SELECT password_hash FROM users WHERE id = ?
    `, [userId]);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar senha atual
    const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidCurrentPassword) {
      throw new Error('Senha atual incorreta');
    }

    // Validar nova senha
    if (!this.isValidPassword(newPassword)) {
      throw new Error('Nova senha deve ter pelo menos 8 caracteres');
    }

    // Hash da nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Atualizar senha
    await Database.run(`
      UPDATE users SET password_hash = ? WHERE id = ?
    `, [newPasswordHash, userId]);

    console.log(`🔑 Senha alterada para usuário ID: ${userId}`);
    return { message: 'Senha alterada com sucesso' };
  }

  /**
   * Generate password reset token (for future implementation)
   */
  async generatePasswordResetToken(email) {
    const user = await this.getUserByEmail(email);

    if (!user) {
      // Não revelar se email existe
      return { message: 'Se o email existir, um link de redefinição será enviado' };
    }

    // Por enquanto apenas log - implementar envio de email futuramente
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      this.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`🔑 Token de reset gerado`);

    return {
      message: 'Se o email existir, um link de redefinição será enviado'
    };
  }

  // ========== UTILITY METHODS ==========

  async getUserByEmail(email) {
    return await Database.get(`
      SELECT * FROM users WHERE email = ?
    `, [email.toLowerCase().trim()]);
  }

  async getUserById(userId) {
    return await Database.get(`
      SELECT id, email, name, role, status, created_at, last_login
      FROM users
      WHERE id = ?
    `, [userId]);
  }

  async updateUserLastLogin(userId) {
    // The Database Adapter will automatically convert CURRENT_TIMESTAMP to NOW() for PostgreSQL
    await Database.run(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `, [userId]);
  }

  isValidEmail(email) {
    return validator.isEmail(email, {
      allow_utf8_local_part: false,
      require_tld: true
    }) && email.length <= 254;
  }

  isValidPassword(password) {
    return password &&
           typeof password === 'string' &&
           password.length >= 8 &&
           password.length <= 128;
  }

  /**
   * Admin functions
   */
  async getPendingUsers() {
    return await Database.all(`
      SELECT id, email, name, created_at
      FROM users
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `);
  }

  async approveUser(userId, approvedBy) {
    // The Database Adapter will automatically convert CURRENT_TIMESTAMP to NOW() for PostgreSQL
    const result = await Database.run(`
      UPDATE users
      SET status = 'active', approved_at = CURRENT_TIMESTAMP, approved_by = ?
      WHERE id = ? AND status = 'pending'
    `, [approvedBy, userId]);

    if (result.changes === 0) {
      throw new Error('Usuário não encontrado ou não está pendente');
    }

    // Criar configuração padrão para o usuário aprovado
    try {
      await Database.run(`
        INSERT INTO user_game_configs (
          user_id, config_name, honey_multiplier, time_limit,
          custom_questions_only, allow_lifelines, max_participants,
          auto_advance, theme_color, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        'Configuração Padrão',
        1.0,        // honey_multiplier
        30,         // time_limit
        0,          // custom_questions_only
        1,          // allow_lifelines
        100,        // max_participants
        0,          // auto_advance
        '#FF6B35',  // theme_color
        1           // is_default
      ]);
      console.log(`✅ Configuração padrão criada para usuário aprovado ${userId}`);
    } catch (configError) {
      console.warn(`⚠️ Erro ao criar configuração padrão para usuário ${userId}:`, configError.message);
      // Don't fail the approval if config creation fails
    }

    const user = await this.getUserById(userId);
    console.log(`✅ Usuário aprovado (ID: ${userId})`);

    return { message: 'Usuário aprovado com sucesso', user };
  }

  async deactivateUser(userId) {
    const result = await Database.run(`
      UPDATE users
      SET status = 'inactive'
      WHERE id = ? AND status = 'active'
    `, [userId]);

    if (result.changes === 0) {
      throw new Error('Usuário não encontrado ou não está ativo');
    }

    const user = await this.getUserById(userId);
    console.log(`❌ Usuário desativado (ID: ${userId})`);

    return { message: 'Usuário desativado com sucesso', user };
  }

  async deleteUser(userId) {
    // Verificar se é um admin (não pode deletar admin)
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (user.role === 'admin') {
      throw new Error('Não é possível deletar um administrador');
    }

    // Verificar se tem jogos/questões associados
    const hasData = await Database.get(`
      SELECT COUNT(*) as count FROM game_sessions WHERE user_id = ?
      UNION ALL
      SELECT COUNT(*) as count FROM questions WHERE created_by = ?
    `, [userId, userId]);

    if (hasData && hasData.count > 0) {
      throw new Error('Usuário possui dados associados. Desative ao invés de deletar.');
    }

    await Database.run(`DELETE FROM users WHERE id = ?`, [userId]);
    console.log(`🗑️ Usuário deletado (ID: ${userId})`);

    return { message: 'Usuário deletado com sucesso' };
  }

  async getSystemStats() {
    const stats = await Database.all(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
        (SELECT COUNT(*) FROM users WHERE status = 'pending') as pending_users,
        (SELECT COUNT(*) FROM users WHERE status = 'inactive') as inactive_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_users,
        (SELECT COUNT(*) FROM users WHERE role = 'host') as host_users,
        (SELECT COUNT(*) FROM game_sessions) as total_sessions,
        (SELECT COUNT(*) FROM participants) as total_participants,
        (SELECT COUNT(*) FROM questions) as total_custom_questions,
        (SELECT COUNT(*) FROM questions WHERE is_active = 1) as active_custom_questions,
        (SELECT COUNT(*) FROM answers) as total_questions
    `);

    return stats[0] || {};
  }
}

module.exports = new AuthService();