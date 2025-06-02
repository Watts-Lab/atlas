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
            // ADDED: If invalid magic link
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

  // Updated to use onClick handler instead of form submission
  const handleLogin = async () => {
    setSubmitting(true)

    if (!email) {
      setSubmitting(false)
      return
    }

    try {
      await login({ email: email })

      // Wait 3 seconds after successful login
      await new Promise((resolve) => setTimeout(resolve, 3000))
      setLoggingInMessage('Check your email for the magic link!')
    } catch {
      setLoggingInMessage('Login failed. Please try again.')
      setTimeout(() => {
        setIsLoggingIn(false)
      }, 3000)
    } finally {
      setSubmitting(false)
      if (email) {
        setEmail('') // Clear email input after login attempt
      }
    }
  }

  return (
    <div className='p-0 m-0 w-full h-full fixed flex justify-center items-center contrast-120'>
      <div className='w-full h-full container-gradient'>
        <div className='w-inherit h-inherit'>
          <canvas ref={canvasRef} id='universe' className='w-full h-full'></canvas>
          <div className='absolute top-1/4 w-full text-center'>
            <div className='w-full max-w-sm mx-auto'>
              <div className='flex flex-col gap-6'>
                {/* Remove form wrapper, just use div */}
                <div>
                  <div className='flex flex-col gap-6'>
                    <div className='flex flex-col items-center gap-2'>
                      <a href='#' className='flex flex-col items-center gap-2 font-medium'>
                        <div className='flex h-12 w-12 items-center justify-center rounded-md pb-2'>
                          <img src='/web-app-manifest-512x512-bg-i.png' alt='Acme Inc.' />
                        </div>
                        <span className='sr-only text-gray-50'>Acme Inc.</span>
                      </a>
                      <h1 className='text-2xl font-bold text-gray-50'>Welcome to Atlas</h1>
                      <p className='text-base text-gray-50'>
                        Atlas is a platform for research cartography and data visualization. <br />
                      </p>
                    </div>
                    <div className='flex flex-col gap-6'>
                      <div className='grid gap-2 text-gray-50'>
                        <Label htmlFor='email'>Email</Label>
                        {!submitting ? (
                          <Input
                            data-testid='email-input'
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                            id='email'
                            type='email'
                            placeholder='example@scaledhumanity.org'
                            required
                          />
                        ) : (
                          <p className='text-slate-200 pt-4 fade-in'>
                            Please check your email for a login link
                          </p>
                        )}
                      </div>
                      <Button
                        disabled={submitting}
                        type='button' // Changed from 'submit' to 'button'
                        onClick={handleLogin} // Add onClick handler
                        className='w-full bg-gray-700'
                      >
                        {submitting && <Loader2 className='animate-spin' />}
                        Login
                      </Button>
                    </div>
                  </div>
                </div>
                <div className='text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary text-gray-100'>
                  By clicking continue, you agree to our{' '}
                  <a href='https://github.com/Watts-Lab/atlas?tab=coc-ov-file'>Code of Conduct</a>{' '}
                  and{' '}
                  <a href='https://github.com/Watts-Lab/atlas?tab=AGPL-3.0-1-ov-file'>License</a>.
                </div>
              </div>
            </div>
            {isLoggingIn ? <p className='text-slate-200 pt-4 fade-in'>{loggingInMessage}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
