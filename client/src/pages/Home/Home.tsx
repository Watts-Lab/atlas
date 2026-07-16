import { useEffect, useState } from 'react'
import { CartographicBackground } from '../Landing/CelestialBackground'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/service/api'
import { loginWithPasskey, passkeysSupported, registerPasskey } from '@/service/passkey'
import { useUser } from '@/context/User/useUser'
import { Button } from '@/components/ui/button'
import { Fingerprint, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

type Params = {
  email?: string
  magicLink?: string
}

const Home = ({ loggingIn }: { loggingIn?: boolean }) => {
  const { login, logout, updateUser, refreshUser } = useUser()
  const params: Params = useParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(loggingIn)
  const [loggingInMessage, setLoggingInMessage] = useState('Authenticating... Please wait.')
  const [showAddPasskey, setShowAddPasskey] = useState(false)
  const supportsPasskeys = passkeysSupported()

  // Handle immediate magic-link login when "loggingIn" is true
  useEffect(() => {
    if (loggingIn) {
      setIsLoggingIn(true)
      setLoggingInMessage('Authenticating... Please wait.')

      api
        .post(`/auth/validate`, { email: params.email, magic_link: params.magicLink })
        .then((response) => {
          if (response.status === 200) {
            updateUser({
              loggedIn: true,
              email: response.data.email,
              usage: response.data.usage ?? null,
            })
            // Offer to enrol a passkey on this device instead of navigating
            // away immediately — but only if the browser supports it.
            if (passkeysSupported()) {
              setIsLoggingIn(false)
              setShowAddPasskey(true)
            } else {
              navigate('/dashboard')
            }
          } else {
            setLoggingInMessage('Invalid or expired magic link. Please try logging in again.')
            setTimeout(() => {
              setIsLoggingIn(false)
            }, 3000)
          }
        })
    }
  }, [loggingIn])

  // If user is already logged in, check if the email is valid
  useEffect(() => {
    if (!loggingIn) {
      refreshUser().then((res) => {
        if (res.loggedIn) {
          navigate('/dashboard')
        } else {
          setLoggingInMessage('Token authentication failed. Please login again.')
          logout()
        }
      })
    }
  }, [])

  const handlePasskeyLogin = async () => {
    setPasskeyBusy(true)
    setIsLoggingIn(true)
    setLoggingInMessage('Waiting for your passkey...')
    try {
      const { email: authedEmail, usage } = await loginWithPasskey()
      updateUser({ loggedIn: true, email: authedEmail, usage: usage as never })
      navigate('/dashboard')
    } catch (err) {
      // Includes user cancellation (NotAllowedError) and verification failures.
      console.warn('Passkey login failed', err)
      setLoggingInMessage('Passkey login was cancelled or failed. Try again or use email.')
      setTimeout(() => setIsLoggingIn(false), 3000)
    } finally {
      setPasskeyBusy(false)
    }
  }

  const handleAddPasskey = async () => {
    setPasskeyBusy(true)
    try {
      await registerPasskey()
    } catch (err) {
      // Non-fatal: the user is already logged in via the magic link.
      console.warn('Passkey registration failed', err)
    } finally {
      setPasskeyBusy(false)
      navigate('/dashboard')
    }
  }

  const handleLogin = async () => {
    setSubmitting(true)

    if (!email) {
      setSubmitting(false)
      return
    }

    try {
      await login({ email: email })
      await new Promise((resolve) => setTimeout(resolve, 3000))
      setLoggingInMessage('Check your email for the magic link!')
    } catch {
      setLoggingInMessage('Login failed. Please try again.')
      setTimeout(() => {
        setIsLoggingIn(false)
      }, 3000)
    } finally {
      setSubmitting(false)
      setEmail('')
    }
  }

  return (
    <div className='fixed inset-0 overflow-auto bg-[#f8fafc] text-[#0b1f3a] selection:bg-[#6f95bd]/25 selection:text-[#06162b]'>
      <CartographicBackground />

      <main className='relative z-10 flex min-h-screen items-center justify-center px-6 py-12'>
        <div className='w-full max-w-md  p-8 '>
          {/* Header Section */}
          <div className='text-center space-y-5'>
            <div className='flex justify-center'>
              <img src='/logo.svg' alt='Atlas Logo' className='h-32 w-32' />
            </div>
            <div>
              <h1 className='text-3xl font-semibold tracking-tight text-[#071a33]'>
                Welcome to Atlas
              </h1>
            </div>
          </div>

          {/* Post-login passkey enrolment prompt */}
          {showAddPasskey ? (
            <div className='mt-8 space-y-5 fade-in'>
              <div className='rounded-md border border-[#d6dee8] bg-white/70 p-5 text-center'>
                <Fingerprint className='mx-auto h-8 w-8 text-[#16375f]' />
                <h2 className='mt-3 text-lg font-semibold text-[#071a33]'>
                  Add a passkey to this device?
                </h2>
                <p className='mt-2 text-sm text-[#475569]'>
                  Next time you can sign in instantly with Touch ID, Face ID, or Windows Hello — no
                  email link needed.
                </p>
              </div>
              <Button
                disabled={passkeyBusy}
                type='button'
                onClick={handleAddPasskey}
                className='h-11 w-full rounded-sm border border-[#0b1f3a] bg-[#0b1f3a] font-semibold text-white shadow-none hover:bg-[#16375f] hover:border-[#16375f]'
              >
                {passkeyBusy ? (
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                ) : (
                  <Fingerprint className='w-4 h-4 mr-2' />
                )}
                Add passkey
              </Button>
              <Button
                disabled={passkeyBusy}
                type='button'
                variant='ghost'
                onClick={() => navigate('/dashboard')}
                className='h-11 w-full rounded-sm font-semibold text-[#475569] hover:bg-[#eef4fa] hover:text-[#0b1f3a]'
              >
                Maybe later
              </Button>
            </div>
          ) : (
            /* Login Form */
            <div className='mt-8 space-y-5'>
              <div className='space-y-2'>
                <Label htmlFor='email' className='text-sm font-semibold text-[#0b1f3a]'>
                  Email
                </Label>
                {!submitting ? (
                  <Input
                    data-testid='email-input'
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    id='email'
                    type='email'
                    placeholder='example@scaledhumanity.org'
                    required
                    className='h-11 rounded-sm border-[#9fb2ca] bg-white text-[#0b1f3a] placeholder:text-[#94a3b8] focus-visible:border-[#3c6082] focus-visible:ring-[#6f95bd]/30'
                  />
                ) : (
                  <p className='border-y border-[#d6dee8] py-4 text-sm text-[#475569] fade-in'>
                    Please check your email for a login link
                  </p>
                )}
              </div>

              <Button
                disabled={submitting}
                type='button'
                onClick={handleLogin}
                className='h-11 w-full rounded-sm border border-[#0b1f3a] bg-[#0b1f3a] font-semibold text-white shadow-none hover:bg-[#16375f] hover:border-[#16375f]'
              >
                {submitting && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
                Login
              </Button>

              <div className='flex items-center gap-3'>
                <div className='h-px flex-1 bg-[#d6dee8]' />
                <span className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]'>
                  Or
                </span>
                <div className='h-px flex-1 bg-[#d6dee8]' />
              </div>

              <Button
                disabled={submitting || passkeyBusy || !supportsPasskeys}
                type='button'
                variant='outline'
                onClick={handlePasskeyLogin}
                className='h-11 w-full rounded-sm border-[#9fb2ca] bg-white font-semibold text-[#0b1f3a] shadow-none hover:border-[#3c6082] hover:bg-[#eef4fa] hover:text-[#0b1f3a]'
              >
                {passkeyBusy ? (
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                ) : (
                  <Fingerprint className='w-4 h-4' />
                )}
                Continue with passkey
              </Button>
              {!supportsPasskeys && (
                <p className='text-center text-xs text-[#64748b]'>
                  Passkeys aren&apos;t supported in this browser. Use the email login above.
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className='mt-8 text-center text-xs leading-5 text-[#64748b]'>
            <span>By clicking continue, you agree to our </span>
            <a
              href='https://github.com/Watts-Lab/atlas?tab=coc-ov-file'
              className='font-medium text-[#0b1f3a] underline decoration-[#9fb2ca] underline-offset-4 hover:text-[#6f1d1b]'
            >
              Code of Conduct
            </a>
            <span> and </span>
            <a
              href='https://github.com/Watts-Lab/atlas?tab=AGPL-3.0-1-ov-file'
              className='font-medium text-[#0b1f3a] underline decoration-[#9fb2ca] underline-offset-4 hover:text-[#6f1d1b]'
            >
              License
            </a>
            <span>.</span>
          </div>

          {/* Status Messages */}
          {isLoggingIn && (
            <p className='mt-6 border-t border-[#d6dee8] pt-5 text-center text-sm text-[#475569] fade-in'>
              {loggingInMessage}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export default Home
