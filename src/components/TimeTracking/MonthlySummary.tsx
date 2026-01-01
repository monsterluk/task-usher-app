import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Users, Clock, Calendar, TrendingUp } from 'lucide-react';
import { timeTrackingApi, isDemoMode } from '@/utils/api';
import { WorkerMonthlySummary } from '@/types';

const MonthlySummary = () => {
  const [summaries, setSummaries] = useState<WorkerMonthlySummary[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'name' | 'work_days' | 'overtime'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Fetch summary data
  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);

      if (isDemoMode()) {
        // Generate demo data
        const demoData: WorkerMonthlySummary[] = [
          {
            worker_id: 1,
            worker_name: 'Jan Kowalski',
            position: 'FREZOWANIE',
            work_days: 20,
            absence_days: 2,
            total_work_minutes: 9720,
            total_work_minutes_smoothed: 9600,
            base_minutes_smoothed: 9600,
            overtime_minutes_smoothed: 0,
          },
          {
            worker_id: 2,
            worker_name: 'Anna Nowak',
            position: 'LASER',
            work_days: 21,
            absence_days: 1,
            total_work_minutes: 10500,
            total_work_minutes_smoothed: 10320,
            base_minutes_smoothed: 10080,
            overtime_minutes_smoothed: 240,
          },
          {
            worker_id: 3,
            worker_name: 'Piotr Wiśniewski',
            position: 'POLEROWANIE',
            work_days: 19,
            absence_days: 3,
            total_work_minutes: 9180,
            total_work_minutes_smoothed: 9120,
            base_minutes_smoothed: 9120,
            overtime_minutes_smoothed: 0,
          },
          {
            worker_id: 4,
            worker_name: 'Maria Zielińska',
            position: 'PAKOWANIE',
            work_days: 22,
            absence_days: 0,
            total_work_minutes: 11220,
            total_work_minutes_smoothed: 10980,
            base_minutes_smoothed: 10560,
            overtime_minutes_smoothed: 420,
          },
          {
            worker_id: 5,
            worker_name: 'Tomasz Dąbrowski',
            position: 'KLEJENIE',
            work_days: 18,
            absence_days: 4,
            total_work_minutes: 8640,
            total_work_minutes_smoothed: 8640,
            base_minutes_smoothed: 8640,
            overtime_minutes_smoothed: 0,
          },
        ];
        setSummaries(demoData);
        setLoading(false);
        return;
      }

      try {
        const data = await timeTrackingApi.getMonthlySummary(currentYear, currentMonth);
        setSummaries(data);
      } catch (err: any) {
        setError(err.message || 'Błąd podczas pobierania danych');
        console.error('Error fetching monthly summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [currentYear, currentMonth]);

  const formatMinutes = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatHoursDecimal = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return '-';
    return (minutes / 60).toFixed(2);
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

  // Sort summaries
  const sortedSummaries = [...summaries].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.worker_name.localeCompare(b.worker_name);
        break;
      case 'work_days':
        comparison = a.work_days - b.work_days;
        break;
      case 'overtime':
        comparison = a.overtime_minutes_smoothed - b.overtime_minutes_smoothed;
        break;
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });

  // Calculate totals
  const totals = summaries.reduce(
    (acc, s) => ({
      workDays: acc.workDays + s.work_days,
      absenceDays: acc.absenceDays + s.absence_days,
      totalMinutes: acc.totalMinutes + s.total_work_minutes,
      totalMinutesSmoothed: acc.totalMinutesSmoothed + s.total_work_minutes_smoothed,
      baseMinutesSmoothed: acc.baseMinutesSmoothed + s.base_minutes_smoothed,
      overtimeMinutesSmoothed: acc.overtimeMinutesSmoothed + s.overtime_minutes_smoothed,
    }),
    { workDays: 0, absenceDays: 0, totalMinutes: 0, totalMinutesSmoothed: 0, baseMinutesSmoothed: 0, overtimeMinutesSmoothed: 0 }
  );

  const handleSort = (field: 'name' | 'work_days' | 'overtime') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Pracownik',
      'Stanowisko',
      'Dni pracy',
      'Nieobecności',
      'Czas pracy (min)',
      'Czas pracy (zaokr. min)',
      'Czas pracy (zaokr. godz.)',
      'Czas bazowy (min)',
      'Nadgodziny (min)',
      'Nadgodziny (godz.)',
    ];

    const rows = sortedSummaries.map(s => [
      s.worker_name,
      s.position,
      s.work_days,
      s.absence_days,
      s.total_work_minutes,
      s.total_work_minutes_smoothed,
      formatHoursDecimal(s.total_work_minutes_smoothed),
      s.base_minutes_smoothed,
      s.overtime_minutes_smoothed,
      formatHoursDecimal(s.overtime_minutes_smoothed),
    ].join(','));

    // Add totals row
    rows.push([
      'RAZEM',
      '-',
      totals.workDays,
      totals.absenceDays,
      totals.totalMinutes,
      totals.totalMinutesSmoothed,
      formatHoursDecimal(totals.totalMinutesSmoothed),
      totals.baseMinutesSmoothed,
      totals.overtimeMinutesSmoothed,
      formatHoursDecimal(totals.overtimeMinutesSmoothed),
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `podsumowanie_miesieczne_${currentYear}_${String(currentMonth).padStart(2, '0')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users size={24} className="text-primary" />
          Podsumowanie Miesięczne
        </h2>

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
          disabled={summaries.length === 0}
        >
          <Download size={18} />
          Eksportuj CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-industrial p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users size={16} />
            Pracowników
          </div>
          <div className="text-2xl font-bold text-primary">{summaries.length}</div>
        </div>
        <div className="card-industrial p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Calendar size={16} />
            Łączne dni pracy
          </div>
          <div className="text-2xl font-bold">{totals.workDays}</div>
        </div>
        <div className="card-industrial p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock size={16} />
            Łączny czas (zaokr.)
          </div>
          <div className="text-2xl font-bold">{formatMinutes(totals.totalMinutesSmoothed)}</div>
        </div>
        <div className="card-industrial p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp size={16} />
            Łączne nadgodziny
          </div>
          <div className="text-2xl font-bold text-blue-600">{formatMinutes(totals.overtimeMinutesSmoothed)}</div>
        </div>
      </div>

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

      {/* Summary Table */}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th
                  className="border border-border px-3 py-2 text-left font-semibold cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('name')}
                >
                  Pracownik {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="border border-border px-3 py-2 text-left font-semibold">Stanowisko</th>
                <th
                  className="border border-border px-3 py-2 text-center font-semibold cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('work_days')}
                >
                  Dni pracy {sortField === 'work_days' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="border border-border px-3 py-2 text-center font-semibold">Nieobecności</th>
                <th className="border border-border px-3 py-2 text-center font-semibold">Czas pracy</th>
                <th className="border border-border px-3 py-2 text-center font-semibold bg-green-50 dark:bg-green-900/20">
                  Czas (zaokr.)
                </th>
                <th className="border border-border px-3 py-2 text-center font-semibold bg-green-50 dark:bg-green-900/20">
                  Godz. (zaokr.)
                </th>
                <th
                  className="border border-border px-3 py-2 text-center font-semibold cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('overtime')}
                >
                  Nadgodziny {sortField === 'overtime' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="border border-border px-3 py-2 text-center font-semibold">Nadgodz. (godz.)</th>
              </tr>
            </thead>
            <tbody>
              {sortedSummaries.map((summary) => (
                <tr key={summary.worker_id} className="hover:bg-muted/30">
                  <td className="border border-border px-3 py-2 font-medium">
                    {summary.worker_name}
                  </td>
                  <td className="border border-border px-3 py-2 text-muted-foreground">
                    {summary.position}
                  </td>
                  <td className="border border-border px-3 py-2 text-center">
                    {summary.work_days}
                  </td>
                  <td className="border border-border px-3 py-2 text-center">
                    {summary.absence_days > 0 ? (
                      <span className="text-orange-600 font-medium">{summary.absence_days}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-muted-foreground">
                    {formatMinutes(summary.total_work_minutes)}
                  </td>
                  <td className="border border-border px-3 py-2 text-center bg-green-50/50 dark:bg-green-900/10 font-semibold">
                    {formatMinutes(summary.total_work_minutes_smoothed)}
                  </td>
                  <td className="border border-border px-3 py-2 text-center bg-green-50/50 dark:bg-green-900/10">
                    {formatHoursDecimal(summary.total_work_minutes_smoothed)}h
                  </td>
                  <td className="border border-border px-3 py-2 text-center">
                    {summary.overtime_minutes_smoothed > 0 ? (
                      <span className="text-blue-600 font-medium">
                        {formatMinutes(summary.overtime_minutes_smoothed)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="border border-border px-3 py-2 text-center">
                    {summary.overtime_minutes_smoothed > 0 ? (
                      <span className="text-blue-600">
                        {formatHoursDecimal(summary.overtime_minutes_smoothed)}h
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Summary Footer */}
            <tfoot className="bg-muted/30 font-semibold">
              <tr>
                <td className="border border-border px-3 py-2">RAZEM</td>
                <td className="border border-border px-3 py-2 text-center">{summaries.length} os.</td>
                <td className="border border-border px-3 py-2 text-center">{totals.workDays}</td>
                <td className="border border-border px-3 py-2 text-center text-orange-600">{totals.absenceDays}</td>
                <td className="border border-border px-3 py-2 text-center text-muted-foreground">
                  {formatMinutes(totals.totalMinutes)}
                </td>
                <td className="border border-border px-3 py-2 text-center bg-green-50/50 dark:bg-green-900/10">
                  {formatMinutes(totals.totalMinutesSmoothed)}
                </td>
                <td className="border border-border px-3 py-2 text-center bg-green-50/50 dark:bg-green-900/10">
                  {formatHoursDecimal(totals.totalMinutesSmoothed)}h
                </td>
                <td className="border border-border px-3 py-2 text-center text-blue-600">
                  {formatMinutes(totals.overtimeMinutesSmoothed)}
                </td>
                <td className="border border-border px-3 py-2 text-center text-blue-600">
                  {formatHoursDecimal(totals.overtimeMinutesSmoothed)}h
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && summaries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p>Brak danych za wybrany miesiąc</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 dark:bg-green-900/20 border border-green-300 rounded"></div>
          <span>Zaokrąglony czas (do wypłaty)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-600 font-medium">Kolor niebieski</span>
          <span>Nadgodziny</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-600 font-medium">Kolor pomarańczowy</span>
          <span>Nieobecności</span>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummary;
