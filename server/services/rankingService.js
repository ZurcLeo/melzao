/**
 * Ranking Service
 * Manages player identities (@handles) and cross-session leaderboards
 */

const Database = require('../database');

const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

class RankingService {
  /**
   * Validate a handle string
   */
  validateHandle(handle) {
    if (!handle || typeof handle !== 'string') return false;
    return HANDLE_REGEX.test(handle.toLowerCase().trim());
  }

  /**
   * Normalize handle: lowercase, trim, remove leading @
   */
  normalizeHandle(handle) {
    return handle.trim().toLowerCase().replace(/^@/, '');
  }

  /**
   * Create a new player identity
   * Returns the created identity or throws on duplicate handle
   */
  async createPlayerIdentity(handle, displayName, createdBy) {
    const norm = this.normalizeHandle(handle);

    if (!this.validateHandle(norm)) {
      throw new Error('Handle inválido. Use 3-20 caracteres: letras, números e underscores.');
    }

    if (!displayName || displayName.trim().length === 0) {
      throw new Error('Nome de exibição é obrigatório.');
    }

    const existing = await Database.get(
      'SELECT id FROM player_identities WHERE handle = ?',
      [norm]
    );
    if (existing) {
      throw new Error(`O handle @${norm} já está em uso.`);
    }

    const result = await Database.run(`
      INSERT INTO player_identities (handle, display_name, created_by)
      VALUES (?, ?, ?)
    `, [norm, displayName.trim(), createdBy || null]);

    console.log(`👤 Identidade criada: @${norm} (${displayName})`);
    return await this.getByHandle(norm);
  }

  /**
   * Update handle or display name (admin/host only)
   */
  async updatePlayerIdentity(id, fields, requesterId, requesterRole) {
    const identity = await Database.get('SELECT * FROM player_identities WHERE id = ?', [id]);
    if (!identity) throw new Error('Jogador não encontrado.');

    // Only admin or the host who created can edit
    if (requesterRole !== 'admin' && identity.created_by !== requesterId) {
      throw new Error('Sem permissão para editar este jogador.');
    }

    const updates = [];
    const params = [];

    if (fields.handle !== undefined) {
      const norm = this.normalizeHandle(fields.handle);
      if (!this.validateHandle(norm)) {
        throw new Error('Handle inválido. Use 3-20 caracteres: letras, números e underscores.');
      }
      const conflict = await Database.get(
        'SELECT id FROM player_identities WHERE handle = ? AND id != ?',
        [norm, id]
      );
      if (conflict) throw new Error(`O handle @${norm} já está em uso.`);
      updates.push('handle = ?');
      params.push(norm);
    }

    if (fields.displayName !== undefined) {
      if (!fields.displayName.trim()) throw new Error('Nome de exibição é obrigatório.');
      updates.push('display_name = ?');
      params.push(fields.displayName.trim());
    }

    if (updates.length === 0) throw new Error('Nenhum campo para atualizar.');

    params.push(id);
    await Database.run(`UPDATE player_identities SET ${updates.join(', ')} WHERE id = ?`, params);

    console.log(`✏️ Identidade #${id} atualizada por usuário ${requesterId}`);
    return await Database.get('SELECT * FROM player_identities WHERE id = ?', [id]);
  }

  /**
   * Get identity by handle
   */
  async getByHandle(handle) {
    const norm = this.normalizeHandle(handle);
    return await Database.get('SELECT * FROM player_identities WHERE handle = ?', [norm]);
  }

  /**
   * Get identity by id
   */
  async getById(id) {
    return await Database.get('SELECT * FROM player_identities WHERE id = ?', [id]);
  }

  /**
   * Link a participant record to a player identity
   */
  async linkParticipant(participantId, identityId) {
    await Database.run(
      'UPDATE participants SET player_identity_id = ? WHERE participant_id = ?',
      [identityId, participantId]
    );
  }

  /**
   * Update accumulated stats after a participant finishes a game
   */
  async updatePlayerStats(identityId, { honeyEarned = 0, level = 0, isWinner = false, answers = [] }) {
    const totalAnswers = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect || a.is_correct).length;

    const dbType = Database.getDatabaseType();
    const nowFn = dbType === 'postgres' ? 'NOW()' : "datetime('now')";

    await Database.run(`
      UPDATE player_identities SET
        total_honey     = total_honey + ?,
        sessions_played = sessions_played + 1,
        best_level      = CASE WHEN ? > best_level THEN ? ELSE best_level END,
        win_count       = win_count + ?,
        total_answers   = total_answers + ?,
        correct_answers = correct_answers + ?,
        last_seen       = ${nowFn}
      WHERE id = ?
    `, [
      honeyEarned,
      level, level,
      isWinner ? 1 : 0,
      totalAnswers,
      correctAnswers,
      identityId
    ]);

    console.log(`📊 Stats atualizados para identidade #${identityId}`);
  }

  /**
   * Get public leaderboard
   * period: 'all-time' | 'monthly' | 'weekly'
   */
  async getLeaderboard({ period = 'all-time', limit = 20, offset = 0 } = {}) {
    const dbType = Database.getDatabaseType();
    let periodFilter = '';

    if (period === 'weekly') {
      periodFilter = dbType === 'postgres'
        ? "AND last_seen >= NOW() - INTERVAL '7 days'"
        : "AND last_seen >= datetime('now', '-7 days')";
    } else if (period === 'monthly') {
      periodFilter = dbType === 'postgres'
        ? "AND last_seen >= NOW() - INTERVAL '30 days'"
        : "AND last_seen >= datetime('now', '-30 days')";
    }

    const rows = await Database.all(`
      SELECT
        id,
        handle,
        display_name,
        total_honey,
        sessions_played,
        best_level,
        win_count,
        total_answers,
        correct_answers,
        CASE
          WHEN total_answers > 0
          THEN ROUND(correct_answers::numeric / total_answers * 100, 1)
          ELSE 0
        END AS accuracy_rate,
        last_seen
      FROM player_identities
      WHERE sessions_played > 0
      ${periodFilter}
      ORDER BY total_honey DESC, best_level DESC, win_count DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    const total = await Database.get(`
      SELECT COUNT(*) as count FROM player_identities
      WHERE sessions_played > 0 ${periodFilter}
    `, []);

    return {
      period,
      players: rows.map((p, i) => ({
        rank: parseInt(offset) + i + 1,
        handle: p.handle,
        display_name: p.display_name,
        total_honey: p.total_honey,
        sessions_played: p.sessions_played,
        best_level: p.best_level,
        win_count: p.win_count,
        accuracy_rate: parseFloat(p.accuracy_rate) || 0,
        last_seen: p.last_seen
      })),
      pagination: {
        total: parseInt(total?.count || 0),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    };
  }

  /**
   * Get player profile with session history
   */
  async getPlayerProfile(handle) {
    const norm = this.normalizeHandle(handle);
    const identity = await Database.get('SELECT * FROM player_identities WHERE handle = ?', [norm]);
    if (!identity) return null;

    // Last 10 sessions this player participated in
    const sessions = await Database.all(`
      SELECT
        p.participant_id,
        p.session_id,
        p.final_status,
        p.final_level,
        p.total_earned,
        p.joined_at,
        gs.started_at
      FROM participants p
      JOIN game_sessions gs ON p.session_id = gs.session_id
      WHERE p.player_identity_id = ?
      ORDER BY p.joined_at DESC
      LIMIT 10
    `, [identity.id]);

    const accuracyRate = identity.total_answers > 0
      ? parseFloat((identity.correct_answers / identity.total_answers * 100).toFixed(1))
      : 0;

    return {
      handle: identity.handle,
      display_name: identity.display_name,
      total_honey: identity.total_honey,
      sessions_played: identity.sessions_played,
      best_level: identity.best_level,
      win_count: identity.win_count,
      accuracy_rate: accuracyRate,
      total_answers: identity.total_answers,
      correct_answers: identity.correct_answers,
      first_seen: identity.first_seen,
      last_seen: identity.last_seen,
      recent_sessions: sessions
    };
  }

  /**
   * List all player identities (for admin/host management)
   */
  async listIdentities({ search = '', createdBy = null, limit = 50, offset = 0 } = {}) {
    const params = [];
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (handle LIKE ? OR display_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (createdBy) {
      where += ' AND created_by = ?';
      params.push(createdBy);
    }

    params.push(parseInt(limit), parseInt(offset));

    const rows = await Database.all(`
      SELECT pi.*, u.name as creator_name
      FROM player_identities pi
      LEFT JOIN users u ON pi.created_by = u.id
      ${where}
      ORDER BY pi.total_honey DESC
      LIMIT ? OFFSET ?
    `, params);

    return rows;
  }

  /**
   * Delete a player identity (admin only)
   * Unlinks participants but does not delete game history
   */
  async deleteIdentity(id) {
    await Database.run('UPDATE participants SET player_identity_id = NULL WHERE player_identity_id = ?', [id]);
    await Database.run('DELETE FROM player_identities WHERE id = ?', [id]);
    console.log(`🗑️ Identidade #${id} removida`);
  }
}

module.exports = new RankingService();
