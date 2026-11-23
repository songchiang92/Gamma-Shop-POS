const { expect } = require('@playwright/test')

/** Delay applied after every safe* interaction so runs are watchable and settle the DOM. */
const STEP_DELAY_MS = 300

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Verify the target is actually on the page and interactive BEFORE touching it.
 * Throws a labelled error instead of a generic timeout when something is missing.
 *
 * @param {import('@playwright/test').Locator} locator
 * @param {string} label human-readable name used in failure messages
 */
async function ensurePresent(locator, label) {
  const name = label || 'target element'
  await expect(locator, `"${name}" is not attached to the DOM`).toHaveCount(1)
  await expect(locator, `"${name}" is not visible before interaction`).toBeVisible()
  await expect(locator, `"${name}" is not enabled before interaction`).toBeEnabled()
}

/** Click, but only after confirming the element is present + visible + enabled. */
async function safeClick(locator, label) {
  await ensurePresent(locator, label)
  await locator.click()
  await wait(STEP_DELAY_MS)
}

/** Fill a text/number input or textarea after confirming it is ready. */
async function safeFill(locator, value, label) {
  await ensurePresent(locator, label)
  await locator.fill(value === undefined || value === null ? '' : String(value))
  await wait(STEP_DELAY_MS)
}

/** Select an <option> by value (or {label}/{index}) after confirming the <select> is ready. */
async function safeSelect(locator, value, label) {
  await ensurePresent(locator, label)
  await locator.selectOption(value)
  await wait(STEP_DELAY_MS)
}

/** Tick a checkbox/radio after confirming it is ready (no-op if already checked). */
async function safeCheck(locator, label) {
  await ensurePresent(locator, label)
  await locator.check()
  await wait(STEP_DELAY_MS)
}

module.exports = { safeClick, safeFill, safeSelect, safeCheck, ensurePresent, STEP_DELAY_MS }
