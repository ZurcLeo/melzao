import React, { useState, useEffect } from 'react';
import HistoryDashboard from './components/HistoryDashboard';
import AdminPanel from './components/AdminPanel';
import { useSounds } from './hooks/useSounds';

interface HostDashboardProps {
  socket: any;
  gameState: any;
  offlineMode?: boolean;
}

type DashboardView = 'live' | 'history' | 'admin';
type AnswerState = 'idle' | 'processing' | 'revealing';

const HostDashboard: React.FC<HostDashboardProps> = ({ socket, gameState, offlineMode = false }) => {
  const [participantName, setParticipantName] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentView, setCurrentView] = useState<DashboardView>('live');
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [lastAnswerResult, setLastAnswerResult] = useState<{correct: boolean, correctAnswer?: string} | null>(null);
  const [gameStarting, setGameStarting] = useState<string | null>(null); // Track which participant is starting


  // Sistema de sons integrado
  const { playSound } = useSounds();

  // Timer para resposta com som de alerta
  useEffect(() => {
    if (gameState?.status === 'active' && gameState.currentQuestion) {
      setTimeLeft(30);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === 6) {
            playSound('timeWarning'); // Som de alerta aos 5 segundos
          }
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState?.currentQuestion, gameState?.status, playSound]);

  // Reset answerState quando nova pergunta começar
  useEffect(() => {
    if (gameState?.currentQuestion) {
      setAnswerState('idle');
      setLastAnswerResult(null);
    }
  }, [gameState?.currentQuestion]);

  // Clear loading state when game actually starts or when status changes
  useEffect(() => {
    if (gameState?.status === 'active' && gameState?.currentQuestion) {
      console.log('🎮 Jogo efetivamente iniciado, limpando estado de loading');
      setGameStarting(null);
    }
  }, [gameState?.status, gameState?.currentQuestion]);

  // Listen for game events to provide better feedback
  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data: any) => {
      console.log('📨 Recebido game-started:', data);
      setGameStarting(null); // Clear loading state
    };

    const handleError = (error: any) => {
      console.error('📨 Recebido erro:', error);
      setGameStarting(null); // Clear loading state on error
    };

    socket.on('game-started', handleGameStarted);
    socket.on('error', handleError);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('error', handleError);
    };
  }, [socket]);

  const addParticipant = () => {
    if (participantName.trim()) {
      console.log('🎭 Adicionando participante:', participantName.trim());
      socket.emit('add-participant', { name: participantName.trim() });
      setParticipantName('');
    } else {
      console.warn('⚠️ Nome do participante está vazio');
    }
  };

  const startGame = (participantId: string) => {
    console.log('🎮 Iniciando jogo para participante:', participantId);
    console.log('🎮 Estado atual do jogo:', gameState);

    if (!socket) {
      console.error('❌ Socket não disponível');
      return;
    }

    setGameStarting(participantId); // Set loading state
    socket.emit('start-game', { participantId });
    playSound('gameStart'); // Som de início do jogo

    console.log('📤 Evento start-game enviado para o servidor');
  };

  const submitAnswer = () => {
    if (selectedAnswer && gameState.currentParticipant && answerState === 'idle') {
      // Fase 1: Processing (criar tensão)
      setAnswerState('processing');
      playSound('processing'); // Som de tensão

      // Enviar resposta para o servidor
      socket.emit('submit-answer', {
        participantId: gameState.currentParticipant.id,
        answer: selectedAnswer
      });

      // Não limpar selectedAnswer ainda - será usado para animação
    }
  };

  // Listener para resultado da resposta com sons
  useEffect(() => {
    const handleAnswerResult = (result: any) => {
      if (answerState === 'processing') {
        // Fase 2: Revealing (mostrar resultado)
        setLastAnswerResult({
          correct: result.correct,
          correctAnswer: result.correctAnswer
        });
        setAnswerState('revealing');

        // Sons são tocados pelo ShowDoMelzao.tsx para evitar duplicação
        // A lógica de sons foi movida para lá para melhor controle

        setTimeout(() => {
          // Fase 3: Reset para próxima pergunta
          setAnswerState('idle');
          setLastAnswerResult(null);
          setSelectedAnswer('');
        }, 2000); // Tempo para mostrar o resultado
      }
    };

    socket.on('answer-result', handleAnswerResult);
    return () => socket.off('answer-result', handleAnswerResult);
  }, [answerState, socket, playSound]);

  const quitGame = () => {
    if (gameState.currentParticipant && window.confirm('Tem certeza que quer desistir?')) {
      socket.emit('quit-game', gameState.currentParticipant.id);
    }
  };

  const resetGame = () => {
    if (window.confirm('Resetar a sessão atual? Todos os dados da sessão atual serão perdidos.')) {
      socket.emit('reset-game');
    }
  };

  const resetHistory = () => {
    if (window.confirm('Resetar TODOS os dados históricos? Esta ação não pode ser desfeita e removerá permanentemente todas as sessões, participantes e respostas já salvas no banco de dados.')) {
      socket.emit('reset-history');
    }
  };

  // Modo Offline - importar ShowDoMelzao dinamicamente
  if (offlineMode) {
    const ShowDoMelzao = require('./ShowDoMelzao').default;
    return <ShowDoMelzao />;
  }

  if (!gameState) {
    return (
      <div className="flex items-center min-h-screen" style={{justifyContent: 'center'}}>
        <div className="text-white text-center">
          <div className="animate-spin rounded" style={{
            width: '128px', height: '128px', border: '2px solid transparent',
            borderBottomColor: 'white', borderRadius: '50%', margin: '0 auto 16px'
          }}></div>
          <p>Carregando Show do Melzão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="card header mb-4 p-4">
        <h1 className="text-2xl font-bold mb-2">🍯 Show do Melzão</h1>
        <p className="opacity-90 mb-2">Dashboard do Leo 🍀</p>
        <div className="text-sm mb-4">
  Status: <strong className="font-semibold">{gameState.status}</strong> |
  Participantes: <strong className="font-semibold">{gameState.totalParticipants}</strong>
</div>

{/* Navigation */}
<div className="flex gap-2 mt-4">
  <button
    onClick={() => setCurrentView('live')}
    className={`btn px-4 py-2 ${currentView === 'live' ? 'btn-primary' : 'bg-gray-600'}`}
  >
    🔴 Ao Vivo
  </button>
  <button
    onClick={() => setCurrentView('history')}
    className={`btn px-4 py-2 ${currentView === 'history' ? 'btn-primary' : 'bg-gray-600'}`}
  >
    📊 Dados Históricos
  </button>
  {window.currentUser && window.currentUser.role === 'admin' && (
    <button
      onClick={() => setCurrentView('admin')}
      className={`btn px-4 py-2 ${currentView === 'admin' ? 'btn-primary' : 'bg-gray-600'}`}
    >
      👑 Admin
    </button>
  )}
</div>
      </div>

      {/* Conteúdo baseado na visualização atual */}
      {currentView === 'history' ? (
        <HistoryDashboard />
      ) : currentView === 'admin' ? (
        <AdminPanel
          currentUser={window.currentUser}
          authToken={window.authToken || localStorage.getItem('authToken') || ''}
        />
      ) : (
        <>
      {/* Adicionar Participante - Admin sempre pode, outros apenas quando waiting */}
      {(gameState.status === 'waiting' || (window.currentUser && window.currentUser.role === 'admin')) && (
        <div className="card mb-4">
          <h2 className="text-lg font-bold text-white mb-4">
            👥 Adicionar Participante
            {window.currentUser && window.currentUser.role === 'admin' && gameState.status !== 'waiting' && (
              <span className="text-sm text-yellow-400 ml-2">(Admin Override)</span>
            )}
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={participantName}
              onChange={(e) => {
                setParticipantName(e.target.value);
                console.log('📝 Input alterado:', e.target.value);
              }}
              placeholder="Nome do participante"
              className="input flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addParticipant();
                }
              }}
              autoComplete="off"
            />
            <button
              onClick={addParticipant}
              disabled={!participantName.trim()}
              className="btn btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➕
            </button>
          </div>
        </div>
      )}

      {/* Lista de Participantes */}
      {gameState.participants && gameState.participants.length > 0 && (
        <div className="card mb-4">
          <h2 className="text-lg font-bold text-white mb-4">📋 Participantes</h2>
          <div className="space-y-2">
            {gameState.participants.map((participant: any) => (
              <div
                key={participant.id}
                className={`flex justify-between items-center p-3 rounded border-l-4 ${
                  participant.status === 'playing' ? 'bg-blue-700 border-blue-400' :
                  participant.status === 'winner' ? 'bg-green-700 border-green-400' :
                  participant.status === 'eliminated' ? 'bg-red-700 border-red-400' :
                  participant.status === 'quit' ? 'bg-yellow-700 border-yellow-400' :
                  'bg-gray-700 border-gray-500'
                }`}
              >
                <div>
                  <div className="text-white font-semibold">{participant.name}</div>
                  <div className="text-sm text-gray-300">
                    Nível {participant.currentLevel} | {participant.totalEarned} 🍯
                  </div>
                </div>
                {gameState.status === 'waiting' && participant.status === 'waiting' && (
                  <button
                    onClick={() => startGame(participant.id)}
                    disabled={gameStarting === participant.id}
                    className={`btn text-sm ${
                      gameStarting === participant.id
                        ? 'bg-orange-600 text-white animate-pulse cursor-not-allowed'
                        : 'btn-success'
                    }`}
                  >
                    {gameStarting === participant.id ? (
                      <>⏳ Iniciando...</>
                    ) : (
                      <>▶️ Iniciar</>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pergunta Atual */}
      {gameState.status === 'active' && gameState.currentQuestion && (
        <div className="card mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-bold transition-all duration-300 ${
              answerState === 'processing'
                ? 'text-orange-400 animate-pulse'
                : 'text-white'
            }`}>
              🎯 Pergunta {gameState.currentQuestion.level}/10
              {answerState === 'processing' && ' - Processando...'}
            </h2>
            <div className={`px-3 py-1 rounded text-white font-bold transition-all duration-300 ${
              answerState === 'processing'
                ? 'bg-orange-600 animate-pulse'
                : timeLeft > 10 ? 'bg-green-500' :
                timeLeft > 5 ? 'bg-yellow-700' : 'bg-red-500'
            }`}>
              ⏰ {timeLeft}s
            </div>
          </div>

          {/* Resultado da Resposta */}
          {answerState === 'revealing' && lastAnswerResult && (
            <div className={`text-center mb-4 p-4 rounded-lg border-2 transition-all duration-300 ${
              lastAnswerResult.correct
                ? 'bg-green-900 border-green-400 text-green-100 animate-bounce'
                : 'bg-red-900 border-red-400 text-red-100 animate-bounce'
            }`}>
              <div className="text-3xl font-bold mb-2">
                {lastAnswerResult.correct ? '✅ CORRETO!' : '❌ INCORRETO!'}
              </div>
              {!lastAnswerResult.correct && lastAnswerResult.correctAnswer && (
                <div className="text-xl">
                  Resposta correta: <strong>{lastAnswerResult.correctAnswer}</strong>
                </div>
              )}
            </div>
          )}

          <div className="text-white mb-4 text-lg">
            {gameState.currentQuestion.question}
          </div>

          <div className="space-y-2 mb-4">
            {gameState.currentQuestion.options.map((option: string) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = answerState === 'revealing' &&
                lastAnswerResult && option === lastAnswerResult.correctAnswer;
              const isWrongSelected = answerState === 'revealing' &&
                lastAnswerResult && !lastAnswerResult.correct && isSelected;

              return (
                <button
                  key={option}
                  onClick={() => answerState === 'idle' && setSelectedAnswer(option)}
                  disabled={answerState !== 'idle'}
                  className={`btn w-full text-left p-3 transition-all duration-300 ${
                    isCorrectAnswer
                      ? 'bg-green-600 text-white border-2 border-green-400 animate-pulse shadow-lg shadow-green-400/50 scale-105'
                      : isWrongSelected
                      ? 'bg-red-600 text-white border-2 border-red-400 animate-pulse shadow-lg shadow-red-400/50'
                      : isSelected && answerState === 'processing'
                      ? 'bg-orange-600 text-white animate-pulse'
                      : isSelected
                      ? 'btn-primary'
                      : answerState !== 'idle'
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={{display: 'block'}}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mb-4">
            {/* Botões para quando o participante está aguardando decisão do host */}
            {gameState.currentParticipant?.status === 'awaiting_host_decision' ? (
              <>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('host-action', { detail: { action: 'continue_to_next_question' } }))}
                  className="btn btn-success flex-1 py-2 font-bold text-lg"
                >
                  ➡️ Próxima Pergunta
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('host-action', { detail: { action: 'force_quit_participant' } }))}
                  className="btn btn-warning px-4 py-2 font-bold"
                >
                  💰 Parar e Levar
                </button>
              </>
            ) : (
              /* Botões normais do jogo */
              <>
                <button
                  onClick={submitAnswer}
                  disabled={!selectedAnswer || answerState !== 'idle'}
                  className={`btn flex-1 py-2 font-bold transition-all duration-300 ${
                    answerState === 'processing'
                      ? 'bg-orange-600 text-white animate-pulse cursor-not-allowed'
                      : answerState === 'revealing'
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : selectedAnswer
                      ? 'btn-success hover:bg-green-700'
                      : 'disabled'
                  }`}
                >
                  {answerState === 'processing'
                    ? '⏳ Processando...'
                    : answerState === 'revealing'
                    ? '📊 Resultado'
                    : '✅ Confirmar Resposta'
                  }
                </button>
                <button
                  onClick={quitGame}
                  disabled={answerState !== 'idle'}
                  className="btn btn-warning px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚪 Desistir
                </button>
              </>
            )}
          </div>

          {gameState.currentParticipant?.status === 'awaiting_host_decision' ? (
            <div className="text-center">
              <div className="bg-green-600 text-white p-3 rounded-lg mb-2 font-bold">
                ✅ RESPOSTA CORRETA!
              </div>
              <div className="text-yellow-400 font-bold">
                🤝 Aguardando decisão do host: continuar ou parar?
              </div>
            </div>
          ) : (
            <div className="text-center text-yellow-400 font-bold">
              💰 Prêmio: {gameState.currentQuestion.honeyValue} Honey
            </div>
          )}
        </div>
      )}

      {/* Rankings */}
      {gameState.rankings && gameState.rankings.length > 0 && (
        <div className="card mb-4 p-4">
          <h2 className="text-lg font-bold text-white mb-4">🏆 Rankings</h2>
          <div className="space-y-2">
            {gameState.rankings.slice(0, 5).map((rank: any) => (
              <div
                key={rank.name}
                className="flex justify-between items-center p-3 bg-gray-700 rounded" // Adicione padding aqui
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {rank.rank === 1 ? '🥇' : rank.rank === 2 ? '🥈' : rank.rank === 3 ? '🥉' : '🔸'}
                  </span>
                  <span className="text-white">{rank.name}</span>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div className="text-yellow-400 font-bold">{rank.totalEarned} 🍯</div>
                  <div className="text-xs text-gray-400">Nível {rank.level}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controles do Host */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">⚙️ Controles</h2>
        <div className="space-y-3">
          <button
            onClick={resetGame}
            className="btn btn-danger w-full py-2 font-bold"
          >
            🔄 Resetar Sessão Atual
          </button>
          <button
            onClick={resetHistory}
            className="btn btn-danger w-full py-2 font-bold"
            style={{backgroundColor: '#8B0000', borderColor: '#8B0000'}}
          >
            🗑️ Resetar Dados Históricos
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default HostDashboard;