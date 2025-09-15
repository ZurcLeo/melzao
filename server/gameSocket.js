const { GameController } = require('./gameController');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Usuário conectado: ${socket.id}`);

    // Entrar na sala do jogo
    socket.on('join-game', () => {
      socket.join('game-room');
      socket.emit('game-state', GameController.getGameState());
      console.log(`👥 ${socket.id} entrou na sala do jogo`);
    });

    // Adicionar participante
    socket.on('add-participant', async (name) => {
      try {
        if (!name || name.trim() === '') {
          socket.emit('error', 'Nome é obrigatório');
          return;
        }

        const participant = await GameController.addParticipant(name);
        io.to('game-room').emit('participant-added', participant);
        io.to('game-room').emit('game-state', GameController.getGameState());
      } catch (error) {
        socket.emit('error', error.message);
      }
    });

    // Iniciar jogo
    socket.on('start-game', (participantId) => {
      try {
        const firstQuestion = GameController.startGame(participantId);
        const gameState = GameController.getGameState();

        // Emitir eventos de atualização para todos
        io.to('game-room').emit('game-started', {
          participant: gameState.currentParticipant,
          question: firstQuestion
        });
        io.to('game-room').emit('game-state', gameState);

        // Timer de 30 segundos para responder usando o GameController
        GameController.setTimer(() => {
          if (GameController.getGameState().status === 'active') {
            io.to('game-room').emit('time-up');
            // Auto-desistir se não respondeu
            try {
              GameController.quitGame(participantId);
              io.to('game-room').emit('game-state', GameController.getGameState());
            } catch (err) {
              console.log('Timer expirou mas jogo já terminou');
            }
          }
        }, 30000);
      } catch (error) {
        socket.emit('error', error.message);
      }
    });

    // Submeter resposta
    socket.on('submit-answer', async ({ participantId, answer }) => {
      try {
        const result = await GameController.submitAnswer(participantId, answer);
        const gameState = GameController.getGameState();

        io.to('game-room').emit('answer-result', result);
        io.to('game-room').emit('game-state', gameState);

        // Se tem próxima pergunta, iniciar timer
        if (result.nextQuestion && gameState.status === 'active') {
          GameController.setTimer(async () => {
            if (GameController.getGameState().status === 'active') {
              io.to('game-room').emit('time-up');
              // Auto-desistir se não respondeu
              try {
                await GameController.quitGame(participantId);
                io.to('game-room').emit('game-state', GameController.getGameState());
              } catch (err) {
                console.log('Timer expirou mas jogo já terminou');
              }
            }
          }, 30000);
        }
      } catch (error) {
        socket.emit('error', error.message);
      }
    });

    // Desistir do jogo
    socket.on('quit-game', async (participantId) => {
      try {
        const result = await GameController.quitGame(participantId);
        const gameState = GameController.getGameState();

        io.to('game-room').emit('game-ended', { ...result, type: 'quit' });
        io.to('game-room').emit('game-state', gameState);
      } catch (error) {
        socket.emit('error', error.message);
      }
    });

    // Reset do jogo
    socket.on('reset-game', async () => {
      try {
        const newState = await GameController.resetGame();
        io.to('game-room').emit('game-reset', newState);
        io.to('game-room').emit('game-state', newState);
      } catch (error) {
        socket.emit('error', error.message);
      }
    });

    // Reset dos dados históricos
    socket.on('reset-history', async () => {
      try {
        const result = await GameController.resetHistoryData();
        io.to('game-room').emit('history-reset', result);
      } catch (error) {
        socket.emit('error', error.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Usuário desconectado: ${socket.id}`);
    });
  });
};