import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import AuthModal from './components/AuthModal';
import AppRouter from './AppRouter';
import { toast } from 'react-toastify';
import { apiService } from './services/api';
import { setTokenExpiredCallback } from './utils/apiClient';
import 'react-toastify/dist/ReactToastify.css';

const socket = io(process.env.REACT_APP_SERVER_URL || 'https://melzao-backend.onrender.com', {
  transports: ['polling', 'websocket'],
  upgrade: true,
  rememberUpgrade: false
});

const API_BASE = process.env.REACT_APP_SERVER_URL || 'https://melzao-backend.onrender.com';

function App() {
  const [gameState, setGameState] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Handle token expiration
  const handleTokenExpired = useCallback(() => {
    console.warn('🔐 Token expirado, fazendo logout');
    setCurrentUser(null);
    setAuthToken(null);
    (window as any).currentUser = null;
    (window as any).authToken = null;
    toast.warning('⚠️ Sua sessão expirou. Faça login novamente.');
  }, []);

  // Setup token expiration handler
  useEffect(() => {
    apiService.setTokenExpiredCallback(handleTokenExpired);
    setTokenExpiredCallback(handleTokenExpired);
  }, [handleTokenExpired]);

  // Validate token on app start
  useEffect(() => {
    const validateToken = async () => {
      const savedToken = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('authUser');

      if (savedToken && savedUser) {
        try {
          const user = JSON.parse(savedUser);

          // Verify token is still valid
          const response = await fetch(`${API_BASE}/api/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });

          if (response.ok) {
            setAuthToken(savedToken);
            setCurrentUser(user);
            (window as any).currentUser = user;
            (window as any).authToken = savedToken;
          } else {
            // Token is invalid or expired
            const errorData = await response.json().catch(() => ({}));
            console.warn('🔐 Token inválido ao iniciar:', errorData.code);
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
        } catch (e) {
          console.error('Erro ao validar token:', e);
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
        }
      }
    };

    validateToken();
  }, []);

  useEffect(() => {
    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      toast.success('🔌 Conectado ao servidor!');

      // Send auth token if available
      if (authToken) {
        socket.auth = { token: authToken };
      }

      socket.emit('join-game');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      toast.error('🔌 Desconectado do servidor');
    });

    // Game events
    socket.on('game-state', (data: any) => {
      console.log('📊 Novo game-state recebido:', {
        status: data?.status,
        hasCurrentQuestion: !!data?.currentQuestion,
        questionId: data?.currentQuestion?.id,
        questionLevel: data?.currentQuestion?.level,
        participantLevel: data?.currentParticipant?.currentLevel,
        hasCurrentParticipant: !!data?.currentParticipant,
        totalParticipants: data?.totalParticipants
      });
      setGameState(data);
    });

    socket.on('participant-added', (data: any) => {
      console.log('👥 Participante adicionado:', data);
      toast.success(`👥 ${data.participant.name} entrou no jogo!`);
    });

    socket.on('game-started', (data: any) => {
      console.log('🎮 Jogo iniciado:', data);
      toast.info(`🎮 Jogo iniciado para ${data.participant.name}!`);
    });

    socket.on('answer-result', (result: any) => {
      if (result.correct) {
        toast.success(result.completed ? '🏆 GANHOU O JOGO!' : '✅ Resposta correta!');
      } else {
        toast.error(`❌ Resposta errada! Correto: ${result.correctAnswer}`);
      }
    });

    socket.on('time-up', () => {
      toast.warning('⏰ Tempo esgotado!');
    });

    socket.on('error', (error: any) => {
      const errorMessage = typeof error === 'object' ? error.message || JSON.stringify(error) : error;
      toast.error(`❌ Erro: ${errorMessage}`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game-state');
      socket.off('participant-added');
      socket.off('game-started');
      socket.off('answer-result');
      socket.off('time-up');
      socket.off('error');
    };
  }, [authToken]);

  const handleAuthSuccess = (user: any, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);

    // Make user and token globally available for HostDashboard
    (window as any).currentUser = user;
    (window as any).authToken = token;

    socket.auth = { token };
    socket.disconnect();
    socket.connect(); // Reconnect with auth
    toast.success(`🎉 Bem-vindo, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);

    // Clear global variables
    (window as any).currentUser = null;
    (window as any).authToken = null;

    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    socket.auth = {};
    socket.disconnect();
    socket.connect(); // Reconnect as anonymous
    toast.info('👋 Logout realizado');
  };

  return (
    <>
      <AppRouter
        currentUser={currentUser}
        authToken={authToken}
        isConnected={isConnected}
        offlineMode={offlineMode}
        socket={socket}
        gameState={gameState}
        onToggleOffline={() => setOfflineMode(!offlineMode)}
        onLogin={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}

export default App;
