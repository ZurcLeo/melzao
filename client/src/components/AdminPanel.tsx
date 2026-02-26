import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, UserX, RotateCcw, BarChart3, Activity, FileText, Layers } from 'lucide-react';
import { apiService } from '../services/api';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Modal, ModalBody } from './ui/Modal';
import { toast } from 'react-toastify';
import QuestionManager from './QuestionManager';
import { apiClient } from '../utils/apiClient';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'host' | 'admin';
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
  approved_at?: string;
  last_login?: string;
}

interface AdminPanelProps {
  currentUser: any;
  authToken: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, authToken }) => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'stats' | 'questions' | 'levels'>('pending');
  const [levelConfig, setLevelConfig] = useState<Array<{ level: number; honey_value: number }>>([]);
  const [levelEdits, setLevelEdits] = useState<Record<number, string>>({});
  const [savingLevel, setSavingLevel] = useState<number | null>(null);

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient('/api/admin/users/pending');
      setPendingUsers(data.users || []);
    } catch (error) {
      toast.error(`Erro ao carregar usuários pendentes: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient('/api/admin/users?limit=200');
      setAllUsers(data.users || []);
    } catch (error) {
      toast.error(`Erro ao carregar usuários: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await apiClient('/api/admin/stats');
      setStats(data.stats);
    } catch (error) {
      toast.error(`Erro ao carregar estatísticas: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: number) => {
    try {
      await apiClient(`/api/admin/users/${userId}/approve`, { method: 'PUT' });
      toast.success('Usuário aprovado com sucesso!');
      loadPendingUsers();
      loadAllUsers();
    } catch (error) {
      toast.error(`Erro ao aprovar usuário: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const deactivateUser = async (userId: number) => {
    try {
      await apiClient(`/api/admin/users/${userId}/deactivate`, { method: 'PUT' });
      toast.success('Usuário desativado com sucesso!');
      loadAllUsers();
    } catch (error) {
      toast.error(`Erro ao desativar usuário: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const reactivateUser = async (userId: number) => {
    try {
      await apiClient(`/api/admin/users/${userId}/reactivate`, { method: 'PUT' });
      toast.success('Usuário reativado com sucesso!');
      loadAllUsers();
    } catch (error) {
      toast.error(`Erro ao reativar usuário: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const loadLevelConfig = async () => {
    try {
      const data = await apiService.getLevelHoneyConfig();
      setLevelConfig(data.levels);
      const edits: Record<number, string> = {};
      data.levels.forEach(l => { edits[l.level] = String(l.honey_value); });
      setLevelEdits(edits);
    } catch (error) {
      toast.error(`Erro ao carregar configuração de níveis: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const saveLevelHoney = async (level: number) => {
    const value = parseInt(levelEdits[level]);
    if (isNaN(value) || value < 1) {
      toast.error('Valor inválido');
      return;
    }
    setSavingLevel(level);
    try {
      await apiService.updateLevelHoneyConfig(level, value);
      setLevelConfig(prev => prev.map(l => l.level === level ? { ...l, honey_value: value } : l));
      toast.success(`Nível ${level} atualizado para ${value} 🍯`);
    } catch (error) {
      toast.error(`Erro ao salvar: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSavingLevel(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingUsers();
    } else if (activeTab === 'users') {
      loadAllUsers();
    } else if (activeTab === 'stats') {
      loadStats();
    } else if (activeTab === 'levels') {
      loadLevelConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-900/20';
      case 'active': return 'text-green-400 bg-green-900/20';
      case 'inactive': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="glass" padding="lg">
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Users className="text-blue-400" size={28} />
                Painel Administrativo
              </h1>
              <p className="text-gray-300 mt-1">
                Gerencie usuários e monitore o sistema
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Admin:</div>
              <div className="font-medium text-white">{currentUser?.name}</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'pending' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('pending')}
              icon={<Users size={16} />}
            >
              Usuários Pendentes ({pendingUsers.length})
            </Button>
            <Button
              variant={activeTab === 'users' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('users')}
              icon={<Activity size={16} />}
            >
              Todos os Usuários
            </Button>
            <Button
              variant={activeTab === 'stats' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('stats')}
              icon={<BarChart3 size={16} />}
            >
              Estatísticas
            </Button>
            <Button
              variant={activeTab === 'questions' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('questions')}
              icon={<FileText size={16} />}
            >
              Questões
            </Button>
            <Button
              variant={activeTab === 'levels' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('levels')}
              icon={<Layers size={16} />}
            >
              Honey por Nível
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Users Tab */}
      {activeTab === 'pending' && (
        <Card variant="glass" padding="lg">
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                Usuários Aguardando Aprovação
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadPendingUsers}
                loading={loading}
                icon={<RotateCcw size={16} />}
              >
                Atualizar
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                <p className="text-gray-400 mt-2">Carregando...</p>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto text-gray-500 mb-4" size={48} />
                <p className="text-gray-400">Nenhum usuário pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-white">{user.name}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Registro: {formatDate(user.created_at)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => approveUser(user.id)}
                        icon={<CheckCircle size={16} />}
                      >
                        Aprovar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                      >
                        Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Users Tab */}
      {activeTab === 'users' && (
        <Card variant="glass" padding="lg">
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                Gerenciar Usuários
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAllUsers}
                loading={loading}
                icon={<RotateCcw size={16} />}
              >
                Atualizar
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                <p className="text-gray-400 mt-2">Carregando...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{user.name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                              {getStatusLabel(user.status)}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-900/20 text-blue-400">
                              {user.role}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Registro: {formatDate(user.created_at)}
                        {user.last_login && (
                          <> • Último login: {formatDate(user.last_login)}</>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {user.status === 'active' && user.id !== currentUser?.userId && (
                        <Button
                          variant="error"
                          size="sm"
                          onClick={() => deactivateUser(user.id)}
                          icon={<UserX size={16} />}
                        >
                          Desativar
                        </Button>
                      )}
                      {user.status === 'inactive' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => reactivateUser(user.id)}
                          icon={<CheckCircle size={16} />}
                        >
                          Reativar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                      >
                        Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats && (
            <>
              {/* User Stats */}
              <Card variant="glass" padding="lg">
                <CardContent>
                  <h3 className="text-lg font-bold text-white mb-4">👥 Usuários</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total:</span>
                      <span className="font-bold text-white">{stats.total_users || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ativos:</span>
                      <span className="font-bold text-green-400">{stats.active_users || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pendentes:</span>
                      <span className="font-bold text-yellow-400">{stats.pending_users || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Inativos:</span>
                      <span className="font-bold text-red-400">{stats.inactive_users || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Game Stats */}
              <Card variant="glass" padding="lg">
                <CardContent>
                  <h3 className="text-lg font-bold text-white mb-4">🎮 Jogos</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Sessões:</span>
                      <span className="font-bold text-white">{stats.total_sessions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Participantes:</span>
                      <span className="font-bold text-blue-400">{stats.total_participants || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Perguntas:</span>
                      <span className="font-bold text-purple-400">{stats.total_questions || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Stats */}
              {stats.recent_activity && (
                <Card variant="glass" padding="lg">
                  <CardContent>
                    <h3 className="text-lg font-bold text-white mb-4">📊 Última Semana</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Novos usuários:</span>
                        <span className="font-bold text-green-400">{stats.recent_activity.new_users_week || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Jogos:</span>
                        <span className="font-bold text-blue-400">{stats.recent_activity.games_week || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Participantes:</span>
                        <span className="font-bold text-purple-400">{stats.recent_activity.participants_week || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <QuestionManager authToken={authToken} />
      )}

      {/* Honey por Nível Tab */}
      {activeTab === 'levels' && (
        <Card variant="glass" padding="lg">
          <CardContent>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Layers className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Honey por Nível</h2>
                <p className="text-gray-300 text-sm">Valor base de 🍯 concedido ao acertar uma questão de cada nível. Afeta todas as questões daquele nível.</p>
              </div>
            </div>

            <div className="space-y-3">
              {levelConfig.length === 0 && (
                <p className="text-gray-400 text-center py-8">Carregando...</p>
              )}
              {levelConfig.map(({ level, honey_value }) => {
                const isDirty = parseInt(levelEdits[level] ?? '') !== honey_value;
                return (
                  <div key={level} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="w-32 flex-shrink-0">
                      <div className="text-white font-semibold">Nível {level}</div>
                      <div className="text-gray-400 text-xs">atual: {honey_value} 🍯</div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={levelEdits[level] ?? honey_value}
                      onChange={e => setLevelEdits(prev => ({ ...prev, [level]: e.target.value }))}
                      className="w-32 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    <span className="text-gray-400 text-sm">🍯</span>
                    <Button
                      variant={isDirty ? 'primary' : 'ghost'}
                      size="sm"
                      disabled={!isDirty || savingLevel === level}
                      onClick={() => saveLevelHoney(level)}
                      className={isDirty ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                    >
                      {savingLevel === level ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                );
              })}
            </div>

            <p className="text-gray-500 text-xs mt-4">
              O multiplicador de honey da sessão ainda se aplica sobre esses valores base.
            </p>
          </CardContent>
        </Card>
      )}

      {/* User Details Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Detalhes do Usuário"
        size="md"
      >
        <ModalBody>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Nome:</label>
                <div className="font-medium text-white">{selectedUser.name}</div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Email:</label>
                <div className="font-medium text-white">{selectedUser.email}</div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Função:</label>
                <div className="font-medium text-white">{selectedUser.role}</div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Status:</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                  {getStatusLabel(selectedUser.status)}
                </span>
              </div>

              <div>
                <label className="text-sm text-gray-400">Registro:</label>
                <div className="font-medium text-white">{formatDate(selectedUser.created_at)}</div>
              </div>

              {selectedUser.approved_at && (
                <div>
                  <label className="text-sm text-gray-400">Aprovação:</label>
                  <div className="font-medium text-white">{formatDate(selectedUser.approved_at)}</div>
                </div>
              )}

              {selectedUser.last_login && (
                <div>
                  <label className="text-sm text-gray-400">Último login:</label>
                  <div className="font-medium text-white">{formatDate(selectedUser.last_login)}</div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {selectedUser.status === 'pending' && (
                  <Button
                    variant="success"
                    onClick={() => {
                      approveUser(selectedUser.id);
                      setShowUserModal(false);
                    }}
                    icon={<CheckCircle size={16} />}
                  >
                    Aprovar
                  </Button>
                )}

                {selectedUser.status === 'active' && selectedUser.id !== currentUser?.userId && (
                  <Button
                    variant="error"
                    onClick={() => {
                      deactivateUser(selectedUser.id);
                      setShowUserModal(false);
                    }}
                    icon={<UserX size={16} />}
                  >
                    Desativar
                  </Button>
                )}

                {selectedUser.status === 'inactive' && (
                  <Button
                    variant="success"
                    onClick={() => {
                      reactivateUser(selectedUser.id);
                      setShowUserModal(false);
                    }}
                    icon={<CheckCircle size={16} />}
                  >
                    Reativar
                  </Button>
                )}
              </div>
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
};

export default AdminPanel;