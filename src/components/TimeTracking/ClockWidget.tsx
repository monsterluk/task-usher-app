import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { timeTrackingApi, isDemoMode } from '@/utils/api';
import { toast } from 'sonner';
import { Clock, LogIn, LogOut, Loader2 } from 'lucide-react';

interface WorkStatus {
  isClockedIn: boolean;
  entryTime: string | null;
  entryId: number | null;
}

const ClockWidget = () => {
  const { currentUser } = useApp();
  const [status, setStatus] = useState<WorkStatus>({
    isClockedIn: false,
    entryTime: null,
    entryId: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load current status
  useEffect(() => {
    loadStatus();
  }, [currentUser]);

  const loadStatus = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      if (isDemoMode()) {
        // Demo mode - check localStorage
        const demoStatus = localStorage.getItem('demoClockStatus');
        if (demoStatus) {
          setStatus(JSON.parse(demoStatus));
        }
        setLoading(false);
        return;
      }

      // Get today's entries for current user
      const today = new Date().toISOString().split('T')[0];
      const response = await timeTrackingApi.getEntries({
        worker_id: currentUser.id,
        start_date: today,
        end_date: today,
      });

      // API returns array directly, not {success, data} object
      const entries = Array.isArray(response) ? response : (response.data || []);

      if (entries.length > 0) {
        // Find open entry (no exit_time)
        const openEntry = entries.find((e: any) => !e.exit_time);
        if (openEntry) {
          setStatus({
            isClockedIn: true,
            entryTime: openEntry.entry_time,
            entryId: openEntry.id,
          });
        } else {
          setStatus({ isClockedIn: false, entryTime: null, entryId: null });
        }
      } else {
        setStatus({ isClockedIn: false, entryTime: null, entryId: null });
      }
    } catch (error) {
      console.error('Failed to load clock status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setSaving(true);
    try {
      if (isDemoMode()) {
        const newStatus: WorkStatus = {
          isClockedIn: true,
          entryTime: new Date().toISOString(),
          entryId: Date.now(),
        };
        setStatus(newStatus);
        localStorage.setItem('demoClockStatus', JSON.stringify(newStatus));
        toast.success('Zarejestrowano rozpoczęcie pracy');
      } else {
        const response = await timeTrackingApi.clockIn();
        // API returns the entry directly or {success, data} object
        const entry = response.data || response;
        if (entry && entry.id) {
          setStatus({
            isClockedIn: true,
            entryTime: entry.entry_time,
            entryId: entry.id,
          });
          toast.success('Zarejestrowano rozpoczęcie pracy');
        } else if (response.error) {
          throw new Error(response.error);
        } else {
          throw new Error('Błąd rejestracji');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Błąd rejestracji wejścia');
    } finally {
      setSaving(false);
    }
  };

  const handleClockOut = async () => {
    setSaving(true);
    try {
      if (isDemoMode()) {
        const newStatus: WorkStatus = {
          isClockedIn: false,
          entryTime: null,
          entryId: null,
        };
        setStatus(newStatus);
        localStorage.removeItem('demoClockStatus');
        toast.success('Zarejestrowano zakończenie pracy');
      } else {
        const response = await timeTrackingApi.clockOut();
        // API returns the updated entry directly or {success, data} object
        const entry = response.data || response;
        if (entry && entry.exit_time) {
          setStatus({ isClockedIn: false, entryTime: null, entryId: null });
          toast.success('Zarejestrowano zakończenie pracy');
        } else if (response.error) {
          throw new Error(response.error);
        } else {
          // Assume success if we got a response without error
          setStatus({ isClockedIn: false, entryTime: null, entryId: null });
          toast.success('Zarejestrowano zakończenie pracy');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Błąd rejestracji wyjścia');
    } finally {
      setSaving(false);
    }
  };

  // Calculate work duration
  const getWorkDuration = () => {
    if (!status.entryTime) return null;
    const entry = new Date(status.entryTime);
    const now = currentTime;
    const diffMs = now.getTime() - entry.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatEntryTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="card-industrial p-6">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={20} />
          <span>Ładowanie...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`card-industrial p-6 ${status.isClockedIn ? 'border-green-500 border-2' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Status & Time */}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${status.isClockedIn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
            <Clock size={32} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono">{formatTime(currentTime)}</div>
            <div className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Work Status */}
        <div className="flex flex-col items-center md:items-end gap-2">
          {status.isClockedIn ? (
            <>
              <div className="flex items-center gap-2 text-green-600 font-semibold">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                W pracy od {formatEntryTime(status.entryTime!)}
              </div>
              <div className="text-lg font-mono font-bold">
                Czas pracy: {getWorkDuration()}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">
              Nie jesteś zalogowany do pracy
            </div>
          )}
        </div>

        {/* Action Button */}
        <div>
          {status.isClockedIn ? (
            <button
              onClick={handleClockOut}
              disabled={saving}
              className="btn-primary bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-lg flex items-center gap-2 w-full md:w-auto justify-center"
            >
              {saving ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <LogOut size={24} />
              )}
              Zakończ pracę
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={saving}
              className="btn-primary bg-green-500 hover:bg-green-600 text-white px-6 py-3 text-lg flex items-center gap-2 w-full md:w-auto justify-center"
            >
              {saving ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <LogIn size={24} />
              )}
              Rozpocznij pracę
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClockWidget;
