const { BasePage } = require('./BasePage')

/**
 * A plain shell page for tests that only need the shared nav / header helpers
 * (`navTo`, `logout`, ...) without a specific page's methods.
 */
class Shell extends BasePage {}

module.exports = { Shell }
