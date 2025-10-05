const authService = require('./services/authService');
const multiUserGameController = require('./multiUserGameController');

/**
 * Multi-User Game Socket Handler
 * Handles WebSocket connections with JWT authentication and per-user game sessions
 */
module.exports = function(io) {

  // Middleware for socket authentication (optional)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        // Allow anonymous connections for public game access
        socket.userId = null;
        socket.userEmail = 'anonymous';
        socket.userName = 'Jogador Anônimo';
        socket.userRole = 'guest';
        console.log(`👤 Conexão anônima aceita`);
        return next();
      }

      // Verify token if provided
      const user = await authService.verifyToken(token);

      if (!user) {
        // If token is invalid, still allow as anonymous
        socket.userId = null;
        socket.userEmail = 'anonymous';
        socket.userName = 'Jogador Anônimo';
        socket.userRole = 'guest';
        console.log(`👤 Token inválido, conexão anônima aceita`);
        return next();
      }

      // Check if user is active
      const userDetails = await authService.getUserById(user.userId);
      if (!userDetails || userDetails.status !== 'active') {
        // If user inactive, still allow as anonymous
        socket.userId = null;
        socket.userEmail = 'anonymous';
        socket.userName = 'Jogador Anônimo';
        socket.userRole = 'guest';
        console.log(`👤 Usuário inativo, conexão anônima aceita`);
        return next();
      }

      // Attach user info to socket
      socket.userId = user.userId;
      socket.userEmail = user.email;
      socket.userName = user.name;
      socket.userRole = user.role;

      console.log(`🔐 Socket autenticado: ${user.email} (${user.role})`);
      next();

    } catch (error) {
      console.error('Erro na autenticação do socket, permitindo acesso anônimo:', error);
      // Allow anonymous access even if auth service fails
      socket.userId = null;
      socket.userEmail = 'anonymous';
      socket.userName = 'Jogador Anônimo';
      socket.userRole = 'guest';
      next();
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    const userId = socket.userId;
    const userName = socket.userName;

    console.log(`🔌 Usuário conectado: ${userName} (ID: ${userId}, Socket: ${socket.id})`);

    // Associate socket with user
    multiUserGameController.associateSocketWithUser(socket.id, userId);

    // Send current session state if exists
    const existingSession = multiUserGameController.getUserSession(userId);
    if (existingSession) {
      socket.emit('session-state', {
        session: multiUserGameController.getSessionStats(userId),
        participants: existingSession.participants,
        currentQuestion: existingSession.currentQuestion,
        currentParticipant: existingSession.currentParticipant
      });
    }

    // ========== SESSION MANAGEMENT ==========

    /**
     * Create new game session
     */
    socket.on('create-session', async (data) => {
      try {
        const { configId } = data;

        // Check if user already has an active session
        const existingSession = multiUserGameController.getUserSession(userId);
        if (existingSession) {
          socket.emit('error', {
            message: 'Você já tem uma sessão ativa. Finalize-a primeiro.',
            code: 'SESSION_ALREADY_EXISTS'
          });
          return;
        }

        // Load user config if provided
        let userConfig = null;
        if (configId) {
          const Database = require('./database');
          userConfig = await Database.get(`
            SELECT * FROM user_game_configs
            WHERE id = ? AND user_id = ?
          `, [configId, userId]);

          if (!userConfig) {
            socket.emit('error', {
              message: 'Configuração não encontrada',
              code: 'CONFIG_NOT_FOUND'
            });
            return;
          }
        }

        // Create session
        const session = await multiUserGameController.createUserSession(userId, userConfig);

        socket.emit('session-created', {
          sessionId: session.sessionId,
          config: {
            name: session.config.config_name,
            honeyMultiplier: session.config.honey_multiplier,
            timeLimit: session.config.time_limit,
            maxParticipants: session.config.max_participants,
            customQuestionsOnly: session.config.custom_questions_only
          }
        });

        // Notify other sockets of the same user
        broadcastToUser(userId, 'session-created', {
          sessionId: session.sessionId
        });

      } catch (error) {
        console.error('Erro ao criar sessão:', error);
        socket.emit('error', {
          message: error.message,
          code: 'SESSION_CREATION_FAILED'
        });
      }
    });

    /**
     * End current session
     */
    socket.on('end-session', async () => {
      try {
        const success = await multiUserGameController.endUserSession(userId, 'manual');

        if (success) {
          socket.emit('session-ended', { reason: 'manual' });
          broadcastToUser(userId, 'session-ended', { reason: 'manual' });
        } else {
          socket.emit('error', {
            message: 'Nenhuma sessão ativa encontrada',
            code: 'NO_ACTIVE_SESSION'
          });
        }

      } catch (error) {
        console.error('Erro ao finalizar sessão:', error);
        socket.emit('error', {
          message: error.message,
          code: 'SESSION_END_FAILED'
        });
      }
    });

    // ========== PARTICIPANT MANAGEMENT ==========

    /**
     * Add participant to session
     */
    socket.on('add-participant', async (data) => {
      try {
        const { name } = data;

        if (!name || name.trim().length === 0) {
          socket.emit('error', {
            message: 'Nome do participante é obrigatório',
            code: 'MISSING_PARTICIPANT_NAME'
          });
          return;
        }

        // For anonymous users, we can't add participants to a session
        if (!userId) {
          socket.emit('error', {
            message: 'Você precisa fazer login para adicionar participantes',
            code: 'LOGIN_REQUIRED'
          });
          return;
        }

        // Ensure user has a session
        let session = multiUserGameController.getUserSession(userId);
        if (!session) {
          console.log(`🎯 Criando sessão automática para adicionar participante - usuário ${userName}`);
          session = await multiUserGameController.createUserSession(userId);
        }

        const participant = await multiUserGameController.addParticipant(userId, name.trim());

        socket.emit('participant-added', { participant });
        broadcastToUser(userId, 'participant-added', { participant });

        // Send updated game state
        const updatedSession = multiUserGameController.getUserSession(userId);
        const gameState = {
          status: updatedSession.gameStatus,
          participants: updatedSession.participants,
          currentQuestion: updatedSession.currentQuestion,
          currentParticipant: updatedSession.currentParticipant,
          session: {
            id: updatedSession.sessionId,
            config: updatedSession.config
          },
          totalParticipants: updatedSession.participants.length
        };
        socket.emit('game-state', gameState);
        broadcastToUser(userId, 'game-state', gameState);

      } catch (error) {
        console.error('Erro ao adicionar participante:', error);
        socket.emit('error', {
          message: error.message,
          code: 'ADD_PARTICIPANT_FAILED'
        });
      }
    });

    /**
     * Start game for participant
     */
    socket.on('start-game', async (data) => {
      try {
        console.log(`🎮 Recebido start-game de ${userName}:`, data);
        const { participantId } = data;

        if (!participantId) {
          console.error('❌ ID do participante não fornecido');
          socket.emit('error', {
            message: 'ID do participante é obrigatório',
            code: 'MISSING_PARTICIPANT_ID'
          });
          return;
        }

        console.log(`🎯 Iniciando jogo para participante ${participantId} do usuário ${userId}`);
        const gameStart = await multiUserGameController.startGame(userId, participantId);
        console.log(`✅ Jogo iniciado com sucesso:`, gameStart);

        socket.emit('game-started', gameStart);
        broadcastToUser(userId, 'game-started', gameStart);

        // Send updated game state
        const session = multiUserGameController.getUserSession(userId);
        if (!session) {
          console.error('❌ Sessão não encontrada após iniciar jogo');
          socket.emit('error', {
            message: 'Erro interno: sessão perdida',
            code: 'SESSION_LOST'
          });
          return;
        }

        const gameState = {
          status: session.gameStatus,
          participants: session.participants,
          currentQuestion: session.currentQuestion,
          currentParticipant: session.currentParticipant,
          session: {
            id: session.sessionId,
            config: session.config
          },
          totalParticipants: session.participants.length
        };

        console.log(`📊 Enviando game-state atualizado:`, {
          status: gameState.status,
          hasCurrentQuestion: !!gameState.currentQuestion,
          hasCurrentParticipant: !!gameState.currentParticipant,
          totalParticipants: gameState.totalParticipants
        });

        socket.emit('game-state', gameState);
        broadcastToUser(userId, 'game-state', gameState);

        // Auto-start question timer if configured
        if (session && session.config.time_limit > 0) {
          startQuestionTimer(userId, session.config.time_limit);
        }

      } catch (error) {
        console.error('Erro ao iniciar jogo:', error);
        socket.emit('error', {
          message: error.message,
          code: 'GAME_START_FAILED'
        });
      }
    });

    // ========== ANSWER PROCESSING ==========

    /**
     * Submit answer
     */
    socket.on('submit-answer', async (data) => {
      try {
        const { participantId, answer, responseTime } = data;

        if (!participantId || !answer) {
          socket.emit('error', {
            message: 'ID do participante e resposta são obrigatórios',
            code: 'MISSING_ANSWER_DATA'
          });
          return;
        }

        const result = await multiUserGameController.submitAnswer(
          userId,
          participantId,
          answer,
          responseTime
        );

        socket.emit('answer-result', result);
        broadcastToUser(userId, 'answer-result', result);

        // Send updated game state after answer is processed
        const session = multiUserGameController.getUserSession(userId);
        if (session) {
          const gameState = {
            status: session.gameStatus,
            participants: session.participants,
            currentQuestion: session.currentQuestion,
            currentParticipant: session.currentParticipant,
            session: {
              id: session.sessionId,
              config: session.config
            },
            totalParticipants: session.participants.length
          };
          socket.emit('game-state', gameState);
          broadcastToUser(userId, 'game-state', gameState);
        }

        // If game continues, start next question timer
        if (result.correct && !result.completed && result.nextQuestion) {
          if (session && session.config.time_limit > 0) {
            startQuestionTimer(userId, session.config.time_limit);
          }
        }

      } catch (error) {
        console.error('Erro ao processar resposta:', error);
        socket.emit('error', {
          message: error.message,
          code: 'ANSWER_PROCESSING_FAILED'
        });
      }
    });

    /**
     * Quit current game
     */
    socket.on('quit-game', async (data) => {
      try {
        const { participantId } = data;

        if (!participantId) {
          socket.emit('error', {
            message: 'ID do participante é obrigatório',
            code: 'MISSING_PARTICIPANT_ID'
          });
          return;
        }

        const result = await multiUserGameController.quitGame(userId, participantId);

        socket.emit('game-quit', result);
        broadcastToUser(userId, 'game-quit', result);

      } catch (error) {
        console.error('Erro ao desistir do jogo:', error);
        socket.emit('error', {
          message: error.message,
          code: 'QUIT_GAME_FAILED'
        });
      }
    });

    // ========== SESSION INFO ==========

    /**
     * Get current session state
     */
    socket.on('get-session-state', () => {
      try {
        const session = multiUserGameController.getUserSession(userId);

        if (session) {
          socket.emit('session-state', {
            session: multiUserGameController.getSessionStats(userId),
            participants: session.participants,
            currentQuestion: session.currentQuestion,
            currentParticipant: session.currentParticipant
          });
        } else {
          socket.emit('session-state', { session: null });
        }

      } catch (error) {
        console.error('Erro ao obter estado da sessão:', error);
        socket.emit('error', {
          message: 'Erro ao obter estado da sessão',
          code: 'GET_SESSION_STATE_FAILED'
        });
      }
    });

    /**
     * Get session statistics
     */
    socket.on('get-session-stats', () => {
      try {
        const stats = multiUserGameController.getSessionStats(userId);
        socket.emit('session-stats', stats);

      } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        socket.emit('error', {
          message: 'Erro ao obter estatísticas',
          code: 'GET_STATS_FAILED'
        });
      }
    });

    // ========== ADMIN FEATURES ==========

    /**
     * Get all active sessions (admin only)
     */
    socket.on('get-all-sessions', () => {
      try {
        if (socket.userRole !== 'admin') {
          socket.emit('error', {
            message: 'Acesso negado. Apenas administradores.',
            code: 'ACCESS_DENIED'
          });
          return;
        }

        const allSessions = multiUserGameController.getAllActiveSessions();
        socket.emit('all-sessions', allSessions);

      } catch (error) {
        console.error('Erro ao obter todas as sessões:', error);
        socket.emit('error', {
          message: 'Erro ao obter sessões ativas',
          code: 'GET_ALL_SESSIONS_FAILED'
        });
      }
    });

    // ========== DISCONNECT HANDLING ==========

    /**
     * Handle socket disconnection
     */
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Usuário desconectado: ${userName} (Razão: ${reason})`);

      multiUserGameController.disconnectSocket(socket.id);

      // If no more connections for this user, you might want to pause their game
      const remainingConnections = multiUserGameController.getUserSockets(userId);
      if (remainingConnections.size === 0) {
        console.log(`💤 Usuário ${userName} não tem mais conexões ativas`);
      }
    });

    // Handle join-game event (for backwards compatibility)
    socket.on('join-game', async () => {
      try {
        // For authenticated users, ensure they have a session
        if (userId) {
          let session = multiUserGameController.getUserSession(userId);

          if (!session) {
            // Create default session for authenticated users
            console.log(`🎯 Criando sessão automática para usuário ${userName}`);
            session = await multiUserGameController.createUserSession(userId);
          }

          // Send session-based game state
          const gameState = {
            status: session.gameStatus,
            participants: session.participants,
            currentQuestion: session.currentQuestion,
            currentParticipant: session.currentParticipant,
            session: {
              id: session.sessionId,
              config: session.config
            },
            totalParticipants: session.participants.length
          };
          socket.emit('game-state', gameState);
          console.log(`🎮 Estado da sessão enviado para ${userName}`);
        } else {
          // Send basic game state for anonymous users
          const gameState = {
            status: 'waiting',
            participants: [],
            currentQuestion: null,
            currentParticipant: null,
            session: null,
            totalParticipants: 0
          };
          socket.emit('game-state', gameState);
          console.log(`🎮 Estado básico enviado para usuário anônimo`);
        }
      } catch (error) {
        console.error('Erro ao processar join-game:', error);
        // Fallback to basic state
        const gameState = {
          status: 'waiting',
          participants: [],
          currentQuestion: null,
          currentParticipant: null,
          session: null,
          totalParticipants: 0
        };
        socket.emit('game-state', gameState);
      }
    });

    // Initial connection event
    socket.emit('connected', {
      userId,
      userName,
      userRole: socket.userRole,
      message: 'Conectado com sucesso ao Show do Melzão Multi-User!'
    });

    // Also emit initial game state
    const initialGameState = {
      status: 'waiting',
      participants: [],
      currentQuestion: null,
      currentParticipant: null,
      session: null
    };

    socket.emit('game-state', initialGameState);
  });

  // ========== HELPER FUNCTIONS ==========

  /**
   * Broadcast event to all sockets of a specific user
   */
  function broadcastToUser(userId, event, data) {
    const userSockets = multiUserGameController.getUserSockets(userId);
    userSockets.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
  }

  /**
   * Start question timer for user session
   */
  function startQuestionTimer(userId, timeLimit) {
    const session = multiUserGameController.getUserSession(userId);
    if (!session || !session.currentParticipant) return;

    multiUserGameController.setSessionTimer(userId, () => {
      // Time's up!
      const currentSession = multiUserGameController.getUserSession(userId);
      if (currentSession && currentSession.gameStatus === 'active') {
        console.log(`⏰ Tempo esgotado na sessão ${currentSession.sessionId}`);

        // Auto-submit wrong answer or quit game
        broadcastToUser(userId, 'time-up', {
          message: 'Tempo esgotado!',
          correctAnswer: currentSession.currentQuestion?.correctAnswer
        });

        // Force quit the game
        if (currentSession.currentParticipant) {
          multiUserGameController.quitGame(userId, currentSession.currentParticipant.id)
            .then(result => {
              broadcastToUser(userId, 'game-quit', {
                ...result,
                reason: 'timeout'
              });
            })
            .catch(error => {
              console.error('Erro ao forçar quit por timeout:', error);
            });
        }
      }
    }, timeLimit * 1000);

    // Notify about timer start
    broadcastToUser(userId, 'timer-started', {
      timeLimit,
      startedAt: new Date().toISOString()
    });
  }

  // Cleanup inactive sessions every 10 minutes
  setInterval(() => {
    const cleanedUp = multiUserGameController.cleanupInactiveSessions(30);
    if (cleanedUp > 0) {
      console.log(`🧹 ${cleanedUp} sessões inativas foram limpas`);
    }
  }, 10 * 60 * 1000);

  console.log('🎮 Multi-User Game Socket Handler initialized');
};