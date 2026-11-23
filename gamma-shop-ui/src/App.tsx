import { useState } from 'react'
import { CSpinner } from '@coreui/react-pro'
import { AuthProvider, useAuth } from './state/AuthContext'
import { ThemeProvider } from './state/ThemeContext'
import { Layout } from './components/Layout'
import { defaultRouteForRole, type Route } from './routes'
import { AuthPage } from './pages/AuthPage'
import { ShopPage } from './pages/ShopPage'
import { CartPage } from './pages/CartPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProfilePage } from './pages/ProfilePage'
import { AccessControlPage } from './pages/AccessControlPage'
import { OrderQueuePage } from './pages/admin/OrderQueuePage'
import { ShipmentsPage } from './pages/admin/ShipmentsPage'
import { AuditPage } from './pages/admin/AuditPage'
import { ProductsPage } from './pages/admin/ProductsPage'
import { PromotionsPage } from './pages/admin/PromotionsPage'
import { PaymentsPage } from './pages/admin/PaymentsPage'
import { RefundsPage } from './pages/admin/RefundsPage'
import { ReportsPage } from './pages/admin/ReportsPage'

function AppShell() {
  const { user, loading } = useAuth()
  const [route, setRoute] = useState<Route>('shop')

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CSpinner />
      </div>
    )
  }

  function navigate(next: Route) {
    setRoute(next)
  }

  if (!user && route === 'auth') {
    return <AuthPage onNavigate={navigate} />
  }

  // Gate role-restricted routes: if the current route isn't valid for this user, bounce to their default.
  const restricted: Record<string, boolean> = {
    orders: !user,
    profile: !user,
    access: user?.role !== 'ADMIN',
    queue: user?.role !== 'STAFF' && user?.role !== 'ADMIN',
    shipments: user?.role !== 'STAFF' && user?.role !== 'ADMIN',
    audit: user?.role !== 'STAFF' && user?.role !== 'ADMIN',
    products: user?.role !== 'ADMIN',
    promotions: user?.role !== 'ADMIN',
    payments: user?.role !== 'ADMIN',
    refunds: user?.role !== 'ADMIN',
    reports: user?.role !== 'ADMIN',
  }
  const effectiveRoute: Route = restricted[route] ? (user ? defaultRouteForRole(user.role) : 'shop') : route

  return (
    <Layout route={effectiveRoute} onNavigate={navigate}>
      {effectiveRoute === 'shop' && <ShopPage onNavigate={navigate} />}
      {effectiveRoute === 'cart' && <CartPage onNavigate={navigate} />}
      {effectiveRoute === 'orders' && <OrdersPage />}
      {effectiveRoute === 'profile' && <ProfilePage onNavigate={navigate} />}
      {effectiveRoute === 'access' && <AccessControlPage />}
      {effectiveRoute === 'queue' && <OrderQueuePage />}
      {effectiveRoute === 'shipments' && <ShipmentsPage />}
      {effectiveRoute === 'audit' && <AuditPage />}
      {effectiveRoute === 'products' && <ProductsPage />}
      {effectiveRoute === 'promotions' && <PromotionsPage />}
      {effectiveRoute === 'payments' && <PaymentsPage />}
      {effectiveRoute === 'refunds' && <RefundsPage />}
      {effectiveRoute === 'reports' && <ReportsPage />}
    </Layout>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
