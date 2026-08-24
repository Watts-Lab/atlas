import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

import api from '@/service/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ─────────────────────────────────────────────────────────────────────

type Provider = 'atlas' | 'openai' | 'anthropic' | 'openrouter'
type Strategy = 'json_schema' | 'assistant_api'

export type ProjectLLM = {
  provider: Provider
  model: string | null
  strategy: Strategy
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  value: ProjectLLM
  onSaved: (llm: ProjectLLM) => void
}

// ── Curated model options per provider ──────────────────────────────────────────
// Radix's Select reserves the empty string for "no selection", so we use an
// explicit sentinel for "use the provider's default model" and map it to null on
// save.
const DEFAULT_MODEL = '__default__'

const MODEL_OPTIONS: Record<Provider, { value: string; label: string }[]> = {
  atlas: [
    { value: DEFAULT_MODEL, label: 'Default (gpt-5.4-mini)' },
    { value: 'gpt-5.4-mini', label: 'gpt-5.4-mini' },
    { value: 'gpt-5.4', label: 'gpt-5.4' },
    { value: 'gpt-5.5', label: 'gpt-5.5' },
  ],
  openai: [
    { value: DEFAULT_MODEL, label: 'Default (gpt-5.4-mini)' },
    { value: 'gpt-5.4-mini', label: 'gpt-5.4-mini' },
    { value: 'gpt-5.4', label: 'gpt-5.4' },
    { value: 'gpt-5.5', label: 'gpt-5.5' },
  ],
  anthropic: [
    { value: DEFAULT_MODEL, label: 'Default (claude-opus-4-8)' },
    { value: 'claude-opus-4-8', label: 'claude-opus-4-8' },
  ],
  openrouter: [
    { value: DEFAULT_MODEL, label: 'Default (openai/gpt-5.4-mini)' },
    { value: 'openai/gpt-5.4-mini', label: 'openai/gpt-5.4-mini' },
    { value: 'anthropic/claude-opus-4.8', label: 'anthropic/claude-opus-4.8' },
  ],
}

const PROVIDER_LABELS: Record<Provider, string> = {
  atlas: 'Atlas (shared key, uses your monthly budget)',
  openai: 'OpenAI (your key)',
  anthropic: 'Anthropic (your key)',
  openrouter: 'OpenRouter (your key)',
}

// Providers that require the user to have saved their own key. 'atlas' uses the
// shared platform key and is always available.
type BYOKProvider = Exclude<Provider, 'atlas'>

type UserSettings = {
  provider_keys: Record<BYOKProvider, { configured: boolean; prefix: string | null }>
  usage: {
    currency: string
    limit_usd: number
    used_usd: number
    remaining_usd: number
  }
}

const STRATEGY_LABELS: Record<Strategy, string> = {
  json_schema: 'JSON Schema (recommended)',
  assistant_api: 'Assistant API (OpenAI only)',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectLLMSettings({
  open,
  onOpenChange,
  projectId,
  value,
  onSaved,
}: Props) {
  const [provider, setProvider] = useState<Provider>(value.provider)
  const [model, setModel] = useState<string>(value.model ?? DEFAULT_MODEL)
  const [strategy, setStrategy] = useState<Strategy>(value.strategy)
  const [saving, setSaving] = useState(false)

  // Which BYOK providers have a saved key. `null` while we're still loading.
  const [configuredKeys, setConfiguredKeys] = useState<Record<BYOKProvider, boolean> | null>(null)
  // Remaining Atlas monthly budget, in USD. `null` until loaded.
  const [atlasRemaining, setAtlasRemaining] = useState<number | null>(null)

  // Re-sync when the dialog is (re)opened with fresh values.
  useEffect(() => {
    if (open) {
      setProvider(value.provider)
      setModel(value.model ?? DEFAULT_MODEL)
      setStrategy(value.strategy)
    }
  }, [open, value])

  // Fetch the user's provider keys so we can disable providers they can't use.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    api
      .get<UserSettings>('/user/settings')
      .then(({ data }) => {
        if (cancelled) return
        setConfiguredKeys({
          openai: !!data.provider_keys?.openai?.configured,
          anthropic: !!data.provider_keys?.anthropic?.configured,
          openrouter: !!data.provider_keys?.openrouter?.configured,
        })
        setAtlasRemaining(
          typeof data.usage?.remaining_usd === 'number' ? data.usage.remaining_usd : null,
        )
      })
      .catch(() => {
        // On failure, don't block the user — leave availability unknown.
        if (!cancelled) {
          setConfiguredKeys(null)
          setAtlasRemaining(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open])

  // 'atlas' is always available; other providers need a saved key. While the
  // keys are still loading we optimistically treat providers as available so we
  // don't briefly disable an already-selected provider.
  const isProviderAvailable = (p: Provider) =>
    p === 'atlas' || configuredKeys === null || configuredKeys[p]

  const fmtUsd = (n: number) =>
    n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

  // The Assistant API is OpenAI-only; force json_schema for other providers.
  const assistantAllowed = provider === 'atlas' || provider === 'openai'
  const effectiveStrategy: Strategy = assistantAllowed ? strategy : 'json_schema'

  const handleProviderChange = (p: Provider) => {
    setProvider(p)
    setModel(DEFAULT_MODEL) // reset to provider default when switching
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: ProjectLLM = {
        provider,
        model: model && model !== DEFAULT_MODEL ? model : null,
        strategy: effectiveStrategy,
      }
      await api.put(`/projects/${projectId}`, { project_llm: payload })
      toast.success('Model settings saved')
      onSaved(payload)
      onOpenChange(false)
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to save model settings'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Model & Provider</DialogTitle>
          <DialogDescription>
            Choose which LLM runs extractions for this project. Using your own provider key
            doesn&apos;t count against your Atlas budget.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => handleProviderChange(v as Provider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => {
                  const available = isProviderAvailable(p)
                  return (
                    <SelectItem key={p} value={p} disabled={!available}>
                      {PROVIDER_LABELS[p]}
                      {p === 'atlas' && atlasRemaining !== null && (
                        <span className='text-muted-foreground'>
                          {' '}
                          — {fmtUsd(atlasRemaining)} left
                        </span>
                      )}
                      {!available && ' — no key saved'}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {provider !== 'atlas' && (
              <p className='text-xs text-muted-foreground'>
                Requires a saved {provider} key in Settings → Usage & Keys.
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label>Model</Label>
            <Select value={model} onValueChange={setModel} disabled={!isProviderAvailable(provider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS[provider].map((m) => (
                  <SelectItem key={m.value || 'default'} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isProviderAvailable(provider) && (
              <p className='text-xs text-muted-foreground'>
                Save a {provider} key in Settings → Usage & Keys to choose a model.
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label>Strategy</Label>
            <Select
              value={effectiveStrategy}
              onValueChange={(v) => setStrategy(v as Strategy)}
              disabled={!assistantAllowed}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STRATEGY_LABELS) as Strategy[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STRATEGY_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!assistantAllowed && (
              <p className='text-xs text-muted-foreground'>
                The Assistant API is only available with OpenAI or Atlas.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !isProviderAvailable(provider)}>
            {saving ? (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <Save className='w-4 h-4 mr-2' />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
