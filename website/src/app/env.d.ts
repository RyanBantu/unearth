/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APPLE_SERVICES_ID?: string
  readonly APP_STORE_URL?: string
  readonly WEB_SIGN_IN_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
