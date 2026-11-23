const { expect } = require('@playwright/test')
const { BasePage } = require('./BasePage')
const { safeClick, safeFill } = require('../utils/safeAction')

class ReportsPage extends BasePage {
  async waitLoaded() {
    await this.heading('Reports').waitFor()
  }

  async setDateRange(start, end) {
    await safeFill(this.byTestId('report-start-date'), start, 'report-start-date')
    await safeFill(this.byTestId('report-end-date'), end, 'report-end-date')
  }

  /** kind: daily | monthly | products | top | revenue */
  async run(kind) {
    await safeClick(this.byTestId(`report-tab-${kind}`), `report-tab-${kind}`)
    await safeClick(this.byTestId('report-run'), 'report-run')
    await expect(this.byTestId('report-results')).toBeVisible()
  }

  /** Runs the report then downloads it; returns the Playwright Download object. */
  async export(kind, format) {
    await safeClick(this.byTestId(`report-tab-${kind}`), `report-tab-${kind}`)
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      safeClick(this.byTestId(`report-export-${format}`), `report-export-${format}`),
    ])
    return download
  }
}

module.exports = { ReportsPage }
