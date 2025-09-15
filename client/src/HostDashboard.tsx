import React, { useState, useEffect } from 'react';
import HistoryDashboard from './components/HistoryDashboard';

interface HostDashboardProps {
  socket: any;
  gameState: any;
}

type DashboardView = 'live' | 'history';

const HostDashboard: React.FC<HostDashboardProps> = ({ socket, gameState }) => {
  const [participantName, setParticipantName] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentView, setCurrentView] = useState<DashboardView>('live');

  // Timer para resposta
  useEffect(() => {
    if (gameState?.status === 'active' && gameState.currentQuestion) {
      setTimeLeft(30);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState?.currentQuestion, gameState?.status]);

  const addParticipant = () => {
    if (participantName.trim()) {
      socket.emit('add-participant', participantName.trim());
      setParticipantName('');
    }
  };

  const startGame = (participantId: string) => {
    socket.emit('start-game', participantId);
  };

  const submitAnswer = () => {
    if (selectedAnswer && gameState.currentParticipant) {
      socket.emit('submit-answer', {
        participantId: gameState.currentParticipant.id,
        answer: selectedAnswer
      });
      setSelectedAnswer('');
    }
  };

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
</div>
      </div>

      {/* Conteúdo baseado na visualização atual */}
      {currentView === 'history' ? (
        <HistoryDashboard />
      ) : (
        <>
      {/* Adicionar Participante */}
      {gameState.status === 'waiting' && (
        <div className="card mb-4">
          <h2 className="text-lg font-bold text-white mb-4">👥 Adicionar Participante</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Nome do participante"
              className="input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
            />
            <button
              onClick={addParticipant}
              className="btn btn-primary px-4 py-2"
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
                    className="btn btn-success text-sm"
                  >
                    ▶️ Iniciar
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
            <h2 className="text-lg font-bold text-white">
              🎯 Pergunta {gameState.currentQuestion.level}/10
            </h2>
            <div className={`px-3 py-1 rounded text-white font-bold ${
              timeLeft > 10 ? 'bg-green-500' :
              timeLeft > 5 ? 'bg-yellow-700' : 'bg-red-500'
            }`}>
              ⏰ {timeLeft}s
            </div>
          </div>

          <div className="text-white mb-4 text-lg">
            {gameState.currentQuestion.question}
          </div>

          <div className="space-y-2 mb-4">
            {gameState.currentQuestion.options.map((option: string) => (
              <button
                key={option}
                onClick={() => setSelectedAnswer(option)}
                className={`btn w-full text-left p-3 ${
                  selectedAnswer === option
                    ? 'btn-primary'
                    : 'bg-gray-700 text-gray-300'
                }`}
                style={{display: 'block'}}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={submitAnswer}
              disabled={!selectedAnswer}
              className={`btn flex-1 py-2 font-bold ${
                selectedAnswer ? 'btn-success' : 'disabled'
              }`}
            >
              ✅ Confirmar Resposta
            </button>
            <button
              onClick={quitGame}
              className="btn btn-warning px-4 py-2"
            >
              🚪 Desistir
            </button>
          </div>

          <div className="text-center text-yellow-400 font-bold">
            💰 Prêmio: {gameState.currentQuestion.honeyValue} Honey
          </div>
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