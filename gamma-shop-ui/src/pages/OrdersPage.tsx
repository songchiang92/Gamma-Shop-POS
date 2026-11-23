import { useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormTextarea,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import { api, money } from '../api/client'
import type { OrderResponse, PageResponse, PaymentIntentResponse, PaymentResponse, RefundResponse } from '../api/types'

const statusColor: Record<string, string> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'info',
  PROCESSING: 'info',
  PACKED: 'info',
  SHIPPED: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'secondary',
  REFUNDED: 'dark',
}

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [payments, setPayments] = useState<PaymentResponse[]>([])
  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null)

  const [refundReason, setRefundReason] = useState('')
  const [myRefunds, setMyRefunds] = useState<RefundResponse[]>([])

  async function loadOrders() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<PageResponse<OrderResponse>>('/api/orders?page=0&size=50')
      setOrders(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders')
    } finally {
      setLoading(false)
    }
  }

  async function loadRefunds() {
    try {
      const data = await api.get<RefundResponse[]>('/api/refunds')
      setMyRefunds(data)
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    loadOrders()
    loadRefunds()
  }, [])

  const selected = orders.find((o) => o.id === selectedId) ?? null

  async function openOrder(id: number) {
    setSelectedId(id)
    setIntent(null)
    setError(null)
    try {
      const [order, orderPayments] = await Promise.all([
        api.get<OrderResponse>(`/api/orders/${id}`),
        api.get<PaymentResponse[]>(`/api/payments/order/${id}`),
      ])
      setOrders((prev) => prev.map((o) => (o.id === id ? order : o)))
      setPayments(orderPayments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load order details')
    }
  }

  async function refreshSelected() {
    if (selectedId) await openOrder(selectedId)
  }

  async function payNow() {
    if (!selected) return
    setError(null)
    try {
      const result = await api.post<PaymentIntentResponse>(`/api/payments/intent/${selected.id}`)
      setIntent(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment')
    }
  }

  async function retryPay() {
    if (!selected) return
    setError(null)
    try {
      const result = await api.post<PaymentIntentResponse>(`/api/payments/retry/${selected.id}`)
      setIntent(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not retry payment')
    }
  }

  async function completePayment(outcome: 'success' | 'fail') {
    if (!intent) return
    setError(null)
    try {
      await api.post(`/api/mock-gateway/pay/${intent.intentId}/complete?outcome=${outcome}`)
      setNotice(`Mock gateway reported ${outcome}.`)
      setIntent(null)
      await refreshSelected()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete payment')
    }
  }

  async function cancelOrder() {
    if (!selected) return
    setError(null)
    try {
      await api.post(`/api/orders/${selected.id}/cancel`)
      setNotice('Order cancelled.')
      await refreshSelected()
      loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel order')
    }
  }

  async function requestRefund(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError(null)
    try {
      await api.post('/api/refunds', { orderId: selected.id, reason: refundReason })
      setNotice('Refund request submitted.')
      setRefundReason('')
      loadRefunds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit refund request')
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h2 className="m-0">My orders</h2>

      {error && (
        <CAlert data-testid="orders-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert data-testid="orders-notice" color="success" dismissible onClose={() => setNotice(null)}>
          {notice}
        </CAlert>
      )}

      {loading ? (
        <CSpinner />
      ) : orders.length === 0 ? (
        <p className="text-body-secondary">You have no orders yet.</p>
      ) : (
        <CTable responsive hover align="middle">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Order #</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
              <CTableHeaderCell>Total</CTableHeaderCell>
              <CTableHeaderCell>Placed</CTableHeaderCell>
              <CTableHeaderCell></CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {orders.map((order) => (
              <CTableRow data-testid={`order-row-${order.id}`} key={order.id}>
                <CTableDataCell>{order.orderNumber}</CTableDataCell>
                <CTableDataCell>
                  <CBadge color={statusColor[order.status] ?? 'secondary'}>{order.status}</CBadge>
                </CTableDataCell>
                <CTableDataCell>{money(order.grandTotal)}</CTableDataCell>
                <CTableDataCell>{new Date(order.createdAt).toLocaleString()}</CTableDataCell>
                <CTableDataCell>
                  <CButton data-testid={`order-details-${order.id}`} size="sm" color="secondary" onClick={() => openOrder(order.id)}>
                    Details
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      )}

      {selected && (
        <CCard data-testid={`order-detail-${selected.id}`}>
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <span>
              Order {selected.orderNumber} <CBadge color={statusColor[selected.status] ?? 'secondary'}>{selected.status}</CBadge>
            </span>
            <div className="d-flex gap-2">
              {selected.status === 'PENDING_PAYMENT' && (
                <CButton data-testid={`order-cancel-${selected.id}`} size="sm" color="danger" variant="outline" onClick={cancelOrder}>
                  Cancel order
                </CButton>
              )}
            </div>
          </CCardHeader>
          <CCardBody className="d-flex flex-column gap-3">
            <CTable small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Product</CTableHeaderCell>
                  <CTableHeaderCell>Unit price</CTableHeaderCell>
                  <CTableHeaderCell>Qty</CTableHeaderCell>
                  <CTableHeaderCell>Line total</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {selected.items.map((item) => (
                  <CTableRow key={item.productId}>
                    <CTableDataCell>{item.productName}</CTableDataCell>
                    <CTableDataCell>{money(item.unitPrice)}</CTableDataCell>
                    <CTableDataCell>{item.quantity}</CTableDataCell>
                    <CTableDataCell>{money(item.lineTotal)}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
            <div className="d-flex gap-4 flex-wrap">
              <span>Subtotal: {money(selected.subtotal)}</span>
              <span>Discount: {money(selected.discountTotal)}</span>
              <strong>Grand total: {money(selected.grandTotal)}</strong>
            </div>

            <div className="border-top pt-3">
              <h6>Payment</h6>
              {payments.length > 0 && (
                <CTable small className="mb-2">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Intent</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Attempts</CTableHeaderCell>
                      <CTableHeaderCell>Gateway ref</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {payments.map((p) => (
                      <CTableRow key={p.id}>
                        <CTableDataCell>{p.intentId}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={p.status === 'SUCCESS' ? 'success' : p.status === 'FAILED' ? 'danger' : 'warning'}>
                            {p.status}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{p.attempts}</CTableDataCell>
                        <CTableDataCell>{p.gatewayRef ?? '-'}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}

              {selected.status === 'PENDING_PAYMENT' && !intent && (
                <div className="d-flex gap-2">
                  <CButton data-testid={`order-pay-now-${selected.id}`} color="primary" onClick={payNow}>
                    Pay now
                  </CButton>
                  {payments.some((p) => p.status === 'FAILED') && (
                    <CButton data-testid={`order-retry-payment-${selected.id}`} color="secondary" onClick={retryPay}>
                      Retry payment
                    </CButton>
                  )}
                </div>
              )}

              {intent && (
                <CAlert color="info" className="d-flex flex-column gap-2">
                  <div>
                    Mock gateway intent <code>{intent.intentId}</code> for {money(intent.amount, intent.currency)}.
                    This simulates a hosted payment page redirect to <code>{intent.redirectUrl}</code>.
                  </div>
                  <div className="d-flex gap-2">
                    <CButton
                      data-testid={`order-pay-success-${selected.id}`}
                      size="sm"
                      color="success"
                      onClick={() => completePayment('success')}
                    >
                      Simulate payment success
                    </CButton>
                    <CButton
                      data-testid={`order-pay-fail-${selected.id}`}
                      size="sm"
                      color="danger"
                      onClick={() => completePayment('fail')}
                    >
                      Simulate payment failure
                    </CButton>
                  </div>
                </CAlert>
              )}
            </div>

            {(selected.status === 'PAID' ||
              selected.status === 'PROCESSING' ||
              selected.status === 'PACKED' ||
              selected.status === 'SHIPPED' ||
              selected.status === 'COMPLETED') && (
              <div className="border-top pt-3">
                <h6>Request a refund</h6>
                <CForm onSubmit={requestRefund} className="d-flex gap-2 align-items-start flex-wrap">
                  <CFormTextarea
                    data-testid={`order-refund-reason-${selected.id}`}
                    placeholder="Reason for refund"
                    required
                    rows={2}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    style={{ minWidth: 260 }}
                  />
                  <CButton data-testid={`order-refund-submit-${selected.id}`} type="submit" color="warning">
                    Submit request
                  </CButton>
                </CForm>
              </div>
            )}
          </CCardBody>
        </CCard>
      )}

      {myRefunds.length > 0 && (
        <CCard>
          <CCardHeader>My refund requests</CCardHeader>
          <CCardBody>
            <CTable small responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Order</CTableHeaderCell>
                  <CTableHeaderCell>Reason</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Review note</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {myRefunds.map((refund) => (
                  <CTableRow data-testid={`my-refund-row-${refund.id}`} key={refund.id}>
                    <CTableDataCell>{refund.orderNumber}</CTableDataCell>
                    <CTableDataCell>{refund.reason}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge
                        color={refund.status === 'APPROVED' ? 'success' : refund.status === 'REJECTED' ? 'danger' : 'warning'}
                      >
                        {refund.status}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{refund.reviewNote ?? '-'}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      )}
    </div>
  )
}
