import { useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormInput,
  CFormSelect,
  CFormTextarea,
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
import { api, money } from '../../api/client'
import { ORDER_STATUSES } from '../../api/types'
import type { OrderNoteResponse, OrderResponse, PageResponse, UserResponse } from '../../api/types'

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

export function OrderQueuePage() {
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)

  const [selected, setSelected] = useState<OrderResponse | null>(null)
  const [notes, setNotes] = useState<OrderNoteResponse[]>([])
  const [newNote, setNewNote] = useState('')
  const [staff, setStaff] = useState<UserResponse[]>([])
  const [staffId, setStaffId] = useState('')
  const [nextStatus, setNextStatus] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [cityInput, setCityInput] = useState('')

  async function loadOrders() {
    setLoading(true)
    setError(null)
    try {
      let data: PageResponse<OrderResponse>
      if (pendingOnly) {
        data = await api.get('/api/admin/orders/pending?page=0&size=50')
      } else {
        const params = new URLSearchParams({ page: '0', size: '50' })
        if (statusFilter) params.set('status', statusFilter)
        data = await api.get(`/api/admin/orders?${params.toString()}`)
      }
      setOrders(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pendingOnly])

  useEffect(() => {
    api
      .get<UserResponse[]>('/api/admin/orders/assignable-staff')
      .then(setStaff)
      .catch(() => setStaff([]))
  }, [])

  async function openOrder(id: number) {
    setError(null)
    try {
      const [order, orderNotes] = await Promise.all([
        api.get<OrderResponse>(`/api/admin/orders/${id}`),
        api.get<OrderNoteResponse[]>(`/api/admin/orders/${id}/notes`),
      ])
      setSelected(order)
      setNotes(orderNotes)
      setNextStatus(order.status)
      setAddressInput(order.shippingAddress ?? '')
      setCityInput(order.shippingCity ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load order')
    }
  }

  async function refreshSelected() {
    if (selected) await openOrder(selected.id)
    loadOrders()
  }

  async function assignStaff() {
    if (!selected || !staffId) return
    setError(null)
    try {
      await api.post(`/api/admin/orders/${selected.id}/assign`, { staffId: Number(staffId) })
      setNotice('Order assigned.')
      setStaffId('')
      await refreshSelected()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign staff')
    }
  }

  async function updateStatus() {
    if (!selected || !nextStatus) return
    setError(null)
    try {
      await api.post(`/api/admin/orders/${selected.id}/status`, { status: nextStatus })
      setNotice(`Status updated to ${nextStatus}.`)
      await refreshSelected()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status')
    }
  }

  async function quickAction(action: 'packed' | 'shipped' | 'completed' | 'cancel') {
    if (!selected) return
    setError(null)
    try {
      await api.post(`/api/admin/orders/${selected.id}/${action}`)
      setNotice(`Order marked ${action}.`)
      await refreshSelected()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not mark ${action}`)
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !newNote.trim()) return
    setError(null)
    try {
      await api.post(`/api/admin/orders/${selected.id}/notes`, { note: newNote })
      setNewNote('')
      await refreshSelected()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add note')
    }
  }

  async function saveAddress() {
    if (!selected || !addressInput.trim() || !cityInput.trim()) return
    setError(null)
    try {
      await api.patch(`/api/admin/orders/${selected.id}/address`, {
        shippingAddress: addressInput.trim(),
        shippingCity: cityInput.trim(),
      })
      setNotice('Delivery address updated.')
      await refreshSelected()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update address')
    }
  }

  async function downloadInvoice() {
    if (!selected) return
    setError(null)
    try {
      const blob = await api.getBlob(`/api/admin/orders/${selected.id}/invoice`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${selected.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download invoice')
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h2 className="m-0">Order queue</h2>

      {error && (
        <CAlert data-testid="queue-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert data-testid="queue-notice" color="success" dismissible onClose={() => setNotice(null)}>
          {notice}
        </CAlert>
      )}

      <CCard>
        <CCardBody className="d-flex flex-wrap gap-3 align-items-end">
          <CFormSelect
            data-testid="queue-status-filter"
            label="Status filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={pendingOnly}
            style={{ width: 220 }}
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </CFormSelect>
          <CButton
            data-testid="queue-pending-toggle"
            color={pendingOnly ? 'primary' : 'secondary'}
            onClick={() => setPendingOnly((v) => !v)}
          >
            {pendingOnly ? 'Showing pending only' : 'Show pending only'}
          </CButton>
          <CButton data-testid="queue-refresh" color="secondary" variant="outline" onClick={loadOrders}>
            Refresh
          </CButton>
        </CCardBody>
      </CCard>

      {loading ? (
        <CSpinner />
      ) : (
        <CTable responsive hover small align="middle">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Order #</CTableHeaderCell>
              <CTableHeaderCell>Customer</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
              <CTableHeaderCell>Assigned</CTableHeaderCell>
              <CTableHeaderCell>Total</CTableHeaderCell>
              <CTableHeaderCell></CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {orders.map((order) => (
              <CTableRow data-testid={`queue-order-row-${order.id}`} key={order.id}>
                <CTableDataCell>{order.orderNumber}</CTableDataCell>
                <CTableDataCell>{order.userEmail}</CTableDataCell>
                <CTableDataCell>
                  <CBadge color={statusColor[order.status] ?? 'secondary'}>{order.status}</CBadge>
                </CTableDataCell>
                <CTableDataCell>{order.assignedStaffEmail ?? '-'}</CTableDataCell>
                <CTableDataCell>{money(order.grandTotal)}</CTableDataCell>
                <CTableDataCell>
                  <CButton data-testid={`queue-manage-${order.id}`} size="sm" color="secondary" onClick={() => openOrder(order.id)}>
                    Manage
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      )}

      {selected && (
        <CCard data-testid={`queue-detail-${selected.id}`}>
          <CCardHeader>
            Order {selected.orderNumber} <CBadge color={statusColor[selected.status] ?? 'secondary'}>{selected.status}</CBadge>
          </CCardHeader>
          <CCardBody className="d-flex flex-column gap-3">
            <div className="d-flex gap-4 flex-wrap small text-body-secondary">
              <span>Customer: {selected.userEmail}</span>
              <span>Assigned: {selected.assignedStaffEmail ?? 'unassigned'}</span>
              <span>Total: {money(selected.grandTotal)}</span>
              {selected.shipmentId && <span>On van: shipment #{selected.shipmentId}</span>}
            </div>

            <div className="border-top pt-3">
              <h6>Delivery address</h6>
              <div className="d-flex gap-2 flex-wrap align-items-end">
                <CFormInput
                  data-testid="queue-address-input"
                  label="Address"
                  placeholder="Street, unit, postcode"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  style={{ flex: 1, minWidth: 220 }}
                />
                <CFormInput
                  data-testid="queue-city-input"
                  label="City"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  style={{ width: 180 }}
                />
                <CButton
                  data-testid="queue-save-address"
                  color="secondary"
                  onClick={saveAddress}
                  disabled={!addressInput.trim() || !cityInput.trim()}
                >
                  Save address
                </CButton>
              </div>
            </div>

            <div className="d-flex gap-2 flex-wrap align-items-end">
              <CFormSelect
                data-testid="queue-staff-id-input"
                label="Assignee"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                style={{ width: 280 }}
              >
                <option value="">
                  {selected.assignedStaffEmail ? `Currently: ${selected.assignedStaffEmail}` : 'Select staff member...'}
                </option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.email}) - {s.role}
                  </option>
                ))}
              </CFormSelect>
              <CButton data-testid="queue-assign-staff" color="secondary" onClick={assignStaff} disabled={!staffId}>
                Assign to staff
              </CButton>
            </div>

            <div className="d-flex gap-2 flex-wrap align-items-end">
              <CFormSelect
                data-testid="queue-status-select"
                label="Set status"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                style={{ width: 220 }}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </CFormSelect>
              <CButton data-testid="queue-update-status" color="primary" onClick={updateStatus}>
                Update status
              </CButton>
            </div>

            <div className="d-flex gap-2 flex-wrap">
              <CButton data-testid="queue-mark-packed" size="sm" color="info" onClick={() => quickAction('packed')}>
                Mark packed
              </CButton>
              <CButton data-testid="queue-mark-shipped" size="sm" color="primary" onClick={() => quickAction('shipped')}>
                Mark shipped
              </CButton>
              <CButton data-testid="queue-mark-completed" size="sm" color="success" onClick={() => quickAction('completed')}>
                Mark completed
              </CButton>
              <CButton
                data-testid="queue-cancel-order"
                size="sm"
                color="danger"
                variant="outline"
                onClick={() => quickAction('cancel')}
              >
                Cancel unpaid order
              </CButton>
              <CButton data-testid="queue-download-invoice" size="sm" color="secondary" variant="outline" onClick={downloadInvoice}>
                Download invoice
              </CButton>
            </div>

            <div className="border-top pt-3">
              <h6>Notes</h6>
              <CListGroup className="mb-2">
                {notes.length === 0 && <div className="text-body-secondary small">No notes yet.</div>}
                {notes.map((note) => (
                  <CListGroupItem data-testid={`queue-note-${note.id}`} key={note.id} className="d-flex flex-column">
                    <span>{note.note}</span>
                    <span className="small text-body-secondary">
                      {note.authorEmail} &middot; {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </CListGroupItem>
                ))}
              </CListGroup>
              <CForm onSubmit={addNote} className="d-flex gap-2">
                <CFormTextarea
                  data-testid="queue-note-input"
                  placeholder="Add an internal note"
                  rows={1}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  style={{ flex: 1 }}
                />
                <CButton data-testid="queue-add-note" type="submit" color="secondary">
                  Add note
                </CButton>
              </CForm>
            </div>
          </CCardBody>
        </CCard>
      )}
    </div>
  )
}
