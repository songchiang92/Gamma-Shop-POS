import { useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormInput,
  CNav,
  CNavItem,
  CNavLink,
  CSpinner,
} from '@coreui/react-pro'
import { useAuth } from '../state/AuthContext'
import { api } from '../api/client'
import { defaultRouteForRole } from '../routes'
import type { Route } from '../routes'

type Tab = 'login' | 'register' | 'guest' | 'forgot'

export function AuthPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { login, register, continueAsGuest } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // login fields
  const [loginEmail, setLoginEmail] = useState('customer@gammashop.local')
  const [loginPassword, setLoginPassword] = useState('')

  // register fields
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')

  // forgot/reset fields
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [resetPassword, setResetPassword] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user = await login(loginEmail, loginPassword)
      onNavigate(defaultRouteForRole(user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user = await register(regEmail, regPassword, regName, regPhone)
      onNavigate(defaultRouteForRole(user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleGuest() {
    setBusy(true)
    setError(null)
    try {
      await continueAsGuest()
      onNavigate('shop')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start guest session')
    } finally {
      setBusy(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await api.post<{ message: string; devResetToken?: string }>('/api/auth/forgot-password', {
        email: forgotEmail,
      })
      setInfo(
        res.devResetToken
          ? `${res.message} (dev token, since email sending is disabled: ${res.devResetToken})`
          : res.message,
      )
      if (res.devResetToken) setResetToken(res.devResetToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await api.post('/api/auth/reset-password', { token: resetToken, newPassword: resetPassword })
      setInfo('Password updated. You can log in now.')
      setTab('login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto' }}>
      <CCard>
        <CCardHeader>
          <CNav variant="tabs" role="tablist">
            <CNavItem>
              <CNavLink
                data-testid="auth-tab-login"
                active={tab === 'login'}
                onClick={() => setTab('login')}
                style={{ cursor: 'pointer' }}
              >
                Log in
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                data-testid="auth-tab-register"
                active={tab === 'register'}
                onClick={() => setTab('register')}
                style={{ cursor: 'pointer' }}
              >
                Register
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                data-testid="auth-tab-guest"
                active={tab === 'guest'}
                onClick={() => setTab('guest')}
                style={{ cursor: 'pointer' }}
              >
                Guest
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                data-testid="auth-tab-forgot"
                active={tab === 'forgot'}
                onClick={() => setTab('forgot')}
                style={{ cursor: 'pointer' }}
              >
                Forgot password
              </CNavLink>
            </CNavItem>
          </CNav>
        </CCardHeader>
        <CCardBody>
          {error && (
            <CAlert data-testid="auth-error" color="danger" dismissible onClose={() => setError(null)}>
              {error}
            </CAlert>
          )}
          {info && (
            <CAlert data-testid="auth-info" color="success" dismissible onClose={() => setInfo(null)}>
              {info}
            </CAlert>
          )}

          {tab === 'login' && (
            <CForm onSubmit={handleLogin} className="d-flex flex-column gap-3">
              <p className="text-body-secondary mb-0">
                One login for everyone. Customers land in the shop, staff in the order queue, admins in access
                control.
              </p>
              <CFormInput
                data-testid="login-email"
                type="email"
                label="Email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <CFormInput
                data-testid="login-password"
                type="password"
                label="Password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <CButton data-testid="login-submit" type="submit" color="primary" disabled={busy}>
                {busy ? <CSpinner size="sm" /> : 'Log in'}
              </CButton>
              <div className="small text-body-secondary">
                Demo accounts: admin@gammashop.local / Admin123! &middot; staff@gammashop.local / Staff123! &middot;
                customer@gammashop.local / Customer123!
              </div>
            </CForm>
          )}

          {tab === 'register' && (
            <CForm onSubmit={handleRegister} className="d-flex flex-column gap-3">
              <CFormInput
                data-testid="register-email"
                type="email"
                label="Email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
              <CFormInput
                data-testid="register-password"
                type="password"
                label="Password"
                minLength={8}
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
              <CFormInput
                data-testid="register-fullname"
                label="Full name"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
              <CFormInput
                data-testid="register-phone"
                label="Phone (optional)"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
              />
              <CButton data-testid="register-submit" type="submit" color="primary" disabled={busy}>
                {busy ? <CSpinner size="sm" /> : 'Create account'}
              </CButton>
              <div className="small text-body-secondary">New accounts are always customers.</div>
            </CForm>
          )}

          {tab === 'guest' && (
            <div className="d-flex flex-column gap-3">
              <p className="text-body-secondary">
                Browse and add items to a cart without an account. You can register at checkout to complete the
                purchase - your cart carries over.
              </p>
              <CButton data-testid="guest-continue" color="secondary" onClick={handleGuest} disabled={busy}>
                {busy ? <CSpinner size="sm" /> : 'Continue as guest'}
              </CButton>
            </div>
          )}

          {tab === 'forgot' && (
            <div className="d-flex flex-column gap-4">
              <CForm onSubmit={handleForgot} className="d-flex flex-column gap-3">
                <CFormInput
                  data-testid="forgot-email"
                  type="email"
                  label="Account email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <CButton data-testid="forgot-submit" type="submit" color="secondary" disabled={busy}>
                  Send reset token
                </CButton>
              </CForm>
              <CForm onSubmit={handleReset} className="d-flex flex-column gap-3 border-top pt-3">
                <CFormInput
                  data-testid="reset-token"
                  label="Reset token"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                />
                <CFormInput
                  data-testid="reset-password"
                  type="password"
                  label="New password"
                  minLength={8}
                  required
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
                <CButton data-testid="reset-submit" type="submit" color="primary" disabled={busy}>
                  Reset password
                </CButton>
              </CForm>
            </div>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}
