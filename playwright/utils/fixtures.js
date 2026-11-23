const base = require('@playwright/test')
const fs = require('fs')
const path = require('path')

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Custom fixtures:
 *  - autoDialog : auto-accepts the app's window.confirm() prompts (delete account,
 *                 disable user, dispatch/cancel van, delete product/promotion).
 *  - shot(label): numbered full-page screenshot into screenshots/<test-title>/,
 *                 also attached to the HTML report.
 */
const test = base.test.extend({
  autoDialog: [
    async ({ page }, use) => {
      page.on('dialog', (dialog) => {
        dialog.accept().catch(() => {})
      })
      await use(true)
    },
    { auto: true },
  ],

  shot: async ({ page }, use, testInfo) => {
    let counter = 0
    const dir = path.join(__dirname, '..', 'screenshots', slug(testInfo.title))
    fs.mkdirSync(dir, { recursive: true })

    const shot = async (label) => {
      counter += 1
      const index = String(counter).padStart(2, '0')
      const file = path.join(dir, `${index}-${slug(label)}.png`)
      await page.screenshot({ path: file, fullPage: true })
      await testInfo.attach(`${index} ${label}`, { path: file, contentType: 'image/png' })
    }

    await use(shot)
  },
})

const expect = base.expect

module.exports = { test, expect, slug }
