import { useState } from 'react';
import { Clock, Calendar, User, Users, Settings } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import WorkTimeRegistration from './WorkTimeRegistration';
import DaysOffCalendar from './DaysOffCalendar';
import WorkCard from './WorkCard';
import MonthlySummary from './MonthlySummary';

type TabType = 'entries' | 'days-off' | 'work-card' | 'summary';

const TimeTracking = () => {
  const [activeTab, setActiveTab] = useState<TabType>('entries');
  const { currentUser } = useApp();

  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'KIEROWNIK';

  const tabs: { id: TabType; label: string; icon: React.ReactNode; managerOnly?: boolean }[] = [
    { id: 'entries', label: 'Rejestracja czasu', icon: <Clock size={18} /> },
    { id: 'days-off', label: 'Dni wolne', icon: <Calendar size={18} /> },
    { id: 'work-card', label: 'Karta pracy', icon: <User size={18} /> },
    { id: 'summary', label: 'Podsumowanie', icon: <Users size={18} />, managerOnly: true },
  ];

  const visibleTabs = tabs.filter(tab => !tab.managerOnly || isManager);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Clock className="text-primary" />
          Rejestracja Czasu Pracy
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-muted pb-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-muted/50 hover:bg-muted text-muted-foreground'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card-industrial">
        {activeTab === 'entries' && <WorkTimeRegistration />}
        {activeTab === 'days-off' && <DaysOffCalendar />}
        {activeTab === 'work-card' && <WorkCard />}
        {activeTab === 'summary' && isManager && <MonthlySummary />}
      </div>
    </div>
  );
};

export default TimeTracking;
