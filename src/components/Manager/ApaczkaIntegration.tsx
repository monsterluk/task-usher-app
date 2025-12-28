// Apaczka Integration - Courier Selection Component
import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Package, MapPin, Clock, Check, Loader2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { apaczkaApi, Courier, ShipmentResponse, TrackingEvent } from '@/utils/apaczka';

interface ApaczkaIntegrationProps {
  orderId: number;
  orderNumber?: string;
  clientName?: string;
  clientAddress?: string;
  clientPostal?: string;
  clientCity?: string;
  clientPhone?: string;
  clientEmail?: string;
  onShipmentCreated?: (shipment: ShipmentResponse) => void;
}

type Step = 'select' | 'details' | 'confirm' | 'success' | 'tracking';

const ApaczkaIntegration: React.FC<ApaczkaIntegrationProps> = ({
  orderId,
  orderNumber,
  clientName = '',
  clientAddress = '',
  clientPostal = '',
  clientCity = '',
  clientPhone = '',
  clientEmail = '',
  onShipmentCreated,
}) => {
  const [step, setStep] = useState<Step>('select');
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCouriers, setLoadingCouriers] = useState(true);
  const [shipmentResult, setShipmentResult] = useState<ShipmentResponse | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);

  const [shipmentData, setShipmentData] = useState({
    recipient_name: clientName,
    recipient_address: clientAddress,
    recipient_city: clientCity,
    recipient_postal: clientPostal,
    recipient_phone: clientPhone,
    recipient_email: clientEmail,
    weight: 1,
    package_type: 'PACZKA' as 'PACZKA' | 'PALETA' | 'KOPERTA',
    cod: 0,
    insurance: 0,
  });

  const isApiConfigured = apaczkaApi.isApiConfigured();

  // Fetch couriers on mount
  const fetchCouriers = useCallback(async () => {
    setLoadingCouriers(true);
    try {
      const result = await apaczkaApi.getCouriers(
        '30-001', // PlexiSystem postal
        shipmentData.recipient_postal || undefined
      );
      setCouriers(result);
    } catch (error) {
      console.error('Failed to fetch couriers:', error);
      toast.error('Nie udało się pobrać listy kurierów');
    } finally {
      setLoadingCouriers(false);
    }
  }, [shipmentData.recipient_postal]);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  // Update recipient data when props change
  useEffect(() => {
    setShipmentData(prev => ({
      ...prev,
      recipient_name: clientName || prev.recipient_name,
      recipient_address: clientAddress || prev.recipient_address,
      recipient_city: clientCity || prev.recipient_city,
      recipient_postal: clientPostal || prev.recipient_postal,
      recipient_phone: clientPhone || prev.recipient_phone,
      recipient_email: clientEmail || prev.recipient_email,
    }));
  }, [clientName, clientAddress, clientCity, clientPostal, clientPhone, clientEmail]);

  const handleSelectCourier = (courier: Courier) => {
    setSelectedCourier(courier);
    setStep('details');
  };

  const validateForm = (): boolean => {
    if (!shipmentData.recipient_name.trim()) {
      toast.error('Podaj imię i nazwisko odbiorcy');
      return false;
    }
    if (!shipmentData.recipient_address.trim()) {
      toast.error('Podaj adres odbiorcy');
      return false;
    }
    if (!shipmentData.recipient_postal.trim()) {
      toast.error('Podaj kod pocztowy');
      return false;
    }
    if (!shipmentData.recipient_city.trim()) {
      toast.error('Podaj miasto');
      return false;
    }
    if (shipmentData.weight <= 0) {
      toast.error('Podaj prawidłową wagę paczki');
      return false;
    }
    return true;
  };

  const handleProceedToConfirm = () => {
    if (validateForm()) {
      setStep('confirm');
    }
  };

  const handleConfirmShipment = async () => {
    if (!selectedCourier) return;

    setLoading(true);
    try {
      const result = await apaczkaApi.createShipment({
        orderId,
        courierId: selectedCourier.id,
        recipientName: shipmentData.recipient_name,
        recipientAddress: shipmentData.recipient_address,
        recipientCity: shipmentData.recipient_city,
        recipientPostal: shipmentData.recipient_postal,
        recipientPhone: shipmentData.recipient_phone,
        recipientEmail: shipmentData.recipient_email,
        weight: shipmentData.weight,
        packageType: shipmentData.package_type,
        cod: shipmentData.cod > 0 ? shipmentData.cod : undefined,
        insurance: shipmentData.insurance > 0 ? shipmentData.insurance : undefined,
      });

      setShipmentResult(result);
      toast.success('Przesyłka utworzona pomyślnie!');
      setStep('success');
      onShipmentCreated?.(result);
    } catch (error) {
      console.error('Failed to create shipment:', error);
      toast.error('Nie udało się utworzyć przesyłki. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackShipment = async () => {
    if (!shipmentResult?.trackingNumber) return;

    setLoading(true);
    try {
      const events = await apaczkaApi.trackShipment(shipmentResult.trackingNumber);
      setTrackingEvents(events);
      setStep('tracking');
    } catch (error) {
      console.error('Failed to track shipment:', error);
      toast.error('Nie udało się pobrać statusu przesyłki');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('select');
    setSelectedCourier(null);
    setShipmentResult(null);
    setTrackingEvents([]);
  };

  // Loading couriers
  if (loadingCouriers) {
    return (
      <div className="card-industrial text-center py-8">
        <Loader2 className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-muted-foreground">Ładowanie kurierów...</p>
      </div>
    );
  }

  // Step: Select courier
  if (step === 'select') {
    return (
      <div className="card-industrial">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Truck size={24} />
            Wybierz Kuriera
          </h2>
          {!isApiConfigured && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Tryb demo
            </span>
          )}
        </div>

        {orderNumber && (
          <p className="text-sm text-muted-foreground mb-4">
            Zlecenie: <span className="font-mono font-bold">{orderNumber}</span>
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {couriers.map(courier => (
            <button
              key={courier.id}
              onClick={() => handleSelectCourier(courier)}
              className="p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{courier.logo}</span>
                  <div>
                    <p className="font-bold text-lg">{courier.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock size={14} />
                      {courier.delivery_time}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{courier.price.toFixed(2)} zł</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {courier.features.map((feature, i) => (
                  <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={fetchCouriers}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <RefreshCw size={14} />
          Odśwież listę
        </button>
      </div>
    );
  }

  // Step: Enter details
  if (step === 'details') {
    return (
      <div className="card-industrial">
        <button
          onClick={() => setStep('select')}
          className="mb-4 text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Wróć do wyboru kuriera
        </button>

        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <MapPin size={24} />
          Dane Odbiorcy i Paczki
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Imię i nazwisko *</label>
            <input
              type="text"
              placeholder="Jan Kowalski"
              className="input-industrial w-full"
              value={shipmentData.recipient_name}
              onChange={e => setShipmentData(p => ({ ...p, recipient_name: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Adres *</label>
            <input
              type="text"
              placeholder="ul. Przykładowa 1/2"
              className="input-industrial w-full"
              value={shipmentData.recipient_address}
              onChange={e => setShipmentData(p => ({ ...p, recipient_address: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kod pocztowy *</label>
            <input
              type="text"
              placeholder="00-000"
              className="input-industrial w-full"
              value={shipmentData.recipient_postal}
              onChange={e => setShipmentData(p => ({ ...p, recipient_postal: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Miasto *</label>
            <input
              type="text"
              placeholder="Warszawa"
              className="input-industrial w-full"
              value={shipmentData.recipient_city}
              onChange={e => setShipmentData(p => ({ ...p, recipient_city: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <input
              type="tel"
              placeholder="+48 123 456 789"
              className="input-industrial w-full"
              value={shipmentData.recipient_phone}
              onChange={e => setShipmentData(p => ({ ...p, recipient_phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              placeholder="klient@example.com"
              className="input-industrial w-full"
              value={shipmentData.recipient_email}
              onChange={e => setShipmentData(p => ({ ...p, recipient_email: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Waga (kg) *</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="input-industrial w-full"
              value={shipmentData.weight}
              onChange={e => setShipmentData(p => ({ ...p, weight: parseFloat(e.target.value) || 1 }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Typ paczki</label>
            <select
              className="input-industrial w-full"
              value={shipmentData.package_type}
              onChange={e => setShipmentData(p => ({
                ...p,
                package_type: e.target.value as 'PACZKA' | 'PALETA' | 'KOPERTA'
              }))}
            >
              <option value="PACZKA">Paczka</option>
              <option value="KOPERTA">Koperta</option>
              <option value="PALETA">Paleta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pobranie (zł)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="input-industrial w-full"
              value={shipmentData.cod || ''}
              onChange={e => setShipmentData(p => ({ ...p, cod: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ubezpieczenie (zł)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="input-industrial w-full"
              value={shipmentData.insurance || ''}
              onChange={e => setShipmentData(p => ({ ...p, insurance: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <button onClick={handleProceedToConfirm} className="btn-primary w-full mt-6">
          Dalej - Podsumowanie →
        </button>
      </div>
    );
  }

  // Step: Confirm
  if (step === 'confirm') {
    return (
      <div className="card-industrial">
        <button
          onClick={() => setStep('details')}
          className="mb-4 text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Wróć do danych
        </button>

        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Check size={24} />
          Podsumowanie Przesyłki
        </h2>

        <div className="space-y-4">
          {/* Courier info */}
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedCourier?.logo}</span>
                <div>
                  <p className="font-bold text-lg">{selectedCourier?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCourier?.delivery_time}</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary">{selectedCourier?.price.toFixed(2)} zł</p>
            </div>
          </div>

          {/* Recipient info */}
          <div className="p-4 border border-border rounded-lg">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <MapPin size={18} />
              Odbiorca
            </h3>
            <p className="font-medium">{shipmentData.recipient_name}</p>
            <p className="text-sm text-muted-foreground">{shipmentData.recipient_address}</p>
            <p className="text-sm text-muted-foreground">
              {shipmentData.recipient_postal} {shipmentData.recipient_city}
            </p>
            {shipmentData.recipient_phone && (
              <p className="text-sm text-muted-foreground mt-1">Tel: {shipmentData.recipient_phone}</p>
            )}
          </div>

          {/* Package info */}
          <div className="p-4 border border-border rounded-lg">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Package size={18} />
              Paczka
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-muted-foreground">Waga:</span> {shipmentData.weight} kg</p>
              <p><span className="text-muted-foreground">Typ:</span> {shipmentData.package_type}</p>
              {shipmentData.cod > 0 && (
                <p><span className="text-muted-foreground">Pobranie:</span> {shipmentData.cod.toFixed(2)} zł</p>
              )}
              {shipmentData.insurance > 0 && (
                <p><span className="text-muted-foreground">Ubezpieczenie:</span> {shipmentData.insurance.toFixed(2)} zł</p>
              )}
            </div>
          </div>

          {/* Order reference */}
          {orderNumber && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="text-muted-foreground">Zlecenie:</span>{' '}
                <span className="font-mono font-bold">{orderNumber}</span>
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleConfirmShipment}
          disabled={loading}
          className="btn-primary w-full mt-6"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              Tworzenie przesyłki...
            </>
          ) : (
            <>
              <Check size={18} className="mr-2" />
              Zamów przesyłkę
            </>
          )}
        </button>
      </div>
    );
  }

  // Step: Success
  if (step === 'success' && shipmentResult) {
    return (
      <div className="card-industrial text-center py-8">
        <div className="bg-success/10 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
          <Check className="text-success" size={40} />
        </div>

        <h2 className="text-2xl font-bold mb-2">Przesyłka Zamówiona!</h2>

        <div className="bg-muted p-4 rounded-lg my-6 max-w-sm mx-auto">
          <p className="text-sm text-muted-foreground mb-1">Numer śledzenia:</p>
          <p className="font-mono font-bold text-lg">{shipmentResult.trackingNumber}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Kurier: {shipmentResult.courier}
          </p>
          {shipmentResult.estimatedDelivery && (
            <p className="text-sm text-muted-foreground">
              Przewidywana dostawa: {new Date(shipmentResult.estimatedDelivery).toLocaleDateString('pl-PL')}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={handleTrackShipment} className="btn-secondary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <MapPin size={18} className="mr-2" />}
            Śledź przesyłkę
          </button>

          {shipmentResult.labelUrl && (
            <a
              href={shipmentResult.labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center justify-center"
            >
              <FileText size={18} className="mr-2" />
              Pobierz etykietę
            </a>
          )}

          <button onClick={resetForm} className="btn-primary">
            Nowa przesyłka
          </button>
        </div>
      </div>
    );
  }

  // Step: Tracking
  if (step === 'tracking') {
    return (
      <div className="card-industrial">
        <button
          onClick={() => setStep('success')}
          className="mb-4 text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Wróć
        </button>

        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <MapPin size={24} />
          Śledzenie Przesyłki
        </h2>

        <div className="bg-muted p-4 rounded-lg mb-6">
          <p className="text-sm text-muted-foreground">Numer śledzenia:</p>
          <p className="font-mono font-bold text-lg">{shipmentResult?.trackingNumber}</p>
        </div>

        <div className="space-y-4">
          {trackingEvents.map((event, index) => (
            <div
              key={index}
              className={`flex gap-4 ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                {index < trackingEvents.length - 1 && (
                  <div className="w-0.5 h-full bg-muted-foreground/20 my-1" />
                )}
              </div>
              <div className="pb-4">
                <p className="font-medium">{event.description}</p>
                <p className="text-sm">
                  {new Date(event.date).toLocaleString('pl-PL')}
                  {event.location && ` • ${event.location}`}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleTrackShipment} className="btn-secondary w-full mt-4" disabled={loading}>
          {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <RefreshCw size={18} className="mr-2" />}
          Odśwież status
        </button>
      </div>
    );
  }

  return null;
};

export default ApaczkaIntegration;
