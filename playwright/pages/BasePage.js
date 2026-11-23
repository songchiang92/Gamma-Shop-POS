const { expect } = require('@playwright/test')
const { safeClick } = require('../utils/safeAction')

/**
 * Shared behaviour for every page: test-id lookup, the top navigation bar and
 * the "screenshot before leaving this page" rule.
 *
 * Construct with the Playwright `page` and the `shot` fixture so any page object
 * can screenshot itself (e.g. right after a modal/confirm interaction).
 */
class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {(label: string) => Promise<void>} shot
   */
  constructor(page, shot) {
    this.page = page
    this.shot = shot
  }

  byTestId(id) {
    return this.page.getByTestId(id)
  }

  heading(name) {
    return this.page.getByRole('heading', { name })
  }

  /** Screenshot the current screen, then jump to another section via the nav bar. */
  async navTo(route, expectedHeading) {
    await this.shot(`before-nav-to-${route}`)
    await safeClick(this.byTestId(`nav-${route}`), `nav-${route}`)
    if (expectedHeading) await this.heading(expectedHeading).waitFor()
  }

  async currentRole() {
    return (await this.byTestId('header-user-role').innerText()).trim()
  }

  async expectSignedIn() {
    await expect(this.byTestId('header-user-name')).toBeVisible()
  }

  async logout() {
    await this.shot('before-logout')
    await safeClick(this.byTestId('header-logout'), 'header-logout')
    await this.byTestId('auth-tab-login').waitFor()
  }

  /** Read the id suffix from the first element whose test-id starts with `prefix`. */
  async firstIdByPrefix(prefix, label) {
    const locator = this.page.locator(`[data-testid^="${prefix}"]`).first()
    await expect(locator, label || `element with test-id "${prefix}*"`).toBeVisible()
    const testId = await locator.getAttribute('data-testid')
    return testId.slice(prefix.length)
  }

  /** Read the id suffix from the row (test-id `prefix*`) that contains `text`. */
  async idByPrefixAndText(prefix, text, label) {
    const row = this.page.locator(`[data-testid^="${prefix}"]`, { hasText: text })
    await expect(row, label || `row "${prefix}*" containing "${text}"`).toBeVisible()
    const testId = await row.getAttribute('data-testid')
    return testId.slice(prefix.length)
  }
}

module.exports = { BasePage }
