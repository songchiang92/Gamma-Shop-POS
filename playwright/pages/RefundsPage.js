const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill, safeSelect } = require('../utils/safeAction')

class RefundsPage extends BasePage {
  async waitLoaded() {
    await this.heading('Refunds').waitFor()
  }

  async filterByStatus(status) {
    await safeSelect(this.byTestId('refunds-status-filter'), status, 'refunds-status-filter')
  }

  async idForEmail(email) {
    return this.idByPrefixAndText('refund-row-', email, `refund row for ${email}`)
  }

  async approve(id, note) {
    if (note) await safeFill(this.byTestId(`refund-note-${id}`), note, `refund-note-${id}`)
    await safeClick(this.byTestId(`refund-approve-${id}`), `refund-approve-${id}`)
    await expect(this.byTestId('refunds-notice')).toBeVisible()
  }

  async reject(id, note) {
    if (note) await safeFill(this.byTestId(`refund-note-${id}`), note, `refund-note-${id}`)
    await safeClick(this.byTestId(`refund-reject-${id}`), `refund-reject-${id}`)
    await expect(this.byTestId('refunds-notice')).toBeVisible()
  }
}

module.exports = { RefundsPage }
