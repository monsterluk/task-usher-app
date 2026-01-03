import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import ManagerLogin from '@/components/Manager/ManagerLogin';

const Index = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      // Dwa typy paneli: Manager i Pracownik
      if (currentUser.role === 'PRACOWNIK') {
        navigate('/worker');
      } else {
        // ADMIN, KIEROWNIK, HANDLOWIEC
        navigate('/manager/orders');
      }
    }
  }, [currentUser, navigate]);

  if (currentUser) {
    return null;
  }

  return <ManagerLogin />;
};

export default Index;
