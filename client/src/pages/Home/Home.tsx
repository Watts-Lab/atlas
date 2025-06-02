import { useEffect, useRef, useState } from 'react'
import { createUniverse } from './stars-render'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/service/api'
import { useUser } from '@/context/User/useUser'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [email, setEmail] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(loggingIn)
  const [loggingInMessage, setLoggingInMessage] = useState('Authenticating... Please wait.')

  useEffect(() => {
    const starDensity = 0.216
    const speedCoeff = 0.03
    const giantColor = '180,184,240'
    const starColor = '226,225,142'
    const cometColor = '226,225,224'
    const cometDisabled = false

    const canva = canvasRef.current!
    const cleanup = createUniverse(
      canva,
      starDensity,
      speedCoeff,
      giantColor,
      starColor,
      cometColor,
      cometDisabled,
    )
    return () => {
      cleanup()
    }
  }, [])

  // Handle immediate magic-link login when "loggingIn" is true
  useEffect(() => {
    if (loggingIn) {
      setIsLoggingIn(true)
      setLoggingInMessage('Authenticating... Please wait.')

      api
        .post(`/validate`, { email: params.email, magic_link: params.magicLink })
        .then((response) => {
          if (response.status === 200) {
            updateUser({
              loggedIn: true,
              email: response.data.email,
              credits: response.data.credits,
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
    <div className='fixed inset-0 flex items-center justify-center contrast-120'>
      <div className='w-full h-full container-gradient'>
        <canvas ref={canvasRef} id='universe' className='w-full h-full' />

        <div className='absolute inset-0 flex items-center justify-center pt-20'>
          <div className='w-full max-w-sm space-y-6'>
            {/* Header Section */}
            <div className='text-center space-y-4'>
              <div className='flex justify-center'>
                <div className='w-12 flex items-center justify-center'>
                  <img
                    src='/web-app-manifest-512x512-bg-i.png'
                    alt='Atlas Logo'
                    className='w-full h-full'
                  />
                </div>
              </div>
              <div>
                <h1 className='text-2xl font-bold text-gray-50'>Welcome to Atlas</h1>
                <p className='text-gray-50 mt-2'>
                  Atlas is a platform for research cartography and data visualization.
                </p>
              </div>
            </div>

            {/* Login Form */}
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email' className='text-gray-50'>
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
                    className='w-full text-white'
                  />
                ) : (
                  <p className='text-slate-200 py-4 fade-in'>
                    Please check your email for a login link
                  </p>
                )}
              </div>

              <Button
                disabled={submitting}
                type='button'
                onClick={handleLogin}
                className='w-full bg-gray-700 hover:bg-gray-600'
              >
                {submitting && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
                Login
              </Button>
            </div>

            {/* Footer */}
            <div className='text-center text-xs text-gray-100 space-x-1'>
              <span>By clicking continue, you agree to our</span>
              <a
                href='https://github.com/Watts-Lab/atlas?tab=coc-ov-file'
                className='underline hover:text-white'
              >
                Code of Conduct
              </a>
              <span>and</span>
              <a
                href='https://github.com/Watts-Lab/atlas?tab=AGPL-3.0-1-ov-file'
                className='underline hover:text-white'
              >
                License
              </a>
              <span>.</span>
            </div>

            {/* Status Messages */}
            {isLoggingIn && (
              <p className='text-slate-200 text-center fade-in'>{loggingInMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
