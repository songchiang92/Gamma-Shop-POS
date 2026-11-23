const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill, safeSelect, safeCheck, ensurePresent } = require('../utils/safeAction')

class PromotionsPage extends BasePage {
  async waitLoaded() {
    await this.heading('Promotions').waitFor()
    await this.byTestId('promo-form-submit').waitFor()
  }

  /** Create a promotion from the top form; returns its numeric id. */
  async createPromotion({ code, name, description, discountType = 'PERCENTAGE', discountValue = '10', active = true }) {
    await safeFill(this.byTestId('promo-form-code'), code, 'promo-form-code')
    await safeFill(this.byTestId('promo-form-name'), name, 'promo-form-name')
    if (description) await safeFill(this.byTestId('promo-form-description'), description, 'promo-form-description')
    await safeSelect(this.byTestId('promo-form-discount-type'), discountType, 'promo-form-discount-type')
    await safeFill(this.byTestId('promo-form-discount-value'), discountValue, 'promo-form-discount-value')
    if (active) await safeCheck(this.byTestId('promo-form-active'), 'promo-form-active')
    await this.shot('promo-form-filled')
    await safeClick(this.byTestId('promo-form-submit'), 'promo-form-submit')
    await expect(this.byTestId('promotions-notice')).toBeVisible()
    return this.idByPrefixAndText('promo-row-', code, `promotion row for ${code}`)
  }

  async manage(id) {
    await safeClick(this.byTestId(`promo-manage-${id}`), `promo-manage-${id}`)
    await expect(this.byTestId(`promo-manage-panel-${id}`)).toBeVisible()
  }

  /** Assign the first product offered by the picker. Returns false if none. */
  async assignFirstProduct() {
    const select = this.byTestId('promo-product-id-input')
    await ensurePresent(select, 'promo-product-id-input')
    const values = await select
      .locator('option')
      .evaluateAll((options) => options.map((o) => o.value).filter(Boolean))
    if (values.length === 0) return false
    await safeSelect(select, values[0], 'promo-product-id-input')
    await safeClick(this.byTestId('promo-assign-product'), 'promo-assign-product')
    await expect(this.page.locator('[data-testid^="promo-remove-product-"]').first()).toBeVisible()
    return true
  }

  async notifyCustomers() {
    await safeClick(this.byTestId('promo-notify'), 'promo-notify')
    await expect(this.byTestId('promotions-notice')).toBeVisible()
  }

  /** Triggers a window.confirm() - auto-accepted by the autoDialog fixture. */
  async deletePromotion(id) {
    await this.shot('before-delete-promotion')
    await safeClick(this.byTestId(`promo-delete-${id}`), `promo-delete-${id}`)
    await this.shot('after-delete-promotion-confirm')
    await expect(this.byTestId(`promo-row-${id}`)).toHaveCount(0)
  }
}

module.exports = { PromotionsPage }
