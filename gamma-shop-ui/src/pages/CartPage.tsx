import { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CListGroup,
  CListGroupItem,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import { api, money } from '../api/client'
import type { CartResponse, CheckoutPreviewResponse, OrderResponse, StockIssue } from '../api/types'
import { useAuth } from '../state/AuthContext'
import type { Route } from '../routes'

export function CartPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { user, isGuest } = useAuth()
  const [cart, setCart] = useState<CartResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [promoCode, setPromoCode] = useState('')
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discountType: string; estimatedDiscount: string } | null>(
    null,
  )
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null)
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([])
  const [placing, setPlacing] = useState(false)

  const [shippingAddress, setShippingAddress] = useState(user?.address ?? '')
  const [shippingCity, setShippingCity] = useState(user?.city ?? '')

  async function loadCart() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<CartResponse>('/api/cart')
      setCart(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load cart')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updateQuantity(productId: number, quantity: number) {
    setError(null)
    try {
      const data = await api.put<CartResponse>(`/api/cart/items/${productId}`, { quantity })
      setCart(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update quantity')
    }
  }

  async function removeItem(productId: number) {
    setError(null)
    try {
      const data = await api.del<CartResponse>(`/api/cart/items/${productId}`)
      setCart(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove item')
    }
  }

  async function clearCart() {
    setError(null)
    try {
      await api.del('/api/cart')
      loadCart()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear cart')
    }
  }

  async function validatePromo() {
    setError(null)
    try {
      const result = await api.get<{ valid: boolean; discountType: string; estimatedDiscount: string }>(
        `/api/promotions/validate?code=${encodeURIComponent(promoCode)}`,
      )
      setPromoResult(result)
    } catch (err) {
      setPromoResult(null)
      setError(err instanceof Error ? err.message : 'Promo code is not valid')
    }
  }

  /**
   * Resolves the promo code to send with a preview/checkout. A code that was typed
   * but not yet "Applied" is validated here so it still counts - and an invalid one
   * is reported up front instead of failing the whole order.
   */
  async function resolvePromoCode(): Promise<string | undefined> {
    const code = promoCode.trim()
    if (!code) return undefined
    if (promoResult) return code
    const result = await api.get<{ valid: boolean; discountType: string; estimatedDiscount: string }>(
      `/api/promotions/validate?code=${encodeURIComponent(code)}`,
    )
    setPromoResult(result)
    return code
  }

  async function runPreview() {
    setError(null)
    try {
      const promotionCode = await resolvePromoCode()
      const data = await api.post<CheckoutPreviewResponse>('/api/orders/preview', { promotionCode })
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not preview order')
    }
  }

  async function checkStock() {
    setError(null)
    try {
      const result = await api.post<{ ok: boolean; issues: StockIssue[] }>('/api/orders/validate-stock')
      setStockIssues(result.issues)
      if (result.ok) setNotice('All items are in stock.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not validate stock')
    }
  }

  async function placeOrder() {
    if (!shippingAddress.trim() || !shippingCity.trim()) {
      setError('Add a delivery address and city before placing the order.')
      return
    }
    setPlacing(true)
    setError(null)
    try {
      const promotionCode = await resolvePromoCode()
      const order = await api.post<OrderResponse>('/api/orders', {
        promotionCode,
        shippingAddress: shippingAddress.trim(),
        shippingCity: shippingCity.trim(),
      })
      setNotice(`Order ${order.orderNumber} placed. Head to My Orders to pay.`)
      setCart(null)
      onNavigate('orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order')
    } finally {
      setPlacing(false)
    }
  }

  if (loading) return <CSpinner />

  const items = cart?.items ?? []

  return (
    <div className="d-flex flex-column gap-3">
      <h2 className="m-0">Cart &amp; checkout</h2>

      {error && (
        <CAlert data-testid="cart-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert data-testid="cart-notice" color="success" dismissible onClose={() => setNotice(null)}>
          {notice}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>Items</CCardHeader>
        <CCardBody>
          {items.length === 0 ? (
            <p className="text-body-secondary m-0">
              Your cart is empty.{' '}
              <a data-testid="cart-browse-products" onClick={() => onNavigate('shop')} style={{ cursor: 'pointer' }}>
                Browse products
              </a>
              .
            </p>
          ) : (
            <CTable responsive align="middle">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Product</CTableHeaderCell>
                  <CTableHeaderCell>Unit price</CTableHeaderCell>
                  <CTableHeaderCell>Quantity</CTableHeaderCell>
                  <CTableHeaderCell>Line total</CTableHeaderCell>
                  <CTableHeaderCell></CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {items.map((item) => (
                  <CTableRow data-testid={`cart-item-row-${item.productId}`} key={item.productId}>
                    <CTableDataCell>{item.productName}</CTableDataCell>
                    <CTableDataCell>{money(item.unitPrice)}</CTableDataCell>
                    <CTableDataCell style={{ width: 110 }}>
                      <CFormInput
                        data-testid={`cart-item-qty-${item.productId}`}
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, Math.max(0, Number(e.target.value)))}
                      />
                    </CTableDataCell>
                    <CTableDataCell>{money(item.lineTotal)}</CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        data-testid={`cart-item-remove-${item.productId}`}
                        size="sm"
                        color="danger"
                        variant="outline"
                        onClick={() => removeItem(item.productId)}
                      >
                        Remove
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
        {items.length > 0 && (
          <div className="d-flex justify-content-between align-items-center p-3 border-top">
            <strong>Subtotal: {money(cart!.subtotal)}</strong>
            <CButton data-testid="cart-clear" size="sm" color="secondary" variant="outline" onClick={clearCart}>
              Clear cart
            </CButton>
          </div>
        )}
      </CCard>

      {items.length > 0 && (
        <CCard>
          <CCardHeader>Promotion code</CCardHeader>
          <CCardBody className="d-flex flex-column gap-2">
            {!user ? (
              <p className="text-body-secondary m-0">Log in to apply a promotion code.</p>
            ) : (
              <>
                <div className="d-flex gap-2">
                  <CFormInput
                    data-testid="cart-promo-code"
                    placeholder="e.g. WELCOME10"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value)
                      setPromoResult(null)
                    }}
                    style={{ maxWidth: 220 }}
                  />
                  <CButton data-testid="cart-promo-apply" color="secondary" onClick={validatePromo} disabled={!promoCode}>
                    Apply
                  </CButton>
                </div>
                {promoResult ? (
                  <div className="text-success">
                    Valid ({promoResult.discountType}) - estimated discount {money(promoResult.estimatedDiscount)}
                  </div>
                ) : (
                  <div className="text-body-secondary small">
                    A code entered here is applied at preview and checkout even without clicking Apply.
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      )}

      {items.length > 0 && (
        <CCard>
          <CCardHeader>Checkout</CCardHeader>
          <CCardBody className="d-flex flex-column gap-3">
            {!user ? (
              <div>
                <p>
                  {isGuest ? 'You are browsing as a guest.' : 'You are not signed in.'} Log in or register to place an
                  order - your cart will carry over automatically.
                </p>
                <CButton data-testid="cart-login-to-checkout" color="primary" onClick={() => onNavigate('auth')}>
                  Log in / Register to check out
                </CButton>
              </div>
            ) : (
              <>
                <div>
                  <div className="fw-semibold mb-2">Delivery address</div>
                  <div className="d-flex gap-2 flex-wrap">
                    <CFormInput
                      data-testid="cart-shipping-address"
                      placeholder="Street, unit, postcode"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      style={{ flex: 1, minWidth: 220 }}
                    />
                    <CFormInput
                      data-testid="cart-shipping-city"
                      placeholder="City"
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      style={{ width: 180 }}
                    />
                  </div>
                  <div className="text-body-secondary small mt-1">
                    {user.address
                      ? 'Defaulted from your profile - editing it here only changes this order.'
                      : "You don't have a saved address yet - this will be saved to your profile as your default."}
                  </div>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <CButton data-testid="cart-validate-stock" color="secondary" onClick={checkStock}>
                    Validate stock
                  </CButton>
                  <CButton data-testid="cart-preview-totals" color="secondary" onClick={runPreview}>
                    Preview totals
                  </CButton>
                  <CButton data-testid="cart-place-order" color="primary" onClick={placeOrder} disabled={placing}>
                    {placing ? <CSpinner size="sm" /> : 'Place order'}
                  </CButton>
                </div>

                {stockIssues.length > 0 && (
                  <CAlert data-testid="cart-stock-issues" color="warning">
                    <div className="fw-semibold mb-1">Stock issues:</div>
                    <CListGroup>
                      {stockIssues.map((issue) => (
                        <CListGroupItem key={issue.productId}>
                          {issue.productName}: requested {issue.requested}, available {issue.available}
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  </CAlert>
                )}

                {preview && (
                  <div data-testid="cart-preview-result" className="border rounded p-3">
                    <div>Subtotal: {money(preview.subtotal)}</div>
                    <div>Discount: {money(preview.discountTotal)}</div>
                    <div className="fw-semibold">Grand total: {money(preview.grandTotal)}</div>
                    {preview.promotionCode && <div>Promo applied: {preview.promotionCode}</div>}
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      )}
    </div>
  )
}
