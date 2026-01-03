import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID musi być liczbą').transform(Number),
});

// ============================================
// Order Schemas
// ============================================

export const orderPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export const orderStatusSchema = z.enum([
  'NOWE',
  'DO_PRODUKCJI',
  'W_TRAKCIE',
  'CZESCIOWO_GOTOWE',
  'GOTOWE',
  'DO_WYSYLKI',
  'WYSLANE',
  'ZAFAKTUROWANE',
  'ZAMKNIETE'
]);

export const createOrderSchema = z.object({
  order_number: z.string().min(1, 'Numer zlecenia jest wymagany'),
  client_order_number: z.string().optional().nullable(),
  client_name: z.string().min(1, 'Nazwa klienta jest wymagana'),
  client_nip: z.string().regex(/^(\d{10})?$/, 'NIP musi składać się z 10 cyfr').optional().nullable().or(z.literal('')),
  client_email: z.string().email('Nieprawidłowy format email').optional().nullable().or(z.literal('')),
  client_phone: z.string().optional().nullable(),
  client_address: z.string().optional().nullable(),
  client_postal: z.string().optional().nullable(),
  client_city: z.string().optional().nullable(),
  product_name: z.string().min(1, 'Nazwa produktu jest wymagana'),
  quantity: z.number().min(0, 'Ilość nie może być ujemna').optional().nullable(),
  price_total: z.number().min(0, 'Cena nie może być ujemna').optional().nullable(),
  price_per_unit: z.number().min(0, 'Cena za jednostkę nie może być ujemna').optional().nullable(),
  planned_completion_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  folder_path: z.string().optional().nullable(),
  invoice_number: z.string().optional().nullable(),
  invoice_date: z.string().optional().nullable(),
  priority: orderPrioritySchema.optional().default('NORMAL'),
  stages: z.array(z.object({
    stage_number: z.number(),
    stage_name: z.string(),
    is_required: z.boolean().optional(),
  })).optional(),
});

export const updateOrderSchema = z.object({
  order_number: z.string().min(1).optional(),
  client_order_number: z.string().optional().nullable(),
  client_name: z.string().min(1).optional(),
  client_nip: z.string().regex(/^(\d{10})?$/, 'NIP musi składać się z 10 cyfr').optional().nullable().or(z.literal('')),
  client_email: z.string().email('Nieprawidłowy format email').optional().nullable().or(z.literal('')),
  client_phone: z.string().optional().nullable(),
  client_address: z.string().optional().nullable(),
  client_postal: z.string().optional().nullable(),
  client_city: z.string().optional().nullable(),
  product_name: z.string().min(1).optional(),
  quantity: z.number().min(0, 'Ilość nie może być ujemna').optional().nullable(),
  price_total: z.number().min(0, 'Cena nie może być ujemna').optional().nullable(),
  price_per_unit: z.number().min(0, 'Cena za jednostkę nie może być ujemna').optional().nullable(),
  status: orderStatusSchema.optional(),
  planned_completion_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  folder_path: z.string().optional().nullable(),
  invoice_number: z.string().optional().nullable(),
  invoice_date: z.string().optional().nullable(),
  archived: z.boolean().optional(),
  priority: orderPrioritySchema.optional(),
});

// ============================================
// Worker Schemas
// ============================================

export const userRoleSchema = z.enum(['ADMIN', 'GRAFIK', 'HANDLOWIEC', 'KIEROWNIK', 'PRACOWNIK']);
export const positionSchema = z.enum([
  'GRAFIK', 'FREZOWANIE', 'LASER', 'POLEROWANIE', 'WYGINANIE',
  'KLEJENIE', 'DRUKOWANIE', 'OKLEJANIE', 'PAKOWANIE', 'WYSYŁKA',
  'HANDLOWIEC', 'INNE'
]);

export const createWorkerSchema = z.object({
  name: z.string().min(1, 'Nazwa pracownika jest wymagana'),
  email: z.string().email('Nieprawidłowy format email'),
  pin: z.string()
    .regex(/^\d{4,6}$/, 'PIN musi składać się z 4-6 cyfr')
    .optional()
    .nullable(),
  password: z.string().min(6, 'Hasło musi mieć minimum 6 znaków').optional(),
  position: positionSchema.optional().default('INNE'),
  hourly_rate: z.number().min(0, 'Stawka nie może być ujemna').optional().nullable(),
  role: userRoleSchema.optional().default('PRACOWNIK'),
  skills: z.array(z.string()).optional().default([]),
  active: z.boolean().optional().default(true),
});

export const updateWorkerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email('Nieprawidłowy format email').optional(),
  pin: z.string()
    .regex(/^\d{4,6}$/, 'PIN musi składać się z 4-6 cyfr')
    .optional()
    .nullable(),
  password: z.string().min(6, 'Hasło musi mieć minimum 6 znaków').optional(),
  position: positionSchema.optional(),
  hourly_rate: z.number().min(0, 'Stawka nie może być ujemna').optional().nullable(),
  role: userRoleSchema.optional(),
  skills: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

// ============================================
// Work Session Schemas
// ============================================

export const createWorkSessionSchema = z.object({
  assignment_id: z.number().positive('ID przypisania musi być dodatnie'),
});

export const updateWorkSessionSchema = z.object({
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional().nullable(),
  quantity_done: z.number().min(0, 'Ilość nie może być ujemna').optional(),
  notes: z.string().optional().nullable(),
});

// ============================================
// Stage Schemas
// ============================================

export const stageStatusSchema = z.enum(['NOWY', 'W_TRAKCIE', 'GOTOWY']);

export const updateStageSchema = z.object({
  stage_name: z.string().min(1).optional(),
  status: stageStatusSchema.optional(),
  is_required: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

// ============================================
// Assignment Schemas
// ============================================

export const createAssignmentSchema = z.object({
  stage_id: z.number().positive('ID etapu musi być dodatnie'),
  worker_id: z.number().positive('ID pracownika musi być dodatnie'),
});

// ============================================
// Comment Schemas
// ============================================

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Treść komentarza jest wymagana'),
  type: z.enum(['comment', 'system']).optional().default('comment'),
});

// ============================================
// Shipment Schemas
// ============================================

export const createShipmentSchema = z.object({
  order_id: z.number().positive('ID zlecenia musi być dodatnie'),
  receiver_name: z.string().min(1, 'Nazwa odbiorcy jest wymagana'),
  receiver_email: z.string().email('Nieprawidłowy format email'),
  receiver_phone: z.string().min(1, 'Numer telefonu jest wymagany'),
  receiver_address: z.string().min(1, 'Adres jest wymagany'),
  receiver_postal: z.string().min(1, 'Kod pocztowy jest wymagany'),
  receiver_city: z.string().min(1, 'Miasto jest wymagane'),
  dimensions: z.string()
    .regex(/^\d+x\d+x\d+$/, 'Format wymiarów: SZxWYxGŁ (np. 30x20x15)')
    .optional()
    .nullable(),
  weight: z.number().min(0.1, 'Waga musi być większa niż 0').optional().nullable(),
  contents: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  cod_amount: z.number().min(0, 'Kwota pobrania nie może być ujemna').optional().nullable(),
  insurance_amount: z.number().min(0, 'Kwota ubezpieczenia nie może być ujemna').optional().nullable(),
});

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy format email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

export const pinLoginSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN musi składać się z 4-6 cyfr'),
});

// ============================================
// Order Item Schemas
// ============================================

export const createOrderItemSchema = z.object({
  product_name: z.string().min(1, 'Nazwa produktu jest wymagana'),
  description: z.string().optional().nullable(),
  quantity: z.number().min(0, 'Ilość nie może być ujemna').optional().default(1),
  unit: z.string().optional().default('szt.'),
  price_per_unit: z.number().min(0, 'Cena nie może być ujemna').optional().default(0),
  notes: z.string().optional().nullable(),
});

export const updateOrderItemSchema = z.object({
  product_name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  quantity: z.number().min(0, 'Ilość nie może być ujemna').optional(),
  unit: z.string().optional(),
  price_per_unit: z.number().min(0, 'Cena nie może być ujemna').optional(),
  notes: z.string().optional().nullable(),
});

// ============================================
// Query Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const orderQuerySchema = paginationSchema.extend({
  status: orderStatusSchema.optional(),
  archived: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Type exports
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
export type CreateWorkSessionInput = z.infer<typeof createWorkSessionSchema>;
export type UpdateWorkSessionInput = z.infer<typeof updateWorkSessionSchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PinLoginInput = z.infer<typeof pinLoginSchema>;
