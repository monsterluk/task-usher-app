import React, { useRef } from 'react';
import { Printer, Eye, X } from 'lucide-react';
import { Order, Worker } from '@/types';
import { getStageColor } from '@/utils/stageColors';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:4000';

interface WorkOrderPDFProps {
  order: Order;
  workers: Worker[];
  onClose?: () => void;
}

const WorkOrderPDF: React.FC<WorkOrderPDFProps> = ({ order, workers, onClose }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = React.useState(false);

  const handlePrint = () => {
    const printContent = componentRef.current;
    if (printContent) {
      const windowOpen = window.open('', '_blank');
      if (windowOpen) {
        windowOpen.document.write(`
          <html>
            <head>
              <title>Zlecenie ${order.order_number}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .company { font-size: 24px; font-weight: bold; }
                .order-title { font-size: 20px; margin-top: 10px; }
                .section { margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; }
                .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                .signature-box { border-bottom: 1px solid #000; height: 50px; margin-top: 30px; }
                .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
                .signature-section { width: 30%; text-align: center; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        windowOpen.document.close();
        windowOpen.focus();
        setTimeout(() => windowOpen.print(), 500);
      }
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${order.order_number}`;

  return (
    <div className="card-industrial">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Printer className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">📄 Drukuj Zlecenie {order.order_number}</h2>
            <p className="text-sm text-muted-foreground">Karta produkcyjna do druku</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-md">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setShowPreview(true)} className="btn-secondary flex-1">
          <Eye size={18} className="mr-2" />
          Podgląd
        </button>
        <button onClick={handlePrint} className="btn-primary flex-1">
          <Printer size={18} className="mr-2" />
          Drukuj
        </button>
      </div>

      {/* Hidden Printable Content */}
      <div ref={componentRef} className="hidden">
        <div className="header">
          <div>
            <div className="company">PLEXI SYSTEM</div>
            <div>Produkcja plexi i tworzyw sztucznych</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>{new Date().toLocaleDateString('pl-PL')}</div>
            <div className="order-title"><strong>ZLECENIE {order.order_number}</strong></div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <img src={qrCodeUrl} alt="QR Code" style={{ float: 'right', width: 80, height: 80 }} />
          <div><strong>Status:</strong> {order.status}</div>
          <div><strong>Termin:</strong> {order.planned_completion_date || 'Nie ustalono'}</div>
        </div>

        <div className="section">
          <div className="section-title">📋 DANE KLIENTA</div>
          <div><strong>Firma:</strong> {order.client_name}</div>
          <div><strong>Zamówienie klienta:</strong> {order.client_order_number || '-'}</div>
          <div><strong>Email:</strong> {order.client_email || '-'}</div>
          <div><strong>Tel:</strong> {order.client_phone || '-'}</div>
        </div>

        <div className="section">
          <div className="section-title">📦 PRODUKT</div>
          <div><strong>Nazwa:</strong> {order.product_name}</div>
          <div><strong>Ilość:</strong> {order.quantity} szt.</div>
          <div><strong>Cena:</strong> {order.price_per_unit?.toFixed(2) || '0.00'} zł/szt</div>
          <div><strong>Wartość:</strong> {order.price_total?.toFixed(2) || '0.00'} zł</div>
          {order.folder_path && <div><strong>Dokumentacja:</strong> {order.folder_path}</div>}
        </div>

        <div className="section">
          <div className="section-title">⚙️ ETAPY PRODUKCJI</div>
          <table>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th>#</th>
                <th>Etap</th>
                <th>Status</th>
                <th>Wykonawca</th>
                <th>Podpis</th>
              </tr>
            </thead>
            <tbody>
              {order.stages?.sort((a, b) => a.sequence_order - b.sequence_order).map((stage) => {
                const color = getStageColor(stage.stage_name);
                const stageWorkers = workers.filter(w => 
                  stage.assignments?.some(a => a.worker_id === w.id)
                );
                return (
                  <tr key={stage.id}>
                    <td>{stage.sequence_order}.</td>
                    <td>{stage.stage_name}</td>
                    <td style={{ backgroundColor: stage.status === 'GOTOWE' ? '#d4edda' : stage.status === 'W_TRAKCIE' ? '#cce5ff' : '#fff3cd' }}>
                      {stage.status}
                    </td>
                    <td>{stageWorkers.map(w => w.name).join(', ') || '-'}</td>
                    <td></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="section">
          <div className="section-title">✅ KONTROLA JAKOŚCI</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>☐ Zgodność z rysunkiem</div>
            <div>☐ Wymiary zgodne</div>
            <div>☐ Jakość wykończenia</div>
            <div>☐ Kompletność</div>
          </div>
        </div>

        <div className="signatures">
          <div className="signature-section">
            <div className="signature-box"></div>
            <div>WYDAM / ZAŁADUJĘ</div>
          </div>
          <div className="signature-section">
            <div className="signature-box"></div>
            <div>WYKONAŁ</div>
          </div>
          <div className="signature-section">
            <div className="signature-box"></div>
            <div>ODEBRAŁ</div>
          </div>
        </div>

        <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          Wygenerowano przez PlexiSystem | {new Date().toLocaleString('pl-PL')}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-foreground/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold">Podgląd wydruku</h3>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <div 
                className="bg-white p-8 text-black mx-auto"
                style={{ width: '210mm', minHeight: '297mm', border: '1px solid #ccc' }}
              >
                {/* Same content as print */}
                <div className="header">
                  <div>
                    <div className="company">PLEXI SYSTEM</div>
                    <div>Produkcja plexi i tworzyw sztucznych</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>{new Date().toLocaleDateString('pl-PL')}</div>
                    <div className="order-title"><strong>ZLECENIE {order.order_number}</strong></div>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <img src={qrCodeUrl} alt="QR Code" style={{ float: 'right', width: 80, height: 80 }} />
                  <div><strong>Status:</strong> {order.status}</div>
                  <div><strong>Termin:</strong> {order.planned_completion_date || 'Nie ustalono'}</div>
                </div>

                <div className="section">
                  <div className="section-title">📋 KLIENT: {order.client_name}</div>
                  <div>Email: {order.client_email || '-'} | Tel: {order.client_phone || '-'}</div>
                </div>

                <div className="section">
                  <div className="section-title">📦 PRODUKT: {order.product_name}</div>
                  <div>Ilość: {order.quantity} szt. | Wartość: {order.price_total?.toFixed(2) || '0.00'} zł</div>
                </div>

                <div className="section">
                  <div className="section-title">⚙️ ETAPY PRODUKCJI</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {order.stages?.sort((a, b) => a.sequence_order - b.sequence_order).map((stage) => {
                      const isDone = stage.status === 'GOTOWE';
                      const isInProgress = stage.status === 'W_TRAKCIE';
                      return (
                        <span 
                          key={stage.id}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            color: 'white',
                            backgroundColor: isDone ? '#22C55E' : isInProgress ? '#3B82F6' : '#6B7280'
                          }}
                        >
                          {stage.sequence_order}. {stage.stage_name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="signatures">
                  <div className="signature-section">
                    <div className="signature-box"></div>
                    <div>WYDAM</div>
                  </div>
                  <div className="signature-section">
                    <div className="signature-box"></div>
                    <div>WYKONAŁ</div>
                  </div>
                  <div className="signature-section">
                    <div className="signature-box"></div>
                    <div>ODEBRAŁ</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button onClick={handlePrint} className="btn-primary flex-1">
                <Printer size={18} className="mr-2" />
                Drukuj
              </button>
              <button onClick={() => setShowPreview(false)} className="btn-secondary flex-1">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrderPDF;
