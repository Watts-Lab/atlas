import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import api from './api'

/**
 * Client helpers for WebAuthn (passkey) registration and login.
 *
 * The server speaks the JSON dialect produced/consumed by
 * `@simplewebauthn/browser`, so options are passed straight through and the
 * authenticator response is posted back unchanged. The ceremony is bound to the
 * browser by an HTTP-only cookie the server sets on the `/options` call, so all
 * requests must send credentials (our axios instance already does).
 */

export const passkeysSupported = (): boolean => browserSupportsWebAuthn()

/**
 * Register a new passkey for the currently logged-in user (Touch ID / Face ID /
 * Windows Hello / security key). Requires an active session.
 *
 * @param deviceName Optional human-friendly label for the credential.
 * @returns true when the passkey was verified and stored.
 */
export async function registerPasskey(deviceName?: string): Promise<boolean> {
  const { data: options } = await api.post('/webauthn/register/options')

  // Triggers the platform biometric / security-key prompt.
  const attResp = await startRegistration({ optionsJSON: options })

  const { data } = await api.post('/webauthn/register/verify', {
    credential: attResp,
    device_name: deviceName,
    transports: attResp.response?.transports ?? [],
  })

  return Boolean(data?.verified)
}

/**
 * Log in with a passkey. Usernameless: the authenticator offers the user's
 * discoverable credentials and the server resolves the account from the signed
 * assertion. On success the server sets the same `jwt` session cookie used by
 * magic-link login and returns the account email + usage.
 */
export async function loginWithPasskey(): Promise<{ email: string; usage: unknown }> {
  const { data: options } = await api.post('/webauthn/authenticate/options')

  const authResp = await startAuthentication({ optionsJSON: options })

  const { data } = await api.post('/webauthn/authenticate/verify', {
    credential: authResp,
  })

  return { email: data.email, usage: data.usage ?? null }
}
