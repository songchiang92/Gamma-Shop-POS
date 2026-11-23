const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick } = require('../utils/safeAction')

class PaymentsPage extends BasePage {
  async waitLoaded() {
    await this.heading('Payments').waitFor()
  }

  async reconcile() {
    await safeClick(this.byTestId('payments-reconcile'), 'payments-reconcile')
    await expect(this.byTestId('payments-reconcile-result')).toBeVisible()
  }

  async result() {
    return (await this.byTestId('payments-reconcile-result').innerText()).trim()
  }
}

module.exports = { PaymentsPage }
