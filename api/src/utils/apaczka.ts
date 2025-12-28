import axios from 'axios';
import CryptoJS from 'crypto-js';
import { logger } from './logger';

const APACZKA_BASE_URL = 'https://www.apaczka.pl/api/v2';
const APACZKA_APP_ID = process.env.APACZKA_APP_ID || '';
const APACZKA_SECRET_CODE = process.env.APACZKA_SECRET_CODE || '';

interface ApaczkaAddress {
  name: string;
  company_name?: string;
  street: string;
  building_number: string;
  apartment_number?: string;
  postal_code: string;
  city: string;
  country_code: string;
  phone: string;
  email: string;
}

interface ApaczkaPackage {
  weight: number;
  width: number;
  height: number;
  depth: number;
  is_nonstandardized?: boolean;
}

interface ApaczkaOrderRequest {
  service_id: string;
  pickup: ApaczkaAddress;
  delivery: ApaczkaAddress;
  package: ApaczkaPackage;
  content: string;
  reference?: string;
  cod_amount?: number;
  insurance_amount?: number;
}

interface ApaczkaResponse {
  success: boolean;
  order_id?: string;
  waybill_number?: string;
  tracking_url?: string;
  error?: string;
}

// Generate Apaczka API signature
const generateSignature = (route: string, data: string): string => {
  const stringToSign = `${APACZKA_APP_ID}:${route}:${data}:${APACZKA_SECRET_CODE}`;
  return CryptoJS.SHA256(stringToSign).toString(CryptoJS.enc.Hex);
};

// Make API request to Apaczka
const makeApaczkaRequest = async (
  route: string,
  method: 'GET' | 'POST' = 'POST',
  data: any = {}
): Promise<any> => {
  const dataString = JSON.stringify(data);
  const signature = generateSignature(route, dataString);

  try {
    const response = await axios({
      method,
      url: `${APACZKA_BASE_URL}${route}`,
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APACZKA_APP_ID,
        'X-Signature': signature,
      },
      data: method === 'POST' ? data : undefined,
    });

    logger.info(`Apaczka API response for ${route}:`, response.data);
    return response.data;
  } catch (error: any) {
    logger.error('Apaczka API error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Apaczka API request failed');
  }
};

// Get available services
export const getServices = async (): Promise<any> => {
  return makeApaczkaRequest('/services/', 'GET');
};

// Create shipment order
export const createShipment = async (
  orderData: ApaczkaOrderRequest
): Promise<ApaczkaResponse> => {
  try {
    const response = await makeApaczkaRequest('/order/', 'POST', orderData);

    return {
      success: true,
      order_id: response.order_id,
      waybill_number: response.waybill_number,
      tracking_url: response.tracking_url || `https://apaczka.pl/tracking/${response.waybill_number}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get shipment status
export const getShipmentStatus = async (orderId: string): Promise<any> => {
  return makeApaczkaRequest(`/order/${orderId}/`, 'GET');
};

// Calculate shipping price
export const calculatePrice = async (
  serviceId: string,
  pickup: ApaczkaAddress,
  delivery: ApaczkaAddress,
  packageInfo: ApaczkaPackage
): Promise<any> => {
  return makeApaczkaRequest('/price/', 'POST', {
    service_id: serviceId,
    pickup,
    delivery,
    package: packageInfo,
  });
};

// Get pickup points
export const getPickupPoints = async (
  serviceId: string,
  postalCode: string
): Promise<any> => {
  return makeApaczkaRequest('/points/', 'POST', {
    service_id: serviceId,
    postal_code: postalCode,
  });
};

// Order pickup
export const orderPickup = async (orderId: string, pickupDate: string): Promise<any> => {
  return makeApaczkaRequest('/pickup/', 'POST', {
    order_id: orderId,
    pickup_date: pickupDate,
  });
};

// Get waybill (label) PDF
export const getWaybill = async (orderId: string): Promise<any> => {
  return makeApaczkaRequest(`/waybill/${orderId}/`, 'GET');
};

// Cancel shipment
export const cancelShipment = async (orderId: string): Promise<any> => {
  return makeApaczkaRequest(`/order/${orderId}/cancel/`, 'POST');
};

// Helper to prepare shipment data from order
export const prepareShipmentFromOrder = (
  order: any,
  recipientData: {
    name: string;
    street: string;
    building_number: string;
    apartment_number?: string;
    postal_code: string;
    city: string;
    phone: string;
    email: string;
  },
  packageData: {
    weight: number;
    width: number;
    height: number;
    depth: number;
  },
  serviceId: string = 'DPD_CLASSIC'
): ApaczkaOrderRequest => {
  // Default sender address (PlexiSystem)
  const pickup: ApaczkaAddress = {
    name: 'PlexiSystem',
    company_name: 'PlexiSystem Sp. z o.o.',
    street: 'Produkcyjna',
    building_number: '1',
    postal_code: '80-000',
    city: 'Gdansk',
    country_code: 'PL',
    phone: '+48123456789',
    email: 'wysylka@plexisystem.pl',
  };

  const delivery: ApaczkaAddress = {
    name: recipientData.name,
    street: recipientData.street,
    building_number: recipientData.building_number,
    apartment_number: recipientData.apartment_number,
    postal_code: recipientData.postal_code,
    city: recipientData.city,
    country_code: 'PL',
    phone: recipientData.phone,
    email: recipientData.email,
  };

  return {
    service_id: serviceId,
    pickup,
    delivery,
    package: packageData,
    content: order.product_name || 'Produkty PlexiSystem',
    reference: order.order_number,
  };
};
