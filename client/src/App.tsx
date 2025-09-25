import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import HostDashboard from './HostDashboard';
import AuthModal from './components/AuthModal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

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
    socket.on('game-state', setGameState);

    socket.on('participant-added', (participant: any) => {
      toast.success(`👥 ${participant.name} entrou no jogo!`);
    });

    socket.on('game-started', (data: any) => {
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

    socket.on('error', (error: string) => {
      toast.error(`❌ Erro: ${error}`);
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
    socket.auth = { token };
    socket.disconnect();
    socket.connect(); // Reconnect with auth
    toast.success(`🎉 Bem-vindo, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    socket.auth = {};
    socket.disconnect();
    socket.connect(); // Reconnect as anonymous
    toast.info('👋 Logout realizado');
  };

  return (
    <div className="min-h-screen">
      {/* Controles de modo */}
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => setOfflineMode(!offlineMode)}
          className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
            offlineMode
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
          title={offlineMode ? 'Modo Offline Ativo' : 'Ativar Modo Offline'}
        >
          {offlineMode ? '🎵 Offline' : '🌐 Online'}
        </button>

        {/* Auth button */}
        {!offlineMode && (
          <button
            onClick={() => currentUser ? handleLogout() : setShowAuthModal(true)}
            className="px-3 py-1 rounded text-sm font-medium transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700"
            title={currentUser ? 'Logout' : 'Login / Registrar'}
          >
            {currentUser ? `👤 ${currentUser.name}` : '🔑 Entrar'}
          </button>
        )}
      </div>

      {/* Status de conexão */}
      <div className={`fixed top-4 right-4 px-3 py-1 rounded text-sm z-50 ${
        offlineMode
          ? 'bg-purple-500 text-white'
          : isConnected
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white animate-pulse'
      }`}>
        {offlineMode
          ? '🎵 Offline'
          : isConnected
          ? (currentUser ? `🟢 ${currentUser.role}` : '🟢 Anônimo')
          : '🔴 Offline'
        }
      </div>

      {/* App principal */}
      <HostDashboard
        socket={offlineMode ? null : socket}
        gameState={offlineMode ? null : gameState}
        offlineMode={offlineMode}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Notificações */}
      {!offlineMode && (
        <ToastContainer
          position="top-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover
          theme="dark"
        />
      )}
    </div>
  );
}

export default App;
