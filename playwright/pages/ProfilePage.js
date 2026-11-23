const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill } = require('../utils/safeAction')

class ProfilePage extends BasePage {
  async waitLoaded() {
    await this.heading('Profile & notifications').waitFor()
  }

  async updateProfile({ fullName, phone, address, city }) {
    if (fullName !== undefined) await safeFill(this.byTestId('profile-fullname'), fullName, 'profile-fullname')
    if (phone !== undefined) await safeFill(this.byTestId('profile-phone'), phone, 'profile-phone')
    if (address !== undefined) await safeFill(this.byTestId('profile-address'), address, 'profile-address')
    if (city !== undefined) await safeFill(this.byTestId('profile-city'), city, 'profile-city')
    await this.shot('profile-form-filled')
    await safeClick(this.byTestId('profile-save'), 'profile-save')
    await expect(this.byTestId('profile-notice')).toBeVisible()
  }

  async notifications() {
    return this.page.locator('[data-testid^="notification-row-"]')
  }

  /** Triggers a window.confirm() - auto-accepted by the autoDialog fixture. */
  async deleteAccount() {
    await this.shot('before-delete-account')
    await safeClick(this.byTestId('profile-delete-account'), 'profile-delete-account')
    await this.shot('after-delete-account-confirm')
    await this.byTestId('auth-tab-login').waitFor()
  }
}

module.exports = { ProfilePage }
