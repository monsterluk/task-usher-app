// Apaczka API Integration
// Dokumentacja: https://apaczka.pl/dla-developerow

export interface Courier {
  id: string;
  name: string;
  logo: string;
  price: number;
  delivery_time: string;
  features: string[];
}

export interface ShipmentRequest {
  orderId: number;
  courierId: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostal: string;
  recipientPhone?: string;
  recipientEmail?: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  packageType: 'PACZKA' | 'PALETA' | 'KOPERTA';
  cod?: number; // Cash on delivery
  insurance?: number;
}

export interface ShipmentResponse {
  id: string;
  trackingNumber: string;
  courier: string;
  labelUrl: string;
  status: string;
  estimatedDelivery?: string;
}

export interface TrackingEvent {
  date: string;
  status: string;
  location?: string;
  description: string;
}

// Sender data - PlexiSystem
const SENDER_DATA = {
  name: 'PlexiSystem Sp. z o.o.',
  address: 'ul. Przemysłowa 1',
  postal: '30-001',
  city: 'Kraków',
  country: 'PL',
  phone: '+48 12 345 67 89',
  email: 'wysylka@plexisystem.pl',
};

// Mock data for fallback
const MOCK_COURIERS: Courier[] = [
  { id: 'ups', name: 'UPS', logo: '📦', price: 25.00, delivery_time: '1-2 dni', features: ['Śledzenie', 'Ubezpieczenie'] },
  { id: 'dhl', name: 'DHL Express', logo: '🚚', price: 22.50, delivery_time: '1-2 dni', features: ['Śledzenie', 'Express'] },
  { id: 'inpost', name: 'InPost Paczkomaty', logo: '📬', price: 18.00, delivery_time: '2-3 dni', features: ['Odbiór 24/7', 'Paczkomat'] },
  { id: 'poczta', name: 'Poczta Polska', logo: '📨', price: 15.00, delivery_time: '3-5 dni', features: ['Ekonomiczne'] },
  { id: 'dpd', name: 'DPD', logo: '📮', price: 20.00, delivery_time: '1-2 dni', features: ['Śledzenie', 'Pickup'] },
  { id: 'fedex', name: 'FedEx', logo: '✈️', price: 35.00, delivery_time: '1 dzień', features: ['Express', 'Międzynarodowe'] },
];

class ApaczkaApi {
  private appId: string;
  private secretCode: string;
  private baseUrl: string;
  private isConfigured: boolean;

  constructor() {
    // Get credentials from environment variables
    this.appId = import.meta.env.VITE_APACZKA_APP_ID || '';
    this.secretCode = import.meta.env.VITE_APACZKA_SECRET || '';
    this.baseUrl = import.meta.env.VITE_APACZKA_API_URL || 'https://www.apaczka.pl/api/v2';
    this.isConfigured = !!(this.appId && this.secretCode);

    if (!this.isConfigured) {
      console.warn('Apaczka API not configured. Using mock data. Set VITE_APACZKA_APP_ID and VITE_APACZKA_SECRET in .env');
    }
  }

  private generateSignature(data: string): string {
    // HMAC-SHA256 signature generation
    // W przeglądarce używamy SubtleCrypto API
    // Dla uproszczenia - na produkcji podpis powinien być generowany po stronie serwera
    const encoder = new TextEncoder();
    const key = encoder.encode(this.secretCode);
    const message = encoder.encode(data);

    // Simplified - in production this should be done server-side
    return btoa(this.secretCode + data).slice(0, 32);
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    body?: object
  ): Promise<T> {
    if (!this.isConfigured) {
      throw new Error('Apaczka API not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const dataToSign = `${this.appId}:${timestamp}:${endpoint}`;
    const signature = this.generateSignature(dataToSign);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-APP-ID': this.appId,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  async getCouriers(postalFrom?: string, postalTo?: string): Promise<Courier[]> {
    if (!this.isConfigured) {
      console.log('Using mock couriers (API not configured)');
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return MOCK_COURIERS;
    }

    try {
      const params = new URLSearchParams();
      if (postalFrom) params.append('postal_from', postalFrom);
      if (postalTo) params.append('postal_to', postalTo);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await this.makeRequest<any>(`/services${queryString}`);

      return response.services.map((service: any) => ({
        id: service.service_id,
        name: service.name,
        logo: this.getServiceLogo(service.service_id),
        price: parseFloat(service.price_brutto) || 0,
        delivery_time: service.delivery_time || '2-3 dni',
        features: service.features || [],
      }));
    } catch (error) {
      console.error('Failed to fetch couriers from Apaczka:', error);
      return MOCK_COURIERS;
    }
  }

  private getServiceLogo(serviceId: string): string {
    const logos: Record<string, string> = {
      ups: '📦',
      dhl: '🚚',
      inpost: '📬',
      poczta: '📨',
      dpd: '📮',
      fedex: '✈️',
      gls: '🚛',
    };
    return logos[serviceId.toLowerCase()] || '📦';
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    if (!this.isConfigured) {
      console.log('Creating mock shipment (API not configured)');
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockTrackingNumber = `PL${Date.now().toString().slice(-10)}`;
      return {
        id: `mock_${Date.now()}`,
        trackingNumber: mockTrackingNumber,
        courier: request.courierId.toUpperCase(),
        labelUrl: `https://example.com/labels/${mockTrackingNumber}.pdf`,
        status: 'CREATED',
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
    }

    try {
      const payload = {
        order: {
          service_id: request.courierId,
          sender: SENDER_DATA,
          receiver: {
            name: request.recipientName,
            address: request.recipientAddress,
            city: request.recipientCity,
            postal: request.recipientPostal,
            country: 'PL',
            phone: request.recipientPhone,
            email: request.recipientEmail,
          },
          package: {
            weight: request.weight,
            length: request.length || 30,
            width: request.width || 20,
            height: request.height || 10,
            type: request.packageType,
          },
          cod: request.cod ? { amount: request.cod, currency: 'PLN' } : undefined,
          insurance: request.insurance ? { amount: request.insurance, currency: 'PLN' } : undefined,
          reference: `ORDER-${request.orderId}`,
        },
      };

      const response = await this.makeRequest<any>('/orders', 'POST', payload);

      return {
        id: response.order_id,
        trackingNumber: response.tracking_number,
        courier: request.courierId,
        labelUrl: response.label_url,
        status: response.status,
        estimatedDelivery: response.estimated_delivery,
      };
    } catch (error) {
      console.error('Failed to create shipment:', error);
      throw error;
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingEvent[]> {
    if (!this.isConfigured) {
      console.log('Getting mock tracking (API not configured)');
      await new Promise(resolve => setTimeout(resolve, 800));

      const now = new Date();
      return [
        {
          date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'IN_TRANSIT',
          location: 'Kraków',
          description: 'Przesyłka w drodze',
        },
        {
          date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'PICKED_UP',
          location: 'Kraków',
          description: 'Przesyłka odebrana od nadawcy',
        },
        {
          date: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
          status: 'CREATED',
          location: 'Kraków',
          description: 'Przesyłka utworzona',
        },
      ];
    }

    try {
      const response = await this.makeRequest<any>(`/tracking/${trackingNumber}`);

      return response.events.map((event: any) => ({
        date: event.timestamp,
        status: event.status,
        location: event.location,
        description: event.description,
      }));
    } catch (error) {
      console.error('Failed to track shipment:', error);
      throw error;
    }
  }

  async getLabel(shipmentId: string): Promise<Blob> {
    if (!this.isConfigured) {
      throw new Error('Apaczka API not configured - cannot download label');
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/${shipmentId}/label`, {
        headers: {
          'X-APP-ID': this.appId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get label: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to get label:', error);
      throw error;
    }
  }

  async calculatePrice(
    serviceId: string,
    postalFrom: string,
    postalTo: string,
    weight: number,
    length?: number,
    width?: number,
    height?: number
  ): Promise<{ price: number; currency: string }> {
    if (!this.isConfigured) {
      // Mock price calculation based on weight and dimensions
      const basePrices: Record<string, number> = {
        ups: 25,
        dhl: 22.5,
        inpost: 18,
        poczta: 15,
        dpd: 20,
        fedex: 35,
      };
      const basePrice = basePrices[serviceId.toLowerCase()] || 20;
      const weightSurcharge = Math.max(0, (weight - 1) * 2);
      // Volumetric weight calculation (length × width × height / 5000)
      const volumetricWeight = ((length || 30) * (width || 20) * (height || 10)) / 5000;
      const effectiveWeight = Math.max(weight, volumetricWeight);
      const dimensionSurcharge = effectiveWeight > weight ? (effectiveWeight - weight) * 1.5 : 0;
      return { price: Math.round((basePrice + weightSurcharge + dimensionSurcharge) * 100) / 100, currency: 'PLN' };
    }

    try {
      const response = await this.makeRequest<any>('/pricing', 'POST', {
        service_id: serviceId,
        postal_from: postalFrom,
        postal_to: postalTo,
        weight,
        dimensions: { length: length || 30, width: width || 20, height: height || 10 },
      });

      return {
        price: parseFloat(response.price_brutto),
        currency: response.currency || 'PLN',
      };
    } catch (error) {
      console.error('Failed to calculate price:', error);
      throw error;
    }
  }

  isApiConfigured(): boolean {
    return this.isConfigured;
  }
}

// Singleton instance
export const apaczkaApi = new ApaczkaApi();

export default apaczkaApi;
