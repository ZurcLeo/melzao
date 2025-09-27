import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Clock, Shield } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { toast } from 'react-toastify';

interface UserData {
  id: number;
  email: string;
  name: string;
  role: 'host' | 'admin';
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileForm {
  name: string;
  email: string;
}

interface UserProfileProps {
  currentUser: any;
  authToken: string;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ currentUser, authToken, onClose }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile');

  // Password change form
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile edit form
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: '',
    email: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const API_BASE = process.env.REACT_APP_SERVER_URL || 'https://melzao-backend.onrender.com';

  const makeRequest = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro na requisição' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro de conexão');
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const data = await makeRequest('/api/auth/me');
      setUserData(data.user);
      setProfileForm({
        name: data.user.name,
        email: data.user.email
      });
    } catch (error) {
      toast.error(`Erro ao carregar perfil: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Nova senha e confirmação não coincidem');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Nova senha deve ter pelo menos 8 caracteres');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.error('Nova senha deve ser diferente da atual');
      return;
    }

    try {
      setPasswordLoading(true);
      await makeRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword
        })
      });

      toast.success('Senha alterada com sucesso!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error(`Erro ao alterar senha: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileForm.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      setProfileLoading(true);

      const data = await makeRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email
        })
      });

      toast.success('Perfil atualizado com sucesso!');
      setUserData(data.user);
      setProfileForm({
        name: data.user.name,
        email: data.user.email
      });
      setEditingProfile(false);
    } catch (error) {
      toast.error(`Erro ao atualizar perfil: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      case 'active': return 'text-green-400 bg-green-900/20';
      case 'pending': return 'text-yellow-400 bg-yellow-900/20';
      case 'inactive': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'pending': return 'Pendente';
      case 'inactive': return 'Inativo';
      default: return status;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'host': return 'Host';
      default: return role;
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <p className="text-gray-400 ml-4">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="glass" padding="lg">
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
                <p className="text-gray-300">Gerencie suas informações pessoais</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕ Fechar
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-white/20 mb-6 bg-black/20 rounded-t-xl p-1">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 min-w-[110px] justify-center ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-102'
                }`}
              >
                <User size={16} />
                Perfil
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 min-w-[110px] justify-center ${
                  activeTab === 'password'
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-102'
                }`}
              >
                <Lock size={16} />
                Senha
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 min-w-[110px] justify-center ${
                  activeTab === 'security'
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-102'
                }`}
              >
                <Shield size={16} />
                Segurança
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tab */}
      {activeTab === 'profile' && userData && (
        <Card variant="glass" padding="lg">
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Informações Pessoais</h2>
              <Button
                variant={editingProfile ? 'warning' : 'ghost'}
                size="sm"
                onClick={() => setEditingProfile(!editingProfile)}
              >
                {editingProfile ? 'Cancelar' : 'Editar'}
              </Button>
            </div>

            {editingProfile ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <Input
                  label="Nome completo"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Seu nome"
                  required
                  variant="glass"
                />

                <Input
                  label="Email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="seu@email.com"
                  required
                  variant="glass"
                />

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    variant="success"
                    loading={profileLoading}
                    icon={<CheckCircle size={16} />}
                  >
                    Salvar Alterações
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingProfile(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Nome:</label>
                    <div className="font-medium text-white">{userData.name}</div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Email:</label>
                    <div className="font-medium text-white">{userData.email}</div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Função:</label>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-900/20 text-blue-400">
                      {getRoleLabel(userData.role)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Status:</label>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(userData.status)}`}>
                        {getStatusLabel(userData.status)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Membro desde:</label>
                    <div className="font-medium text-white">{formatDate(userData.createdAt)}</div>
                  </div>

                  {userData.lastLogin && (
                    <div>
                      <label className="text-sm text-gray-400">Último acesso:</label>
                      <div className="font-medium text-white">{formatDate(userData.lastLogin)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <Card variant="glass" padding="lg">
          <CardContent>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">Alterar Senha</h2>
              <p className="text-gray-400">Mantenha sua conta segura com uma senha forte</p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="relative">
                <Input
                  label="Senha atual"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Digite sua senha atual"
                  required
                  variant="glass"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-9 text-gray-400 hover:text-white"
                >
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Nova senha"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Digite sua nova senha"
                  required
                  variant="glass"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-9 text-gray-400 hover:text-white"
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirmar nova senha"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirme sua nova senha"
                  required
                  variant="glass"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-9 text-gray-400 hover:text-white"
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Requirements */}
              <Card variant="glass" padding="sm">
                <CardContent>
                  <div className="text-sm text-gray-400 mb-2">Requisitos da senha:</div>
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${passwordForm.newPassword.length >= 8 ? 'text-green-400' : 'text-gray-500'}`}>
                      {passwordForm.newPassword.length >= 8 ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      Pelo menos 8 caracteres
                    </div>
                    <div className={`flex items-center gap-2 ${passwordForm.newPassword !== passwordForm.currentPassword && passwordForm.newPassword ? 'text-green-400' : 'text-gray-500'}`}>
                      {passwordForm.newPassword !== passwordForm.currentPassword && passwordForm.newPassword ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      Diferente da senha atual
                    </div>
                    <div className={`flex items-center gap-2 ${passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.confirmPassword ? 'text-green-400' : 'text-gray-500'}`}>
                      {passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.confirmPassword ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      Confirmação coincide
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                variant="primary"
                loading={passwordLoading}
                icon={<Lock size={16} />}
                disabled={
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword ||
                  !passwordForm.confirmPassword ||
                  passwordForm.newPassword !== passwordForm.confirmPassword ||
                  passwordForm.newPassword.length < 8
                }
              >
                Alterar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && userData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="glass" padding="lg">
            <CardContent>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="text-blue-400" size={20} />
                Informações de Segurança
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <div>
                    <div className="font-medium text-white">Autenticação por Token</div>
                    <div className="text-sm text-gray-400">JWT válido por 24 horas</div>
                  </div>
                  <CheckCircle className="text-green-400" size={20} />
                </div>

                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <div>
                    <div className="font-medium text-white">Conta Verificada</div>
                    <div className="text-sm text-gray-400">Status: {getStatusLabel(userData.status)}</div>
                  </div>
                  {userData.status === 'active' ? (
                    <CheckCircle className="text-green-400" size={20} />
                  ) : (
                    <Clock className="text-yellow-400" size={20} />
                  )}
                </div>

                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <div>
                    <div className="font-medium text-white">Função de Acesso</div>
                    <div className="text-sm text-gray-400">{getRoleLabel(userData.role)}</div>
                  </div>
                  <Shield className="text-blue-400" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" padding="lg">
            <CardContent>
              <h3 className="text-lg font-bold text-white mb-4">Atividade Recente</h3>

              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="font-medium text-white">Login atual</div>
                  <div className="text-sm text-gray-400">Agora • Sessão ativa</div>
                </div>

                {userData.lastLogin && (
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="font-medium text-white">Último login</div>
                    <div className="text-sm text-gray-400">{formatDate(userData.lastLogin)}</div>
                  </div>
                )}

                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="font-medium text-white">Conta criada</div>
                  <div className="text-sm text-gray-400">{formatDate(userData.createdAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserProfile;