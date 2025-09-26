import React, { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, User } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent } from './ui/Card';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Entrar na conta' : 'Criar nova conta'}
      description={mode === 'login' ? 'Entre para acessar recursos exclusivos' : 'Registre-se para começar'}
      size="md"
    >
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'register' && (
            <Input
              label="Nome completo"
              type="text"
              value={form.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              leftIcon={<User size={18} />}
              placeholder="Seu nome"
              required={mode === 'register'}
              disabled={loading}
              variant="glass"
            />
          )}

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            leftIcon={<Mail size={18} />}
            placeholder="seu@email.com"
            required
            disabled={loading}
            variant="glass"
          />

          <Input
            label="Senha"
            type="password"
            value={form.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            leftIcon={<Lock size={18} />}
            placeholder="••••••••"
            required
            disabled={loading}
            variant="glass"
          />

          {error && (
            <Card variant={error.startsWith('✅') ? 'solid' : 'solid'} padding="sm">
              <CardContent>
                <div className={`text-sm flex items-center gap-2 ${
                  error.startsWith('✅')
                    ? 'text-success-400'
                    : 'text-error-400'
                }`}>
                  <span>{error.startsWith('✅') ? '✅' : '⚠️'}</span>
                  {error.replace(/^✅\s*/, '')}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            icon={mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
          >
            {mode === 'login' ? 'Entrar' : 'Registrar'}
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setForm({ email: '', password: '', name: '' });
              }}
              disabled={loading}
            >
              {mode === 'login'
                ? 'Não tem conta? Registre-se'
                : 'Já tem conta? Faça login'
              }
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-300"
            >
              👤 Continuar como anônimo
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default AuthModal;