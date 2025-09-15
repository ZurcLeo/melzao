const { QuestionBank } = require('./questionBank');
const gameData = require('./gameData');

// Estado do jogo em memória + persistência
let gameState = {
  participants: [],
  currentParticipant: null,
  currentQuestion: null,
  questionIndex: 0,
  status: 'waiting', // 'waiting', 'active', 'finished'
  timer: null,
  usedQuestionIds: [], // Para evitar repetições na mesma sessão
  sessionId: null // ID da sessão atual no banco
};

// Função para limpar o timer atual
function clearCurrentTimer() {
  if (gameState.timer) {
    clearTimeout(gameState.timer);
    gameState.timer = null;
  }
}

// Substituído por questionBank.js - sistema dinâmico com 100 questões

class GameController {
  static async addParticipant(name) {
    const participant = {
      id: Date.now().toString(),
      name: name.trim(),
      currentLevel: 0,
      totalEarned: 0,
      status: 'waiting', // 'waiting', 'playing', 'eliminated', 'quit', 'winner'
      answers: [],
      joinedAt: new Date().toISOString()
    };

    gameState.participants.push(participant);

    // Criar sessão se não existir
    if (!gameState.sessionId) {
      gameState.sessionId = await gameData.createGameSession();
    }

    // Salvar participante no banco
    try {
      await gameData.saveParticipant(gameState.sessionId, participant);
    } catch (error) {
      console.error('Erro ao salvar participante no banco:', error);
    }

    console.log(`✅ Participante adicionado: ${name}`);
    return participant;
  }

  static startGame(participantId) {
    const participant = gameState.participants.find(p => p.id === participantId);
    if (!participant) throw new Error('Participante não encontrado');

    // Verificar se já existe um jogo ativo
    if (gameState.status === 'active') {
      throw new Error('Já existe um jogo em andamento');
    }

    // Garantir que todos os participantes estão em estado 'waiting'
    gameState.participants.forEach(p => {
      if (p.status === 'playing') {
        p.status = 'waiting';
      }
    });

    // Inicializar o jogo para o participante selecionado
    gameState.currentParticipant = participant;
    gameState.questionIndex = 0;
    gameState.status = 'active';
    participant.status = 'playing';

    // Reset do progresso do participante
    participant.currentLevel = 0;
    participant.totalEarned = 0;
    participant.answers = [];

    // Buscar primeira questão aleatória do nível 1
    const firstQuestion = QuestionBank.getRandomQuestionWithHistory(1, gameState.usedQuestionIds);
    gameState.currentQuestion = firstQuestion;
    gameState.usedQuestionIds.push(firstQuestion.id);

    console.log(`🎮 Jogo iniciado para: ${participant.name}`);
    return firstQuestion;
  }

  static async submitAnswer(participantId, answer) {
    const participant = gameState.participants.find(p => p.id === participantId);
    const question = gameState.currentQuestion;

    if (!participant || !question) {
      throw new Error('Participante ou pergunta não encontrada');
    }

    // Verificar se o participante está realmente jogando
    if (participant.id !== gameState.currentParticipant?.id || participant.status !== 'playing') {
      throw new Error('Participante não está autorizado a responder');
    }

    // Limpar timer atual quando resposta é submetida
    clearCurrentTimer();

    const isCorrect = answer === question.correctAnswer;

    const answerRecord = {
      questionId: question.id,
      question: question.question,
      selectedAnswer: answer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      honeyEarned: isCorrect ? question.honeyValue : 0,
      answeredAt: new Date().toISOString(),
      level: participant.currentLevel + 1
    };

    participant.answers.push(answerRecord);

    // Salvar resposta no banco
    try {
      await gameData.saveAnswer(gameState.sessionId, participantId, answerRecord);
    } catch (error) {
      console.error('Erro ao salvar resposta no banco:', error);
    }

    if (isCorrect) {
      participant.currentLevel++;
      participant.totalEarned += question.honeyValue;

      // Verificar se completou todos os 10 níveis
      if (participant.currentLevel >= 10) {
        participant.status = 'winner';
        gameState.status = 'waiting';
        gameState.currentParticipant = null;
        gameState.currentQuestion = null;

        // Atualizar participante no banco
        try {
          await gameData.updateParticipant(participantId, 'winner', participant.currentLevel, participant.totalEarned);
          await gameData.finishGameSession(gameState.sessionId, gameState.participants.length);
        } catch (error) {
          console.error('Erro ao atualizar dados no banco:', error);
        }

        console.log(`🏆 ${participant.name} ganhou o jogo!`);
        return {
          correct: true,
          completed: true,
          finalEarnings: participant.totalEarned,
          wonDragonTrophy: true
        };
      }

      // Próxima pergunta aleatória do próximo nível
      gameState.questionIndex = participant.currentLevel;
      const nextLevel = participant.currentLevel + 1;
      const nextQuestion = QuestionBank.getRandomQuestionWithHistory(nextLevel, gameState.usedQuestionIds);
      gameState.currentQuestion = nextQuestion;
      gameState.usedQuestionIds.push(nextQuestion.id);

      console.log(`✅ ${participant.name} acertou! Próxima pergunta: nível ${participant.currentLevel + 1}`);
      return {
        correct: true,
        nextQuestion,
        currentEarnings: participant.totalEarned
      };
    } else {
      // Errou - fica com 50%
      const finalEarnings = Math.floor(participant.totalEarned * 0.5);
      participant.totalEarned = finalEarnings;
      participant.status = 'eliminated';
      gameState.status = 'waiting';
      gameState.currentParticipant = null;
      gameState.currentQuestion = null;

      // Atualizar participante no banco
      try {
        await gameData.updateParticipant(participantId, 'eliminated', participant.currentLevel, finalEarnings);
        await gameData.finishGameSession(gameState.sessionId, gameState.participants.length);
      } catch (error) {
        console.error('Erro ao atualizar dados no banco:', error);
      }

      console.log(`❌ ${participant.name} errou! Ganhou 50%: ${finalEarnings} honey`);
      return {
        correct: false,
        finalEarnings,
        correctAnswer: question.correctAnswer
      };
    }
  }

  static async quitGame(participantId) {
    const participant = gameState.participants.find(p => p.id === participantId);
    if (!participant) throw new Error('Participante não encontrado');

    // Limpar timer atual quando jogo é encerrado
    clearCurrentTimer();

    participant.status = 'quit';
    gameState.status = 'waiting';
    gameState.currentParticipant = null;
    gameState.currentQuestion = null;

    // Atualizar participante no banco
    try {
      await gameData.updateParticipant(participantId, 'quit', participant.currentLevel, participant.totalEarned);
      await gameData.finishGameSession(gameState.sessionId, gameState.participants.length);
    } catch (error) {
      console.error('Erro ao atualizar dados no banco:', error);
    }

    console.log(`🚪 ${participant.name} desistiu com ${participant.totalEarned} honey`);
    return { finalEarnings: participant.totalEarned };
  }

  static getGameState() {
    return {
      ...gameState,
      totalParticipants: gameState.participants.length,
      rankings: this.getRankings()
    };
  }

  static getRankings() {
    return gameState.participants
      .sort((a, b) => b.totalEarned - a.totalEarned)
      .map((participant, index) => ({
        rank: index + 1,
        name: participant.name,
        totalEarned: participant.totalEarned,
        level: participant.currentLevel,
        status: participant.status,
        correctAnswers: participant.answers.filter(a => a.isCorrect).length
      }));
  }

  static async resetGame() {
    // Limpar timer atual antes de resetar
    clearCurrentTimer();

    // Finalizar sessão atual se existir
    if (gameState.sessionId) {
      try {
        await gameData.finishGameSession(gameState.sessionId, gameState.participants.length);
      } catch (error) {
        console.error('Erro ao finalizar sessão no banco:', error);
      }
    }

    gameState = {
      participants: [],
      currentParticipant: null,
      currentQuestion: null,
      questionIndex: 0,
      status: 'waiting',
      timer: null,
      usedQuestionIds: [],
      sessionId: null
    };
    console.log('🔄 Jogo resetado');
    return gameState;
  }

  static getQuestionStats() {
    return QuestionBank.getQuestionStats();
  }

  static getQuestionsByCategory(level, category) {
    return QuestionBank.getRandomQuestionsByCategory(level, category);
  }

  // Novos métodos para estatísticas persistidas
  static async getGameStats() {
    try {
      return await gameData.getGameStats();
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return null;
    }
  }

  static async getTopScores() {
    try {
      return await gameData.getTopScores();
    } catch (error) {
      console.error('Erro ao buscar top scores:', error);
      return [];
    }
  }

  static async getSessionReport(sessionId) {
    try {
      return await gameData.getSessionReport(sessionId);
    } catch (error) {
      console.error('Erro ao buscar relatório da sessão:', error);
      return null;
    }
  }

  static async getPersistentQuestionStats() {
    try {
      return await gameData.getQuestionStats();
    } catch (error) {
      console.error('Erro ao buscar estatísticas de perguntas:', error);
      return [];
    }
  }

  static async getGameSessions(limit = 50) {
    try {
      return await gameData.getGameSessions(limit);
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      return [];
    }
  }

  static async resetHistoryData() {
    try {
      await gameData.resetHistoryData();
      console.log('📊 Dados históricos resetados');
      return { success: true, message: 'Dados históricos resetados com sucesso' };
    } catch (error) {
      console.error('Erro ao resetar dados históricos:', error);
      throw error;
    }
  }

  // Método para definir um novo timer
  static setTimer(callback, delay) {
    clearCurrentTimer();
    gameState.timer = setTimeout(callback, delay);
  }

  // Método para verificar se há timer ativo
  static hasActiveTimer() {
    return gameState.timer !== null;
  }
}

// Exportar também a função clearCurrentTimer
module.exports = { GameController, clearCurrentTimer };