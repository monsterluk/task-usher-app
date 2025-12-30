import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Calculator,
  DollarSign,
  Package,
  Clock,
  Wrench,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import { costsApi, isDemoMode } from '@/utils/api';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface QuoteStage {
  type: string;
  estimated_hours: number;
}

interface CostSummaryOrder {
  id: number;
  order_number: string;
  product_name: string;
  quantity: number;
  status: string;
  revenue: number;
  material_cost: number;
  labor_hours: number;
  labor_cost: number;
  total_cost: number;
  profit: number;
  margin: number;
}

const CostCalculator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'calculator' | 'summary'>('calculator');

  // Quote calculator state
  const [quoteForm, setQuoteForm] = useState({
    product_type: '',
    quantity: 1,
    material_type: 'plexi_clear_3mm',
    material_quantity: 1,
    // Cutting efficiency settings
    cutting_meters: 0, // Linear meters of cutting required
    cutting_speed: 100 // Meters per hour (cutting speed)
  });
  const [stages, setStages] = useState<QuoteStage[]>([
    { type: 'ciecie_laser', estimated_hours: 1 }
  ]);
  const [quoteResult, setQuoteResult] = useState<any>(null);

  // Summary state
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [summary, setSummary] = useState<any>(null);
  const [summaryOrders, setSummaryOrders] = useState<CostSummaryOrder[]>([]);

  const MATERIAL_OPTIONS = [
    { value: 'plexi_clear_3mm', label: 'Plexi przezroczysta 3mm', price: 120 },
    { value: 'plexi_clear_5mm', label: 'Plexi przezroczysta 5mm', price: 180 },
    { value: 'plexi_clear_10mm', label: 'Plexi przezroczysta 10mm', price: 350 },
    { value: 'plexi_color_3mm', label: 'Plexi kolorowa 3mm', price: 150 },
    { value: 'plexi_color_5mm', label: 'Plexi kolorowa 5mm', price: 220 },
    { value: 'dibond_3mm', label: 'Dibond 3mm', price: 200 },
    { value: 'pcv_3mm', label: 'PCV 3mm', price: 80 },
    { value: 'pcv_5mm', label: 'PCV 5mm', price: 120 },
    { value: 'other', label: 'Inny material', price: 100 }
  ];

  const STAGE_OPTIONS = [
    { value: 'ciecie_laser', label: 'Ciecie laserowe', rate: 150 },
    { value: 'frezowanie_cnc', label: 'Frezowanie CNC', rate: 120 },
    { value: 'giecie', label: 'Giecie', rate: 80 },
    { value: 'klejenie', label: 'Klejenie', rate: 60 },
    { value: 'montaz', label: 'Montaz', rate: 50 },
    { value: 'pakowanie', label: 'Pakowanie', rate: 30 }
  ];

  useEffect(() => {
    if (activeTab === 'summary') {
      loadSummary();
    }
  }, [activeTab, dateRange]);

  const loadSummary = async () => {
    if (isDemoMode()) {
      loadDemoSummary();
      return;
    }

    try {
      setLoading(true);
      const response = await costsApi.getSummary({ from_date: dateRange.from, to_date: dateRange.to });
      setSummary(response.data.summary);
      setSummaryOrders(response.data.orders);
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDemoSummary = () => {
    setSummary({
      total_orders: 45,
      total_revenue: 258700,
      total_material_cost: 45200,
      total_labor_hours: 342,
      total_labor_cost: 17100,
      total_cost: 62300,
      total_profit: 196400,
      average_margin: 75.9
    });

    setSummaryOrders([
      { id: 1, order_number: 'ZL-2024/001', product_name: 'Stand reklamowy', quantity: 10, status: 'GOTOWE', revenue: 8500, material_cost: 1200, labor_hours: 12, labor_cost: 600, total_cost: 1800, profit: 6700, margin: 78.8 },
      { id: 2, order_number: 'ZL-2024/002', product_name: 'Kaseton LED', quantity: 5, status: 'GOTOWE', revenue: 12500, material_cost: 2800, labor_hours: 18, labor_cost: 900, total_cost: 3700, profit: 8800, margin: 70.4 },
      { id: 3, order_number: 'ZL-2024/003', product_name: 'Litery 3D', quantity: 20, status: 'W_TRAKCIE', revenue: 4200, material_cost: 650, labor_hours: 8, labor_cost: 400, total_cost: 1050, profit: 3150, margin: 75.0 },
      { id: 4, order_number: 'ZL-2024/004', product_name: 'Display akrylowy', quantity: 50, status: 'GOTOWE', revenue: 6800, material_cost: 980, labor_hours: 10, labor_cost: 500, total_cost: 1480, profit: 5320, margin: 78.2 },
      { id: 5, order_number: 'ZL-2024/005', product_name: 'Potykacz', quantity: 8, status: 'GOTOWE', revenue: 3200, material_cost: 420, labor_hours: 6, labor_cost: 300, total_cost: 720, profit: 2480, margin: 77.5 }
    ]);
    setLoading(false);
  };

  const calculateQuote = async () => {
    if (isDemoMode()) {
      calculateDemoQuote();
      return;
    }

    try {
      setLoading(true);
      const response = await costsApi.calculateQuote({
        ...quoteForm,
        stages
      });
      setQuoteResult(response.data);
    } catch (error) {
      console.error('Error calculating quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDemoQuote = () => {
    const materialPrice = MATERIAL_OPTIONS.find(m => m.value === quoteForm.material_type)?.price || 100;
    const materialCost = materialPrice * quoteForm.material_quantity;

    let stageCost = 0;
    let totalHours = 0;
    const stageBreakdown = stages.map(s => {
      const rate = STAGE_OPTIONS.find(opt => opt.value === s.type)?.rate || 100;
      const cost = rate * s.estimated_hours;
      stageCost += cost;
      totalHours += s.estimated_hours;
      return { stage: s.type, hours: s.estimated_hours, rate, cost };
    });

    const laborCost = totalHours * 50;
    const totalCost = materialCost + stageCost + laborCost;
    const suggestedPrice = Math.ceil(totalCost / 0.7);

    // Cutting efficiency info
    const cuttingInfo = quoteForm.cutting_meters > 0 ? {
      meters: quoteForm.cutting_meters,
      speed: quoteForm.cutting_speed,
      calculated_hours: quoteForm.cutting_meters / quoteForm.cutting_speed
    } : null;

    setQuoteResult({
      costs: {
        material: { type: quoteForm.material_type, quantity: quoteForm.material_quantity, unit_price: materialPrice, total: materialCost },
        stages: stageBreakdown,
        stage_total: stageCost,
        labor: { hours: totalHours, rate: 50, total: laborCost },
        cutting: cuttingInfo,
        total: totalCost
      },
      pricing: {
        target_margin: 30,
        suggested_total: suggestedPrice,
        suggested_unit_price: Math.ceil(suggestedPrice / quoteForm.quantity),
        cost_per_unit: totalCost / quoteForm.quantity
      }
    });
    setLoading(false);
  };

  const addStage = () => {
    setStages([...stages, { type: 'montaz', estimated_hours: 1 }]);
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const updateStage = (index: number, field: keyof QuoteStage, value: any) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setStages(newStages);
  };

  const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6'];

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NOWE': return 'Nowe';
      case 'W_TRAKCIE': return 'W trakcie';
      case 'GOTOWE': return 'Gotowe';
      default: return status;
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/manager')} className="btn-secondary">
            <ArrowLeft size={18} className="mr-2" />
            Dashboard
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">Kalkulator kosztow</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'calculator'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <Calculator size={18} />
          Kalkulator wyceny
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'summary'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <FileText size={18} />
          Podsumowanie kosztow
        </button>
      </div>

      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="card-industrial">
            <h2 className="text-lg font-bold mb-4">Dane do wyceny</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Typ produktu</label>
                <input
                  type="text"
                  value={quoteForm.product_type}
                  onChange={(e) => setQuoteForm({ ...quoteForm, product_type: e.target.value })}
                  placeholder="np. Stand reklamowy, Kaseton LED"
                  className="input-industrial w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ilosc sztuk</label>
                  <input
                    type="number"
                    min="1"
                    value={quoteForm.quantity}
                    onChange={(e) => setQuoteForm({ ...quoteForm, quantity: parseInt(e.target.value) || 1 })}
                    className="input-industrial w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ilosc materialu (m2)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={quoteForm.material_quantity}
                    onChange={(e) => setQuoteForm({ ...quoteForm, material_quantity: parseFloat(e.target.value) || 1 })}
                    className="input-industrial w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Typ materialu</label>
                <select
                  value={quoteForm.material_type}
                  onChange={(e) => setQuoteForm({ ...quoteForm, material_type: e.target.value })}
                  className="input-industrial w-full"
                >
                  {MATERIAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.price} zl/m2)
                    </option>
                  ))}
                </select>
              </div>

              {/* Cutting efficiency settings */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Wrench size={16} />
                  Wydajnosc ciecia laserowego
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Metry ciecia (mb)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={quoteForm.cutting_meters}
                      onChange={(e) => {
                        const meters = parseFloat(e.target.value) || 0;
                        setQuoteForm({ ...quoteForm, cutting_meters: meters });
                        // Auto-update laser cutting hours
                        if (meters > 0 && quoteForm.cutting_speed > 0) {
                          const hours = meters / quoteForm.cutting_speed;
                          const laserStageIndex = stages.findIndex(s => s.type === 'ciecie_laser');
                          if (laserStageIndex !== -1) {
                            updateStage(laserStageIndex, 'estimated_hours', Math.round(hours * 10) / 10);
                          }
                        }
                      }}
                      placeholder="np. 25.5"
                      className="input-industrial w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Laczna dlugosc linii ciecia</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Predkosc ciecia (mb/h)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quoteForm.cutting_speed}
                      onChange={(e) => {
                        const speed = parseFloat(e.target.value) || 100;
                        setQuoteForm({ ...quoteForm, cutting_speed: speed });
                        // Auto-update laser cutting hours
                        if (quoteForm.cutting_meters > 0 && speed > 0) {
                          const hours = quoteForm.cutting_meters / speed;
                          const laserStageIndex = stages.findIndex(s => s.type === 'ciecie_laser');
                          if (laserStageIndex !== -1) {
                            updateStage(laserStageIndex, 'estimated_hours', Math.round(hours * 10) / 10);
                          }
                        }
                      }}
                      placeholder="np. 100"
                      className="input-industrial w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Typowo 60-150 mb/h dla plexi</p>
                  </div>
                </div>
                {quoteForm.cutting_meters > 0 && quoteForm.cutting_speed > 0 && (
                  <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-800/30 rounded text-sm text-center">
                    <strong>Szacowany czas ciecia:</strong>{' '}
                    {(quoteForm.cutting_meters / quoteForm.cutting_speed).toFixed(2)}h
                    ({Math.round(quoteForm.cutting_meters / quoteForm.cutting_speed * 60)} min)
                  </div>
                )}
              </div>

              {/* Stages */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Etapy produkcji</label>
                  <button onClick={addStage} className="text-primary text-sm flex items-center gap-1">
                    <Plus size={14} /> Dodaj etap
                  </button>
                </div>
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <select
                        value={stage.type}
                        onChange={(e) => updateStage(index, 'type', e.target.value)}
                        className="input-industrial flex-1"
                      >
                        {STAGE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} ({opt.rate} zl/h)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={stage.estimated_hours}
                        onChange={(e) => updateStage(index, 'estimated_hours', parseFloat(e.target.value) || 1)}
                        className="input-industrial w-20"
                        title="Godziny"
                      />
                      <span className="text-sm text-muted-foreground">h</span>
                      {stages.length > 1 && (
                        <button onClick={() => removeStage(index)} className="text-red-500 p-1">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={calculateQuote}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Calculator size={18} className="mr-2" />}
                Oblicz wycene
              </button>
            </div>
          </div>

          {/* Quote Result */}
          <div className="space-y-4">
            {quoteResult ? (
              <>
                {/* Cost breakdown pie chart */}
                <div className="card-industrial">
                  <h2 className="text-lg font-bold mb-4">Struktura kosztow</h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Material', value: quoteResult.costs.material.total },
                            { name: 'Etapy', value: quoteResult.costs.stage_total },
                            { name: 'Robocizna', value: quoteResult.costs.labor.total }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {[0, 1, 2].map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)} zl`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cost details */}
                <div className="card-industrial">
                  <h2 className="text-lg font-bold mb-4">Szczegoly kosztow</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <span className="flex items-center gap-2">
                        <Package size={16} className="text-blue-600" />
                        Material ({quoteResult.costs.material.quantity} m2)
                      </span>
                      <span className="font-bold">{quoteResult.costs.material.total.toFixed(2)} zl</span>
                    </div>
                    {/* Cutting efficiency info */}
                    {quoteResult.costs.cutting && (
                      <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded border border-cyan-200 dark:border-cyan-800">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                            <TrendingUp size={16} />
                            Ciecie: {quoteResult.costs.cutting.meters} mb @ {quoteResult.costs.cutting.speed} mb/h
                          </span>
                          <span className="font-medium text-cyan-700 dark:text-cyan-300">
                            = {quoteResult.costs.cutting.calculated_hours.toFixed(2)}h
                          </span>
                        </div>
                      </div>
                    )}
                    {quoteResult.costs.stages.map((s: any, i: number) => (
                      <div key={i} className="flex justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <span className="flex items-center gap-2">
                          <Wrench size={16} className="text-green-600" />
                          {STAGE_OPTIONS.find(opt => opt.value === s.stage)?.label || s.stage} ({s.hours}h)
                        </span>
                        <span className="font-bold">{s.cost.toFixed(2)} zl</span>
                      </div>
                    ))}
                    <div className="flex justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <span className="flex items-center gap-2">
                        <Clock size={16} className="text-orange-600" />
                        Robocizna ({quoteResult.costs.labor.hours}h)
                      </span>
                      <span className="font-bold">{quoteResult.costs.labor.total.toFixed(2)} zl</span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted rounded-lg text-lg">
                      <span className="font-bold">Koszt calkowity</span>
                      <span className="font-bold text-primary">{quoteResult.costs.total.toFixed(2)} zl</span>
                    </div>
                  </div>
                </div>

                {/* Suggested pricing */}
                <div className="card-industrial bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <DollarSign className="text-green-600" />
                    Sugerowana cena
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white dark:bg-card rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{quoteResult.pricing.suggested_total} zl</p>
                      <p className="text-sm text-muted-foreground">Cena calkowita</p>
                    </div>
                    <div className="text-center p-4 bg-white dark:bg-card rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{quoteResult.pricing.suggested_unit_price} zl</p>
                      <p className="text-sm text-muted-foreground">Cena za sztuke</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Przy marzy {quoteResult.pricing.target_margin}% | Koszt jednostkowy: {quoteResult.pricing.cost_per_unit.toFixed(2)} zl
                  </p>
                </div>
              </>
            ) : (
              <div className="card-industrial text-center py-12">
                <Calculator size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Wypelnij formularz i kliknij "Oblicz wycene"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Date filter */}
          <div className="card-industrial">
            <div className="flex flex-wrap items-center gap-4">
              <Calendar size={18} className="text-muted-foreground" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="input-industrial"
              />
              <span className="text-muted-foreground">-</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="input-industrial"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : summary && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-industrial">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="text-green-600" size={20} />
                    <span className="text-sm text-muted-foreground">Przychod</span>
                  </div>
                  <p className="text-2xl font-bold">{summary.total_revenue.toLocaleString('pl-PL')} zl</p>
                </div>
                <div className="card-industrial">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="text-blue-600" size={20} />
                    <span className="text-sm text-muted-foreground">Koszty</span>
                  </div>
                  <p className="text-2xl font-bold">{summary.total_cost.toLocaleString('pl-PL')} zl</p>
                </div>
                <div className="card-industrial">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="text-green-600" size={20} />
                    <span className="text-sm text-muted-foreground">Zysk</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{summary.total_profit.toLocaleString('pl-PL')} zl</p>
                </div>
                <div className="card-industrial">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="text-purple-600" size={20} />
                    <span className="text-sm text-muted-foreground">Srednia marza</span>
                  </div>
                  <p className={`text-2xl font-bold ${getMarginColor(summary.average_margin)}`}>
                    {summary.average_margin.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-industrial">
                  <h2 className="text-lg font-bold mb-4">Podział kosztow</h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Materialy', value: summary.total_material_cost },
                            { name: 'Robocizna', value: summary.total_labor_cost }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#f97316" />
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('pl-PL')} zl`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-around mt-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-blue-600">{summary.total_material_cost.toLocaleString('pl-PL')} zl</p>
                      <p className="text-muted-foreground">Materialy</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-orange-600">{summary.total_labor_cost.toLocaleString('pl-PL')} zl</p>
                      <p className="text-muted-foreground">Robocizna ({summary.total_labor_hours}h)</p>
                    </div>
                  </div>
                </div>

                <div className="card-industrial">
                  <h2 className="text-lg font-bold mb-4">Marza wg zlecenia</h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summaryOrders.slice(0, 5)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} unit="%" fontSize={12} />
                        <YAxis dataKey="order_number" type="category" width={90} fontSize={10} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                          {summaryOrders.slice(0, 5).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.margin >= 30 ? '#22c55e' : entry.margin >= 15 ? '#f97316' : '#ef4444'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Orders table */}
              <div className="card-industrial overflow-x-auto">
                <h2 className="text-lg font-bold mb-4">Szczegoly zlecen</h2>
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3">Zlecenie</th>
                      <th className="text-left p-3">Produkt</th>
                      <th className="text-right p-3">Przychod</th>
                      <th className="text-right p-3">Materialy</th>
                      <th className="text-right p-3">Robocizna</th>
                      <th className="text-right p-3">Zysk</th>
                      <th className="text-right p-3">Marza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryOrders.map(order => (
                      <tr key={order.id} className="border-t border-border hover:bg-muted/50">
                        <td className="p-3 font-mono font-medium">{order.order_number}</td>
                        <td className="p-3">{order.product_name}</td>
                        <td className="p-3 text-right">{order.revenue.toLocaleString('pl-PL')} zl</td>
                        <td className="p-3 text-right text-blue-600">{order.material_cost.toLocaleString('pl-PL')} zl</td>
                        <td className="p-3 text-right text-orange-600">{order.labor_cost.toLocaleString('pl-PL')} zl</td>
                        <td className="p-3 text-right text-green-600 font-medium">{order.profit.toLocaleString('pl-PL')} zl</td>
                        <td className={`p-3 text-right font-bold ${getMarginColor(order.margin)}`}>
                          {order.margin.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CostCalculator;
