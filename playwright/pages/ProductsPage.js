const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill, safeCheck } = require('../utils/safeAction')

class ProductsPage extends BasePage {
  async waitLoaded() {
    await this.heading('Products').waitFor()
    await this.byTestId('product-form-submit').waitFor()
  }

  /** Create a product from the top form; returns its numeric id. */
  async createProduct({ sku, name, description, price, stock, active = true }) {
    await safeFill(this.byTestId('product-form-sku'), sku, 'product-form-sku')
    await safeFill(this.byTestId('product-form-name'), name, 'product-form-name')
    if (description) await safeFill(this.byTestId('product-form-description'), description, 'product-form-description')
    await safeFill(this.byTestId('product-form-price'), price, 'product-form-price')
    await safeFill(this.byTestId('product-form-slot-quantity'), stock, 'product-form-slot-quantity')
    if (active) await safeCheck(this.byTestId('product-form-active'), 'product-form-active')
    await this.shot('product-form-filled')
    await safeClick(this.byTestId('product-form-submit'), 'product-form-submit')
    await expect(this.byTestId('products-notice')).toBeVisible()
    return this.idByPrefixAndText('product-row-', sku, `product row for ${sku}`)
  }

  async manage(id) {
    await safeClick(this.byTestId(`product-manage-${id}`), `product-manage-${id}`)
    await expect(this.byTestId(`product-manage-panel-${id}`)).toBeVisible()
  }

  async setStock(quantity) {
    await safeFill(this.byTestId('product-slot-value'), quantity, 'product-slot-value')
    await safeClick(this.byTestId('product-set-slot'), 'product-set-slot')
    await expect(this.byTestId('products-notice')).toBeVisible()
  }

  async restock(quantity) {
    await safeFill(this.byTestId('product-restock-value'), quantity, 'product-restock-value')
    await safeClick(this.byTestId('product-restock-submit'), 'product-restock-submit')
    await expect(this.byTestId('products-notice')).toBeVisible()
  }

  /** Triggers a window.confirm() - auto-accepted by the autoDialog fixture. */
  async deleteProduct(id) {
    await this.shot('before-delete-product')
    await safeClick(this.byTestId(`product-delete-${id}`), `product-delete-${id}`)
    await this.shot('after-delete-product-confirm')
    await expect(this.byTestId(`product-row-${id}`)).toHaveCount(0)
  }
}

module.exports = { ProductsPage }
