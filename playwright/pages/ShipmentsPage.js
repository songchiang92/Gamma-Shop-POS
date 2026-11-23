const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill, safeSelect, safeCheck } = require('../utils/safeAction')

class ShipmentsPage extends BasePage {
  async waitLoaded() {
    await this.heading('Shipments').waitFor()
  }

  /** Create a van and return its id. */
  async createVan(label, capacity) {
    await safeFill(this.byTestId('shipment-new-van-label'), label, 'shipment-new-van-label')
    await safeFill(this.byTestId('shipment-new-van-capacity'), capacity, 'shipment-new-van-capacity')
    await safeClick(this.byTestId('shipment-create-van'), 'shipment-create-van')
    const card = this.page.locator('[data-testid^="van-card-"]').filter({ hasText: label }).first()
    await expect(card, `van card for "${label}"`).toBeVisible()
    const testId = await card.getAttribute('data-testid')
    return testId.replace('van-card-', '')
  }

  async selectUnassignedOrder(orderId) {
    await safeCheck(this.byTestId(`unassigned-select-${orderId}`), `unassigned-select-${orderId}`)
  }

  async addSelectedToVan(vanId) {
    await safeSelect(this.byTestId('shipment-target-van-select'), vanId, 'shipment-target-van-select')
    await safeClick(this.byTestId('shipment-add-to-van'), 'shipment-add-to-van')
    await expect(this.byTestId('shipments-notice')).toBeVisible()
  }

  vanCard(vanId) {
    return this.byTestId(`van-card-${vanId}`)
  }

  /** Triggers a window.confirm() - auto-accepted by the autoDialog fixture. */
  async dispatchVan(vanId) {
    await this.shot('before-dispatch-van')
    await safeClick(this.byTestId(`van-dispatch-${vanId}`), `van-dispatch-${vanId}`)
    await expect(this.byTestId('shipments-notice')).toBeVisible()
    await this.shot('after-dispatch-van-confirm')
  }

  async cancelVan(vanId) {
    await safeClick(this.byTestId(`van-cancel-${vanId}`), `van-cancel-${vanId}`)
    await expect(this.byTestId('shipments-notice')).toBeVisible()
  }

  async openHistory() {
    await safeClick(this.byTestId('shipment-history-toggle'), 'shipment-history-toggle')
  }
}

module.exports = { ShipmentsPage }
