import { useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import { api } from '../api/client'
import type { PageResponse, UserResponse } from '../api/types'
import { useAuth } from '../state/AuthContext'
import { NAV_SECTIONS } from '../routes'

const MATRIX: { feature: string; guest: boolean; customer: boolean; staff: boolean; admin: boolean }[] = [
  { feature: 'Browse products', guest: true, customer: true, staff: true, admin: true },
  { feature: 'Cart (add/update/remove items)', guest: true, customer: true, staff: true, admin: true },
  { feature: 'Checkout, pay, view/cancel own orders', guest: false, customer: true, staff: true, admin: true },
  { feature: 'Request/view own refunds', guest: false, customer: true, staff: true, admin: true },
  { feature: 'Profile & notifications', guest: false, customer: true, staff: true, admin: true },
  { feature: 'Order queue (assign, status, notes, invoice)', guest: false, customer: false, staff: true, admin: true },
  { feature: 'Shipment routing (vans by city)', guest: false, customer: false, staff: true, admin: true },
  { feature: 'Audit log (orders & user actions)', guest: false, customer: false, staff: true, admin: true },
  { feature: 'Product catalog management', guest: false, customer: false, staff: false, admin: true },
  { feature: 'Promotion management', guest: false, customer: false, staff: false, admin: true },
  { feature: 'Payment reconciliation', guest: false, customer: false, staff: false, admin: true },
  { feature: 'Refund approval / rejection', guest: false, customer: false, staff: false, admin: true },
  { feature: 'User accounts (this page)', guest: false, customer: false, staff: false, admin: true },
  { feature: 'Sales reports & exports', guest: false, customer: false, staff: false, admin: true },
]

function Check({ ok }: { ok: boolean }) {
  return ok ? <span style={{ color: 'var(--cui-success, green)' }}>✓</span> : <span style={{ opacity: 0.3 }}>—</span>
}

export function AccessControlPage() {
  const { user, isGuest } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(isAdmin)
  const [error, setError] = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<PageResponse<UserResponse>>('/api/admin/users?page=0&size=100')
      setUsers(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  async function disableUser(id: number) {
    if (!confirm('Disable this account? The user will no longer be able to log in.')) return
    setError(null)
    try {
      await api.postNoBody(`/api/admin/users/${id}/disable`)
      loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disable user')
    }
  }

  const visibleSections = NAV_SECTIONS.map((section) => ({
    label: section.label,
    items: section.items.filter((item) => item.visible(user, isGuest)),
  })).filter((s) => s.items.length > 0)

  return (
    <div className="d-flex flex-column gap-3">
      <h2 className="m-0">Access control</h2>
      <p className="text-body-secondary m-0">
        There is a single login for every account type. What you can see and do after logging in is driven entirely
        by your role: <strong>{user?.role ?? (isGuest ? 'GUEST' : 'signed out')}</strong>.
      </p>

      {error && (
        <CAlert data-testid="access-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>Your current access</CCardHeader>
        <CCardBody>
          {visibleSections.length === 0 ? (
            <p className="m-0 text-body-secondary">Log in to see what you have access to.</p>
          ) : (
            visibleSections.map((section) => (
              <div key={section.label} className="mb-2">
                <span className="text-body-secondary small text-uppercase">{section.label}: </span>
                {section.items.map((item) => (
                  <CBadge key={item.route} color="secondary" className="me-1">
                    {item.label}
                  </CBadge>
                ))}
              </div>
            ))
          )}
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader>Permission matrix</CCardHeader>
        <CCardBody>
          <CTable responsive small align="middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Feature</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Guest</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Customer</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Staff</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Admin</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {MATRIX.map((row) => (
                <CTableRow key={row.feature}>
                  <CTableDataCell>{row.feature}</CTableDataCell>
                  <CTableDataCell className="text-center">
                    <Check ok={row.guest} />
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <Check ok={row.customer} />
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <Check ok={row.staff} />
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <Check ok={row.admin} />
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>

      {isAdmin && (
        <CCard>
          <CCardHeader>User accounts</CCardHeader>
          <CCardBody>
            {loading ? (
              <CSpinner size="sm" />
            ) : (
              <CTable responsive hover small align="middle">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>ID</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Role</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Joined</CTableHeaderCell>
                    <CTableHeaderCell></CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {users.map((u) => (
                    <CTableRow data-testid={`user-row-${u.id}`} key={u.id}>
                      <CTableDataCell className="text-body-secondary">{u.id}</CTableDataCell>
                      <CTableDataCell>{u.email}</CTableDataCell>
                      <CTableDataCell>{u.fullName}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={u.role === 'ADMIN' ? 'danger' : u.role === 'STAFF' ? 'warning' : 'info'}>
                          {u.role}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={u.enabled ? 'success' : 'secondary'}>{u.enabled ? 'Enabled' : 'Disabled'}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{new Date(u.createdAt).toLocaleDateString()}</CTableDataCell>
                      <CTableDataCell>
                        {u.enabled && (
                          <CButton data-testid={`user-disable-${u.id}`} size="sm" color="danger" variant="outline" onClick={() => disableUser(u.id)}>
                            Disable
                          </CButton>
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      )}
    </div>
  )
}
