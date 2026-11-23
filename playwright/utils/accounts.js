/** Demo accounts seeded by the API on first start (see gamma-shop-api/README.md). */
module.exports = {
  ADMIN: { email: 'admin@gammashop.local', password: 'Admin123!' },
  STAFF: { email: 'staff@gammashop.local', password: 'Staff123!' },
  CUSTOMER: { email: 'customer@gammashop.local', password: 'Customer123!' },

  /** A fresh, unique customer for a test run (keeps cart/order state clean). */
  freshCustomer() {
    const stamp = Date.now()
    return {
      stamp,
      email: `e2e.customer.${stamp}@test.local`,
      password: 'Password123!',
      fullName: `E2E Customer ${stamp}`,
      phone: '0123456789',
    }
  },
}
