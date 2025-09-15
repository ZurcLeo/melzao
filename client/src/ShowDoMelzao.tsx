import React, { useState } from 'react';
import { Trophy, Clock, Users, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

interface Response {
  questionNumber: number;
  questionCode: string;
  isCorrect: boolean | null;
  value: number;
  timestamp: string;
}

interface Participant {
  id: number;
  name: string;
  currentQuestion: number;
  totalEarned: number;
  status: 'waiting' | 'playing' | 'finished' | 'eliminated';
  skipsUsed: number;
  helpUsed: boolean;
  responses: Response[];
}

type GameState = 'registration' | 'playing' | 'finished';

const ShowDoMelzao = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [gameState, setGameState] = useState<GameState>('registration');
  const [currentQuestion, setCurrentQuestion] = useState(1);

  // Valores das perguntas por nível
  const questionValues: Record<number, number> = {
    1: 50, 2: 100, 3: 200,           // Fáceis
    4: 400, 5: 800, 6: 1600, 7: 3200, // Moderadas
    8: 6400, 9: 12800, 10: 20000     // Difíceis
  };

  const getDifficulty = (questionNum: number) => {
    if (questionNum <= 3) return 'Fácil';
    if (questionNum <= 7) return 'Moderada';
    return 'Difícil';
  };

  const getDifficultyColor = (questionNum: number) => {
    if (questionNum <= 3) return 'bg-green-100 text-green-800';
    if (questionNum <= 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Adicionar participante
  const addParticipant = () => {
    if (participants.length >= 5) return;

    const newParticipant: Participant = {
      id: Date.now(),
      name: `Participante ${participants.length + 1}`,
      currentQuestion: 1,
      totalEarned: 0,
      status: 'waiting',
      skipsUsed: 0,
      helpUsed: false,
      responses: []
    };

    setParticipants([...participants, newParticipant]);
  };

  // Iniciar jogo
  const startGame = () => {
    if (participants.length === 0) return;
    setGameState('playing');
    setCurrentParticipant(participants[0]);
  };

  // Atualizar nome do participante
  const updateParticipantName = (id: number, newName: string) => {
    setParticipants(participants.map(p =>
      p.id === id ? { ...p, name: newName } : p
    ));
  };

  // Remover participante
  const removeParticipant = (id: number) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  // Responder pergunta
  const answerQuestion = (isCorrect: boolean, questionCode = '') => {
    if (!currentParticipant) return;

    const updatedParticipant = { ...currentParticipant };
    const questionValue = questionValues[currentQuestion] || 0;

    const response: Response = {
      questionNumber: currentQuestion,
      questionCode: questionCode,
      isCorrect: isCorrect,
      value: isCorrect ? questionValue : Math.floor(questionValue / 2),
      timestamp: new Date().toLocaleTimeString()
    };

    updatedParticipant.responses.push(response);

    if (isCorrect) {
      updatedParticipant.totalEarned += questionValue;
      if (currentQuestion < 10) {
        updatedParticipant.currentQuestion = currentQuestion + 1;
        setCurrentQuestion(currentQuestion + 1);
      } else {
        updatedParticipant.status = 'finished';
        nextParticipant();
      }
    } else {
      updatedParticipant.totalEarned += Math.floor(questionValue / 2);
      updatedParticipant.status = 'eliminated';
      nextParticipant();
    }

    updateCurrentParticipant(updatedParticipant);
  };

  // Pular pergunta (custa 100 honey)
  const skipQuestion = () => {
    if (!currentParticipant || currentParticipant.skipsUsed >= 1) return;

    const updatedParticipant = { ...currentParticipant };
    updatedParticipant.skipsUsed += 1;
    updatedParticipant.totalEarned = Math.max(0, updatedParticipant.totalEarned - 100);

    const response: Response = {
      questionNumber: currentQuestion,
      questionCode: 'SKIP',
      isCorrect: null,
      value: -100,
      timestamp: new Date().toLocaleTimeString()
    };

    updatedParticipant.responses.push(response);

    if (currentQuestion < 10) {
      updatedParticipant.currentQuestion = currentQuestion + 1;
      setCurrentQuestion(currentQuestion + 1);
    } else {
      updatedParticipant.status = 'finished';
      nextParticipant();
    }

    updateCurrentParticipant(updatedParticipant);
  };

  // Usar ajuda da plateia
  const useAudienceHelp = () => {
    if (!currentParticipant || currentParticipant.helpUsed) return;

    const updatedParticipant = { ...currentParticipant };
    updatedParticipant.helpUsed = true;

    updateCurrentParticipant(updatedParticipant);
  };

  // Desistir (leva o valor acumulado)
  const giveUp = () => {
    if (!currentParticipant) return;

    const updatedParticipant = { ...currentParticipant };
    updatedParticipant.status = 'finished';

    const response: Response = {
      questionNumber: currentQuestion,
      questionCode: 'QUIT',
      isCorrect: null,
      value: 0,
      timestamp: new Date().toLocaleTimeString()
    };

    updatedParticipant.responses.push(response);
    updateCurrentParticipant(updatedParticipant);
    nextParticipant();
  };

  // Próximo participante
  const nextParticipant = () => {
    const nextIndex = participants.findIndex(p => p.status === 'waiting');
    if (nextIndex !== -1) {
      setCurrentParticipant(participants[nextIndex]);
      setCurrentQuestion(1);
    } else {
      setGameState('finished');
    }
  };

  // Atualizar participante atual
  const updateCurrentParticipant = (updatedParticipant: Participant) => {
    setParticipants(participants.map(p =>
      p.id === updatedParticipant.id ? updatedParticipant : p
    ));
    setCurrentParticipant(updatedParticipant);
  };

  // Reiniciar jogo
  const resetGame = () => {
    setParticipants([]);
    setCurrentParticipant(null);
    setGameState('registration');
    setCurrentQuestion(1);
  };

  if (gameState === 'registration') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
              🍯 Show do Melzão 🍯
            </h1>
            <p className="text-xl text-white/90">
              Quiz show com até 5 participantes - Ganhe honey respondendo perguntas!
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-2xl p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Participantes ({participants.length}/5)</h2>
              <button
                onClick={addParticipant}
                disabled={participants.length >= 5}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                + Adicionar Participante
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {participants.map((participant) => (
                <div key={participant.id} className="border-2 border-gray-200 rounded-lg p-4">
                  <input
                    type="text"
                    value={participant.name}
                    onChange={(e) => updateParticipantName(participant.id, e.target.value)}
                    className="w-full text-lg font-medium mb-2 p-2 border rounded"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ID: {participant.id}</span>
                    <button
                      onClick={() => removeParticipant(participant.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {participants.length > 0 && (
              <div className="text-center">
                <button
                  onClick={startGame}
                  className="bg-green-600 text-white px-8 py-3 rounded-xl text-xl font-bold hover:bg-green-700 shadow-lg"
                >
                  🎮 Iniciar Show!
                </button>
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
            <h3 className="text-xl font-bold mb-4">📋 Regras do Jogo</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <ul className="space-y-2">
                <li>• 10 perguntas por participante</li>
                <li>• Fáceis (1-3): 50, 100, 200 honey</li>
                <li>• Moderadas (4-7): 400, 800, 1600, 3200 honey</li>
                <li>• Difíceis (8-10): 6400, 12800, 20000 honey</li>
              </ul>
              <ul className="space-y-2">
                <li>• 1 pulo por participante (custa 100 honey)</li>
                <li>• 1 ajuda da plateia por participante</li>
                <li>• Erro = metade do valor da pergunta</li>
                <li>• Desistir = leva o valor acumulado</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && currentParticipant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">🍯 Show do Melzão 🍯</h1>
            <p className="text-white/80">Participante atual: {currentParticipant.name}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Painel Principal */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-2xl p-8">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  Pergunta {currentQuestion}/10
                </h2>
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getDifficultyColor(currentQuestion)}`}>
                  {getDifficulty(currentQuestion)} - {questionValues[currentQuestion]} honey
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código da Pergunta:
                  </label>
                  <input
                    type="text"
                    id="questionCode"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Ex: P001, Q123, etc."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const code = (document.getElementById('questionCode') as HTMLInputElement)?.value || '';
                      answerQuestion(true, code);
                    }}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} />
                    Resposta Correta
                  </button>
                  <button
                    onClick={() => {
                      const code = (document.getElementById('questionCode') as HTMLInputElement)?.value || '';
                      answerQuestion(false, code);
                    }}
                    className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2"
                  >
                    <XCircle size={20} />
                    Resposta Errada
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={skipQuestion}
                    disabled={currentParticipant.skipsUsed >= 1}
                    className="flex-1 bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                  >
                    <Clock size={16} />
                    Pular (-100 🍯)
                  </button>
                  <button
                    onClick={useAudienceHelp}
                    disabled={currentParticipant.helpUsed}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                  >
                    <Users size={16} />
                    Ajuda Plateia
                  </button>
                  <button
                    onClick={giveUp}
                    className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 text-sm"
                  >
                    Desistir
                  </button>
                </div>
              </div>
            </div>

            {/* Painel Lateral */}
            <div className="space-y-6">
              {/* Status Atual */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Trophy className="text-yellow-500" size={20} />
                  Status Atual
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Honey Acumulado:</span>
                    <span className="font-bold text-yellow-600">{currentParticipant.totalEarned} 🍯</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pulos Restantes:</span>
                    <span className="font-bold">{1 - currentParticipant.skipsUsed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ajuda Plateia:</span>
                    <span className={`font-bold ${currentParticipant.helpUsed ? 'text-red-500' : 'text-green-500'}`}>
                      {currentParticipant.helpUsed ? 'Usada' : 'Disponível'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Escala de Valores */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Escala de Valores</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(questionValues).map(([q, value]) => (
                    <div
                      key={q}
                      className={`flex justify-between p-2 rounded ${
                        parseInt(q) === currentQuestion ? 'bg-blue-100 font-bold' :
                        parseInt(q) < currentQuestion ? 'bg-green-50 text-green-600' : 'text-gray-500'
                      }`}
                    >
                      <span>Q{q} ({getDifficulty(parseInt(q))}):</span>
                      <span>{value} 🍯</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista de Participantes */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">👥 Participantes</h3>
                <div className="space-y-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className={`p-2 rounded text-sm ${
                        p.id === currentParticipant?.id ? 'bg-blue-100 border-2 border-blue-300' :
                        p.status === 'finished' ? 'bg-green-100' :
                        p.status === 'eliminated' ? 'bg-red-100' : 'bg-gray-100'
                      }`}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-600">{p.totalEarned} 🍯 • {p.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const sortedParticipants = [...participants].sort((a, b) => b.totalEarned - a.totalEarned);

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 via-teal-500 to-blue-600 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4">🏆 Resultados Finais 🏆</h1>
            <p className="text-xl text-white/90">Show do Melzão - Classificação Final</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Ranking */}
            <div className="bg-white rounded-xl shadow-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">🥇 Ranking Final</h2>
              <div className="space-y-4">
                {sortedParticipants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`p-4 rounded-lg border-2 ${
                      index === 0 ? 'border-yellow-400 bg-yellow-50' :
                      index === 1 ? 'border-gray-400 bg-gray-50' :
                      index === 2 ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-2xl mr-2">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                        </span>
                        <span className="text-lg font-bold">{participant.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-yellow-600">{participant.totalEarned} 🍯</div>
                        <div className="text-sm text-gray-600">
                          {participant.responses.length} perguntas respondidas
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detalhes dos Participantes */}
            <div className="bg-white rounded-xl shadow-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Detalhes das Respostas</h2>
              <div className="space-y-6">
                {participants.map((participant) => (
                  <div key={participant.id} className="border rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">
                      {participant.name} - {participant.totalEarned} 🍯
                    </h3>
                    <div className="space-y-2">
                      {participant.responses.map((response, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium">Q{response.questionNumber}</span>
                            {response.questionCode && (
                              <span className="text-gray-600 ml-2">({response.questionCode})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {response.isCorrect === true ? (
                              <CheckCircle className="text-green-500" size={16} />
                            ) : response.isCorrect === false ? (
                              <XCircle className="text-red-500" size={16} />
                            ) : (
                              <HelpCircle className="text-yellow-500" size={16} />
                            )}
                            <span className={`font-medium ${
                              response.value > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {response.value > 0 ? '+' : ''}{response.value} 🍯
                            </span>
                            <span className="text-gray-500">{response.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={resetGame}
              className="bg-white text-purple-600 px-8 py-3 rounded-xl text-xl font-bold hover:bg-gray-100 shadow-lg"
            >
              🔄 Novo Show
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ShowDoMelzao;