const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill } = require('../utils/safeAction')

class CartPage extends BasePage {
  async waitLoaded() {
    await this.heading('Cart & checkout').waitFor()
  }

  row(productId) {
    return this.byTestId(`cart-item-row-${productId}`)
  }

  async setQuantity(productId, quantity) {
    await safeFill(this.byTestId(`cart-item-qty-${productId}`), quantity, `cart-item-qty-${productId}`)
    await expect(this.row(productId)).toBeVisible()
  }

  async removeItem(productId) {
    await safeClick(this.byTestId(`cart-item-remove-${productId}`), `cart-item-remove-${productId}`)
    await expect(this.row(productId)).toHaveCount(0)
  }

  async applyPromo(code) {
    await safeFill(this.byTestId('cart-promo-code'), code, 'cart-promo-code')
    await safeClick(this.byTestId('cart-promo-apply'), 'cart-promo-apply')
  }

  async fillShipping(address, city) {
    await safeFill(this.byTestId('cart-shipping-address'), address, 'cart-shipping-address')
    await safeFill(this.byTestId('cart-shipping-city'), city, 'cart-shipping-city')
  }

  async validateStock() {
    await safeClick(this.byTestId('cart-validate-stock'), 'cart-validate-stock')
  }

  async previewTotals() {
    await safeClick(this.byTestId('cart-preview-totals'), 'cart-preview-totals')
    await expect(this.byTestId('cart-preview-result')).toBeVisible()
  }

  async placeOrder() {
    await this.shot('before-place-order')
    await safeClick(this.byTestId('cart-place-order'), 'cart-place-order')
    await this.heading('My orders').waitFor()
  }
}

module.exports = { CartPage }
