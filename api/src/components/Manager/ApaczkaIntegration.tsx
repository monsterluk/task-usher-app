// Apaczka Integration - Courier Selection Component
import React, { useState } from 'react';
import { Truck, Package, MapPin, Clock, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MOCK_COURIERS = [
  { id: 'ups', name: 'UPS', logo: '📦', price: 25.00, delivery_time: '1-2 dni', features: ['Śledzenie'] },
  { id: 'dhl', name: 'DHL Express', logo: '🚚', price: 22.50, delivery_time: '1-2 dni', features: ['Śledzenie'] },
  { id: 'inpost', name: 'InPost Paczkomaty', logo: '📬', price: 18.00, delivery_time: '2-3 dni', features: ['Odbiór 24/7'] },
  { id: 'poczta', name: 'Poczta Polska', logo: '📨', price: 15.00, delivery_time: '3-5 dni', features: ['Najtańsze'] },
];

interface ApaczkaIntegrationProps {
  orderId: number;
  onShipmentCreated?: (shipment: any) => void;
}

const ApaczkaIntegration: React.FC<ApaczkaIntegrationProps> = ({ orderId, onShipmentCreated }) => {
  const [step, setStep] = useState<'select' | 'details' | 'confirm' | 'success'>('select');
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState({
    to_postal: '',
    recipient_name: '',
    recipient_address: '',
  });

  const handleSelectCourier = (courier: any) => {
    setSelectedCourier(courier);
    setStep('details');
  };

  const handleConfirm = async () => {
    if (!shipmentData.to_postal || !shipmentData.recipient_name) {
      toast.error('Wypełnij wymagane pola');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    toast.success('Przesyłka utworzona!');
    setStep('success');
    onShipmentCreated?.({ id: '123', courier: selectedCourier.name });
    setLoading(false);
  };

  if (step === 'select') {
    return (
      <div className="card-industrial">
        <h2 className="text-xl font-bold mb-4">🚚 Wybierz Kuriera</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_COURIERS.map(courier => (
            <div key={courier.id} onClick={() => handleSelectCourier(courier)}
              className="p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{courier.logo}</span>
                  <div>
                    <p className="font-bold">{courier.name}</p>
                    <p className="text-sm text-muted-foreground">{courier.delivery_time}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-primary">{courier.price.toFixed(2)} zł</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="card-industrial">
        <button onClick={() => setStep('select')} className="mb-4 text-muted-foreground hover:text-foreground">
          ← Wróć
        </button>
        <h2 className="text-xl font-bold mb-4">📍 Dane Odbiorcy</h2>
        <div className="space-y-4">
          <input type="text" placeholder="Imię i nazwisko *" className="input-industrial w-full"
            value={shipmentData.recipient_name}
            onChange={e => setShipmentData(p => ({ ...p, recipient_name: e.target.value }))} />
          <input type="text" placeholder="Adres *" className="input-industrial w-full"
            value={shipmentData.recipient_address}
            onChange={e => setShipmentData(p => ({ ...p, recipient_address: e.target.value }))} />
          <input type="text" placeholder="Kod pocztowy" className="input-industrial w-full"
            value={shipmentData.to_postal}
            onChange={e => setShipmentData(p => ({ ...p, to_postal: e.target.value }))} />
          <button onClick={() => setStep('confirm')} className="btn-primary w-full">
            Dalej →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="card-industrial">
        <button onClick={() => setStep('details')} className="mb-4 text-muted-foreground hover:text-foreground">
          ← Wróć
        </button>
        <h2 className="text-xl font-bold mb-4">✅ Potwierdzenie</h2>
        <div className="p-4 bg-primary/10 rounded-lg mb-4">
          <p className="font-bold">{selectedCourier?.name}</p>
          <p className="text-primary text-xl">{selectedCourier?.price.toFixed(2)} zł</p>
        </div>
        <button onClick={handleConfirm} disabled={loading} className="btn-primary w-full">
          {loading ? <><Loader2 className="animate-spin mr-2" size={18} />Tworzenie...</> : '✓ Zamów'}
        </button>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="card-industrial text-center py-8">
        <div className="bg-success/10 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
          <Check className="text-success" size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-2">🎉 Przesyłka zamówiona!</h2>
        <button onClick={() => setStep('select')} className="btn-primary mt-4">
          Nowa przesyłka
        </button>
      </div>
    );
  }

  return null;
};

export default ApaczkaIntegration;
