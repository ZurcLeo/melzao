import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Wifi, WifiOff, Music, Users, Settings, LogOut, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface HeaderProps {
  currentUser: any;
  isConnected: boolean;
  offlineMode: boolean;
  onToggleOffline: () => void;
  onLogin: () => void;
  onLogout: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isConnected,
  offlineMode,
  onToggleOffline,
  onLogin,
  onLogout,
  className,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const getConnectionStatus = () => {
    if (offlineMode) return { text: 'Offline', icon: Music, color: 'text-purple-400' };
    if (isConnected) {
      const userType = currentUser ? currentUser.role : 'Anônimo';
      return {
        text: userType,
        icon: Users,
        color: 'text-success-400'
      };
    }
    return { text: 'Desconectado', icon: WifiOff, color: 'text-error-400' };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 glass-card',
        'border-b border-white/10 backdrop-blur-md',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <motion.div
            className="flex items-center space-x-3 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 rounded-xl bg-lgbt-gradient flex items-center justify-center">
              <span className="text-white font-bold text-xl">🌈</span>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">
                Show do Melzão
              </h1>
              <p className="text-xs text-gray-400">
                Quiz LGBT+ Interativo
              </p>
            </div>
          </motion.div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {/* Ranking Link */}
            <Button
              variant="ghost"
              size="sm"
              icon={<Trophy size={16} />}
              onClick={() => navigate('/ranking')}
              className="hidden sm:flex"
            >
              Ranking
            </Button>

            {/* Offline Mode Toggle */}
            <Button
              variant={offlineMode ? 'primary' : 'ghost'}
              size="sm"
              icon={offlineMode ? <Music size={16} /> : <Wifi size={16} />}
              onClick={onToggleOffline}
              className="hidden sm:flex"
            >
              {offlineMode ? 'Offline' : 'Online'}
            </Button>

            {/* Auth Button */}
            {!offlineMode && (
              <>
                {currentUser ? (
                  <div className="relative">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<User size={16} />}
                      onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                      <span className="hidden sm:inline">
                        {currentUser.name}
                      </span>
                      <span className="sm:hidden">
                        {currentUser.name.charAt(0)}
                      </span>
                    </Button>

                    {/* User Menu Dropdown */}
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-md rounded-xl border border-white/20 shadow-xl z-50">
                        <div className="p-2">
                          <button
                            onClick={() => {
                              navigate('/profile');
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Settings size={16} />
                            Meu Perfil
                          </button>
                          <button
                            onClick={() => {
                              onLogout();
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <LogOut size={16} />
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<User size={16} />}
                    onClick={onLogin}
                  >
                    <span className="hidden sm:inline">Entrar</span>
                    <span className="sm:hidden">🔑</span>
                  </Button>
                )}
              </>
            )}

            {/* Connection Status */}
            <motion.div
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20"
              animate={!isConnected && !offlineMode ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <StatusIcon size={16} className={status.color} />
              <span className={cn('text-sm font-medium', status.color)}>
                {status.text}
              </span>
            </motion.div>
          </div>

          {/* Mobile menu button - pode ser implementado no futuro */}
          <div className="sm:hidden">
            {/* Placeholder para menu mobile */}
          </div>
        </div>
      </div>


      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </motion.header>
  );
};