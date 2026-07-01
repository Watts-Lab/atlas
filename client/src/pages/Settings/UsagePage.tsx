import { useState, useEffect, useCallback } from 'react'
import { KeyRound, Trash2, Sparkles, Bot } from 'lucide-react'
import { toast } from 'sonner'

import MainPage from '@/components/View/DataGrid/MainPage'
import api from '@/service/api'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

// ── Types ─────────────────────────────────────────────────────────────────────

type Usage = {
  currency: string
  limit_usd: number
  used_usd: number
  remaining_usd: number
  period_start: string
  has_openai_key: boolean
  has_anthropic_key: boolean
}

type ProviderKey = {
  configured: boolean
  prefix: string | null
}

type Settings = {
  usage: Usage
  provider_keys: {
    openai: ProviderKey
    anthropic: ProviderKey
  }
}

type Provider = 'openai' | 'anthropic'

// ── Constants ─────────────────────────────────────────────────────────────────

const BREADCRUMBS = [
  { title: 'Settings', url: '/settings' },
  { title: 'Usage & Keys', url: '/settings/usage' },
]

const PROVIDER_META: Record<
  Provider,
  { label: string; icon: typeof Sparkles; placeholder: string }
> = {
  openai: { label: 'OpenAI', icon: Sparkles, placeholder: 'sk-...' },
  anthropic: { label: 'Anthropic', icon: Bot, placeholder: 'sk-ant-...' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Per-provider input + saving state
  const [inputs, setInputs] = useState<Record<Provider, string>>({ openai: '', anthropic: '' })
  const [savingProvider, setSavingProvider] = useState<Provider | null>(null)
  const [removingProvider, setRemovingProvider] = useState<Provider | null>(null)

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<Settings>('/user/settings')
      setSettings(data)
    } catch {
      toast.error('Failed to load usage settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // ── Save / remove provider keys ──────────────────────────────────────────────

  const handleSave = async (provider: Provider) => {
    const raw = inputs[provider].trim()
    if (!raw) {
      toast.error(`Please paste your ${PROVIDER_META[provider].label} API key`)
      return
    }
    setSavingProvider(provider)
    try {
      await api.put(`/user/provider-keys/${provider}`, { api_key: raw })
      toast.success(`${PROVIDER_META[provider].label} API key saved`)
      setInputs((prev) => ({ ...prev, [provider]: '' }))
      fetchSettings()
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save API key'
      toast.error(message)
    } finally {
      setSavingProvider(null)
    }
  }

  const handleRemove = async (provider: Provider) => {
    if (
      !confirm(
        `Remove your ${PROVIDER_META[provider].label} API key?\n\nExtractions will fall back to Atlas' platform keys and resume consuming your monthly token budget.`,
      )
    )
      return
    setRemovingProvider(provider)
    try {
      await api.delete(`/user/provider-keys/${provider}`)
      toast.success(`${PROVIDER_META[provider].label} API key removed`)
      fetchSettings()
    } catch {
      toast.error('Failed to remove API key')
    } finally {
      setRemovingProvider(null)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  // period_start is the UTC start of the current calendar month; the reset
  // happens at the start of next month, shown in the user's local time.
  const resetDateLabel = (periodStartIso: string) => {
    const start = new Date(periodStartIso)
    const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return nextMonth.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const usage = settings?.usage
  const usedPct =
    usage && usage.limit_usd > 0
      ? Math.min(100, Math.round((usage.used_usd / usage.limit_usd) * 100))
      : 0
  const fmtUsd = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <MainPage breadcrumbs={BREADCRUMBS}>
      <div className='flex flex-col flex-1 p-6 gap-6 max-w-3xl mx-auto w-full'>
        {/* ── Page header ── */}
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Usage & API Keys</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Track your monthly usage, or bring your own OpenAI / Anthropic key to run extractions
            without consuming your Atlas budget.
          </p>
        </div>

        <Separator />

        {/* ── Usage card ── */}
        <section className='rounded-lg border p-5'>
          <h2 className='text-lg font-semibold'>Monthly usage</h2>
          {isLoading || !usage ? (
            <div className='mt-4 space-y-3'>
              <Skeleton className='h-4 w-48' />
              <Skeleton className='h-3 w-full rounded-full' />
              <Skeleton className='h-4 w-64' />
            </div>
          ) : (
            <div className='mt-4 space-y-3'>
              <div className='flex items-baseline justify-between'>
                <span className='text-sm text-muted-foreground'>
                  {fmtUsd(usage.used_usd)} / {fmtUsd(usage.limit_usd)} used
                </span>
                <span className='text-sm font-medium'>{fmtUsd(usage.remaining_usd)} remaining</span>
              </div>
              <div className='h-2.5 w-full rounded-full bg-muted overflow-hidden'>
                <div
                  className='h-full rounded-full bg-primary transition-all'
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <p className='text-xs text-muted-foreground'>
                Resets on {resetDateLabel(usage.period_start)}. Extractions using your own provider
                key do not count toward this limit.
              </p>
            </div>
          )}
        </section>

        {/* ── Provider keys ── */}
        <section className='rounded-lg border p-5'>
          <h2 className='text-lg font-semibold'>Your provider keys</h2>
          <p className='text-sm text-muted-foreground mt-1'>
            When a key is set, your extractions use it directly and are billed by the provider — not
            against your Atlas budget. Keys are encrypted and never shown again after saving.
          </p>

          <div className='mt-5 space-y-6'>
            {(Object.keys(PROVIDER_META) as Provider[]).map((provider) => {
              const meta = PROVIDER_META[provider]
              const Icon = meta.icon
              const pk = settings?.provider_keys?.[provider]
              const configured = pk?.configured
              return (
                <div key={provider} className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <Icon className='h-4 w-4' />
                    <Label className='text-sm font-medium'>{meta.label}</Label>
                    {isLoading ? (
                      <Skeleton className='h-5 w-24 rounded-full' />
                    ) : configured ? (
                      <Badge variant='secondary' className='font-mono text-xs'>
                        {pk?.prefix ?? 'configured'}
                      </Badge>
                    ) : (
                      <Badge variant='outline' className='text-xs text-muted-foreground'>
                        Not set
                      </Badge>
                    )}
                  </div>

                  <div className='flex items-center gap-2'>
                    <Input
                      type='password'
                      autoComplete='off'
                      placeholder={configured ? 'Enter a new key to replace' : meta.placeholder}
                      value={inputs[provider]}
                      onChange={(e) =>
                        setInputs((prev) => ({ ...prev, [provider]: e.target.value }))
                      }
                      disabled={savingProvider === provider}
                    />
                    <Button
                      onClick={() => handleSave(provider)}
                      disabled={savingProvider === provider || !inputs[provider].trim()}
                      className='shrink-0'
                    >
                      {savingProvider === provider ? 'Saving…' : configured ? 'Replace' : 'Save'}
                    </Button>
                    {configured && (
                      <Button
                        variant='outline'
                        size='icon'
                        className='shrink-0'
                        onClick={() => handleRemove(provider)}
                        disabled={removingProvider === provider}
                        title={`Remove ${meta.label} key`}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {!isLoading &&
            !settings?.provider_keys?.openai.configured &&
            !settings?.provider_keys?.anthropic.configured && (
              <div className='mt-6 flex items-center gap-2 text-xs text-muted-foreground'>
                <KeyRound className='h-3.5 w-3.5' />
                No provider keys configured — extractions use your monthly Atlas budget.
              </div>
            )}
        </section>
      </div>
    </MainPage>
  )
}
