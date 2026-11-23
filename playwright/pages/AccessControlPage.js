const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick } = require('../utils/safeAction')

class AccessControlPage extends BasePage {
  async waitLoaded() {
    await this.heading('Access control').waitFor()
  }

  userRow(id) {
    return this.byTestId(`user-row-${id}`)
  }

  async idForEmail(email) {
    return this.idByPrefixAndText('user-row-', email, `user row for ${email}`)
  }

  /** Triggers a window.confirm() - auto-accepted by the autoDialog fixture. */
  async disableUser(id) {
    await this.shot('before-disable-user')
    await safeClick(this.byTestId(`user-disable-${id}`), `user-disable-${id}`)
    await this.shot('after-disable-user-confirm')
    await expect(this.userRow(id)).toContainText('Disabled')
  }
}

module.exports = { AccessControlPage }
