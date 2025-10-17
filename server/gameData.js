const database = require('./database');

class GameDataService {

  // Inicializar nova sessão de jogo
  async createGameSession(sessionData = null) {
    // If sessionData provided, use it; otherwise generate a new session
    const sessionId = sessionData?.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = sessionData?.user_id || null;
    const configId = sessionData?.config_id || null;
    const status = sessionData?.status || 'active';

    await database.run(
      'INSERT INTO game_sessions (session_id, user_id, config_id, started_at, status) VALUES (?, ?, ?, ?, ?)',
      [sessionId, userId, configId, new Date().toISOString(), status]
    );

    console.log(`📊 Nova sessão criada: ${sessionId}`);
    return sessionId;
  }

  // Finalizar sessão de jogo
  async finishGameSession(sessionId, totalParticipants) {
    await database.run(
      'UPDATE game_sessions SET ended_at = ?, status = ?, total_participants = ? WHERE session_id = ?',
      [new Date().toISOString(), 'finished', totalParticipants, sessionId]
    );

    console.log(`📊 Sessão finalizada: ${sessionId}`);
  }

  // Salvar participante
  async saveParticipant(sessionId, participant) {
    await database.run(
      `INSERT INTO participants
       (participant_id, session_id, name, joined_at, final_status, final_level, total_earned)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        participant.id,
        sessionId,
        participant.name,
        participant.joinedAt,
        participant.status,
        participant.currentLevel,
        participant.totalEarned
      ]
    );

    console.log(`👤 Participante salvo: ${participant.name}`);
  }

  // Atualizar status do participante
  async updateParticipant(participantId, status, level, totalEarned) {
    await database.run(
      'UPDATE participants SET final_status = ?, final_level = ?, total_earned = ? WHERE participant_id = ?',
      [status, level, totalEarned, participantId]
    );
  }

  // Salvar resposta
  async saveAnswer(sessionId, participantId, answerData) {
    await database.run(
      `INSERT INTO answers
       (participant_id, session_id, question_id, question_text, level, selected_answer,
        correct_answer, is_correct, honey_earned, answered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        participantId,
        sessionId,
        answerData.questionId,
        answerData.question,
        answerData.level || 1,
        answerData.selectedAnswer,
        answerData.correctAnswer,
        answerData.isCorrect ? 1 : 0,
        answerData.honeyEarned,
        answerData.answeredAt
      ]
    );
  }

  // Buscar histórico de sessões
  async getGameSessions(limit = 50) {
    return await database.all(
      `SELECT * FROM game_sessions
       ORDER BY started_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  // Buscar participantes de uma sessão
  async getSessionParticipants(sessionId) {
    return await database.all(
      `SELECT * FROM participants
       WHERE session_id = ?
       ORDER BY total_earned DESC`,
      [sessionId]
    );
  }

  // Buscar respostas de um participante
  async getParticipantAnswers(participantId) {
    return await database.all(
      `SELECT * FROM answers
       WHERE participant_id = ?
       ORDER BY answered_at ASC`,
      [participantId]
    );
  }

  // Estatísticas gerais
  async getGameStats() {
    const stats = {};

    // Total de sessões
    const totalSessions = await database.get(
      'SELECT COUNT(*) as count FROM game_sessions'
    );
    stats.totalSessions = totalSessions.count;

    // Total de participantes
    const totalParticipants = await database.get(
      'SELECT COUNT(*) as count FROM participants'
    );
    stats.totalParticipants = totalParticipants.count;

    // Total de respostas
    const totalAnswers = await database.get(
      'SELECT COUNT(*) as count FROM answers'
    );
    stats.totalAnswers = totalAnswers.count;

    // Respostas corretas
    const correctAnswers = await database.get(
      'SELECT COUNT(*) as count FROM answers WHERE is_correct = 1'
    );
    stats.correctAnswers = correctAnswers.count;
    stats.accuracyRate = totalAnswers.count > 0 ?
      (correctAnswers.count / totalAnswers.count * 100).toFixed(2) : 0;

    // Vencedores
    const winners = await database.get(
      'SELECT COUNT(*) as count FROM participants WHERE final_status = "winner"'
    );
    stats.totalWinners = winners.count;

    // Média de honey ganho
    const avgHoney = await database.get(
      'SELECT AVG(total_earned) as avg FROM participants WHERE total_earned > 0'
    );
    stats.averageHoneyEarned = avgHoney.avg ? Math.round(avgHoney.avg) : 0;

    return stats;
  }

  // Top 10 maiores pontuações
  async getTopScores() {
    return await database.all(
      `SELECT p.name, p.total_earned, p.final_level, p.final_status,
              gs.started_at as session_date
       FROM participants p
       JOIN game_sessions gs ON p.session_id = gs.session_id
       ORDER BY p.total_earned DESC, p.final_level DESC
       LIMIT 10`
    );
  }

  // Estatísticas de perguntas
  async getQuestionStats() {
    const stats = await database.all(
      `SELECT question_id, question_text, level,
              COUNT(*) as times_asked,
              SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
              (SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy_rate
       FROM answers
       GROUP BY question_id, question_text, level
       ORDER BY times_asked DESC, accuracy_rate ASC`
    );

    return stats;
  }

  // Relatório detalhado de uma sessão
  async getSessionReport(sessionId) {
    const session = await database.get(
      'SELECT * FROM game_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (!session) return null;

    const participants = await this.getSessionParticipants(sessionId);

    const report = {
      session,
      participants: []
    };

    for (const participant of participants) {
      const answers = await this.getParticipantAnswers(participant.participant_id);
      report.participants.push({
        ...participant,
        answers
      });
    }

    return report;
  }

  // Resetar todos os dados históricos
  async resetHistoryData() {
    const db = database.getDatabase();

    try {
      await db.exec('BEGIN TRANSACTION');

      // Deletar dados das tabelas na ordem correta devido às foreign keys
      await database.run('DELETE FROM answers');
      await database.run('DELETE FROM participants');
      await database.run('DELETE FROM game_sessions');

      await db.exec('COMMIT');

      console.log('🗑️  Dados históricos resetados com sucesso');
      return true;
    } catch (error) {
      await db.exec('ROLLBACK');
      console.error('Erro ao resetar dados históricos:', error);
      throw error;
    }
  }
}

module.exports = new GameDataService();