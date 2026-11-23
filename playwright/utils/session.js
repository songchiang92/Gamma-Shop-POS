/**
 * Put an already-authenticated session into the browser before the app boots, so a
 * spec doesn't have to click through the login form just to reach the step it tests.
 *
 * Keys match gamma-shop-ui/src/api/client.ts.
 */

/** @param {import('@playwright/test').Page} page @param {{token:string, refreshToken?:string}} session */
async function useSession(page, session) {
  await page.addInitScript((s) => {
    try {
      localStorage.setItem('gamma.accessToken', s.token)
      localStorage.setItem('gamma.refreshToken', s.refreshToken || '')
      localStorage.setItem('gamma.sessionTouch', String(Date.now()))
    } catch {
      /* storage blocked - ignore */
    }
  }, session)
}

/** @param {import('@playwright/test').Page} page @param {string} guestToken */
async function useGuest(page, guestToken) {
  await page.addInitScript((token) => {
    try {
      localStorage.setItem('gamma.guestToken', token)
    } catch {
      /* ignore */
    }
  }, guestToken)
}

/** Open the app at "/" and wait for the shell to render. */
async function openApp(page) {
  await page.goto('/')
  await page.getByTestId('header-brand').waitFor()
}

module.exports = { useSession, useGuest, openApp }
