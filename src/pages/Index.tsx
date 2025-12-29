import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import ManagerLogin from '@/components/Manager/ManagerLogin';

const Index = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      // Route based on role
      switch (currentUser.role) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'KIEROWNIK':
          navigate('/manager/dashboard');
          break;
        case 'GRAFIK':
          navigate('/grafik');
          break;
        case 'HANDLOWIEC':
          navigate('/handlowiec');
          break;
        case 'PRACOWNIK':
        default:
          navigate('/worker/stages');
          break;
      }
    }
  }, [currentUser, navigate]);

  if (currentUser) {
    return null;
  }

  return <ManagerLogin />;
};

export default Index;
