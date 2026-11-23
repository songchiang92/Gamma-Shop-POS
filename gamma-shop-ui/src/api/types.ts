export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN'

export interface UserResponse {
  id: number
  email: string
  fullName: string
  phone: string | null
  address: string | null
  city: string | null
  role: Role
  enabled: boolean
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  user: UserResponse
}

export interface GuestSessionResponse {
  guestToken: string
  expiresAt: string
  usage: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ProductImageResponse {
  id: number
  imageUrl: string
  sortOrder: number
}

export interface ProductResponse {
  id: number
  sku: string
  name: string
  description: string | null
  price: string
  slotQuantity: number
  availableQuantity: number
  active: boolean
  images: ProductImageResponse[]
  promotionCodes: string[]
  createdAt: string
}

export interface ProductRequest {
  sku: string
  name: string
  description?: string
  price: string
  slotQuantity: number
  active?: boolean
}

export interface CartItemResponse {
  productId: number
  productName: string
  unitPrice: string
  quantity: number
  lineTotal: string
}

export interface CartResponse {
  cartId: number
  items: CartItemResponse[]
  subtotal: string
  updatedAt: string
}

export interface OrderItemResponse {
  productId: number
  productName: string
  unitPrice: string
  quantity: number
  lineTotal: string
}

export interface OrderResponse {
  id: number
  orderNumber: string
  status: string
  subtotal: string
  discountTotal: string
  grandTotal: string
  promotionCode: string | null
  userEmail: string
  assignedStaffEmail: string | null
  shippingAddress: string | null
  shippingCity: string | null
  shipmentId: number | null
  createdAt: string
  items: OrderItemResponse[]
}

export interface CheckoutPreviewResponse {
  subtotal: string
  discountTotal: string
  grandTotal: string
  promotionCode: string | null
}

export interface StockIssue {
  productId: number
  productName: string
  requested: number
  available: number
}

export interface OrderNoteResponse {
  id: number
  authorEmail: string
  note: string
  createdAt: string
}

export interface PaymentIntentResponse {
  paymentId: number
  intentId: string
  amount: string
  currency: string
  redirectUrl: string
  status: string
}

export interface PaymentResponse {
  id: number
  intentId: string
  amount: string
  currency: string
  status: string
  gatewayRef: string | null
  attempts: number
  createdAt: string
}

export type DiscountType = 'PERCENTAGE' | 'FIXED'

export interface PromotionResponse {
  id: number
  code: string
  name: string
  description: string | null
  discountType: DiscountType
  discountValue: string
  startsAt: string | null
  endsAt: string | null
  active: boolean
  currentlyValid: boolean
  productIds: number[]
}

export interface PromotionRequest {
  code: string
  name: string
  description?: string
  discountType: DiscountType
  discountValue: string
  startsAt?: string | null
  endsAt?: string | null
  active?: boolean
}

export type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface RefundResponse {
  id: number
  orderId: number
  orderNumber: string
  requestedByEmail: string
  reason: string
  status: RefundStatus
  reviewNote: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface OrderAuditEntry {
  id: number
  actorId: number | null
  action: string
  fromStatus: string | null
  toStatus: string | null
  details: string | null
  createdAt: string
}

export interface UserActionEntry {
  id: number
  userId: number | null
  action: string
  details: string | null
  createdAt: string
}

export interface NotificationView {
  id: number
  type: string
  subject: string
  body: string
  status: string
  createdAt: string
}

export type ShipmentStatus = 'PLANNING' | 'DISPATCHED'

export interface ShipmentOrderResponse {
  orderId: number
  orderNumber: string
  status: string
  userEmail: string
  shippingAddress: string | null
  shippingCity: string | null
  itemCount: number
  grandTotal: string
}

export interface ShipmentResponse {
  id: number
  vanLabel: string
  city: string | null
  capacity: number
  status: ShipmentStatus
  orders: ShipmentOrderResponse[]
  loadedCount: number
  createdAt: string
  dispatchedAt: string | null
}

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const
