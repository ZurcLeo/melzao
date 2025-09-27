import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header, Container } from './components/layout';
import HostDashboard from './HostDashboard';
import ProfilePage from './pages/ProfilePage';
import { ToastContainer } from 'react-toastify';

interface AppRouterProps {
  currentUser: any;
  authToken: string | null;
  isConnected: boolean;
  offlineMode: boolean;
  socket: any;
  gameState: any;
  onToggleOffline: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

const AppRouter: React.FC<AppRouterProps> = ({
  currentUser,
  authToken,
  isConnected,
  offlineMode,
  socket,
  gameState,
  onToggleOffline,
  onLogin,
  onLogout
}) => {
  return (
    <Router>
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
          onToggleOffline={onToggleOffline}
          onLogin={onLogin}
          onLogout={onLogout}
        />

        {/* Rotas */}
        <Routes>
          {/* Página principal do dashboard */}
          <Route
            path="/"
            element={
              <Container size="full" padding="none" className="pt-20">
                <HostDashboard
                  socket={offlineMode ? null : socket}
                  gameState={offlineMode ? null : gameState}
                  offlineMode={offlineMode}
                />
              </Container>
            }
          />

          {/* Página de perfil */}
          <Route
            path="/profile"
            element={
              <ProfilePage
                currentUser={currentUser}
                authToken={authToken || ''}
              />
            }
          />
        </Routes>

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
    </Router>
  );
};

export default AppRouter;