import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Fingerprint, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import MainPage from '@/components/View/DataGrid/MainPage'
import api from '@/service/api'
import { passkeysSupported, registerPasskey } from '@/service/passkey'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ── Types ─────────────────────────────────────────────────────────────────────

type Passkey = {
  id: string
  device_name: string
  is_active: boolean
  backup_state: boolean
  created_at: string
  last_used_at: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BREADCRUMBS = [
  { title: 'Settings', url: '/settings' },
  { title: 'Passkeys', url: '/settings/passkeys' },
]

const SKELETON_ROWS = Array.from({ length: 3 })

// ── Component ─────────────────────────────────────────────────────────────────

export default function PasskeysPage() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const supported = passkeysSupported()

  const fetchPasskeys = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<{ passkeys: Passkey[] }>('/webauthn/passkeys')
      setPasskeys(data.passkeys)
    } catch {
      toast.error('Failed to load passkeys')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPasskeys()
  }, [fetchPasskeys])

  const handleAdd = async () => {
    setIsRegistering(true)
    try {
      const deviceName =
        window.prompt('Name this passkey (e.g. "MacBook Pro", "iPhone")')?.trim() || undefined
      const ok = await registerPasskey(deviceName)
      if (ok) {
        toast.success('Passkey added')
        fetchPasskeys()
      }
    } catch (err) {
      // Includes user cancellation (NotAllowedError).
      console.warn('Passkey registration failed', err)
      toast.error('Could not add passkey. It may have been cancelled.')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleDelete = async (passkey: Passkey) => {
    if (
      !confirm(
        `Remove the passkey "${passkey.device_name}"?\n\nYou will no longer be able to sign in with it on that device.`,
      )
    )
      return
    setDeletingId(passkey.id)
    try {
      await api.delete(`/webauthn/passkeys/${passkey.id}`)
      toast.success(`Passkey "${passkey.device_name}" removed`)
      fetchPasskeys()
    } catch {
      toast.error('Failed to remove passkey')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return <span className='text-muted-foreground'>—</span>
    return (
      <span title={new Date(iso).toLocaleString()}>{format(new Date(iso), 'MMM dd, yyyy')}</span>
    )
  }

  return (
    <MainPage breadcrumbs={BREADCRUMBS}>
      <div className='flex flex-col flex-1 p-6 gap-6 max-w-5xl mx-auto w-full'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Passkeys</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Sign in with Touch ID, Face ID, Windows Hello, or a security key. Passkeys are a
              faster, phishing-resistant alternative to the email login link.
            </p>
          </div>
          <Button onClick={handleAdd} disabled={!supported || isRegistering} className='shrink-0'>
            {isRegistering ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : (
              <Plus className='h-4 w-4 mr-2' />
            )}
            Add Passkey
          </Button>
        </div>

        {!supported && (
          <p className='text-sm text-muted-foreground'>
            This browser doesn&apos;t support passkeys, so you can&apos;t add one here.
          </p>
        )}

        <Separator />

        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Synced</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading &&
                SKELETON_ROWS.map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className='h-4 w-full' />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isLoading && passkeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className='text-center text-muted-foreground py-10'>
                    <Fingerprint className='mx-auto mb-3 h-8 w-8 opacity-50' />
                    No passkeys yet. Add one to sign in without an email link.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                passkeys.map((pk) => (
                  <TableRow key={pk.id}>
                    <TableCell className='font-medium'>{pk.device_name}</TableCell>
                    <TableCell>
                      {pk.backup_state ? (
                        <Badge variant='secondary'>Synced</Badge>
                      ) : (
                        <Badge variant='outline'>This device</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(pk.created_at)}</TableCell>
                    <TableCell>{formatDate(pk.last_used_at)}</TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleDelete(pk)}
                        disabled={deletingId === pk.id}
                        className='text-destructive hover:text-destructive'
                      >
                        {deletingId === pk.id ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Trash2 className='h-4 w-4' />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainPage>
  )
}
