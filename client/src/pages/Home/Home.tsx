import { useEffect, useState } from 'react'
import { CartographicBackground } from '../Landing/CelestialBackground'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/service/api'
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
  const [isLoggingIn, setIsLoggingIn] = useState(loggingIn)
  const [loggingInMessage, setLoggingInMessage] = useState('Authenticating... Please wait.')

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
            navigate('/dashboard')
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

          {/* Login Form */}
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
              disabled={submitting}
              type='button'
              variant='outline'
              className='h-11 w-full rounded-sm border-[#9fb2ca] bg-white font-semibold text-[#0b1f3a] shadow-none hover:border-[#3c6082] hover:bg-[#eef4fa] hover:text-[#0b1f3a]'
            >
              <Fingerprint className='w-4 h-4' />
              Continue with passkey
            </Button>
          </div>

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
