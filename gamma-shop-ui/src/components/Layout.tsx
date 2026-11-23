import type { ReactNode } from 'react'
import { CBadge, CButton, CContainer } from '@coreui/react-pro'
import { useAuth } from '../state/AuthContext'
import { useTheme } from '../state/ThemeContext'
import { NAV_SECTIONS, type Route } from '../routes'

const roleColor: Record<string, string> = {
  ADMIN: 'danger',
  STAFF: 'warning',
  CUSTOMER: 'info',
}

export function Layout({
  route,
  onNavigate,
  children,
}: {
  route: Route
  onNavigate: (route: Route) => void
  children: ReactNode
}) {
  const { user, isGuest, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div
          data-testid="header-brand"
          style={{ fontWeight: 600, fontSize: 20, cursor: 'pointer' }}
          onClick={() => onNavigate(user ? 'shop' : 'auth')}
        >
          Gamma Shop
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CButton
            data-testid="header-theme-toggle"
            size="sm"
            color="secondary"
            variant="outline"
            onClick={toggleTheme}
            title="Toggle light/dark mode"
          >
            {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
          </CButton>
          {user ? (
            <>
              <span data-testid="header-user-name">{user.fullName}</span>
              <CBadge data-testid="header-user-role" color={roleColor[user.role]}>
                {user.role}
              </CBadge>
              <CButton
                data-testid="header-logout"
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => {
                  logout().then(() => onNavigate('auth'))
                }}
              >
                Log out
              </CButton>
            </>
          ) : isGuest ? (
            <>
              <CBadge color="secondary">Guest</CBadge>
              <CButton data-testid="header-login" size="sm" color="primary" onClick={() => onNavigate('auth')}>
                Log in / Register
              </CButton>
            </>
          ) : (
            <CButton data-testid="header-login" size="sm" color="primary" onClick={() => onNavigate('auth')}>
              Log in
            </CButton>
          )}
        </div>
      </header>

      <nav
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '10px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          rowGap: 10,
        }}
      >
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => item.visible(user, isGuest))
          if (items.length === 0) return null
          return (
            <div key={section.label} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.55, marginRight: 2 }}>
                {section.label}
              </span>
              {items.map((item) => (
                <CButton
                  key={item.route}
                  data-testid={`nav-${item.route}`}
                  size="sm"
                  color={route === item.route ? 'primary' : 'secondary'}
                  variant={route === item.route ? undefined : 'ghost'}
                  onClick={() => onNavigate(item.route)}
                >
                  {item.label}
                </CButton>
              ))}
            </div>
          )
        })}
      </nav>

      <CContainer fluid style={{ flex: 1, padding: '24px', maxWidth: 1200 }}>
        {children}
      </CContainer>
    </div>
  )
}
