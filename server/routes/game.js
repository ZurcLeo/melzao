const express = require('express');
const router = express.Router();
const multiUserGameController = require('../multiUserGameController');
const { authenticateToken, requireRole, requireActiveUser } = require('../middleware/auth');

// All game routes require authentication
router.use(authenticateToken);
router.use(requireActiveUser);

/**
 * @route GET /game/session
 * @desc Get current user's game session state
 * @access Host
 */
router.get('/session', (req, res) => {
  try {
    const userId = req.user.userId;
    const session = multiUserGameController.getUserSession(userId);

    if (!session) {
      return res.json({
        success: true,
        session: null,
        message: 'Nenhuma sessão ativa'
      });
    }

    const sessionStats = multiUserGameController.getSessionStats(userId);

    res.json({
      success: true,
      session: sessionStats,
      participants: session.participants,
      currentQuestion: session.currentQuestion,
      currentParticipant: session.currentParticipant
    });

  } catch (error) {
    console.error('Erro ao obter sessão:', error);
    res.status(500).json({
      error: 'Erro ao obter estado da sessão',
      code: 'GET_SESSION_FAILED'
    });
  }
});

/**
 * @route POST /game/session
 * @desc Create a new game session
 * @access Host
 */
router.post('/session', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { configId } = req.body;

    // Check if user already has active session
    const existingSession = multiUserGameController.getUserSession(userId);
    if (existingSession) {
      return res.status(400).json({
        error: 'Você já tem uma sessão ativa. Finalize-a primeiro.',
        code: 'SESSION_ALREADY_EXISTS'
      });
    }

    // Load config if provided
    let userConfig = null;
    if (configId) {
      const Database = require('../database');
      userConfig = await Database.get(`
        SELECT * FROM user_game_configs
        WHERE id = ? AND user_id = ?
      `, [configId, userId]);

      if (!userConfig) {
        return res.status(404).json({
          error: 'Configuração não encontrada',
          code: 'CONFIG_NOT_FOUND'
        });
      }
    }

    // Create session
    const session = await multiUserGameController.createUserSession(userId, userConfig);

    res.status(201).json({
      success: true,
      sessionId: session.sessionId,
      config: {
        name: session.config.config_name,
        honeyMultiplier: session.config.honey_multiplier,
        timeLimit: session.config.time_limit,
        maxParticipants: session.config.max_participants,
        customQuestionsOnly: session.config.custom_questions_only
      }
    });

  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    res.status(500).json({
      error: error.message,
      code: 'SESSION_CREATION_FAILED'
    });
  }
});

/**
 * @route DELETE /game/session
 * @desc End current game session
 * @access Host
 */
router.delete('/session', async (req, res) => {
  try {
    const userId = req.user.userId;
    const success = await multiUserGameController.endUserSession(userId, 'manual');

    if (success) {
      res.json({
        success: true,
        message: 'Sessão finalizada com sucesso'
      });
    } else {
      res.status(404).json({
        error: 'Nenhuma sessão ativa encontrada',
        code: 'NO_ACTIVE_SESSION'
      });
    }

  } catch (error) {
    console.error('Erro ao finalizar sessão:', error);
    res.status(500).json({
      error: error.message,
      code: 'SESSION_END_FAILED'
    });
  }
});

/**
 * @route POST /game/participants
 * @desc Add participant to session
 * @access Host
 */
router.post('/participants', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Nome do participante é obrigatório',
        code: 'MISSING_PARTICIPANT_NAME'
      });
    }

    const participant = await multiUserGameController.addParticipant(userId, name.trim());

    res.status(201).json({
      success: true,
      participant,
      message: 'Participante adicionado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao adicionar participante:', error);

    let statusCode = 500;
    let errorCode = 'ADD_PARTICIPANT_FAILED';

    if (error.message.includes('Sessão não encontrada')) {
      statusCode = 404;
      errorCode = 'SESSION_NOT_FOUND';
    } else if (error.message.includes('durante o jogo')) {
      statusCode = 400;
      errorCode = 'GAME_IN_PROGRESS';
    } else if (error.message.includes('Limite máximo')) {
      statusCode = 400;
      errorCode = 'PARTICIPANT_LIMIT_REACHED';
    } else if (error.message.includes('já existe')) {
      statusCode = 400;
      errorCode = 'PARTICIPANT_NAME_EXISTS';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route POST /game/start
 * @desc Start game for a participant
 * @access Host
 */
router.post('/start', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        error: 'ID do participante é obrigatório',
        code: 'MISSING_PARTICIPANT_ID'
      });
    }

    const gameStart = await multiUserGameController.startGame(userId, participantId);

    res.json({
      success: true,
      ...gameStart,
      message: 'Jogo iniciado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao iniciar jogo:', error);

    let statusCode = 500;
    let errorCode = 'GAME_START_FAILED';

    if (error.message.includes('Sessão não encontrada')) {
      statusCode = 404;
      errorCode = 'SESSION_NOT_FOUND';
    } else if (error.message.includes('Participante não encontrado')) {
      statusCode = 404;
      errorCode = 'PARTICIPANT_NOT_FOUND';
    } else if (error.message.includes('jogo ativo')) {
      statusCode = 400;
      errorCode = 'GAME_ALREADY_ACTIVE';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route POST /game/answer
 * @desc Submit answer for current question
 * @access Host
 */
router.post('/answer', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { participantId, answer, responseTime } = req.body;

    if (!participantId || !answer) {
      return res.status(400).json({
        error: 'ID do participante e resposta são obrigatórios',
        code: 'MISSING_ANSWER_DATA'
      });
    }

    const result = await multiUserGameController.submitAnswer(
      userId,
      participantId,
      answer,
      responseTime
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Erro ao processar resposta:', error);

    let statusCode = 500;
    let errorCode = 'ANSWER_PROCESSING_FAILED';

    if (error.message.includes('Sessão não encontrada')) {
      statusCode = 404;
      errorCode = 'SESSION_NOT_FOUND';
    } else if (error.message.includes('não está ativo')) {
      statusCode = 400;
      errorCode = 'GAME_NOT_ACTIVE';
    } else if (error.message.includes('não é a vez')) {
      statusCode = 400;
      errorCode = 'NOT_PARTICIPANT_TURN';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route POST /game/quit
 * @desc Quit current game
 * @access Host
 */
router.post('/quit', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        error: 'ID do participante é obrigatório',
        code: 'MISSING_PARTICIPANT_ID'
      });
    }

    const result = await multiUserGameController.quitGame(userId, participantId);

    res.json({
      success: true,
      ...result,
      message: 'Jogo finalizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao desistir do jogo:', error);

    let statusCode = 500;
    let errorCode = 'QUIT_GAME_FAILED';

    if (error.message.includes('Sessão não encontrada')) {
      statusCode = 404;
      errorCode = 'SESSION_NOT_FOUND';
    } else if (error.message.includes('Participante não encontrado')) {
      statusCode = 404;
      errorCode = 'PARTICIPANT_NOT_FOUND';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
});

/**
 * @route GET /game/stats
 * @desc Get current session statistics
 * @access Host
 */
router.get('/stats', (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = multiUserGameController.getSessionStats(userId);

    if (!stats) {
      return res.status(404).json({
        error: 'Nenhuma sessão ativa encontrada',
        code: 'NO_ACTIVE_SESSION'
      });
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      error: 'Erro ao obter estatísticas da sessão',
      code: 'GET_STATS_FAILED'
    });
  }
});

/**
 * @route GET /game/all-sessions
 * @desc Get all active sessions (admin only)
 * @access Admin
 */
router.get('/all-sessions', requireRole(['admin']), (req, res) => {
  try {
    const allSessions = multiUserGameController.getAllActiveSessions();

    res.json({
      success: true,
      sessions: allSessions,
      count: allSessions.length
    });

  } catch (error) {
    console.error('Erro ao obter todas as sessões:', error);
    res.status(500).json({
      error: 'Erro ao obter sessões ativas',
      code: 'GET_ALL_SESSIONS_FAILED'
    });
  }
});

/**
 * @route POST /game/cleanup
 * @desc Cleanup inactive sessions (admin only)
 * @access Admin
 */
router.post('/cleanup', requireRole(['admin']), (req, res) => {
  try {
    const { maxInactiveMinutes = 30 } = req.body;
    const cleanedUp = multiUserGameController.cleanupInactiveSessions(maxInactiveMinutes);

    res.json({
      success: true,
      message: `${cleanedUp} sessões inativas foram limpas`,
      cleanedUp
    });

  } catch (error) {
    console.error('Erro na limpeza de sessões:', error);
    res.status(500).json({
      error: 'Erro ao limpar sessões inativas',
      code: 'CLEANUP_FAILED'
    });
  }
});

/**
 * @route GET /game/question-preview/:level
 * @desc Preview available questions for a level
 * @access Host
 */
router.get('/question-preview/:level', async (req, res) => {
  try {
    const userId = req.user.userId;
    const level = parseInt(req.params.level);

    if (isNaN(level) || level < 1 || level > 10) {
      return res.status(400).json({
        error: 'Nível deve estar entre 1 e 10',
        code: 'INVALID_LEVEL'
      });
    }

    // Get user's config to determine question mix
    const Database = require('../database');
    const config = await Database.get(`
      SELECT * FROM user_game_configs
      WHERE user_id = ? AND is_default = 1
    `, [userId]);

    if (!config) {
      return res.status(404).json({
        error: 'Configuração não encontrada',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    // Load question bank
    const questionBank = await multiUserGameController.loadQuestionBank(userId, config);
    const questionsForLevel = questionBank[level] || [];

    // Return preview without revealing correct answers
    const preview = questionsForLevel.map(q => ({
      id: q.question_id || q.id,
      question: q.question_text || q.question,
      options: q.options,
      level: q.level,
      honeyValue: Math.floor((q.honey_value || q.honeyValue || 0) * config.honey_multiplier),
      source: q.source,
      category: q.category
    }));

    res.json({
      success: true,
      level,
      questions: preview,
      count: preview.length,
      config: {
        honeyMultiplier: config.honey_multiplier,
        customQuestionsOnly: config.custom_questions_only
      }
    });

  } catch (error) {
    console.error('Erro ao obter preview de questões:', error);
    res.status(500).json({
      error: 'Erro ao obter questões para preview',
      code: 'QUESTION_PREVIEW_FAILED'
    });
  }
});

module.exports = router;