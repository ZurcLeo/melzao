import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import HostDashboard from './HostDashboard';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5001');

function App() {
  const [gameState, setGameState] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      toast.success('🔌 Conectado ao servidor!');
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
  }, []);

  return (
    <div className="min-h-screen">
      {/* Status de conexão */}
      <div className={`fixed top-4 right-4 px-3 py-1 rounded text-sm z-50 ${
        isConnected
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white animate-pulse'
      }`}>
        {isConnected ? '🟢 Online' : '🔴 Offline'}
      </div>

      {/* App principal */}
      <HostDashboard socket={socket} gameState={gameState} />

      {/* Notificações */}
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
    </div>
  );
}

export default App;
