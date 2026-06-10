import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Copy, Check, KeyRound, ShieldOff, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import MainPage from '@/components/View/DataGrid/MainPage'
import api, { WEB_URL } from '@/service/api'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ── Types ─────────────────────────────────────────────────────────────────────

type ApiKey = {
  id: string
  name: string
  prefix: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

type CreatedKey = {
  id: string
  key: string
  prefix: string
  name: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BREADCRUMBS = [
  { title: 'Settings', url: '/settings' },
  { title: 'API Keys', url: '/settings/api-keys' },
]

const SKELETON_ROWS = Array.from({ length: 4 })

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  // List state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Reveal dialog
  const [revealOpen, setRevealOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [mcpCopied, setMcpCopied] = useState(false)
  const [mcpLocalCopied, setMcpLocalCopied] = useState(false)

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null)
  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<{ api_keys: ApiKey[] }>('/api-keys/')
      setApiKeys(data.api_keys)
    } catch {
      toast.error('Failed to load API keys')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  // ── Create ──────────────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setNewKeyName('')
    setCreateOpen(true)
  }

  const handleCloseCreate = () => {
    if (isCreating) return
    setCreateOpen(false)
    setNewKeyName('')
  }

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key')
      return
    }
    setIsCreating(true)
    try {
      const { data } = await api.post<{ api_key: CreatedKey; message: string }>('/api-keys/', {
        name: newKeyName.trim(),
      })
      setCreatedKey(data.api_key)
      setCopied(false)
      setCreateOpen(false)
      setNewKeyName('')
      setRevealOpen(true)
      toast.success('API key created')
      fetchApiKeys()
    } catch {
      toast.error('Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  // ── Copy key ────────────────────────────────────────────────────────────────

  const handleCopy = async () => {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey.key)
      setCopied(true)
      toast.success('API key copied to clipboard')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Failed to copy — please select and copy manually')
    }
  }

  // ── Reveal dialog close ─────────────────────────────────────────────────────

  const handleRevealDone = () => {
    setRevealOpen(false)
    setCopied(false)
    setMcpCopied(false)
    setMcpLocalCopied(false)
    setCreatedKey(null)
  }

  // ── MCP config ──────────────────────────────────────────────────────────────

  // Both configs are built client-side from the already-revealed key — the raw
  // key is never sent back to the server.
  //
  // Remote: the hosted MCP server under /mcp, authenticated via Bearer header.
  // Covers every tool except uploading local PDFs (MCP tool calls are JSON
  // only, so a remote server can never receive file bytes).
  const mcpUrl = `${WEB_URL}/mcp`
  const mcpConfig = createdKey
    ? JSON.stringify(
        {
          atlas: {
            url: mcpUrl,
            headers: {
              Authorization: `Bearer ${createdKey.key}`,
            },
          },
        },
        null,
        2,
      )
    : ''

  // Local: the same MCP server run on the user's machine over stdio (via uvx).
  // Because it runs locally, the `add_paper` tool can read PDFs straight from
  // the user's disk and upload them to the Atlas API with this key.
  const mcpLocalConfig = createdKey
    ? JSON.stringify(
        {
          atlas: {
            command: 'uvx',
            args: ['--from', 'git+https://github.com/Watts-Lab/atlas.git', 'atlas-mcp'],
            env: {
              MCP_TRANSPORT: 'stdio',
              ATLAS_API_URL: `${WEB_URL}/api/v1`,
              ATLAS_API_KEY: createdKey.key,
            },
          },
        },
        null,
        2,
      )
    : ''

  const handleCopyMcp = async () => {
    if (!mcpConfig) return
    try {
      await navigator.clipboard.writeText(mcpConfig)
      setMcpCopied(true)
      toast.success('MCP configuration copied to clipboard')
      setTimeout(() => setMcpCopied(false), 2500)
    } catch {
      toast.error('Failed to copy — please select and copy manually')
    }
  }

  const handleCopyMcpLocal = async () => {
    if (!mcpLocalConfig) return
    try {
      await navigator.clipboard.writeText(mcpLocalConfig)
      setMcpLocalCopied(true)
      toast.success('MCP configuration copied to clipboard')
      setTimeout(() => setMcpLocalCopied(false), 2500)
    } catch {
      toast.error('Failed to copy — please select and copy manually')
    }
  }

  // ── Revoke ──────────────────────────────────────────────────────────────────

  const handleRevoke = async (key: ApiKey) => {
    if (
      !confirm(
        `Revoke the API key "${key.name}"?\n\nThis action cannot be undone. Any services using this key will immediately lose access.`,
      )
    )
      return
    setRevokingId(key.id)
    try {
      await api.delete(`/api-keys/${key.id}`)
      toast.success(`API key "${key.name}" revoked`)
      fetchApiKeys()
    } catch {
      toast.error('Failed to revoke API key')
    } finally {
      setRevokingId(null)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (key: ApiKey) => {
    if (
      !confirm(
        `Permanently delete the API key "${key.name}"?\n\nThis removes the key entirely and cannot be undone. Any services using this key will immediately lose access.`,
      )
    )
      return
    setDeletingId(key.id)
    try {
      await api.delete(`/api-keys/${key.id}?permanent=true`)
      toast.success(`API key "${key.name}" deleted`)
      fetchApiKeys()
    } catch {
      toast.error('Failed to delete API key')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const formatDate = (iso: string | null) => {
    if (!iso) return <span className='text-muted-foreground'>—</span>
    return (
      <span title={new Date(iso).toLocaleString()}>{format(new Date(iso), 'MMM dd, yyyy')}</span>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <MainPage breadcrumbs={BREADCRUMBS}>
      <div className='flex flex-col flex-1 p-6 gap-6 max-w-5xl mx-auto w-full'>
        {/* ── Page header ── */}
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>API Keys</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Create and manage API keys for programmatic access to the Atlas API.
            </p>
          </div>
          <Button onClick={handleOpenCreate} className='shrink-0'>
            <Plus className='h-4 w-4 mr-2' />
            Create API Key
          </Button>
        </div>

        <Separator />

        {/* ── Table ── */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {/* Loading skeletons */}
              {isLoading &&
                SKELETON_ROWS.map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className='h-4 w-36' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-20' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-5 w-16 rounded-full' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-24' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-24' />
                    </TableCell>
                    <TableCell className='flex justify-end'>
                      <Skeleton className='h-8 w-20' />
                    </TableCell>
                  </TableRow>
                ))}

              {/* Empty state */}
              {!isLoading && apiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className='h-48 text-center'>
                    <div className='flex flex-col items-center justify-center gap-3 text-muted-foreground'>
                      <KeyRound className='h-9 w-9 opacity-25' />
                      <div>
                        <p className='text-sm font-medium'>No API keys yet</p>
                        <p className='text-xs mt-0.5'>Create a key to start using the Atlas API</p>
                      </div>
                      <Button variant='outline' size='sm' onClick={handleOpenCreate}>
                        <Plus className='h-3.5 w-3.5 mr-1.5' />
                        Create your first key
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Key rows */}
              {!isLoading &&
                apiKeys.map((key) => (
                  <TableRow key={key.id} className={!key.is_active ? 'opacity-60' : undefined}>
                    <TableCell className='font-medium'>{key.name}</TableCell>
                    <TableCell>
                      <code className='rounded bg-muted px-1.5 py-0.5 text-xs font-mono tracking-wide'>
                        {key.prefix}…
                      </code>
                    </TableCell>
                    <TableCell>
                      {key.is_active ? (
                        <Badge
                          variant='outline'
                          className='border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400'
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge variant='destructive'>Revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {formatDate(key.created_at)}
                    </TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {formatDate(key.last_used_at)}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button
                          variant='ghost'
                          size='sm'
                          disabled={!key.is_active || revokingId === key.id}
                          onClick={() => handleRevoke(key)}
                          className='text-destructive hover:text-destructive hover:bg-destructive/10 disabled:pointer-events-none'
                        >
                          <ShieldOff className='h-3.5 w-3.5 mr-1.5' />
                          {revokingId === key.id ? 'Revoking…' : 'Revoke'}
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          disabled={deletingId === key.id}
                          onClick={() => handleDelete(key)}
                          className='text-destructive hover:text-destructive hover:bg-destructive/10 disabled:pointer-events-none'
                        >
                          <Trash2 className='h-3.5 w-3.5 mr-1.5' />
                          {deletingId === key.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer note */}
        {!isLoading && apiKeys.length > 0 && (
          <p className='text-xs text-muted-foreground'>
            API keys are shown <span className='font-medium'>only once</span> at creation time.
            Store them securely — they cannot be recovered after leaving the creation screen.
          </p>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/*  Create Dialog                                                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseCreate()
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Give your key a descriptive name so you can identify it later.
            </DialogDescription>
          </DialogHeader>

          <div className='flex flex-col gap-2 py-2'>
            <Label htmlFor='api-key-name'>Key name</Label>
            <Input
              id='api-key-name'
              placeholder='e.g. Production server, CI pipeline…'
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
              disabled={isCreating}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={handleCloseCreate} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !newKeyName.trim()}>
              {isCreating ? 'Creating…' : 'Create key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/*  Reveal Dialog — blocked from accidental close                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Dialog
        open={revealOpen}
        onOpenChange={() => {
          /* intentionally no-op */
        }}
      >
        <DialogContent
          className='sm:max-w-4xl'
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <KeyRound className='h-5 w-5 text-primary' />
              Save your API key
            </DialogTitle>
            <DialogDescription>
              This key will{' '}
              <span className='font-semibold text-destructive'>not be shown again</span> after you
              close this dialog. Copy it to a safe place now.
            </DialogDescription>
          </DialogHeader>

          {createdKey && (
            <div className='flex flex-col gap-4 py-1'>
              {/* Key value */}
              <div className='flex items-stretch gap-2'>
                <code className='flex-1 rounded-md border bg-muted px-3 py-2.5 text-[13px] font-mono break-all select-all leading-relaxed'>
                  {createdKey.key}
                </code>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={handleCopy}
                  className='shrink-0 self-stretch h-auto'
                  title='Copy to clipboard'
                >
                  {copied ? (
                    <Check className='h-4 w-4 text-green-600' />
                  ) : (
                    <Copy className='h-4 w-4' />
                  )}
                </Button>
              </div>

              {/* Warning banner */}
              <div className='rounded-md border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/40'>
                <p className='text-xs text-amber-800 dark:text-amber-300 leading-relaxed'>
                  <span className='font-semibold'>Treat this key like a password.</span> It grants
                  full API access on your behalf. If you lose it, revoke this key and create a new
                  one.
                </p>
              </div>

              {/* Key metadata */}
              <div className='text-sm text-muted-foreground'>
                Key name: <span className='font-medium text-foreground'>{createdKey.name}</span>
              </div>

              <Separator />

              {/* MCP configuration — remote vs local, as tabs */}
              <Tabs defaultValue='remote' className='gap-3'>
                <TabsList className='w-full'>
                  <TabsTrigger value='remote'>Remote server</TabsTrigger>
                  <TabsTrigger value='local'>Local server (PDF uploads)</TabsTrigger>
                </TabsList>

                {/* Remote */}
                <TabsContent value='remote' className='flex flex-col gap-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <Label className='text-sm font-medium'>
                      Connect an MCP client (e.g. Zed) — remote server
                    </Label>
                    <Button variant='outline' size='sm' onClick={handleCopyMcp}>
                      {mcpCopied ? (
                        <>
                          <Check className='h-3.5 w-3.5 mr-1.5 text-green-600' />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className='h-3.5 w-3.5 mr-1.5' />
                          Copy config
                        </>
                      )}
                    </Button>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Paste this into your editor&apos;s remote MCP server settings. Nothing to
                    install. Supports everything except uploading PDFs from your computer.
                  </p>
                  <pre className='rounded-md border bg-muted px-3 py-2.5 text-[12px] font-mono overflow-x-auto leading-relaxed select-all'>
                    {mcpConfig}
                  </pre>
                </TabsContent>

                {/* Local (stdio) */}
                <TabsContent value='local' className='flex flex-col gap-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <Label className='text-sm font-medium'>
                      Local MCP server — enables PDF uploads
                    </Label>
                    <Button variant='outline' size='sm' onClick={handleCopyMcpLocal}>
                      {mcpLocalCopied ? (
                        <>
                          <Check className='h-3.5 w-3.5 mr-1.5 text-green-600' />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className='h-3.5 w-3.5 mr-1.5' />
                          Copy config
                        </>
                      )}
                    </Button>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Paste this into your editor&apos;s local (command-based) MCP server settings.
                    Runs the Atlas connector on your machine via{' '}
                    <code className='font-mono'>uvx</code> (requires{' '}
                    <a
                      href='https://docs.astral.sh/uv/'
                      target='_blank'
                      rel='noreferrer'
                      className='underline'
                    >
                      uv
                    </a>
                    ), so the assistant can also upload PDF files directly from your computer.
                  </p>
                  <pre className='rounded-md border bg-muted px-3 py-2.5 text-[12px] font-mono overflow-x-auto leading-relaxed select-all'>
                    {mcpLocalConfig}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter className='flex-col-reverse gap-2 sm:flex-row sm:gap-0'>
            <Button variant='outline' onClick={handleCopy} className='sm:mr-auto'>
              {copied ? (
                <>
                  <Check className='h-4 w-4 mr-2 text-green-600' />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className='h-4 w-4 mr-2' />
                  Copy key
                </>
              )}
            </Button>
            <Button onClick={handleRevealDone}>I&apos;ve copied it — Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainPage>
  )
}
