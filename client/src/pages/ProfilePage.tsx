import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserProfile from '../components/UserProfile';
import { Button } from '../components/ui/Button';

interface ProfilePageProps {
  currentUser: any;
  authToken: string;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser, authToken }) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1); // Volta para a página anterior
  };

  // Redirect to home if not logged in
  React.useEffect(() => {
    if (!currentUser || !authToken) {
      navigate('/');
    }
  }, [currentUser, authToken, navigate]);

  if (!currentUser || !authToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Acesso Negado</h1>
          <p className="text-gray-300 mb-6">Você precisa estar logado para acessar esta página.</p>
          <Button onClick={handleGoBack} variant="primary">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 pt-20 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header da página */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            icon={<ArrowLeft size={20} />}
            className="mb-4"
          >
            Voltar
          </Button>

          <div className="text-center">
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Configurações do Perfil
            </h1>
            <p className="text-gray-300 text-lg">
              Gerencie suas informações pessoais e configurações de segurança
            </p>
          </div>
        </div>

        {/* Componente de perfil sem modal */}
        <div className="w-full">
          <UserProfile
            currentUser={currentUser}
            authToken={authToken}
            onClose={handleGoBack}
            isFullPage={true}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;