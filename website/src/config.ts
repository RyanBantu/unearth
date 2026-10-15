// Fill these in before publishing. Anything in [BRACKETS] is shown as-is on the site.
export const site = {
  operatorCity: 'Manipal',
  contactEmail: 'bantu.ryan@gmail.com',
  privacyEffectiveDate: '15 October 2026',
  termsUpdatedDate: '13 October 2026',
  guidelinesUrl: 'https://unearth-1o4a.onrender.com/guidelines',
  backupRetentionDays: 30,
  /** Set APP_STORE_URL in Vercel once the app is approved. Empty shows "Coming soon to iPhone". */
  appStoreUrl: (import.meta.env.APP_STORE_URL ?? '').trim(),
  // Optional line in your own words, shown under "Why we built it". Leave empty to hide.
  founderNote: '',
  founderName: '',
}

/** Web sign-in stays dark unless WEB_SIGN_IN_ENABLED=true at build time. */
export const webSignInEnabled = import.meta.env.WEB_SIGN_IN_ENABLED === 'true'
