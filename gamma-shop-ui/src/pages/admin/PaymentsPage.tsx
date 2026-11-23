import { useState } from 'react'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react-pro'
import { api } from '../../api/client'

export function PaymentsPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reconcile() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<Record<string, unknown>>('/api/admin/payments/reconcile')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h2 className="m-0">Payments</h2>

      {error && (
        <CAlert data-testid="payments-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>Reconcile payment records</CCardHeader>
        <CCardBody className="d-flex flex-column gap-3">
          <p className="text-body-secondary m-0">
            Cross-checks stored payment records against expected order totals and flags timed-out or mismatched
            payments.
          </p>
          <div>
            <CButton data-testid="payments-reconcile" color="primary" onClick={reconcile} disabled={loading}>
              {loading ? <CSpinner size="sm" /> : 'Run reconciliation'}
            </CButton>
          </div>
          {result && (
            <pre
              data-testid="payments-reconcile-result"
              style={{
                background: 'var(--bg-subtle)',
                padding: 12,
                borderRadius: 6,
                overflowX: 'auto',
                fontSize: 13,
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}
