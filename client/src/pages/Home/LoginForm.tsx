import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginFormProps = {
  emailRef: React.RefObject<HTMLInputElement>
  submitEmail: (e: React.FormEvent<HTMLFormElement>) => void
  submitting: boolean
}

export function LoginForm({
  className,
  emailRef,
  submitEmail,
  submitting,
  ...props
}: LoginFormProps & React.HTMLProps<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form onSubmit={submitEmail}>
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
                  ref={emailRef}
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
            <Button disabled={submitting} type='submit' className='w-full bg-gray-700'>
              {submitting && <Loader2 className='animate-spin' />}
              Login
            </Button>
          </div>
          {/* <div className='relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border'>
            <span className='relative z-10 bg-[#1a1f41] px-2 text-gray-100'>Or</span>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Button type='button' variant='outline' className='w-full'>
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
                <path
                  d='M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701'
                  fill='currentColor'
                />
              </svg>
              Continue with Apple
            </Button>
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={() => console.log('clicked')}
            >
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
                <path
                  d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
                  fill='currentColor'
                />
              </svg>
              Continue with Google
            </Button>
          </div> */}
        </div>
      </form>
      <div className='text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary text-gray-100'>
        By clicking continue, you agree to our{' '}
        <a href='https://github.com/Watts-Lab/atlas?tab=coc-ov-file'>Code of Conduct</a> and{' '}
        <a href='https://github.com/Watts-Lab/atlas?tab=AGPL-3.0-1-ov-file'>License</a>.
      </div>
    </div>
  )
}
