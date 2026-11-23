import type { Role, UserResponse } from './api/types'

export type Route =
  | 'auth'
  | 'shop'
  | 'cart'
  | 'orders'
  | 'profile'
  | 'access'
  | 'queue'
  | 'shipments'
  | 'audit'
  | 'products'
  | 'promotions'
  | 'payments'
  | 'refunds'
  | 'reports'

export function defaultRouteForRole(role: Role): Route {
  if (role === 'ADMIN') return 'queue'
  if (role === 'STAFF') return 'queue'
  return 'shop'
}

interface NavItem {
  route: Route
  label: string
  visible: (user: UserResponse | null, isGuest: boolean) => boolean
}

interface NavSection {
  label: string
  items: NavItem[]
}

const isStaffOrAdmin = (user: UserResponse | null) => user?.role === 'STAFF' || user?.role === 'ADMIN'
const isAdmin = (user: UserResponse | null) => user?.role === 'ADMIN'

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Shop',
    items: [
      { route: 'shop', label: 'Browse products', visible: () => true },
      { route: 'cart', label: 'Cart & checkout', visible: () => true },
    ],
  },
  {
    label: 'Account',
    items: [
      { route: 'orders', label: 'My orders', visible: (user) => !!user },
      { route: 'profile', label: 'Profile & notifications', visible: (user) => !!user },
    ],
  },
  {
    label: 'Back office',
    items: [
      { route: 'queue', label: 'Order queue', visible: (user) => isStaffOrAdmin(user) },
      { route: 'shipments', label: 'Shipments', visible: (user) => isStaffOrAdmin(user) },
      { route: 'audit', label: 'Audit log', visible: (user) => isStaffOrAdmin(user) },
    ],
  },
  {
    label: 'Admin',
    items: [
      { route: 'access', label: 'Access control', visible: (user) => isAdmin(user) },
      { route: 'products', label: 'Products', visible: (user) => isAdmin(user) },
      { route: 'promotions', label: 'Promotions', visible: (user) => isAdmin(user) },
      { route: 'payments', label: 'Payments', visible: (user) => isAdmin(user) },
      { route: 'refunds', label: 'Refunds', visible: (user) => isAdmin(user) },
      { route: 'reports', label: 'Reports', visible: (user) => isAdmin(user) },
    ],
  },
]
