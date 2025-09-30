const { QuestionBank } = require('./questionBank');
const gameData = require('./gameData');
const questionService = require('./services/questionService');

/**
 * Multi-User GameController
 * Manages multiple simultaneous game sessions, one per authenticated user
 */
class MultiUserGameController {
  constructor() {
    // Map: userId -> gameSession
    this.userSessions = new Map();

    // Map: socketId -> userId (for WebSocket management)
    this.socketToUser = new Map();

    // Map: userId -> Set<socketId> (multiple connections per user)
    this.activeConnections = new Map();

    // Map: sessionId -> userId (for quick lookups)
    this.sessionToUser = new Map();
  }

  // ========== SESSION MANAGEMENT ==========

  /**
   * Create a new game session for a user
   */
  async createUserSession(userId, userConfig = null) {
    try {
      const sessionId = this.generateSessionId();

      // Get user's configuration
      let config = userConfig;
      if (!config) {
        const Database = require('./database');
        config = await Database.get(`
          SELECT * FROM user_game_configs
          WHERE user_id = ? AND is_default = 1
        `, [userId]);

        if (!config) {
          // Create default configuration for user
          console.log(`🔧 Criando configuração padrão para usuário ${userId}`);
          config = await this.createDefaultUserConfig(userId);
        }
      }

      // Load question bank for this user
      const questionBank = await this.loadQuestionBank(userId, config);

      const gameSession = {
        sessionId,
        userId,
        configId: config.id,
        config,
        participants: [],
        currentParticipant: null,
        currentQuestion: null,
        questionIndex: 0,
        gameStatus: 'waiting', // 'waiting', 'active', 'finished'
        timer: null,
        questionBank,
        usedQuestions: new Set(),
        startedAt: null,
        lastActivity: new Date(),
        stats: {
          totalQuestions: 0,
          correctAnswers: 0,
          totalHoneyEarned: 0,
          averageResponseTime: 0,
          participantsCount: 0
        }
      };

      this.userSessions.set(userId, gameSession);
      this.sessionToUser.set(sessionId, userId);

      // Save session to database
      await gameData.createGameSession({
        session_id: sessionId,
        user_id: userId,
        config_id: config.id,
        status: 'active'
      });

      console.log(`🎮 Nova sessão criada para usuário ${userId}: ${sessionId}`);
      return gameSession;

    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      throw error;
    }
  }

  /**
   * Get user's active game session
   */
  getUserSession(userId) {
    return this.userSessions.get(userId);
  }

  /**
   * End user's game session
   */
  async endUserSession(userId, reason = 'manual') {
    const session = this.userSessions.get(userId);

    if (!session) {
      return false;
    }

    try {
      // Clear any active timers
      this.clearSessionTimer(userId);

      // Update database
      await gameData.finishGameSession(session.sessionId, {
        ended_at: new Date(),
        status: 'finished',
        end_reason: reason,
        total_participants: session.participants.length,
        final_stats: JSON.stringify(session.stats)
      });

      // Clean up maps
      this.userSessions.delete(userId);
      this.sessionToUser.delete(session.sessionId);

      // Disconnect all user's sockets
      const userSockets = this.activeConnections.get(userId);
      if (userSockets) {
        userSockets.forEach(socketId => {
          this.socketToUser.delete(socketId);
        });
        this.activeConnections.delete(userId);
      }

      console.log(`🔚 Sessão finalizada para usuário ${userId}: ${reason}`);
      return true;

    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
      throw error;
    }
  }

  // ========== PARTICIPANT MANAGEMENT ==========

  /**
   * Add participant to user's session
   */
  async addParticipant(userId, participantName) {
    const session = this.getUserSession(userId);

    if (!session) {
      throw new Error('Sessão não encontrada. Crie uma sessão primeiro.');
    }

    if (session.gameStatus === 'active') {
      throw new Error('Não é possível adicionar participantes durante o jogo');
    }

    // Check participant limit
    if (session.participants.length >= session.config.max_participants) {
      throw new Error(`Limite máximo de ${session.config.max_participants} participantes atingido`);
    }

    // Check for duplicate names
    const existingParticipant = session.participants.find(p =>
      p.name.toLowerCase() === participantName.trim().toLowerCase()
    );

    if (existingParticipant) {
      throw new Error('Já existe um participante com este nome');
    }

    const participant = {
      id: `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: participantName.trim(),
      currentLevel: 0,
      totalEarned: 0,
      status: 'waiting',
      answers: [],
      joinedAt: new Date().toISOString(),
      sessionId: session.sessionId
    };

    session.participants.push(participant);
    session.lastActivity = new Date();

    // Save to database
    try {
      await gameData.saveParticipant(session.sessionId, participant);
      session.stats.participantsCount = session.participants.length;

      console.log(`👥 Participante adicionado à sessão ${session.sessionId}: ${participantName}`);
      return participant;

    } catch (error) {
      // Remove from memory if database save fails
      session.participants.pop();
      throw error;
    }
  }

  /**
   * Start game for a specific participant in user's session
   */
  async startGame(userId, participantId) {
    console.log(`🎯 startGame chamado para userId: ${userId}, participantId: ${participantId}`);

    const session = this.getUserSession(userId);
    if (!session) {
      console.error(`❌ Sessão não encontrada para userId: ${userId}`);
      throw new Error('Sessão não encontrada');
    }

    console.log(`📋 Sessão encontrada: ${session.sessionId}, status: ${session.gameStatus}`);
    console.log(`👥 Participantes na sessão: ${session.participants.length}`);

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant) {
      console.error(`❌ Participante ${participantId} não encontrado na sessão ${session.sessionId}`);
      console.log(`📋 Participantes disponíveis:`, session.participants.map(p => ({ id: p.id, name: p.name })));
      throw new Error('Participante não encontrado');
    }

    if (session.gameStatus === 'active') {
      console.warn(`⚠️ Jogo já ativo na sessão ${session.sessionId}`);
      throw new Error('Já existe um jogo ativo nesta sessão');
    }

    console.log(`🔄 Inicializando estado do jogo para participante: ${participant.name}`);

    // Initialize game state
    session.currentParticipant = participant;
    session.gameStatus = 'active';
    session.questionIndex = 0;
    session.usedQuestions.clear();

    if (!session.startedAt) {
      session.startedAt = new Date();
    }
    session.lastActivity = new Date();

    // Reset participant state
    participant.status = 'playing';
    participant.currentLevel = 1; // Começar no nível 1, não 0
    participant.totalEarned = 0;
    participant.answers = [];

    console.log(`📚 Buscando primeira questão (nível 1) para usuário ${userId}`);

    try {
      // Get first question
      const firstQuestion = await this.getNextQuestion(userId, 1);
      session.currentQuestion = firstQuestion;

      console.log(`✅ Primeira questão carregada:`, {
        questionText: firstQuestion.question?.substring(0, 50) + '...',
        level: firstQuestion.level,
        honeyValue: firstQuestion.honeyValue
      });

      console.log(`🎮 Jogo iniciado na sessão ${session.sessionId} para: ${participant.name}`);

      return {
        participant,
        question: firstQuestion,
        sessionInfo: {
          sessionId: session.sessionId,
          config: {
            timeLimit: session.config.time_limit,
            honeyMultiplier: session.config.honey_multiplier
          }
        }
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar primeira questão:`, error);
      // Reverter estado em caso de erro
      session.gameStatus = 'waiting';
      session.currentParticipant = null;
      participant.status = 'waiting';
      throw new Error(`Erro ao carregar primeira questão: ${error.message}`);
    }
  }

  // ========== QUESTION MANAGEMENT ==========

  /**
   * Load question bank mixing default and custom questions
   */
  async loadQuestionBank(userId, config) {
    const questionBank = {};

    // Initialize levels 1-10
    for (let level = 1; level <= 10; level++) {
      questionBank[level] = [];
    }

    try {
      // Validate config object
      if (!config) {
        throw new Error('Configuração não fornecida para loadQuestionBank');
      }

      // Load default questions from existing system
      const defaultQuestions = this.getDefaultQuestions();

      if (!config.custom_questions_only) {
        // Add default questions
        defaultQuestions.forEach(question => {
          if (questionBank[question.level]) {
            questionBank[question.level].push({
              ...question,
              source: 'default'
            });
          }
        });
      }

      // Load custom questions
      const customQuestions = await questionService.getQuestionsForGame(userId, null, true);
      customQuestions.forEach(question => {
        if (questionBank[question.level]) {
          questionBank[question.level].push({
            ...question,
            source: 'custom'
          });
        }
      });

      // Log question bank stats
      const stats = Object.entries(questionBank).map(([level, questions]) =>
        `L${level}:${questions.length}`
      ).join(' ');
      console.log(`📚 Question bank carregado para usuário ${userId}: ${stats}`);

      return questionBank;

    } catch (error) {
      console.error('Erro ao carregar banco de questões:', error);
      throw new Error('Erro ao carregar questões para o jogo');
    }
  }

  /**
   * Get next random question for current level
   */
  async getNextQuestion(userId, level) {
    const session = this.getUserSession(userId);

    if (!session) {
      throw new Error('Sessão não encontrada');
    }

    // ✅ SOLUÇÃO: Recarregar questões do banco para garantir versão mais recente
    const availableQuestions = await this.getAvailableQuestionsFromDB(
      userId,
      level,
      Array.from(session.usedQuestions),
      session.config
    );

    if (availableQuestions.length === 0) {
      throw new Error(`Não há mais questões disponíveis para o nível ${level}`);
    }

    // Select random question
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const selectedQuestion = availableQuestions[randomIndex];

    // Apply honey multiplier
    const baseHoneyValue = selectedQuestion.honey_value || selectedQuestion.honeyValue || 0;
    const adjustedHoneyValue = Math.floor(baseHoneyValue * session.config.honey_multiplier);

    // Mark question as used
    session.usedQuestions.add(selectedQuestion.question_id || selectedQuestion.id);

    // Increment usage count for custom questions
    if (selectedQuestion.source === 'custom' && selectedQuestion.id) {
      try {
        await questionService.incrementUsageCount(selectedQuestion.id);
      } catch (error) {
        console.warn('Erro ao incrementar contador de uso:', error);
      }
    }

    const formattedQuestion = {
      id: selectedQuestion.question_id || selectedQuestion.id,
      question: selectedQuestion.question_text || selectedQuestion.question,
      options: selectedQuestion.options,
      correctAnswer: selectedQuestion.correct_answer || selectedQuestion.correctAnswer,
      level: selectedQuestion.level,
      honeyValue: adjustedHoneyValue,
      originalHoneyValue: baseHoneyValue,
      source: selectedQuestion.source,
      explanation: selectedQuestion.explanation,
      timeLimit: session.config.time_limit
    };

    console.log(`❓ Questão selecionada (${selectedQuestion.source}) para sessão ${session.sessionId}, nível ${level}`);
    return formattedQuestion;
  }

  /**
   * Get default questions from existing system
   */
  getDefaultQuestions() {
    try {
      return QuestionBank.getAllQuestions() || [];
    } catch (error) {
      console.warn('Erro ao carregar questões padrão:', error);
      return [];
    }
  }

  /**
   * Get available questions from database (fresh data, not cached)
   * This ensures users always see the most recent version of questions
   */
  async getAvailableQuestionsFromDB(userId, level, usedQuestionIds, config) {
    const Database = require('./database');
    const allQuestions = [];

    try {
      // Build exclusion clause for used questions
      const exclusionClause = usedQuestionIds.length > 0
        ? `AND question_id NOT IN (${usedQuestionIds.map(() => '?').join(',')})`
        : '';

      // Load default questions from database if not custom_questions_only
      if (!config.custom_questions_only) {
        const defaultQuestions = await Database.all(`
          SELECT * FROM questions
          WHERE level = ?
            AND is_active = 1
            AND question_id LIKE 'default_%'
            ${exclusionClause}
        `, [level, ...usedQuestionIds]);

        defaultQuestions.forEach(q => {
          allQuestions.push({
            id: q.question_id,
            question_id: q.question_id,
            question_text: q.question_text,
            question: q.question_text,
            options: JSON.parse(q.options),
            correct_answer: q.correct_answer,
            correctAnswer: q.correct_answer,
            level: q.level,
            honey_value: q.honey_value,
            honeyValue: q.honey_value,
            explanation: q.explanation,
            source: 'default'
          });
        });
      }

      // Load custom questions from database
      const customQuestions = await Database.all(`
        SELECT * FROM questions
        WHERE level = ?
          AND is_active = 1
          AND created_by = ?
          ${exclusionClause}
      `, [level, userId, ...usedQuestionIds]);

      customQuestions.forEach(q => {
        allQuestions.push({
          id: q.id,
          question_id: q.question_id,
          question_text: q.question_text,
          question: q.question_text,
          options: JSON.parse(q.options),
          correct_answer: q.correct_answer,
          correctAnswer: q.correct_answer,
          level: q.level,
          honey_value: q.honey_value,
          honeyValue: q.honey_value,
          explanation: q.explanation,
          source: 'custom'
        });
      });

      console.log(`✅ ${allQuestions.length} questões carregadas do banco (nível ${level}, ${usedQuestionIds.length} usadas)`);
      return allQuestions;

    } catch (error) {
      console.error('❌ Erro ao buscar questões do banco:', error);
      throw error;
    }
  }

  // ========== ANSWER PROCESSING ==========

  /**
   * Process answer from participant
   */
  async submitAnswer(userId, participantId, answer, responseTime = null) {
    const session = this.getUserSession(userId);

    if (!session) {
      throw new Error('Sessão não encontrada');
    }

    if (session.gameStatus !== 'active') {
      throw new Error('Jogo não está ativo');
    }

    const participant = session.participants.find(p => p.id === participantId);
    const question = session.currentQuestion;

    if (!participant || !question) {
      throw new Error('Participante ou questão não encontrada');
    }

    if (participant.id !== session.currentParticipant?.id) {
      throw new Error('Não é a vez deste participante');
    }

    // Clear any active timer
    this.clearSessionTimer(userId);

    const isCorrect = answer.toUpperCase() === question.correctAnswer.toUpperCase();
    const honeyEarned = isCorrect ? question.honeyValue : 0;

    const answerRecord = {
      questionId: question.id,
      question: question.question,
      selectedAnswer: answer.toUpperCase(),
      correctAnswer: question.correctAnswer,
      isCorrect,
      honeyEarned,
      responseTime: responseTime || null,
      answeredAt: new Date().toISOString(),
      level: participant.currentLevel + 1,
      source: question.source
    };

    participant.answers.push(answerRecord);
    session.lastActivity = new Date();

    // Update session stats
    session.stats.totalQuestions++;
    if (isCorrect) {
      session.stats.correctAnswers++;
      session.stats.totalHoneyEarned += honeyEarned;
    }

    if (responseTime) {
      const currentAvg = session.stats.averageResponseTime;
      const totalQuestions = session.stats.totalQuestions;
      session.stats.averageResponseTime =
        (currentAvg * (totalQuestions - 1) + responseTime) / totalQuestions;
    }

    // Save answer to database
    try {
      await gameData.saveAnswer(session.sessionId, participantId, answerRecord);
    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
    }

    let gameResult;

    if (isCorrect) {
      participant.currentLevel++;
      participant.totalEarned = question.honeyValue;

      // Check if completed all 10 levels
      if (participant.currentLevel >= 10) {
        // Winner!
        participant.status = 'winner';
        session.gameStatus = 'waiting';
        session.currentParticipant = null;
        session.currentQuestion = null;

        // Update participant in database
        try {
          await gameData.updateParticipant(participantId, 'winner',
            participant.currentLevel, participant.totalEarned);
        } catch (error) {
          console.error('Erro ao atualizar participante:', error);
        }

        gameResult = {
          correct: true,
          completed: true,
          finalEarnings: participant.totalEarned,
          wonDragonTrophy: true,
          explanation: question.explanation
        };

        console.log(`🏆 Participante ${participant.name} ganhou na sessão ${session.sessionId}!`);

      } else {
        // Continue to next level
        const nextLevel = participant.currentLevel + 1;
        const nextQuestion = await this.getNextQuestion(userId, nextLevel);
        session.currentQuestion = nextQuestion;

        gameResult = {
          correct: true,
          nextQuestion,
          currentEarnings: participant.totalEarned,
          explanation: question.explanation
        };

        console.log(`✅ Resposta correta na sessão ${session.sessionId}, próximo nível: ${nextLevel}`);
      }

    } else {
      // Wrong answer - game over
      const finalEarnings = Math.floor(question.honeyValue * 0.5);
      participant.totalEarned = finalEarnings;
      participant.status = 'eliminated';
      session.gameStatus = 'waiting';
      session.currentParticipant = null;
      session.currentQuestion = null;

      // Update participant in database
      try {
        await gameData.updateParticipant(participantId, 'eliminated',
          participant.currentLevel, finalEarnings);
      } catch (error) {
        console.error('Erro ao atualizar participante:', error);
      }

      gameResult = {
        correct: false,
        finalEarnings,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      };

      console.log(`❌ Resposta incorreta na sessão ${session.sessionId}, jogo finalizado`);
    }

    return gameResult;
  }

  /**
   * Quit current game
   */
  async quitGame(userId, participantId) {
    const session = this.getUserSession(userId);

    if (!session) {
      throw new Error('Sessão não encontrada');
    }

    const participant = session.participants.find(p => p.id === participantId);

    if (!participant) {
      throw new Error('Participante não encontrado');
    }

    if (participant.id !== session.currentParticipant?.id) {
      throw new Error('Apenas o participante ativo pode desistir');
    }

    // Clear timer
    this.clearSessionTimer(userId);

    participant.status = 'quit';
    session.gameStatus = 'waiting';
    session.currentParticipant = null;
    session.currentQuestion = null;
    session.lastActivity = new Date();

    // Update participant in database
    try {
      await gameData.updateParticipant(participantId, 'quit',
        participant.currentLevel, participant.totalEarned);
    } catch (error) {
      console.error('Erro ao atualizar participante:', error);
    }

    console.log(`🚪 Participante ${participant.name} desistiu na sessão ${session.sessionId}`);

    return {
      finalEarnings: participant.totalEarned,
      message: 'Jogo encerrado pelo participante'
    };
  }

  // ========== SOCKET MANAGEMENT ==========

  /**
   * Associate socket with authenticated user
   */
  associateSocketWithUser(socketId, userId) {
    this.socketToUser.set(socketId, userId);

    if (!this.activeConnections.has(userId)) {
      this.activeConnections.set(userId, new Set());
    }

    this.activeConnections.get(userId).add(socketId);
    console.log(`🔌 Socket ${socketId} associado ao usuário ${userId}`);
  }

  /**
   * Disconnect socket
   */
  disconnectSocket(socketId) {
    const userId = this.socketToUser.get(socketId);

    if (userId) {
      const userSockets = this.activeConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socketId);

        // If no more connections, mark session as inactive
        if (userSockets.size === 0) {
          const session = this.getUserSession(userId);
          if (session) {
            session.lastActivity = new Date();
            console.log(`💤 Usuário ${userId} desconectou todas as sessões`);
          }
        }
      }
    }

    this.socketToUser.delete(socketId);
  }

  /**
   * Get user's socket connections
   */
  getUserSockets(userId) {
    return this.activeConnections.get(userId) || new Set();
  }

  // ========== UTILITY METHODS ==========

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Clear session timer
   */
  clearSessionTimer(userId) {
    const session = this.getUserSession(userId);
    if (session && session.timer) {
      clearTimeout(session.timer);
      session.timer = null;
    }
  }

  /**
   * Set session timer
   */
  setSessionTimer(userId, callback, delay) {
    this.clearSessionTimer(userId);
    const session = this.getUserSession(userId);
    if (session) {
      session.timer = setTimeout(callback, delay);
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(userId) {
    const session = this.getUserSession(userId);

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      status: session.gameStatus,
      participantCount: session.participants.length,
      currentParticipant: session.currentParticipant?.name || null,
      currentLevel: session.currentParticipant?.currentLevel || 0,
      stats: session.stats,
      config: {
        name: session.config.config_name,
        honeyMultiplier: session.config.honey_multiplier,
        timeLimit: session.config.time_limit,
        customQuestionsOnly: session.config.custom_questions_only
      },
      lastActivity: session.lastActivity
    };
  }

  /**
   * Get all active sessions (admin only)
   */
  getAllActiveSessions() {
    const sessions = [];

    this.userSessions.forEach((session, userId) => {
      sessions.push({
        userId,
        sessionId: session.sessionId,
        status: session.gameStatus,
        participantCount: session.participants.length,
        startedAt: session.startedAt,
        lastActivity: session.lastActivity,
        stats: session.stats
      });
    });

    return sessions;
  }

  /**
   * Clean up inactive sessions (run periodically)
   */
  cleanupInactiveSessions(maxInactiveMinutes = 30) {
    const now = new Date();
    const inactiveUsers = [];

    this.userSessions.forEach((session, userId) => {
      const inactiveTime = now - session.lastActivity;
      const inactiveMinutes = inactiveTime / (1000 * 60);

      if (inactiveMinutes > maxInactiveMinutes && session.gameStatus === 'waiting') {
        inactiveUsers.push(userId);
      }
    });

    // Clean up inactive sessions
    inactiveUsers.forEach(userId => {
      console.log(`🧹 Limpando sessão inativa do usuário ${userId}`);
      this.endUserSession(userId, 'inactivity_timeout');
    });

    return inactiveUsers.length;
  }

  /**
   * Create default configuration for a new user
   */
  async createDefaultUserConfig(userId) {
    const Database = require('./database');

    try {
      // Check if user already has a default configuration
      const existingConfig = await Database.get(`
        SELECT * FROM user_game_configs
        WHERE user_id = ? AND is_default = 1
      `, [userId]);

      if (existingConfig) {
        console.log(`✅ Configuração padrão já existe para usuário ${userId} (ID: ${existingConfig.id})`);
        return existingConfig;
      }

      // Insert default configuration
      const result = await Database.run(`
        INSERT INTO user_game_configs (
          user_id,
          config_name,
          honey_multiplier,
          time_limit,
          custom_questions_only,
          allow_lifelines,
          max_participants,
          auto_advance,
          theme_color,
          is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        'Configuração Padrão',
        1.0,                    // honey_multiplier
        30,                     // time_limit
        0,                      // custom_questions_only (false)
        1,                      // allow_lifelines (true)
        100,                    // max_participants
        0,                      // auto_advance (false)
        '#FF6B35',              // theme_color
        1                       // is_default (true)
      ]);

      // Check if insertion was successful
      if (!result || !result.lastID) {
        console.error('Erro: Falha ao inserir configuração, resultado:', result);
        throw new Error('Falha ao criar configuração no banco de dados');
      }

      // Get the created configuration
      const config = await Database.get(`
        SELECT * FROM user_game_configs WHERE id = ?
      `, [result.lastID]);

      console.log(`✅ Configuração padrão criada para usuário ${userId} (ID: ${result.lastID})`);
      return config;

    } catch (error) {
      console.error('Erro ao criar configuração padrão:', error);

      // Return a fallback configuration if database insert fails
      return {
        id: null,
        user_id: userId,
        config_name: 'Configuração Padrão',
        honey_multiplier: 1.0,
        time_limit: 30,
        custom_questions_only: 0,
        allow_lifelines: 1,
        max_participants: 100,
        auto_advance: 0,
        theme_color: '#FF6B35',
        is_default: 1
      };
    }
  }
}

// Export singleton instance
module.exports = new MultiUserGameController();