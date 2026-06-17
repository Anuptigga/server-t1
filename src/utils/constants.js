// ====================================
// Application-wide constants & enums
// ====================================

export const ROLES = {
  BUYER: 'buyer',
  KITCHEN: 'kitchen',
  DELIVERY: 'delivery',
  ADMIN: 'admin',
};

export const ALL_ROLES = Object.values(ROLES);

export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const WALLET_TX_TYPE = {
  CREDIT: 'credit',
  DEBIT: 'debit',
};

export const WALLET_TX_PURPOSE = {
  ORDER_PAYMENT: 'order_payment',
  KITCHEN_EARNING: 'kitchen_earning',
  DELIVERY_EARNING: 'delivery_earning',
  COMMISSION: 'commission',
  WITHDRAWAL: 'withdrawal',
  REFUND: 'refund',
  TOPUP: 'topup',
};

export const KYC_DOC_TYPE = {
  FSSAI: 'fssai',
  AADHAAR: 'aadhaar',
  PAN: 'pan',
  OTHER: 'other',
};

export const KYC_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const NOTIFICATION_TYPE = {
  ORDER: 'order',
  DELIVERY: 'delivery',
  WALLET: 'wallet',
  SYSTEM: 'system',
  KITCHEN: 'kitchen',
};

// Default platform configuration
export const PLATFORM_CONFIG = {
  DEFAULT_SEARCH_RADIUS_KM: 10,
  DEFAULT_COMMISSION_PERCENT: 15,
  DEFAULT_DELIVERY_FEE: 30,
  OTP_EXPIRY_MINUTES: 5,
  MAX_FOOD_IMAGES: 5,
  MAX_KITCHEN_IMAGES: 10,
};
