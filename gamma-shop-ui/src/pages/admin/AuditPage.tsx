import { useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import { api } from '../../api/client'
import type { OrderAuditEntry, PageResponse, UserActionEntry } from '../../api/types'

export function AuditPage() {
  const [orderId, setOrderId] = useState('')
  const [orderAudit, setOrderAudit] = useState<OrderAuditEntry[] | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)

  const [userId, setUserId] = useState('')
  const [userActions, setUserActions] = useState<UserActionEntry[]>([])
  const [loadingActions, setLoadingActions] = useState(false)

  const [error, setError] = useState<string | null>(null)

  async function lookupOrder() {
    if (!orderId) return
    setLoadingOrder(true)
    setError(null)
    try {
      const data = await api.get<OrderAuditEntry[]>(`/api/admin/audit/orders/${orderId}`)
      setOrderAudit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load order audit trail')
    } finally {
      setLoadingOrder(false)
    }
  }

  async function loadUserActions() {
    setLoadingActions(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: '0', size: '50' })
      if (userId) params.set('userId', userId)
      const data = await api.get<PageResponse<UserActionEntry>>(`/api/admin/audit/user-actions?${params.toString()}`)
      setUserActions(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load user actions')
    } finally {
      setLoadingActions(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h2 className="m-0">Audit log</h2>

      {error && (
        <CAlert data-testid="audit-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>Order history</CCardHeader>
        <CCardBody className="d-flex flex-column gap-3">
          <div className="d-flex gap-2 align-items-end">
            <CFormInput
              data-testid="audit-order-id"
              label="Order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              style={{ width: 160 }}
            />
            <CButton data-testid="audit-lookup-order" color="primary" onClick={lookupOrder} disabled={!orderId}>
              Look up
            </CButton>
          </div>
          {loadingOrder ? (
            <CSpinner size="sm" />
          ) : orderAudit ? (
            orderAudit.length === 0 ? (
              <p className="text-body-secondary m-0">No audit entries for that order.</p>
            ) : (
              <CTable responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>When</CTableHeaderCell>
                    <CTableHeaderCell>Actor</CTableHeaderCell>
                    <CTableHeaderCell>Action</CTableHeaderCell>
                    <CTableHeaderCell>From &rarr; To</CTableHeaderCell>
                    <CTableHeaderCell>Details</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {orderAudit.map((entry) => (
                    <CTableRow data-testid={`audit-order-entry-${entry.id}`} key={entry.id}>
                      <CTableDataCell>{new Date(entry.createdAt).toLocaleString()}</CTableDataCell>
                      <CTableDataCell>{entry.actorId ?? 'system'}</CTableDataCell>
                      <CTableDataCell>{entry.action}</CTableDataCell>
                      <CTableDataCell>
                        {entry.fromStatus ?? '-'} &rarr; {entry.toStatus ?? '-'}
                      </CTableDataCell>
                      <CTableDataCell>{entry.details ?? '-'}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )
          ) : null}
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader>User actions</CCardHeader>
        <CCardBody className="d-flex flex-column gap-3">
          <div className="d-flex gap-2 align-items-end">
            <CFormInput
              data-testid="audit-user-id"
              label="User ID (optional)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ width: 160 }}
            />
            <CButton data-testid="audit-load-user-actions" color="primary" onClick={loadUserActions}>
              Load
            </CButton>
          </div>
          {loadingActions ? (
            <CSpinner size="sm" />
          ) : userActions.length === 0 ? (
            <p className="text-body-secondary m-0">No entries loaded yet.</p>
          ) : (
            <CTable responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>When</CTableHeaderCell>
                  <CTableHeaderCell>User</CTableHeaderCell>
                  <CTableHeaderCell>Action</CTableHeaderCell>
                  <CTableHeaderCell>Details</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {userActions.map((entry) => (
                  <CTableRow data-testid={`audit-user-action-${entry.id}`} key={entry.id}>
                    <CTableDataCell>{new Date(entry.createdAt).toLocaleString()}</CTableDataCell>
                    <CTableDataCell>{entry.userId ?? '-'}</CTableDataCell>
                    <CTableDataCell>{entry.action}</CTableDataCell>
                    <CTableDataCell>{entry.details ?? '-'}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}
