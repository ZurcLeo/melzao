import React, { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any, token: string) => void;
}

interface AuthForm {
  email: string;
  password: string;
  name?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState<AuthForm>({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = process.env.REACT_APP_SERVER_URL || 'https://melzao-backend.onrender.com';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, name: form.name };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (mode === 'login') {
          // Login successful
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('authUser', JSON.stringify(data.user));
          onAuthSuccess(data.user, data.token);
          onClose();
        } else {
          // Registration successful - show message and switch to login
          setMode('login');
          setForm({ email: form.email, password: '', name: '' });
          setError('✅ Registro realizado! Aguarde aprovação do admin e faça login.');
        }
      } else {
        // Handle different error codes
        switch (data.code) {
          case 'EMAIL_EXISTS':
            setError('Email já está em uso. Tente fazer login.');
            break;
          case 'INVALID_CREDENTIALS':
            setError('Email ou senha incorretos.');
            break;
          case 'USER_PENDING_APPROVAL':
            setError('Sua conta aguarda aprovação do administrador.');
            break;
          case 'USER_DEACTIVATED':
            setError('Sua conta foi desativada. Entre em contato com o administrador.');
            break;
          default:
            setError(data.error || 'Erro ao processar solicitação.');
        }
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof AuthForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {mode === 'login' ? '🔑 Entrar' : '📝 Registrar'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-white text-sm font-medium mb-1">
                Nome
              </label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Seu nome"
                required={mode === 'register'}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Senha
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className={`text-sm p-2 rounded ${
              error.startsWith('✅')
                ? 'bg-green-900 text-green-200'
                : 'bg-red-900 text-red-200'
            }`}>
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              {loading ? '⏳ Aguarde...' : (mode === 'login' ? '🔑 Entrar' : '📝 Registrar')}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
              setForm({ email: '', password: '', name: '' });
            }}
            className="text-blue-400 hover:text-blue-300 text-sm"
            disabled={loading}
          >
            {mode === 'login'
              ? '📝 Não tem conta? Registre-se'
              : '🔑 Já tem conta? Faça login'
            }
          </button>
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 text-sm"
            disabled={loading}
          >
            👤 Continuar como anônimo
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;