export interface FulfillmentSettings {
  email: string;
  secondary_email?: string;
  manual_shipping_enabled: boolean;
  auto_dispatch_enabled: boolean;
  auto_dispatch_time: string; // "08:00"
  last_dispatched_at: string | null;
  notes?: string;
}

export interface FulfillmentItemSummary {
  name: string;
  variant?: string;
  quantity: number;
  sku?: string;
  image?: string;
}

export interface FulfillmentOrderSummary {
  id: string; // display ID like TZ-2026-XXXX
  supabaseId: string;
  date: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  total: string;
  totalAmount: number;
  currency: string;
  paymentMethod: 'stripe' | 'cod' | string;
  priorityProcessing?: boolean;
  giftPackaging?: boolean;
  giftMessage?: string | null;
  shippingType?: string;
  items: FulfillmentItemSummary[];
}

export interface FulfillmentDispatchLog {
  id: string;
  sent_at: string;
  recipient_email: string;
  secondary_email?: string;
  subject?: string;
  trigger: 'manual' | 'scheduled_8am';
  order_count: number;
  orders: FulfillmentOrderSummary[];
  status: 'sent' | 'failed';
  error_message?: string;
}
