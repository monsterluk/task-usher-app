import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Navigation from '@/components/Navigation';
import MyStages from '@/components/Worker/MyStages';
import ClockWidget from '@/components/TimeTracking/ClockWidget';
import MobileDashboard from '@/components/Mobile/MobileDashboard';
import MobileOrderDetail from '@/components/Mobile/MobileOrderDetail';
import MobileHistory from '@/components/Mobile/MobileHistory';
import MobileProfile from '@/components/Mobile/MobileProfile';

const WorkerDashboard = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Allow PRACOWNIK and ADMIN to access this dashboard
  const hasAccess = currentUser && (currentUser.role === 'PRACOWNIK' || currentUser.role === 'ADMIN');

  useEffect(() => {
    if (!hasAccess) {
      navigate('/login');
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) {
    return null;
  }

  // Mobile PWA interface
  if (isMobile) {
    return (
      <Routes>
        <Route path="/" element={<MobileDashboard />} />
        <Route path="order/:id" element={<MobileOrderDetail />} />
        <Route path="history" element={<MobileHistory />} />
        <Route path="profile" element={<MobileProfile />} />
        <Route path="stages" element={<MobileDashboard />} />
        <Route path="*" element={<Navigate to="/worker" replace />} />
      </Routes>
    );
  }

  // Desktop interface
  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <main className="container mx-auto p-4">
        {/* Clock Widget - always visible at top */}
        <div className="mb-6">
          <ClockWidget />
        </div>
        <Routes>
          <Route path="stages" element={<MyStages />} />
          <Route path="*" element={<Navigate to="stages" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default WorkerDashboard;
