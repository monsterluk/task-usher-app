import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import ManagerLogin from '@/components/Manager/ManagerLogin';

const Index = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        navigate('/admin');
      } else if (currentUser.role === 'manager') {
        navigate('/manager/dashboard');
      } else {
        navigate('/worker/stages');
      }
    }
  }, [currentUser, navigate]);

  if (currentUser) {
    return null;
  }

  return <ManagerLogin />;
};

export default Index;
