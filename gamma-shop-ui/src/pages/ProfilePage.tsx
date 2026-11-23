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
  CListGroup,
  CListGroupItem,
  CSpinner,
} from '@coreui/react-pro'
import { api } from '../api/client'
import type { NotificationView } from '../api/types'
import { useAuth } from '../state/AuthContext'
import type { Route } from '../routes'

export function ProfilePage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { user, logout, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [notifications, setNotifications] = useState<NotificationView[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)

  useEffect(() => {
    api
      .get<NotificationView[]>('/api/notifications')
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoadingNotifications(false))
  }, [])

  if (!user) return null

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await api.put('/api/users/me', {
        fullName,
        phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
      })
      await refreshProfile()
      setNotice('Profile updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    if (!confirm('Delete your account? This cannot be undone.')) return
    setError(null)
    try {
      await api.del('/api/users/me')
      await logout()
      onNavigate('auth')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account')
    }
  }

  return (
    <div className="d-flex flex-column gap-3" style={{ maxWidth: 640 }}>
      <h2 className="m-0">Profile &amp; notifications</h2>

      {error && (
        <CAlert data-testid="profile-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert data-testid="profile-notice" color="success" dismissible onClose={() => setNotice(null)}>
          {notice}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>
          Account <CBadge color="info">{user.role}</CBadge>
        </CCardHeader>
        <CCardBody>
          <CForm onSubmit={saveProfile} className="d-flex flex-column gap-3">
            <CFormInput data-testid="profile-email" label="Email" value={user.email} disabled />
            <CFormInput data-testid="profile-fullname" label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <CFormInput data-testid="profile-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <CFormInput
              data-testid="profile-address"
              label="Delivery address"
              placeholder="Street, unit, postcode"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <CFormInput
              data-testid="profile-city"
              label="City"
              placeholder="e.g. Kuala Lumpur"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <p className="text-body-secondary small m-0">
              Used as the default delivery address at checkout, and to route your orders onto the right delivery
              van.
            </p>
            <div className="d-flex gap-2">
              <CButton data-testid="profile-save" type="submit" color="primary" disabled={saving}>
                {saving ? <CSpinner size="sm" /> : 'Save changes'}
              </CButton>
              <CButton data-testid="profile-delete-account" type="button" color="danger" variant="outline" onClick={deleteAccount}>
                Delete account
              </CButton>
            </div>
          </CForm>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader>Notifications</CCardHeader>
        <CCardBody>
          {loadingNotifications ? (
            <CSpinner size="sm" />
          ) : notifications.length === 0 ? (
            <p className="text-body-secondary m-0">No notifications yet.</p>
          ) : (
            <CListGroup>
              {notifications.map((n) => (
                <CListGroupItem data-testid={`notification-row-${n.id}`} key={n.id} className="d-flex flex-column gap-1">
                  <div className="d-flex justify-content-between">
                    <strong>{n.subject}</strong>
                    <CBadge color={n.status === 'SENT' ? 'success' : 'secondary'}>{n.status}</CBadge>
                  </div>
                  <div>{n.body}</div>
                  <div className="small text-body-secondary">
                    {n.type} &middot; {new Date(n.createdAt).toLocaleString()}
                  </div>
                </CListGroupItem>
              ))}
            </CListGroup>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}
