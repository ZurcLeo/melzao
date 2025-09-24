import React, { useState, useEffect, useCallback } from 'react';
import { apiService, GameStats, TopScore, GameSession, SessionReport, QuestionStats } from '../services/api';
import SimpleCharts from './SimpleCharts';

const HistoryDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'leaderboard' | 'sessions' | 'questions' | 'charts'>('stats');
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [topScores, setTopScores] = useState<TopScore[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<GameSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionReport | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  const loadGameStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await apiService.getGameStats();
      setGameStats(stats);
    } catch (err) {
      setError('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadTopScores = async () => {
    try {
      setLoading(true);
      setError(null);
      const scores = await apiService.getTopScores();
      setTopScores(scores);
    } catch (err) {
      setError('Erro ao carregar ranking');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionList = await apiService.getGameSessions(30);
      setSessions(sessionList);
      setFilteredSessions(sessionList);
    } catch (err) {
      setError('Erro ao carregar sessões');
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = useCallback(() => {
    let filtered = sessions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(session =>
        statusFilter === 'active' ? session.status === 'active' : session.status !== 'active'
      );
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(session =>
        session.session_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSessions(filtered);
  }, [sessions, searchTerm, statusFilter]);

  useEffect(() => {
    filterSessions();
  }, [filterSessions]);

  const loadSessionDetail = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const report = await apiService.getSessionReport(sessionId);
      setSelectedSession(report);
    } catch (err) {
      setError('Erro ao carregar detalhes da sessão');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await apiService.getQuestionStats();
      setQuestionStats(stats);
    } catch (err) {
      setError('Erro ao carregar estatísticas de perguntas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switch (activeTab) {
      case 'stats':
        loadGameStats();
        break;
      case 'leaderboard':
        loadTopScores();
        break;
      case 'sessions':
        loadSessions();
        break;
      case 'questions':
        loadQuestionStats();
        break;
      case 'charts':
        loadTopScores();
        loadQuestionStats();
        break;
    }
  }, [activeTab]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const renderStats = () => (
    <div className="space-y-4">
      {gameStats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-400">{gameStats.totalSessions}</div>
              <div className="text-sm text-gray-300">Sessões Totais</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-400">{gameStats.totalParticipants}</div>
              <div className="text-sm text-gray-300">Participantes</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-yellow-400">{gameStats.totalWinners}</div>
              <div className="text-sm text-gray-300">Vencedores</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-purple-400">{gameStats.accuracyRate}%</div>
              <div className="text-sm text-gray-300">Taxa de Acerto</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-lg font-bold text-white mb-2">📊 Respostas</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total de Respostas:</span>
                  <span className="font-bold">{gameStats.totalAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Respostas Corretas:</span>
                  <span className="font-bold text-green-400">{gameStats.correctAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Respostas Erradas:</span>
                  <span className="font-bold text-red-400">{gameStats.totalAnswers - gameStats.correctAnswers}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-white mb-2">🍯 Honey Médio</h3>
              <div className="text-3xl font-bold text-yellow-400 text-center">
                {gameStats.averageHoneyEarned}
              </div>
              <div className="text-sm text-gray-300 text-center mt-1">Honey por jogador</div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderLeaderboard = () => (
    <div className="card">
      <h3 className="text-lg font-bold text-white mb-4">🏆 Top 10 Maiores Pontuações</h3>
      <div className="space-y-2">
        {topScores.map((score, index) => (
          <div
            key={`${score.name}-${score.session_date}`}
            className="flex justify-between items-center p-3 bg-gray-700 rounded"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}°`}
              </span>
              <div>
                <div className="font-bold text-white">{score.name}</div>
                <div className="text-xs text-gray-400">
                  {formatDate(score.session_date)} • Status: {score.final_status}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-yellow-400">{score.total_earned} 🍯</div>
              <div className="text-sm text-gray-300">Nível {score.final_level}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSessions = () => (
    <div className="space-y-6">
      {selectedSession ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setSelectedSession(null)}
              className="btn bg-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-500 transition-colors flex items-center gap-2"
            >
              ← Voltar
            </button>
            <h3 className="text-xl font-bold text-white">
              Sessão: {selectedSession.session.session_id}
            </h3>
          </div>

          <div className="card p-6">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-lg">
              <span>ℹ️</span> Informações da Sessão
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-400">Iniciada</span>
                <span className="text-white font-medium">{formatDate(selectedSession.session.started_at)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">Finalizada</span>
                <span className="text-white font-medium">
                  {selectedSession.session.ended_at ? formatDate(selectedSession.session.ended_at) : 'Em andamento'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium px-2 py-1 rounded text-xs w-fit ${
                  selectedSession.session.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
                }`}>
                  {selectedSession.session.status}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">Participantes</span>
                <span className="text-white font-medium">{selectedSession.session.total_participants}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-lg">
              <span>👥</span> Participantes
            </h4>
            <div className="space-y-4">
              {selectedSession.participants.map((participant) => (
                <div key={participant.participant_id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div className="font-bold text-white text-xl">{participant.name}</div>
                    <div className="mt-2 sm:mt-0">
                      <span className={`px-4 py-1 rounded-full text-xs font-semibold ${
                        participant.final_status === 'winner' ? 'bg-green-600 text-green-100' :
                        participant.final_status === 'eliminated' ? 'bg-red-600 text-red-100' :
                        participant.final_status === 'quit' ? 'bg-yellow-600 text-yellow-100' :
                        'bg-gray-600 text-gray-100'
                      }`}>
                        {participant.final_status === 'winner' ? '🏆 Vencedor' :
                         participant.final_status === 'eliminated' ? '❌ Eliminado' :
                         participant.final_status === 'quit' ? '🚪 Desistiu' : '🎮 Em jogo'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center bg-gray-900 rounded-lg p-3">
                      <div className="text-blue-400 font-extrabold text-2xl">Nível {participant.final_level}</div>
                      <div className="text-xs text-gray-500">Nível Final</div>
                    </div>
                    <div className="text-center bg-gray-900 rounded-lg p-3">
                      <div className="text-yellow-400 font-extrabold text-2xl">{participant.total_earned} 🍯</div>
                      <div className="text-xs text-gray-500">Honey Ganho</div>
                    </div>
                    <div className="text-center bg-gray-900 rounded-lg p-3">
                      <div className="text-green-400 font-extrabold text-2xl">
                        {participant.answers.filter(a => a.is_correct).length}/{participant.answers.length}
                      </div>
                      <div className="text-xs text-gray-500">Acertos</div>
                    </div>
                  </div>

                  {participant.answers.length > 0 && (
                    <div className="mt-4 border-t border-gray-700 pt-4">
                      <div className="text-sm text-gray-400 mb-3 font-medium">Últimas 3 Respostas:</div>
                      <div className="space-y-3">
                        {participant.answers.slice(-3).map((answer) => (
                          <div key={answer.id} className="text-sm flex items-center gap-3 bg-gray-900 rounded-lg p-3">
                            <span className={`text-xl ${answer.is_correct ? '✅' : '❌'}`}></span>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-200">Nível {answer.level}</div>
                              <div className="text-gray-500 truncate">{answer.question_text.substring(0, 60)}...</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>📋</span> Sessões Recentes
                {filteredSessions.length !== sessions.length && (
                  <span className="text-sm font-normal text-gray-400">
                    ({filteredSessions.length} de {sessions.length})
                  </span>
                )}
              </h3>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Buscar por ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none w-full sm:w-48"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">Todas</option>
                  <option value="active">Ativas</option>
                  <option value="completed">Finalizadas</option>
                </select>
              </div>
            </div>
          </div>

          {filteredSessions.length > 0 ? (
            <div className="grid gap-4">
              {filteredSessions.map((session) => {
                const isActive = session.status === 'active';
                const sessionDate = new Date(session.started_at);
                const now = new Date();
                const timeDiff = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60));

                return (
                  <div
                    key={session.session_id}
                    className="card p-5 hover:bg-gray-750 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] border border-gray-700 hover:border-blue-500 shadow-md rounded-xl"
                    onClick={() => loadSessionDetail(session.session_id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-bold text-white text-xl">{session.session_id}</div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            isActive
                              ? 'bg-green-600 text-green-100 animate-pulse'
                              : 'bg-gray-600 text-gray-100'
                          }`}>
                            {isActive ? '🟢 Ativa' : '⚫ Finalizada'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xs">Iniciada</span>
                            <span className="text-white font-medium">{formatDate(session.started_at)}</span>
                            <span className="text-gray-400 text-xs">
                              {timeDiff < 60 ? `${timeDiff} min atrás` : `${Math.floor(timeDiff / 60)}h atrás`}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xs">Participantes</span>
                            <span className="text-blue-400 font-extrabold text-2xl">
                              👥 {session.total_participants}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xs">Status</span>
                            <span className="text-white font-medium capitalize">{session.status}</span>
                          </div>

                          <div className="flex flex-col justify-end text-right md:text-left">
                            <span className="text-blue-400 hover:text-blue-300 text-sm font-semibold flex items-center justify-end md:justify-start gap-1 cursor-pointer">
                              Ver detalhes <span>→</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-gray-300 mb-2 font-semibold">
                {sessions.length === 0
                  ? 'Nenhuma sessão encontrada.'
                  : 'Nenhuma sessão corresponde aos filtros aplicados.'
                }
              </div>
              <div className="text-sm text-gray-400">
                {sessions.length === 0
                  ? 'As sessões aparecerão aqui conforme forem criadas.'
                  : 'Tente ajustar os filtros ou limpar a busca.'
                }
              </div>
              {(searchTerm || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="btn btn-primary mt-4 text-sm"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderQuestions = () => (
    <div className="card">
      <h3 className="text-lg font-bold text-white mb-4">❓ Estatísticas de Perguntas</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {questionStats.map((stat) => (
          <div key={stat.question_id} className="bg-gray-700 rounded p-3">
            <div className="text-white font-medium mb-1">
              Nível {stat.level}: {stat.question_text.substring(0, 80)}...
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm text-gray-300">
              <div>Perguntada: {stat.times_asked}x</div>
              <div>Acertos: {stat.correct_count}</div>
              <div className={`font-bold ${
                stat.accuracy_rate > 70 ? 'text-green-400' :
                stat.accuracy_rate > 40 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {stat.accuracy_rate.toFixed(1)}% acerto
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
<div className="space-y-4">
  {/* Navegação */}
  <div className="card p-4">
    <div className="flex flex-col gap-2">
      {[
        { key: 'stats', label: '📊 Estatísticas', icon: '📊' },
        { key: 'leaderboard', label: '🏆 Ranking', icon: '🏆' },
        { key: 'sessions', label: '📋 Sessões', icon: '📋' },
        { key: 'questions', label: '❓ Perguntas', icon: '❓' },
        { key: 'charts', label: '📈 Gráficos', icon: '📈' }
      ].map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key as any)}
          // Adicione 'w-full' aqui e ajuste o padding
          className={`btn w-full py-2 text-left ${
            activeTab === tab.key ? 'btn-primary' : 'bg-gray-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>
  {/* Conteúdo (sem alteração) */}
  {loading && (
    <div className="text-center text-white py-8">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
      Carregando dados históricos...
    </div>
  )}
  {error && (
    <div className="card bg-red-900 border-red-500">
      <div className="text-red-200">❌ {error}</div>
      <button
        onClick={() => window.location.reload()}
        className="btn btn-danger mt-2 text-sm"
      >
        Tentar novamente
      </button>
    </div>
  )}
  {!loading && !error && (
    <>
      {activeTab === 'stats' && renderStats()}
      {activeTab === 'leaderboard' && renderLeaderboard()}
      {activeTab === 'sessions' && renderSessions()}
      {activeTab === 'questions' && renderQuestions()}
      {activeTab === 'charts' && (
        <SimpleCharts topScores={topScores} questionStats={questionStats} />
      )}
    </>
  )}
</div>
  )
};

export default HistoryDashboard;