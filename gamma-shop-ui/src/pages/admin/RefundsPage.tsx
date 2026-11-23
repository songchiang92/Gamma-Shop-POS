import { useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CFormSelect,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import { api } from '../../api/client'
import type { PageResponse, RefundResponse, RefundStatus } from '../../api/types'

export function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundResponse[]>([])
  const [statusFilter, setStatusFilter] = useState<RefundStatus | ''>('PENDING')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: '0', size: '100' })
      if (statusFilter) params.set('status', statusFilter)
      const data = await api.get<PageResponse<RefundResponse>>(`/api/admin/refunds?${params.toString()}`)
      setRefunds(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load refunds')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function review(id: number, action: 'approve' | 'reject') {
    setError(null)
    try {
      await api.post(`/api/admin/refunds/${id}/${action}`, { note: notes[id] || undefined })
      setNotice(`Refund ${action === 'approve' ? 'approved' : 'rejected'}.`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} refund`)
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h2 className="m-0">Refunds</h2>

      {error && (
        <CAlert data-testid="refunds-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert data-testid="refunds-notice" color="success" dismissible onClose={() => setNotice(null)}>
          {notice}
        </CAlert>
      )}

      <CCard>
        <CCardBody className="d-flex gap-3 align-items-end">
          <CFormSelect
            data-testid="refunds-status-filter"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RefundStatus | '')}
            style={{ width: 200 }}
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </CFormSelect>
          <CButton data-testid="refunds-refresh" color="secondary" variant="outline" onClick={load}>
            Refresh
          </CButton>
        </CCardBody>
      </CCard>

      {loading ? (
        <CSpinner />
      ) : refunds.length === 0 ? (
        <p className="text-body-secondary">No refund requests.</p>
      ) : (
        <CTable responsive hover small align="middle">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Order</CTableHeaderCell>
              <CTableHeaderCell>Requested by</CTableHeaderCell>
              <CTableHeaderCell>Reason</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
              <CTableHeaderCell style={{ minWidth: 260 }}>Review</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {refunds.map((refund) => (
              <CTableRow data-testid={`refund-row-${refund.id}`} key={refund.id}>
                <CTableDataCell>{refund.orderNumber}</CTableDataCell>
                <CTableDataCell>{refund.requestedByEmail}</CTableDataCell>
                <CTableDataCell>{refund.reason}</CTableDataCell>
                <CTableDataCell>
                  <CBadge
                    color={refund.status === 'APPROVED' ? 'success' : refund.status === 'REJECTED' ? 'danger' : 'warning'}
                  >
                    {refund.status}
                  </CBadge>
                </CTableDataCell>
                <CTableDataCell>
                  {refund.status === 'PENDING' ? (
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      <CFormInput
                        data-testid={`refund-note-${refund.id}`}
                        placeholder="Note (optional)"
                        size="sm"
                        value={notes[refund.id] ?? ''}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [refund.id]: e.target.value }))}
                        style={{ width: 160 }}
                      />
                      <CButton data-testid={`refund-approve-${refund.id}`} size="sm" color="success" onClick={() => review(refund.id, 'approve')}>
                        Approve
                      </CButton>
                      <CButton
                        data-testid={`refund-reject-${refund.id}`}
                        size="sm"
                        color="danger"
                        variant="outline"
                        onClick={() => review(refund.id, 'reject')}
                      >
                        Reject
                      </CButton>
                    </div>
                  ) : (
                    <span className="text-body-secondary small">{refund.reviewNote ?? 'Reviewed'}</span>
                  )}
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      )}
    </div>
  )
}
