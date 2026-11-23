/**
 * Thin REST client used only to SEED preconditions fast, so each UI spec can test
 * exactly one step. It never asserts - the browser test does that.
 *
 * Override the API URL with API_URL=http://host:port (defaults to :8080).
 */
const API = process.env.API_URL || 'http://localhost:8080'

const ADMIN = { email: 'admin@gammashop.local', password: 'Admin123!' }
const STAFF = { email: 'staff@gammashop.local', password: 'Staff123!' }
const CUSTOMER = { email: 'customer@gammashop.local', password: 'Customer123!' }

function uid() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

async function req(path, { method = 'GET', token, guestToken, body } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (guestToken) headers['X-Guest-Token'] = guestToken
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`)
  return text ? JSON.parse(text) : undefined
}

// ---------- auth ----------

async function registerCustomer() {
  const id = uid()
  const account = {
    email: `e2e.customer.${id}@test.local`,
    password: 'Password123!',
    fullName: `E2E Customer ${id}`,
    phone: '0123456789',
  }
  const auth = await req('/api/auth/register', { method: 'POST', body: account })
  return { ...account, token: auth.accessToken, refreshToken: auth.refreshToken, user: auth.user }
}

async function login(email, password) {
  const auth = await req('/api/auth/login', { method: 'POST', body: { email, password } })
  return { email, token: auth.accessToken, refreshToken: auth.refreshToken, user: auth.user }
}

const adminSession = () => login(ADMIN.email, ADMIN.password)
const staffSession = () => login(STAFF.email, STAFF.password)
const customerSession = () => login(CUSTOMER.email, CUSTOMER.password)

async function guestSession() {
  const s = await req('/api/auth/guest', { method: 'POST' })
  return s.guestToken
}

// ---------- catalogue ----------

async function firstProduct() {
  const page = await req('/api/products?page=0&size=1')
  return page.content[0]
}

async function products(size = 50) {
  const page = await req(`/api/products?page=0&size=${size}`)
  return page.content
}

async function createProduct(adminToken, overrides = {}) {
  const id = uid()
  const body = {
    sku: `E2E-SKU-${id}`,
    name: `E2E Product ${id}`,
    description: 'Seeded by e2e',
    price: '12.34',
    slotQuantity: 20,
    active: true,
    ...overrides,
  }
  return req('/api/admin/products', { method: 'POST', token: adminToken, body })
}

async function createPromotion(adminToken, overrides = {}) {
  const id = uid()
  const body = {
    code: `E2E${String(id).slice(-6)}`,
    name: `E2E Promo ${id}`,
    description: 'Seeded by e2e',
    discountType: 'PERCENTAGE',
    discountValue: '10',
    active: true,
    ...overrides,
  }
  return req('/api/admin/promotions', { method: 'POST', token: adminToken, body })
}

// ---------- cart & orders ----------

async function addToCart(token, productId, quantity = 1) {
  return req('/api/cart/items', { method: 'POST', token, body: { productId, quantity } })
}

async function checkout(token, opts = {}) {
  const body = {
    promotionCode: opts.promotionCode,
    shippingAddress: opts.shippingAddress || '1 E2E Street, Unit 2, 50000',
    shippingCity: opts.shippingCity || 'Kuala Lumpur',
  }
  return req('/api/orders', { method: 'POST', token, body })
}

async function getOrder(token, orderId) {
  return req(`/api/orders/${orderId}`, { token })
}

async function payOrder(token, orderId, outcome = 'success') {
  const intent = await req(`/api/payments/intent/${orderId}`, { method: 'POST', token })
  await req(`/api/mock-gateway/pay/${intent.intentId}/complete?outcome=${outcome}`, { method: 'POST' })
  return intent
}

async function requestRefund(token, orderId, reason = 'e2e refund reason') {
  return req('/api/refunds', { method: 'POST', token, body: { orderId, reason } })
}

async function setOrderStatus(staffToken, orderId, status) {
  return req(`/api/admin/orders/${orderId}/status`, { method: 'POST', token: staffToken, body: { status } })
}

async function assignableStaff(token) {
  return req('/api/admin/orders/assignable-staff', { token })
}

// ---------- shipments ----------

async function createVan(staffToken, label, capacity = 12) {
  return req('/api/admin/shipments', { method: 'POST', token: staffToken, body: { vanLabel: label, capacity } })
}

async function loadVan(staffToken, vanId, orderId) {
  return req(`/api/admin/shipments/${vanId}/orders/${orderId}`, { method: 'POST', token: staffToken })
}

// ---------- composed preconditions ----------

/** A fresh customer with one item in their cart, nothing ordered yet. */
async function customerWithCart(quantity = 2) {
  const customer = await registerCustomer()
  const product = await firstProduct()
  await addToCart(customer.token, product.id, quantity)
  return { customer, product }
}

/** A fresh customer with a PENDING_PAYMENT order. */
async function pendingOrder() {
  const { customer, product } = await customerWithCart(1)
  const order = await checkout(customer.token)
  return { customer, product, order }
}

/** A fresh customer with a PAID order. */
async function paidOrder() {
  const { customer, product } = await customerWithCart(2)
  const created = await checkout(customer.token)
  await payOrder(customer.token, created.id)
  const order = await getOrder(customer.token, created.id)
  return { customer, product, order }
}

/** A PAID order that the customer then failed to pay a second time (for retry tests). */
async function orderWithFailedPayment() {
  const { customer, product } = await customerWithCart(1)
  const created = await checkout(customer.token)
  await payOrder(customer.token, created.id, 'fail')
  const order = await getOrder(customer.token, created.id)
  return { customer, product, order }
}

/** A PAID order advanced by staff to the requested status (PROCESSING/PACKED/SHIPPED/COMPLETED). */
async function orderInStatus(status) {
  const ctx = await paidOrder()
  const staff = await staffSession()
  const chain = {
    PAID: [],
    PROCESSING: ['PROCESSING'],
    PACKED: ['PROCESSING', 'PACKED'],
    SHIPPED: ['PROCESSING', 'PACKED', 'SHIPPED'],
    COMPLETED: ['PROCESSING', 'PACKED', 'SHIPPED', 'COMPLETED'],
  }
  for (const s of chain[status] || []) {
    await setOrderStatus(staff.token, ctx.order.id, s)
  }
  const order = await getOrder(ctx.customer.token, ctx.order.id)
  return { ...ctx, order, staff }
}

/** A fresh customer with a PAID order and a PENDING refund request. */
async function refundRequestedOrder() {
  const ctx = await paidOrder()
  const refund = await requestRefund(ctx.customer.token, ctx.order.id)
  return { ...ctx, refund }
}

/** A PROCESSING order already loaded onto a fresh PLANNING van. */
async function vanLoadedWithOrder() {
  const ctx = await orderInStatus('PROCESSING')
  const van = await createVan(ctx.staff.token, `E2E Van ${uid()}`, 5)
  await loadVan(ctx.staff.token, van.id, ctx.order.id)
  return { ...ctx, van }
}

module.exports = {
  API,
  ADMIN,
  STAFF,
  CUSTOMER,
  req,
  uid,
  registerCustomer,
  login,
  adminSession,
  staffSession,
  customerSession,
  guestSession,
  firstProduct,
  products,
  createProduct,
  createPromotion,
  addToCart,
  checkout,
  getOrder,
  payOrder,
  requestRefund,
  setOrderStatus,
  assignableStaff,
  createVan,
  loadVan,
  customerWithCart,
  pendingOrder,
  paidOrder,
  orderWithFailedPayment,
  orderInStatus,
  refundRequestedOrder,
  vanLoadedWithOrder,
}
