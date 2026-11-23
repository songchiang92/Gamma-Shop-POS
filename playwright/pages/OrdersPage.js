const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill } = require('../utils/safeAction')

class OrdersPage extends BasePage {
  async waitLoaded() {
    await this.heading('My orders').waitFor()
  }

  /** The first order in the list: its numeric id and its order number. */
  async firstOrder() {
    const row = this.page.locator('[data-testid^="order-row-"]').first()
    await expect(row, 'an order row').toBeVisible()
    const testId = await row.getAttribute('data-testid')
    const id = testId.replace('order-row-', '')
    const number = (await row.locator('td').first().innerText()).trim()
    return { id, number }
  }

  detail(id) {
    return this.byTestId(`order-detail-${id}`)
  }

  async openDetails(id) {
    await safeClick(this.byTestId(`order-details-${id}`), `order-details-${id}`)
    await expect(this.detail(id)).toBeVisible()
  }

  /** Start payment: opens the mock-gateway intent panel (a popup within the card). */
  async startPayment(id) {
    await safeClick(this.byTestId(`order-pay-now-${id}`), `order-pay-now-${id}`)
    await expect(this.byTestId(`order-pay-success-${id}`)).toBeVisible()
    await this.shot('after-payment-intent-popup')
  }

  async simulatePaymentSuccess(id) {
    await safeClick(this.byTestId(`order-pay-success-${id}`), `order-pay-success-${id}`)
    await expect(this.byTestId('orders-notice')).toBeVisible()
    await this.shot('after-simulate-payment-success')
    await expect(this.detail(id)).toContainText('PAID')
  }

  async simulatePaymentFailure(id) {
    await safeClick(this.byTestId(`order-pay-fail-${id}`), `order-pay-fail-${id}`)
    await expect(this.byTestId('orders-notice')).toBeVisible()
    await this.shot('after-simulate-payment-failure')
  }

  async retryPayment(id) {
    await safeClick(this.byTestId(`order-retry-payment-${id}`), `order-retry-payment-${id}`)
    await expect(this.byTestId(`order-pay-success-${id}`)).toBeVisible()
  }

  async cancelOrder(id) {
    await safeClick(this.byTestId(`order-cancel-${id}`), `order-cancel-${id}`)
    await expect(this.byTestId('orders-notice')).toBeVisible()
  }

  async requestRefund(id, reason) {
    await safeFill(this.byTestId(`order-refund-reason-${id}`), reason, `order-refund-reason-${id}`)
    await safeClick(this.byTestId(`order-refund-submit-${id}`), `order-refund-submit-${id}`)
    await expect(this.byTestId('orders-notice')).toBeVisible()
  }
}

module.exports = { OrdersPage }
