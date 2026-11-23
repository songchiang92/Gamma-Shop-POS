const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill, safeSelect, ensurePresent } = require('../utils/safeAction')

class OrderQueuePage extends BasePage {
  async waitLoaded() {
    await this.heading('Order queue').waitFor()
  }

  detail(id) {
    return this.byTestId(`queue-detail-${id}`)
  }

  /** Make sure the list shows every status (not just "pending only"). */
  async showAllStatuses() {
    const toggle = this.byTestId('queue-pending-toggle')
    await ensurePresent(toggle, 'queue-pending-toggle')
    if ((await toggle.innerText()).includes('Showing pending only')) {
      await safeClick(toggle, 'queue-pending-toggle')
    }
  }

  async filterByStatus(status) {
    await this.showAllStatuses()
    await safeSelect(this.byTestId('queue-status-filter'), status, 'queue-status-filter')
  }

  async idForOrderNumber(orderNumber) {
    return this.idByPrefixAndText('queue-order-row-', orderNumber, `queue row for ${orderNumber}`)
  }

  async manage(id) {
    await safeClick(this.byTestId(`queue-manage-${id}`), `queue-manage-${id}`)
    await expect(this.detail(id)).toBeVisible()
  }

  /** Assign to the first real entry in the staff picker. Returns false if none. */
  async assignFirstStaff() {
    const select = this.byTestId('queue-staff-id-input')
    await ensurePresent(select, 'queue-staff-id-input')
    const values = await select
      .locator('option')
      .evaluateAll((options) => options.map((o) => o.value).filter(Boolean))
    if (values.length === 0) return false
    await safeSelect(select, values[0], 'queue-staff-id-input')
    await safeClick(this.byTestId('queue-assign-staff'), 'queue-assign-staff')
    await expect(this.byTestId('queue-notice')).toBeVisible()
    return true
  }

  async setStatus(status) {
    await safeSelect(this.byTestId('queue-status-select'), status, 'queue-status-select')
    await safeClick(this.byTestId('queue-update-status'), 'queue-update-status')
    await expect(this.byTestId('queue-notice')).toBeVisible()
  }

  async markPacked() {
    await safeClick(this.byTestId('queue-mark-packed'), 'queue-mark-packed')
    await expect(this.byTestId('queue-notice')).toBeVisible()
  }

  async markShipped() {
    await safeClick(this.byTestId('queue-mark-shipped'), 'queue-mark-shipped')
    await expect(this.byTestId('queue-notice')).toBeVisible()
  }

  async markCompleted() {
    await safeClick(this.byTestId('queue-mark-completed'), 'queue-mark-completed')
    await expect(this.byTestId('queue-notice')).toBeVisible()
  }

  async fixAddress(address, city) {
    await safeFill(this.byTestId('queue-address-input'), address, 'queue-address-input')
    await safeFill(this.byTestId('queue-city-input'), city, 'queue-city-input')
    await safeClick(this.byTestId('queue-save-address'), 'queue-save-address')
    await expect(this.byTestId('queue-notice')).toBeVisible()
  }

  async addNote(text) {
    await safeFill(this.byTestId('queue-note-input'), text, 'queue-note-input')
    await safeClick(this.byTestId('queue-add-note'), 'queue-add-note')
    await expect(this.page.locator('[data-testid^="queue-note-"]').first()).toBeVisible()
  }

  /** Clicks "Download invoice" and returns the Playwright Download object. */
  async downloadInvoice() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      safeClick(this.byTestId('queue-download-invoice'), 'queue-download-invoice'),
    ])
    return download
  }
}

module.exports = { OrderQueuePage }
