import { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Calendar,
  Package,
  Users,
  Clock,
  CheckCircle,
  Filter,
  X
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface ExportConfig {
  type: 'orders' | 'workers' | 'timesheets' | 'production';
  format: 'excel' | 'pdf' | 'csv';
  dateFrom: string;
  dateTo: string;
  status: string[];
  includeArchived: boolean;
}

const DataExport = () => {
  const { orders, workers } = useApp();
  const [exporting, setExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [config, setConfig] = useState<ExportConfig>({
    type: 'orders',
    format: 'excel',
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    status: ['NOWE', 'W_TRAKCIE', 'GOTOWE'],
    includeArchived: false
  });

  const exportTypes = [
    { id: 'orders', label: 'Zlecenia', icon: Package, description: 'Lista zlecen z danymi' },
    { id: 'workers', label: 'Pracownicy', icon: Users, description: 'Dane pracownikow' },
    { id: 'timesheets', label: 'Czas pracy', icon: Clock, description: 'Zestawienie godzin' },
    { id: 'production', label: 'Produkcja', icon: CheckCircle, description: 'Raport produkcji' }
  ];

  const handleExport = async () => {
    setExporting(true);

    try {
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Prepare data based on type
      let data: any[] = [];
      let filename = '';

      switch (config.type) {
        case 'orders':
          data = prepareOrdersData();
          filename = `zlecenia_${config.dateFrom}_${config.dateTo}`;
          break;
        case 'workers':
          data = prepareWorkersData();
          filename = `pracownicy_${new Date().toISOString().split('T')[0]}`;
          break;
        case 'timesheets':
          data = prepareTimesheetsData();
          filename = `czas_pracy_${config.dateFrom}_${config.dateTo}`;
          break;
        case 'production':
          data = prepareProductionData();
          filename = `produkcja_${config.dateFrom}_${config.dateTo}`;
          break;
      }

      // Generate file based on format
      if (config.format === 'csv') {
        downloadCSV(data, filename);
      } else if (config.format === 'excel') {
        downloadExcel(data, filename);
      } else {
        downloadPDF(data, filename);
      }

      setShowModal(false);
      alert('Eksport zakonczony pomyslnie!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Blad podczas eksportu');
    } finally {
      setExporting(false);
    }
  };

  const prepareOrdersData = () => {
    return orders
      .filter(o => {
        if (!config.includeArchived && o.archived) return false;
        if (!config.status.includes(o.status)) return false;
        const orderDate = new Date(o.created_at || 0);
        const from = new Date(config.dateFrom);
        const to = new Date(config.dateTo);
        return orderDate >= from && orderDate <= to;
      })
      .map(o => ({
        'Numer zlecenia': o.order_number,
        'Klient': o.client_name,
        'Produkt': o.product_name,
        'Ilosc': o.quantity,
        'Jednostka': o.unit,
        'Status': o.status === 'NOWE' ? 'Nowe' : o.status === 'W_TRAKCIE' ? 'W trakcie' : 'Gotowe',
        'Priorytet': o.priority,
        'Termin': new Date(o.planned_completion_date).toLocaleDateString('pl-PL'),
        'Wartosc netto': o.price_total?.toFixed(2) || '0.00',
        'Data utworzenia': new Date(o.created_at || 0).toLocaleDateString('pl-PL')
      }));
  };

  const prepareWorkersData = () => {
    return workers.map(w => ({
      'ID': w.id,
      'Imie i nazwisko': w.name,
      'Email': w.email,
      'Rola': w.role,
      'Dzial': w.department || '-',
      'Aktywny': w.active ? 'Tak' : 'Nie',
      'Data utworzenia': new Date(w.created_at || 0).toLocaleDateString('pl-PL')
    }));
  };

  const prepareTimesheetsData = () => {
    // Aggregate time data per worker per order
    const timesheets: any[] = [];

    orders.forEach(order => {
      if (order.stages) {
        order.stages.forEach(stage => {
          if (stage.assignedWorkers && stage.actualHours) {
            stage.assignedWorkers.forEach(workerId => {
              const worker = workers.find(w => w.id === workerId);
              timesheets.push({
                'Pracownik': worker?.name || `ID: ${workerId}`,
                'Zlecenie': order.order_number,
                'Etap': stage.name,
                'Godziny planowane': stage.estimatedHours || 0,
                'Godziny rzeczywiste': stage.actualHours || 0,
                'Status etapu': stage.status === 'completed' ? 'Zakonczony' :
                               stage.status === 'in_progress' ? 'W trakcie' : 'Oczekuje',
                'Data': new Date().toLocaleDateString('pl-PL')
              });
            });
          }
        });
      }
    });

    return timesheets;
  };

  const prepareProductionData = () => {
    const filteredOrders = orders.filter(o => {
      if (o.archived) return false;
      const orderDate = new Date(o.created_at || 0);
      const from = new Date(config.dateFrom);
      const to = new Date(config.dateTo);
      return orderDate >= from && orderDate <= to;
    });

    return [
      {
        'Metryka': 'Wszystkie zlecenia',
        'Wartosc': filteredOrders.length,
        'Jednostka': 'szt.'
      },
      {
        'Metryka': 'Zlecenia nowe',
        'Wartosc': filteredOrders.filter(o => o.status === 'NOWE').length,
        'Jednostka': 'szt.'
      },
      {
        'Metryka': 'Zlecenia w trakcie',
        'Wartosc': filteredOrders.filter(o => o.status === 'W_TRAKCIE').length,
        'Jednostka': 'szt.'
      },
      {
        'Metryka': 'Zlecenia zakonczone',
        'Wartosc': filteredOrders.filter(o => o.status === 'GOTOWE').length,
        'Jednostka': 'szt.'
      },
      {
        'Metryka': 'Wartosc zlecen',
        'Wartosc': filteredOrders.reduce((sum, o) => sum + (o.price_total || 0), 0).toFixed(2),
        'Jednostka': 'PLN'
      },
      {
        'Metryka': 'Srednia wartosc zlecenia',
        'Wartosc': filteredOrders.length > 0
          ? (filteredOrders.reduce((sum, o) => sum + (o.price_total || 0), 0) / filteredOrders.length).toFixed(2)
          : '0.00',
        'Jednostka': 'PLN'
      }
    ];
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert('Brak danych do eksportu');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(';'),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(';'))
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadExcel = (data: any[], filename: string) => {
    // For Excel, we'll use CSV format with .xls extension
    // For proper XLSX, you would use a library like xlsx or exceljs
    downloadCSV(data, filename);
    // Note: In production, use proper XLSX library
  };

  const downloadPDF = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert('Brak danych do eksportu');
      return;
    }

    // Create HTML content for PDF
    const headers = Object.keys(data[0]);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e3a5f; font-size: 24px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1e3a5f; color: white; padding: 10px; text-align: left; font-size: 12px; }
          td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <h1>PlexiSystem - ${config.type === 'orders' ? 'Zlecenia' :
                           config.type === 'workers' ? 'Pracownicy' :
                           config.type === 'timesheets' ? 'Czas pracy' : 'Raport produkcji'}</h1>
        <p>Okres: ${config.dateFrom} - ${config.dateTo}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Wygenerowano: ${new Date().toLocaleString('pl-PL')}</p>
          <p>PlexiSystem - System Zarzadzania Produkcja</p>
        </div>
      </body>
      </html>
    `;

    // Open print dialog for PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const toggleStatus = (status: string) => {
    if (config.status.includes(status)) {
      setConfig({ ...config, status: config.status.filter(s => s !== status) });
    } else {
      setConfig({ ...config, status: [...config.status, status] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Download size={28} />
            Eksport danych
          </h1>
          <p className="text-muted-foreground">Eksportuj dane do Excel, PDF lub CSV</p>
        </div>
      </div>

      {/* Export Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {exportTypes.map(type => (
          <button
            key={type.id}
            onClick={() => {
              setConfig({ ...config, type: type.id as ExportConfig['type'] });
              setShowModal(true);
            }}
            className="card-industrial p-6 text-left hover:border-primary transition-colors"
          >
            <type.icon size={32} className="text-primary mb-3" />
            <h3 className="font-bold text-lg">{type.label}</h3>
            <p className="text-sm text-muted-foreground">{type.description}</p>
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="card-industrial">
        <h2 className="font-bold mb-4">Podsumowanie danych</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <Package size={24} className="mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Zlecenia</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <Users size={24} className="mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{workers.length}</p>
            <p className="text-xs text-muted-foreground">Pracownicy</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <CheckCircle size={24} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-2xl font-bold">{orders.filter(o => o.status === 'GOTOWE').length}</p>
            <p className="text-xs text-muted-foreground">Zakonczone</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <Clock size={24} className="mx-auto text-orange-600 mb-2" />
            <p className="text-2xl font-bold">{orders.filter(o => o.status === 'W_TRAKCIE').length}</p>
            <p className="text-xs text-muted-foreground">W trakcie</p>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">
                Eksportuj: {exportTypes.find(t => t.id === config.type)?.label}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Format pliku</label>
                <div className="flex gap-3">
                  {[
                    { id: 'excel', label: 'Excel', icon: FileSpreadsheet },
                    { id: 'csv', label: 'CSV', icon: FileSpreadsheet },
                    { id: 'pdf', label: 'PDF', icon: FileText }
                  ].map(format => (
                    <button
                      key={format.id}
                      onClick={() => setConfig({ ...config, format: format.id as ExportConfig['format'] })}
                      className={`flex-1 p-3 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                        config.format === format.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <format.icon size={20} />
                      <span className="text-sm font-medium">{format.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Od daty</label>
                  <input
                    type="date"
                    value={config.dateFrom}
                    onChange={(e) => setConfig({ ...config, dateFrom: e.target.value })}
                    className="input-industrial w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Do daty</label>
                  <input
                    type="date"
                    value={config.dateTo}
                    onChange={(e) => setConfig({ ...config, dateTo: e.target.value })}
                    className="input-industrial w-full"
                  />
                </div>
              </div>

              {/* Status Filter (for orders) */}
              {config.type === 'orders' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Status zlecen</label>
                  <div className="flex gap-2">
                    {['NOWE', 'W_TRAKCIE', 'GOTOWE'].map(status => (
                      <button
                        key={status}
                        onClick={() => toggleStatus(status)}
                        className={`px-3 py-1.5 rounded text-sm ${
                          config.status.includes(status)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {status === 'NOWE' ? 'Nowe' : status === 'W_TRAKCIE' ? 'W trakcie' : 'Gotowe'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Include Archived */}
              {config.type === 'orders' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeArchived}
                    onChange={(e) => setConfig({ ...config, includeArchived: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Uwzglednij zarchiwizowane</span>
                </label>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                  disabled={exporting}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="btn-primary flex-1"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Eksportowanie...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-2" />
                      Eksportuj
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExport;
