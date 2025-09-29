import React, { useState, useEffect } from 'react';
import { Play, Users, BarChart3, Settings, Crown, Timer, Trophy } from 'lucide-react';
import HistoryDashboard from './components/HistoryDashboard';
import AdminPanel from './components/AdminPanel';
import { Card, CardContent } from './components/ui/Card';
import { Button } from './components/ui/Button';
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
      // Reiniciar temporizador sempre que há uma nova pergunta
      setTimeLeft(gameState.currentQuestion.timeLimit || 30);
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
  }, [gameState?.currentQuestion?.id, gameState?.currentQuestion, gameState?.status, playSound]); // Mudança: usar currentQuestion.id para garantir reset

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

    const handleTimerStarted = (data: any) => {
      console.log('📨 Timer iniciado pelo servidor:', data);
      if (data.timeLimit) {
        setTimeLeft(data.timeLimit);
      }
    };

    socket.on('game-started', handleGameStarted);
    socket.on('error', handleError);
    socket.on('timer-started', handleTimerStarted);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('error', handleError);
      socket.off('timer-started', handleTimerStarted);
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

        // Se a resposta está correta e há próxima pergunta, resetar mais rápido
        const delay = result.correct && result.nextQuestion ? 1500 : 2000;

        setTimeout(() => {
          // Fase 3: Reset para próxima pergunta
          setAnswerState('idle');
          setLastAnswerResult(null);
          setSelectedAnswer('');
        }, delay);
      }
    };

    socket.on('answer-result', handleAnswerResult);
    return () => socket.off('answer-result', handleAnswerResult);
  }, [answerState, socket, playSound]);

  // Detect quando uma nova pergunta foi carregada para forçar reset de estado
  const [lastQuestionId, setLastQuestionId] = useState<number | null>(null);
  useEffect(() => {
    const currentQuestionId = gameState?.currentQuestion?.id;
    const currentQuestionText = gameState?.currentQuestion?.question;
    const currentQuestionLevel = gameState?.currentQuestion?.level;

    if (currentQuestionId && currentQuestionId !== lastQuestionId) {
      console.log('🔄 Nova pergunta detectada, resetando estado:', {
        old: lastQuestionId,
        new: currentQuestionId,
        level: currentQuestionLevel,
        question: currentQuestionText
      });
      setLastQuestionId(currentQuestionId);
      // Reset IMEDIATO do estado para nova pergunta (ignora timeout pendente)
      setAnswerState('idle');
      setLastAnswerResult(null);
      setSelectedAnswer('');

      // Tocar som de nova pergunta
      playSound('processing');
    }
  }, [gameState?.currentQuestion?.id, gameState?.currentQuestion?.question, gameState?.currentQuestion?.level, lastQuestionId, playSound]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <Card variant="glass" padding="lg">
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-600 rounded-full flex items-center justify-center">
                <Trophy className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Show do Melzão</h1>
                <p className="text-gray-300">Dashboard Interativo do Quiz LGBT+</p>
              </div>
            </div>

            {/* Status Info */}
            <div className="text-right">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    gameState?.status === 'active' ? 'bg-green-400 animate-pulse' :
                    gameState?.status === 'waiting' ? 'bg-yellow-400' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-gray-300">
                    Status: <span className="text-white font-semibold">
                      {gameState?.status === 'active' ? 'Ativo' :
                       gameState?.status === 'waiting' ? 'Aguardando' : 'Inativo'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-blue-400" />
                  <span className="text-gray-300">
                    Participantes: <span className="text-white font-semibold">{gameState?.totalParticipants || 0}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-white/20 mb-6 bg-black/20 rounded-t-xl p-1">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setCurrentView('live')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 min-w-[140px] justify-center ${
                  currentView === 'live'
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-102'
                }`}
              >
                <Play size={16} />
                Ao Vivo
              </button>
              <button
                onClick={() => setCurrentView('history')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 min-w-[140px] justify-center ${
                  currentView === 'history'
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-102'
                }`}
              >
                <BarChart3 size={16} />
                Histórico
              </button>
              {window.currentUser && window.currentUser.role === 'admin' && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 min-w-[140px] justify-center ${
                    currentView === 'admin'
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-102'
                  }`}
                >
                  <Crown size={16} />
                  Admin
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
          {/* Adicionar Participante */}
          {(gameState.status === 'waiting' || (window.currentUser && window.currentUser.role === 'admin')) && (
            <Card variant="glass" padding="lg">
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Adicionar Participante
                    </h2>
                    {window.currentUser && window.currentUser.role === 'admin' && gameState.status !== 'waiting' && (
                      <p className="text-yellow-400 text-sm">(Admin Override Ativo)</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={participantName}
                    onChange={(e) => {
                      setParticipantName(e.target.value);
                      console.log('📝 Input alterado:', e.target.value);
                    }}
                    placeholder="Digite o nome do participante..."
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addParticipant();
                      }
                    }}
                    autoComplete="off"
                  />
                  <Button
                    onClick={addParticipant}
                    disabled={!participantName.trim()}
                    variant="primary"
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Participantes */}
          {gameState.participants && gameState.participants.length > 0 && (
            <Card variant="glass" padding="lg">
              <CardContent>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Users className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Participantes</h2>
                    <p className="text-gray-300">{gameState.participants.length} jogador(es) registrado(s)</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {gameState.participants.map((participant: any) => (
                    <div
                      key={participant.id}
                      className={`flex justify-between items-center p-4 rounded-xl border-l-4 transition-all duration-200 ${
                        participant.status === 'playing' ? 'bg-blue-600/20 border-blue-400 shadow-blue-500/20 shadow-lg' :
                        participant.status === 'winner' ? 'bg-green-600/20 border-green-400 shadow-green-500/20 shadow-lg' :
                        participant.status === 'eliminated' ? 'bg-red-600/20 border-red-400' :
                        participant.status === 'quit' ? 'bg-yellow-600/20 border-yellow-400' :
                        'bg-white/10 border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          participant.status === 'playing' ? 'bg-blue-500' :
                          participant.status === 'winner' ? 'bg-green-500' :
                          participant.status === 'eliminated' ? 'bg-red-500' :
                          participant.status === 'quit' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}>
                          {participant.status === 'playing' ? '🎮' :
                           participant.status === 'winner' ? '🏆' :
                           participant.status === 'eliminated' ? '❌' :
                           participant.status === 'quit' ? '⏸️' : '👤'}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg">{participant.name}</div>
                          <div className="text-sm text-gray-300 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Trophy size={14} className="text-orange-400" />
                              Nível {participant.currentLevel}
                            </span>
                            <span className="flex items-center gap-1">
                              🍯 {participant.totalEarned}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              participant.status === 'playing' ? 'bg-blue-500/30 text-blue-200' :
                              participant.status === 'winner' ? 'bg-green-500/30 text-green-200' :
                              participant.status === 'eliminated' ? 'bg-red-500/30 text-red-200' :
                              participant.status === 'quit' ? 'bg-yellow-500/30 text-yellow-200' :
                              'bg-gray-500/30 text-gray-200'
                            }`}>
                              {participant.status === 'playing' ? 'Jogando' :
                               participant.status === 'winner' ? 'Vencedor' :
                               participant.status === 'eliminated' ? 'Eliminado' :
                               participant.status === 'quit' ? 'Desistiu' : 'Aguardando'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {gameState.status === 'waiting' && participant.status === 'waiting' && (
                        <Button
                          onClick={() => startGame(participant.id)}
                          disabled={gameStarting === participant.id}
                          variant={gameStarting === participant.id ? 'secondary' : 'primary'}
                          className={`${
                            gameStarting === participant.id
                              ? 'bg-orange-600 text-white animate-pulse cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                          icon={gameStarting === participant.id ? <Timer size={16} /> : <Play size={16} />}
                        >
                          {gameStarting === participant.id ? 'Iniciando...' : 'Iniciar Jogo'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pergunta Atual */}
          {gameState.status === 'active' && gameState.currentQuestion && (
            <Card variant="glass" padding="lg">
              <CardContent>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      answerState === 'processing'
                        ? 'bg-orange-500 animate-pulse'
                        : 'bg-gradient-to-br from-pink-500 to-red-600'
                    }`}>
                      🎯
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold transition-all duration-300 ${
                        answerState === 'processing'
                          ? 'text-orange-400 animate-pulse'
                          : 'text-white'
                      }`}>
                        Pergunta {gameState.currentQuestion.level}/10
                      </h2>
                      {answerState === 'processing' && (
                        <p className="text-orange-400 text-sm animate-pulse">Processando resposta...</p>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-300 ${
                    answerState === 'processing'
                      ? 'bg-orange-600 text-white animate-pulse'
                      : timeLeft > 10 ? 'bg-green-500 text-white' :
                      timeLeft > 5 ? 'bg-yellow-600 text-white' : 'bg-red-500 text-white animate-pulse'
                  }`}>
                    <Timer size={18} />
                    {timeLeft}s
                  </div>
                </div>

                {/* Resultado da Resposta */}
                {answerState === 'revealing' && lastAnswerResult && (
                  <div className={`text-center mb-6 p-6 rounded-xl border-2 transition-all duration-300 ${
                    lastAnswerResult.correct
                      ? 'bg-green-600/20 border-green-400 text-green-100 animate-bounce shadow-green-500/20 shadow-lg'
                      : 'bg-red-600/20 border-red-400 text-red-100 animate-bounce shadow-red-500/20 shadow-lg'
                  }`}>
                    <div className="text-4xl font-bold mb-3">
                      {lastAnswerResult.correct ? '✅ CORRETO!' : '❌ INCORRETO!'}
                    </div>
                    {!lastAnswerResult.correct && lastAnswerResult.correctAnswer && (
                      <div className="text-xl">
                        Resposta correta: <strong>{lastAnswerResult.correctAnswer}</strong>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white/10 p-6 rounded-xl mb-6">
                  <div className="text-white text-xl leading-relaxed">
                    {gameState.currentQuestion.question}
                  </div>
                </div>

                <div className="grid gap-3 mb-6">
                  {gameState.currentQuestion.options.map((option: string, index: number) => {
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
                        className={`w-full text-left p-4 rounded-xl transition-all duration-300 border-2 font-medium ${
                          isCorrectAnswer
                            ? 'bg-green-600/30 border-green-400 text-green-100 shadow-lg shadow-green-400/30 scale-105 animate-pulse'
                            : isWrongSelected
                            ? 'bg-red-600/30 border-red-400 text-red-100 shadow-lg shadow-red-400/30 animate-pulse'
                            : isSelected && answerState === 'processing'
                            ? 'bg-orange-600/30 border-orange-400 text-orange-100 animate-pulse'
                            : isSelected
                            ? 'bg-blue-600/30 border-blue-400 text-blue-100 shadow-lg shadow-blue-400/20'
                            : answerState !== 'idle'
                            ? 'bg-gray-800/50 border-gray-600 text-gray-500 cursor-not-allowed'
                            : 'bg-white/10 border-white/20 text-gray-200 hover:bg-white/20 hover:border-white/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isCorrectAnswer ? 'bg-green-500' :
                            isWrongSelected ? 'bg-red-500' :
                            isSelected ? 'bg-blue-500' : 'bg-gray-600'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="flex-1">{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3 mb-6">
                  {/* Botões para quando o participante está aguardando decisão do host */}
                  {gameState.currentParticipant?.status === 'awaiting_host_decision' ? (
                    <>
                      <Button
                        onClick={() => window.dispatchEvent(new CustomEvent('host-action', { detail: { action: 'continue_to_next_question' } }))}
                        variant="primary"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-3"
                      >
                        ➡️ Próxima Pergunta
                      </Button>
                      <Button
                        onClick={() => window.dispatchEvent(new CustomEvent('host-action', { detail: { action: 'force_quit_participant' } }))}
                        variant="secondary"
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-6 py-3"
                      >
                        💰 Parar e Levar
                      </Button>
                    </>
                  ) : (
                    /* Botões normais do jogo */
                    <>
                      <Button
                        onClick={submitAnswer}
                        disabled={!selectedAnswer || answerState !== 'idle'}
                        variant="primary"
                        className={`flex-1 py-3 font-bold transition-all duration-300 ${
                          answerState === 'processing'
                            ? 'bg-orange-600 text-white animate-pulse cursor-not-allowed'
                            : answerState === 'revealing'
                            ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                            : selectedAnswer
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {answerState === 'processing'
                          ? '⏳ Processando...'
                          : answerState === 'revealing'
                          ? '📊 Resultado'
                          : '✅ Confirmar Resposta'
                        }
                      </Button>
                      <Button
                        onClick={quitGame}
                        disabled={answerState !== 'idle'}
                        variant="secondary"
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🚪 Desistir
                      </Button>
                    </>
                  )}
                </div>

                {gameState.currentParticipant?.status === 'awaiting_host_decision' ? (
                  <div className="text-center bg-gradient-to-r from-green-600/20 to-blue-600/20 p-6 rounded-xl border border-green-400/30">
                    <div className="bg-green-600 text-white p-4 rounded-xl mb-3 font-bold text-lg shadow-lg">
                      ✅ RESPOSTA CORRETA!
                    </div>
                    <div className="text-yellow-400 font-bold text-lg">
                      🤝 Aguardando decisão do host: continuar ou parar?
                    </div>
                  </div>
                ) : (
                  <div className="text-center bg-gradient-to-r from-yellow-600/20 to-orange-600/20 p-4 rounded-xl border border-yellow-400/30">
                    <div className="text-yellow-400 font-bold text-xl">
                      💰 Prêmio: {gameState.currentQuestion.honeyValue} Honey
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rankings */}
          {gameState.rankings && gameState.rankings.length > 0 && (
            <Card variant="glass" padding="lg">
              <CardContent>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Trophy className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Rankings</h2>
                    <p className="text-gray-300">Top {gameState.rankings.slice(0, 5).length} melhores jogadores</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {gameState.rankings.slice(0, 5).map((rank: any) => (
                    <div
                      key={rank.name}
                      className="flex justify-between items-center p-4 bg-white/10 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                          rank.rank === 1 ? 'bg-yellow-500' :
                          rank.rank === 2 ? 'bg-gray-400' :
                          rank.rank === 3 ? 'bg-orange-600' :
                          'bg-blue-500'
                        }`}>
                          {rank.rank === 1 ? '🥇' : rank.rank === 2 ? '🥈' : rank.rank === 3 ? '🥉' : '🔸'}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{rank.name}</div>
                          <div className="text-xs text-gray-400">Posição #{rank.rank}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold text-lg">{rank.totalEarned} 🍯</div>
                        <div className="text-xs text-gray-400">Nível {rank.level}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Controles do Host */}
          <Card variant="glass" padding="lg">
            <CardContent>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Settings className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Controles do Host</h2>
                  <p className="text-gray-300">Gerenciar sessão e dados do jogo</p>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={resetGame}
                  variant="secondary"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 font-bold"
                >
                  🔄 Resetar Sessão Atual
                </Button>
                <Button
                  onClick={resetHistory}
                  variant="secondary"
                  className="w-full bg-red-800 hover:bg-red-900 text-white py-3 font-bold border-red-600"
                >
                  🗑️ Resetar Dados Históricos
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default HostDashboard;