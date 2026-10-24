const REPO_URL = 'https://github.com/sengthai-319/textbee'
const SETUP_GUIDE_URL = `${REPO_URL}/blob/main/docs/SETUP.md`

export const Routes = {
  landingPage: '/dashboard',
  quickstart: SETUP_GUIDE_URL,
  login: '/login',
  register: '/register',
  logout: '/logout',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',

  dashboard: '/dashboard',

  // The anchors match the headings in docs/SETUP.md.
  downloadAndroidApp: `${SETUP_GUIDE_URL}#android-phones`,
  setupIphone: `${SETUP_GUIDE_URL}#iphone-through-a-mac`,
}
