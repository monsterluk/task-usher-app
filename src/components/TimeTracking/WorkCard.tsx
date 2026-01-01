import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar, Download, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { timeTrackingApi, workersApi, isDemoMode } from '@/utils/api';
import { WorkerWorkCard, WorkTimeEntry, DayOff, Worker, DAY_OFF_TYPE_LABELS, DAY_OFF_TYPE_COLORS } from '@/types';

const WorkCard = () => {
  const { currentUser } = useApp();
  const [workCard, setWorkCard] = useState<WorkerWorkCard | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'KIEROWNIK';

  // Fetch workers list (for managers)
  useEffect(() => {
    const fetchWorkers = async () => {
      if (isDemoMode()) {
        setWorkers([
          { id: 1, name: 'Jan Kowalski', email: 'jan@test.pl', position: 'FREZOWANIE', role: 'PRACOWNIK', skills: [], active: true },
          { id: 2, name: 'Anna Nowak', email: 'anna@test.pl', position: 'LASER', role: 'PRACOWNIK', skills: [], active: true },
          { id: 3, name: 'Piotr Wiśniewski', email: 'piotr@test.pl', position: 'POLEROWANIE', role: 'PRACOWNIK', skills: [], active: true },
        ]);
        return;
      }
      try {
        const data = await workersApi.getAll();
        setWorkers(data.filter((w: Worker) => w.active));
      } catch (err) {
        console.error('Error fetching workers:', err);
      }
    };
    fetchWorkers();
  }, []);

  // Set initial selected worker
  useEffect(() => {
    if (!selectedWorkerId) {
      if (isManager && workers.length > 0) {
        setSelectedWorkerId(workers[0].id);
      } else if (currentUser?.id) {
        setSelectedWorkerId(currentUser.id);
      }
    }
  }, [workers, currentUser, isManager, selectedWorkerId]);

  // Fetch work card data
  useEffect(() => {
    const fetchWorkCard = async () => {
      if (!selectedWorkerId) return;

      setLoading(true);
      setError(null);

      if (isDemoMode()) {
        // Generate demo data
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const demoEntries: WorkTimeEntry[] = [];
        const demoDaysOff: DayOff[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(currentYear, currentMonth - 1, day);
          const dayOfWeek = date.getDay();

          // Skip weekends
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;

          // Random day off
          if (Math.random() < 0.1) {
            demoDaysOff.push({
              id: day,
              worker_id: selectedWorkerId,
              worker_name: 'Demo Worker',
              start_date: date.toISOString().split('T')[0],
              end_date: date.toISOString().split('T')[0],
              type: 'URLOP_WYPOCZYNKOWY',
              status: 'approved',
              notes: null,
              requested_by: selectedWorkerId,
              approved_by: 1,
              approved_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            continue;
          }

          // Generate entry
          const entryHour = 7 + Math.floor(Math.random() * 2);
          const entryMin = Math.floor(Math.random() * 60);
          const exitHour = 15 + Math.floor(Math.random() * 3);
          const exitMin = Math.floor(Math.random() * 60);

          const entryTime = new Date(currentYear, currentMonth - 1, day, entryHour, entryMin);
          const exitTime = new Date(currentYear, currentMonth - 1, day, exitHour, exitMin);

          // Smooth entry up to 15 min
          const entrySmoothed = new Date(entryTime);
          const entryRemainder = entrySmoothed.getMinutes() % 15;
          if (entryRemainder !== 0) {
            entrySmoothed.setMinutes(entrySmoothed.getMinutes() + (15 - entryRemainder));
          }

          // Smooth exit down to 15 min
          const exitSmoothed = new Date(exitTime);
          const exitRemainder = exitSmoothed.getMinutes() % 15;
          exitSmoothed.setMinutes(exitSmoothed.getMinutes() - exitRemainder);

          const workMinutes = Math.round((exitTime.getTime() - entryTime.getTime()) / 60000);
          const workMinutesSmoothed = Math.round((exitSmoothed.getTime() - entrySmoothed.getTime()) / 60000);
          const overtime = Math.max(0, workMinutesSmoothed - 480);

          demoEntries.push({
            id: day,
            worker_id: selectedWorkerId,
            worker_name: 'Demo Worker',
            entry_time: entryTime.toISOString(),
            exit_time: exitTime.toISOString(),
            shift: 'DZIEŃ',
            entry_time_smoothed: entrySmoothed.toISOString(),
            exit_time_smoothed: exitSmoothed.toISOString(),
            work_minutes: workMinutes,
            work_minutes_smoothed: workMinutesSmoothed,
            overtime_minutes: overtime,
            break_minutes: 30,
            notes: null,
            source: 'manual',
            created_by: 1,
            approved_by: null,
            approved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        const totalMinutes = demoEntries.reduce((sum, e) => sum + (e.work_minutes || 0), 0);
        const totalMinutesSmoothed = demoEntries.reduce((sum, e) => sum + (e.work_minutes_smoothed || 0), 0);
        const totalOvertime = demoEntries.reduce((sum, e) => sum + e.overtime_minutes, 0);

        setWorkCard({
          worker: {
            id: selectedWorkerId,
            name: workers.find(w => w.id === selectedWorkerId)?.name || 'Pracownik',
            position: workers.find(w => w.id === selectedWorkerId)?.position || 'PRACOWNIK',
          },
          year: currentYear,
          month: currentMonth,
          entries: demoEntries,
          daysOff: demoDaysOff,
          summary: {
            workDays: demoEntries.length,
            absenceDays: demoDaysOff.length,
            totalWorkMinutes: totalMinutes,
            totalWorkMinutesSmoothed: totalMinutesSmoothed,
            baseMinutesSmoothed: totalMinutesSmoothed - totalOvertime,
            overtimeMinutesSmoothed: totalOvertime,
          },
        });
        setLoading(false);
        return;
      }

      try {
        const data = await timeTrackingApi.getWorkerWorkCard(selectedWorkerId, currentYear, currentMonth);
        setWorkCard(data);
      } catch (err: any) {
        setError(err.message || 'Błąd podczas pobierania danych');
        console.error('Error fetching work card:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkCard();
  }, [selectedWorkerId, currentYear, currentMonth, workers]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMinutes = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
  };

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Niedz.', 'Pon.', 'Wt.', 'Śr.', 'Czw.', 'Pt.', 'Sob.'];
    return days[date.getDay()];
  };

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];

  // Generate all days for the month view
  const generateMonthDays = () => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const days: {
      date: string;
      dayOfMonth: number;
      entry: WorkTimeEntry | null;
      dayOff: DayOff | null;
    }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Find entry for this day
      const entry = workCard?.entries.find(e => {
        const entryDate = new Date(e.entry_time).toISOString().split('T')[0];
        return entryDate === dateStr;
      }) || null;

      // Find day off for this day
      const dayOff = workCard?.daysOff.find(d => {
        return dateStr >= d.start_date && dateStr <= d.end_date;
      }) || null;

      days.push({
        date: dateStr,
        dayOfMonth: day,
        entry,
        dayOff,
      });
    }

    return days;
  };

  const exportToCSV = () => {
    if (!workCard) return;

    const monthDays = generateMonthDays();
    const headers = [
      'Data',
      'Dzień',
      'Wejście',
      'Wyjście',
      'Wejście (zaokr.)',
      'Wyjście (zaokr.)',
      'Czas pracy',
      'Czas (zaokr.)',
      'Nadgodziny',
      'Status'
    ];

    const rows = monthDays.map(day => {
      const weekend = isWeekend(day.date);
      let status = weekend ? 'Weekend' : '';

      if (day.dayOff) {
        status = DAY_OFF_TYPE_LABELS[day.dayOff.type] || day.dayOff.type;
      } else if (!day.entry && !weekend) {
        status = 'Brak wpisu';
      }

      return [
        formatDate(day.date),
        getDayOfWeek(day.date),
        day.entry ? formatTime(day.entry.entry_time) : '-',
        day.entry ? formatTime(day.entry.exit_time) : '-',
        day.entry ? formatTime(day.entry.entry_time_smoothed) : '-',
        day.entry ? formatTime(day.entry.exit_time_smoothed) : '-',
        day.entry ? formatMinutes(day.entry.work_minutes) : '-',
        day.entry ? formatMinutes(day.entry.work_minutes_smoothed) : '-',
        day.entry ? formatMinutes(day.entry.overtime_minutes) : '-',
        status
      ].join(',');
    });

    // Add summary row
    rows.push('');
    rows.push(`Podsumowanie miesiąca: ${monthNames[currentMonth - 1]} ${currentYear}`);
    rows.push(`Dni pracy: ${workCard.summary.workDays}`);
    rows.push(`Dni nieobecności: ${workCard.summary.absenceDays}`);
    rows.push(`Łączny czas pracy (zaokr.): ${formatMinutes(workCard.summary.totalWorkMinutesSmoothed)}`);
    rows.push(`W tym nadgodziny: ${formatMinutes(workCard.summary.overtimeMinutesSmoothed)}`);

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `karta_pracy_${workCard.worker.name.replace(/\s+/g, '_')}_${currentYear}_${String(currentMonth).padStart(2, '0')}.csv`;
    link.click();
  };

  const monthDays = workCard ? generateMonthDays() : [];

  return (
    <div className="space-y-6">
      {/* Header with worker selection and month navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          {isManager && (
            <div className="flex items-center gap-2">
              <User size={18} className="text-muted-foreground" />
              <select
                value={selectedWorkerId || ''}
                onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                className="input-industrial min-w-[200px]"
              >
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold min-w-[150px] text-center">
            {monthNames[currentMonth - 1]} {currentYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button
          onClick={exportToCSV}
          className="btn-industrial flex items-center gap-2"
          disabled={!workCard}
        >
          <Download size={18} />
          Eksportuj CSV
        </button>
      </div>

      {/* Summary Cards */}
      {workCard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-industrial p-4">
            <div className="text-sm text-muted-foreground mb-1">Dni pracy</div>
            <div className="text-2xl font-bold text-primary">{workCard.summary.workDays}</div>
          </div>
          <div className="card-industrial p-4">
            <div className="text-sm text-muted-foreground mb-1">Dni nieobecności</div>
            <div className="text-2xl font-bold text-orange-500">{workCard.summary.absenceDays}</div>
          </div>
          <div className="card-industrial p-4">
            <div className="text-sm text-muted-foreground mb-1">Łączny czas (zaokr.)</div>
            <div className="text-2xl font-bold">{formatMinutes(workCard.summary.totalWorkMinutesSmoothed)}</div>
          </div>
          <div className="card-industrial p-4">
            <div className="text-sm text-muted-foreground mb-1">Nadgodziny</div>
            <div className="text-2xl font-bold text-blue-600">{formatMinutes(workCard.summary.overtimeMinutesSmoothed)}</div>
          </div>
        </div>
      )}

      {/* Loading / Error states */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Clock className="animate-spin text-primary" size={32} />
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Work Card Table */}
      {!loading && !error && workCard && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border px-3 py-2 text-left font-semibold">Data</th>
                <th className="border border-border px-3 py-2 text-left font-semibold">Dzień</th>
                <th className="border border-border px-3 py-2 text-center font-semibold">Wejście</th>
                <th className="border border-border px-3 py-2 text-center font-semibold">Wyjście</th>
                <th className="border border-border px-3 py-2 text-center font-semibold bg-green-50 dark:bg-green-900/20">Wejście (zaokr.)</th>
                <th className="border border-border px-3 py-2 text-center font-semibold bg-green-50 dark:bg-green-900/20">Wyjście (zaokr.)</th>
                <th className="border border-border px-3 py-2 text-center font-semibold">Czas pracy</th>
                <th className="border border-border px-3 py-2 text-center font-semibold bg-green-50 dark:bg-green-900/20">Czas (zaokr.)</th>
                <th className="border border-border px-3 py-2 text-center font-semibold">Nadgodziny</th>
                <th className="border border-border px-3 py-2 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {monthDays.map((day) => {
                const weekend = isWeekend(day.date);
                const rowClass = weekend
                  ? 'bg-gray-100 dark:bg-gray-800/50'
                  : day.dayOff
                  ? 'bg-orange-50 dark:bg-orange-900/20'
                  : '';

                return (
                  <tr key={day.date} className={rowClass}>
                    <td className="border border-border px-3 py-2 whitespace-nowrap">
                      {formatDate(day.date)}
                    </td>
                    <td className="border border-border px-3 py-2 whitespace-nowrap">
                      {getDayOfWeek(day.date)}
                    </td>
                    <td className="border border-border px-3 py-2 text-center">
                      {day.entry ? formatTime(day.entry.entry_time) : '-'}
                    </td>
                    <td className="border border-border px-3 py-2 text-center">
                      {day.entry ? formatTime(day.entry.exit_time) : '-'}
                    </td>
                    <td className="border border-border px-3 py-2 text-center bg-green-50/50 dark:bg-green-900/10 font-medium">
                      {day.entry ? formatTime(day.entry.entry_time_smoothed) : '-'}
                    </td>
                    <td className="border border-border px-3 py-2 text-center bg-green-50/50 dark:bg-green-900/10 font-medium">
                      {day.entry ? formatTime(day.entry.exit_time_smoothed) : '-'}
                    </td>
                    <td className="border border-border px-3 py-2 text-center text-muted-foreground">
                      {day.entry ? formatMinutes(day.entry.work_minutes) : '-'}
                    </td>
                    <td className="border border-border px-3 py-2 text-center bg-green-50/50 dark:bg-green-900/10 font-semibold">
                      {day.entry ? formatMinutes(day.entry.work_minutes_smoothed) : '-'}
                    </td>
                    <td className="border border-border px-3 py-2 text-center">
                      {day.entry && day.entry.overtime_minutes > 0 ? (
                        <span className="text-blue-600 font-medium">
                          {formatMinutes(day.entry.overtime_minutes)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="border border-border px-3 py-2">
                      {weekend ? (
                        <span className="text-muted-foreground text-sm">Weekend</span>
                      ) : day.dayOff ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white ${DAY_OFF_TYPE_COLORS[day.dayOff.type]}`}>
                          {DAY_OFF_TYPE_LABELS[day.dayOff.type]}
                        </span>
                      ) : !day.entry ? (
                        <span className="text-muted-foreground text-sm">Brak wpisu</span>
                      ) : (
                        <span className="text-green-600 text-sm">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Summary Footer */}
            <tfoot className="bg-muted/30 font-semibold">
              <tr>
                <td colSpan={6} className="border border-border px-3 py-2 text-right">
                  Suma:
                </td>
                <td className="border border-border px-3 py-2 text-center text-muted-foreground">
                  {formatMinutes(workCard.summary.totalWorkMinutes)}
                </td>
                <td className="border border-border px-3 py-2 text-center bg-green-50/50 dark:bg-green-900/10">
                  {formatMinutes(workCard.summary.totalWorkMinutesSmoothed)}
                </td>
                <td className="border border-border px-3 py-2 text-center text-blue-600">
                  {formatMinutes(workCard.summary.overtimeMinutesSmoothed)}
                </td>
                <td className="border border-border px-3 py-2">
                  {workCard.summary.workDays} dni
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 dark:bg-green-900/20 border border-green-300 rounded"></div>
          <span>Zaokrąglony czas (do wypłaty)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800/50 border border-gray-300 rounded"></div>
          <span>Weekend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-300 rounded"></div>
          <span>Nieobecność</span>
        </div>
      </div>
    </div>
  );
};

export default WorkCard;
