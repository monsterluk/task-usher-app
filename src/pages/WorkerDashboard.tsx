import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Navigation from '@/components/Navigation';
import MyStages from '@/components/Worker/MyStages';

const WorkerDashboard = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'worker') {
      navigate('/worker/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'worker') {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <main className="container mx-auto">
        <Routes>
          <Route path="stages" element={<MyStages />} />
          <Route path="*" element={<Navigate to="stages" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default WorkerDashboard;
