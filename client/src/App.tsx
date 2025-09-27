import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import io from 'socket.io-client';
import HostDashboard from './HostDashboard';
import AuthModal from './components/AuthModal';
import { Header, Container } from './components/layout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const socket = io(process.env.REACT_APP_SERVER_URL || 'https://melzao-backend.onrender.com', {
  transports: ['polling', 'websocket'],
  upgrade: true,
  rememberUpgrade: false
});

function App() {
  const [gameState, setGameState] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for saved auth on app start
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('authUser');

    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setAuthToken(savedToken);
        setCurrentUser(user);

        // Make user and token globally available for HostDashboard
        (window as any).currentUser = user;
        (window as any).authToken = savedToken;
      } catch (e) {
        // Invalid saved data, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      toast.success('🔌 Conectado ao servidor!');

      // Send auth token if available
      if (savedToken || authToken) {
        socket.auth = { token: savedToken || authToken };
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
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header moderno */}
      <Header
        currentUser={currentUser}
        isConnected={isConnected}
        offlineMode={offlineMode}
        onToggleOffline={() => setOfflineMode(!offlineMode)}
        onLogin={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Conteúdo principal com espaçamento para o header */}
      <Container size="full" padding="none" className="pt-20">
        <HostDashboard
          socket={offlineMode ? null : socket}
          gameState={offlineMode ? null : gameState}
          offlineMode={offlineMode}
        />
      </Container>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Notificações modernas */}
      {!offlineMode && (
        <ToastContainer
          position="top-center"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover
          theme="dark"
          toastClassName="glass-card border-0"
        />
      )}
    </motion.div>
  );
}

export default App;
