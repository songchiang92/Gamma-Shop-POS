const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill } = require('../utils/safeAction')

class AuthPage extends BasePage {
  /** Open the app and make sure the auth card is showing (logging out first if needed). */
  async open() {
    await this.page.goto('/')
    if (await this.byTestId('header-logout').isVisible().catch(() => false)) {
      await this.logout()
    }
    if (!(await this.byTestId('auth-tab-login').isVisible().catch(() => false))) {
      await safeClick(this.byTestId('header-login'), 'header-login')
    }
    await this.byTestId('auth-tab-login').waitFor()
  }

  async register({ email, password, fullName, phone }) {
    await safeClick(this.byTestId('auth-tab-register'), 'auth-tab-register')
    await safeFill(this.byTestId('register-email'), email, 'register-email')
    await safeFill(this.byTestId('register-password'), password, 'register-password')
    await safeFill(this.byTestId('register-fullname'), fullName, 'register-fullname')
    if (phone) await safeFill(this.byTestId('register-phone'), phone, 'register-phone')
    await this.shot('register-form-filled')
    await safeClick(this.byTestId('register-submit'), 'register-submit')
    await this.expectSignedIn()
  }

  async login(email, password) {
    await safeClick(this.byTestId('auth-tab-login'), 'auth-tab-login')
    await safeFill(this.byTestId('login-email'), email, 'login-email')
    await safeFill(this.byTestId('login-password'), password, 'login-password')
    await this.shot('login-form-filled')
    await safeClick(this.byTestId('login-submit'), 'login-submit')
    await this.expectSignedIn()
  }

  async continueAsGuest() {
    await safeClick(this.byTestId('auth-tab-guest'), 'auth-tab-guest')
    await safeClick(this.byTestId('guest-continue'), 'guest-continue')
    await this.heading('Browse products').waitFor()
  }

  async requestPasswordReset(email) {
    await safeClick(this.byTestId('auth-tab-forgot'), 'auth-tab-forgot')
    await safeFill(this.byTestId('forgot-email'), email, 'forgot-email')
    await safeClick(this.byTestId('forgot-submit'), 'forgot-submit')
    await expect(this.byTestId('auth-info')).toBeVisible()
  }
}

module.exports = { AuthPage }
