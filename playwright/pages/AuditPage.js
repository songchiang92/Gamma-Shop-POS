const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill } = require('../utils/safeAction')

class AuditPage extends BasePage {
  async waitLoaded() {
    await this.heading('Audit log').waitFor()
  }

  async lookupOrder(orderId) {
    await safeFill(this.byTestId('audit-order-id'), orderId, 'audit-order-id')
    await safeClick(this.byTestId('audit-lookup-order'), 'audit-lookup-order')
    await expect(this.page.locator('[data-testid^="audit-order-entry-"]').first()).toBeVisible()
  }

  orderEntries() {
    return this.page.locator('[data-testid^="audit-order-entry-"]')
  }

  async loadUserActions(userId) {
    if (userId !== undefined) await safeFill(this.byTestId('audit-user-id'), userId, 'audit-user-id')
    await safeClick(this.byTestId('audit-load-user-actions'), 'audit-load-user-actions')
  }
}

module.exports = { AuditPage }
