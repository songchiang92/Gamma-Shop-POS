const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill, safeCheck } = require('../utils/safeAction')

class ShopPage extends BasePage {
  async waitLoaded() {
    await this.heading('Browse products').waitFor()
    await this.byTestId('shop-filter-apply').waitFor()
  }

  card(id) {
    return this.byTestId(`product-card-${id}`)
  }

  async firstProductId() {
    return this.firstIdByPrefix('product-card-', 'a product card')
  }

  async firstProductName() {
    const title = this.page.locator('[data-testid^="product-card-"]').first().locator('.card-title')
    await expect(title, 'a product title').toBeVisible()
    return (await title.innerText()).trim()
  }

  async search(term) {
    await safeFill(this.byTestId('shop-search'), term, 'shop-search')
    await safeClick(this.byTestId('shop-filter-apply'), 'shop-filter-apply')
  }

  async clearFilters() {
    await safeFill(this.byTestId('shop-search'), '', 'shop-search')
    await safeFill(this.byTestId('shop-min-price'), '', 'shop-min-price')
    await safeFill(this.byTestId('shop-max-price'), '', 'shop-max-price')
    await safeClick(this.byTestId('shop-filter-apply'), 'shop-filter-apply')
  }

  async filterByPrice({ min, max, inStockOnly } = {}) {
    await safeFill(this.byTestId('shop-search'), '', 'shop-search')
    if (min !== undefined) await safeFill(this.byTestId('shop-min-price'), min, 'shop-min-price')
    if (max !== undefined) await safeFill(this.byTestId('shop-max-price'), max, 'shop-max-price')
    if (inStockOnly) await safeCheck(this.byTestId('shop-instock-filter'), 'shop-instock-filter')
    await safeClick(this.byTestId('shop-filter-apply'), 'shop-filter-apply')
  }

  /** Opens the product detail modal (a popup) by clicking the card title. */
  async openProductModal(id) {
    await safeClick(this.card(id).getByRole('heading').first(), `product ${id} title`)
    await expect(this.byTestId(`product-modal-add-to-cart-${id}`)).toBeVisible()
  }

  async addToCartFromModal(id) {
    await safeClick(this.byTestId(`product-modal-add-to-cart-${id}`), `product-modal-add-to-cart-${id}`)
    await this.shot('after-add-to-cart-from-modal')
    await expect(this.byTestId('shop-notice')).toBeVisible()
  }

  async addToCart(id, quantity) {
    if (quantity !== undefined) {
      await safeFill(this.byTestId(`product-qty-${id}`), quantity, `product-qty-${id}`)
    }
    await safeClick(this.byTestId(`add-to-cart-${id}`), `add-to-cart-${id}`)
    await expect(this.byTestId('shop-notice')).toBeVisible()
  }

  async goToCart() {
    await this.shot('before-nav-to-cart')
    await safeClick(this.byTestId('shop-go-to-cart'), 'shop-go-to-cart')
    await this.heading('Cart & checkout').waitFor()
  }
}

module.exports = { ShopPage }
