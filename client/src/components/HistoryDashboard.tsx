import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Trophy, Users, TrendingUp, HelpCircle, Calendar, ArrowLeft } from 'lucide-react';
import { apiService, GameStats, TopScore, GameSession, SessionReport, QuestionStats } from '../services/api';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
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
    <div className="space-y-6">
      {gameStats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card variant="glass" padding="md">
              <CardContent>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Calendar className="text-white" size={20} />
                  </div>
                  <div className="text-2xl font-bold text-blue-400">{gameStats.totalSessions}</div>
                  <div className="text-sm text-gray-300">Sessões Totais</div>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass" padding="md">
              <CardContent>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Users className="text-white" size={20} />
                  </div>
                  <div className="text-2xl font-bold text-green-400">{gameStats.totalParticipants}</div>
                  <div className="text-sm text-gray-300">Participantes</div>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass" padding="md">
              <CardContent>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Trophy className="text-white" size={20} />
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">{gameStats.totalWinners}</div>
                  <div className="text-sm text-gray-300">Vencedores</div>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass" padding="md">
              <CardContent>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="text-white" size={20} />
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{gameStats.accuracyRate}%</div>
                  <div className="text-sm text-gray-300">Taxa de Acerto</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="glass" padding="lg">
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <BarChart3 className="text-white" size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Respostas</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                    <span className="text-gray-300">Total de Respostas:</span>
                    <span className="font-bold text-white">{gameStats.totalAnswers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                    <span className="text-gray-300">Respostas Corretas:</span>
                    <span className="font-bold text-green-400">{gameStats.correctAnswers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                    <span className="text-gray-300">Respostas Erradas:</span>
                    <span className="font-bold text-red-400">{gameStats.totalAnswers - gameStats.correctAnswers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" padding="lg">
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">🍯</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Honey Médio</h3>
                </div>
                <div className="text-center bg-gradient-to-r from-yellow-600/20 to-orange-600/20 p-6 rounded-xl border border-yellow-400/30">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">
                    {gameStats.averageHoneyEarned}
                  </div>
                  <div className="text-sm text-gray-300">Honey por jogador</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );

  const renderLeaderboard = () => (
    <Card variant="glass" padding="lg">
      <CardContent>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Trophy className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Top 10 Maiores Pontuações</h3>
            <p className="text-gray-300">Os melhores jogadores de todos os tempos</p>
          </div>
        </div>
        <div className="space-y-3">
          {topScores.map((score, index) => (
            <div
              key={`${score.name}-${score.session_date}`}
              className="flex justify-between items-center p-4 bg-white/10 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-orange-600' :
                  'bg-blue-500'
                }`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}°`}
                </div>
                <div>
                  <div className="font-bold text-white text-lg">{score.name}</div>
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
      </CardContent>
    </Card>
  );

  const renderSessions = () => (
    <div className="space-y-6">
      {selectedSession ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Button
              onClick={() => setSelectedSession(null)}
              variant="ghost"
              icon={<ArrowLeft size={16} />}
              className="text-white hover:bg-white/10"
            >
              Voltar
            </Button>
            <h3 className="text-2xl font-bold text-white">
              Sessão: {selectedSession.session.session_id}
            </h3>
          </div>

          <Card variant="glass" padding="lg">
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Calendar className="text-white" size={18} />
                </div>
                <h4 className="font-bold text-white text-lg">Informações da Sessão</h4>
              </div>
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
            </CardContent>
          </Card>

          <Card variant="glass" padding="lg">
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Users className="text-white" size={18} />
                </div>
                <h4 className="font-bold text-white text-lg">Participantes</h4>
              </div>
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
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card variant="glass" padding="lg">
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Calendar className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Sessões Recentes</h3>
                    {filteredSessions.length !== sessions.length && (
                      <p className="text-gray-300 text-sm">
                        ({filteredSessions.length} de {sessions.length})
                      </p>
                    )}
                  </div>
                </div>

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
            </CardContent>
          </Card>

          {filteredSessions.length > 0 ? (
            <div className="grid gap-4">
              {filteredSessions.map((session) => {
                const isActive = session.status === 'active';
                const sessionDate = new Date(session.started_at);
                const now = new Date();
                const timeDiff = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60));

                return (
                  <Card
                    key={session.session_id}
                    variant="glass"
                    padding="lg"
                    className="group cursor-pointer transition-all duration-200 transform hover:scale-[1.02] hover:border-blue-500"
                    onClick={() => loadSessionDetail(session.session_id)}
                  >
                    <CardContent>
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card variant="glass" padding="lg">
              <CardContent>
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <div className="text-gray-300 mb-2 font-semibold">
                    {sessions.length === 0
                      ? 'Nenhuma sessão encontrada.'
                      : 'Nenhuma sessão corresponde aos filtros aplicados.'
                    }
                  </div>
                  <div className="text-sm text-gray-400 mb-4">
                    {sessions.length === 0
                      ? 'As sessões aparecerão aqui conforme forem criadas.'
                      : 'Tente ajustar os filtros ou limpar a busca.'
                    }
                  </div>
                  {(searchTerm || statusFilter !== 'all') && (
                    <Button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      variant="primary"
                      className="text-sm"
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  const renderQuestions = () => (
    <Card variant="glass" padding="lg">
      <CardContent>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
            <HelpCircle className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Estatísticas de Perguntas</h3>
            <p className="text-gray-300">Performance por pergunta do banco</p>
          </div>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {questionStats.map((stat) => (
            <div key={stat.question_id} className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="text-white font-medium mb-3">
                Nível {stat.level}: {stat.question_text.substring(0, 80)}...
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col items-center p-2 bg-blue-600/20 rounded-lg">
                  <span className="text-blue-400 font-bold">{stat.times_asked}x</span>
                  <span className="text-gray-300 text-xs">Perguntada</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-green-600/20 rounded-lg">
                  <span className="text-green-400 font-bold">{stat.correct_count}</span>
                  <span className="text-gray-300 text-xs">Acertos</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-purple-600/20 rounded-lg">
                  <span className={`font-bold ${
                    stat.accuracy_rate > 70 ? 'text-green-400' :
                    stat.accuracy_rate > 40 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {stat.accuracy_rate.toFixed(1)}%
                  </span>
                  <span className="text-gray-300 text-xs">Taxa de acerto</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
<div className="space-y-6">
  {/* Navegação */}
  <Card variant="glass" padding="lg">
    <CardContent>
      <div className="border-b border-white/20 mb-6 bg-black/20 rounded-t-xl p-1">
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'stats', label: 'Estatísticas', icon: BarChart3 },
            { key: 'leaderboard', label: 'Ranking', icon: Trophy },
            { key: 'sessions', label: 'Sessões', icon: Calendar },
            { key: 'questions', label: 'Perguntas', icon: HelpCircle },
            { key: 'charts', label: 'Gráficos', icon: TrendingUp }
          ].map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 min-w-[140px] justify-center ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-102'
                }`}
              >
                <IconComponent size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </CardContent>
  </Card>
  {/* Conteúdo */}
  {loading && (
    <Card variant="glass" padding="lg">
      <CardContent>
        <div className="text-center text-white py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          Carregando dados históricos...
        </div>
      </CardContent>
    </Card>
  )}
  {error && (
    <Card variant="glass" padding="lg" className="border-red-500">
      <CardContent>
        <div className="text-red-200 mb-4">❌ {error}</div>
        <Button
          onClick={() => window.location.reload()}
          variant="secondary"
          className="bg-red-600 hover:bg-red-700 text-white text-sm"
        >
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
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