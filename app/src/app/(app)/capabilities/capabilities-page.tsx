'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  Layers,
  Minus,
  RefreshCw,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip } from '@/components/ui/tooltip'
import { PageHeader } from '@/components/layouts/page-header'
import {
  CAPABILITY_LABELS,
  type BackendCapabilities,
  type BackendMatrixEntry,
  type CapabilityMatrixResponse,
} from '@/types/capabilities'

/**
 * M-matrix slice 2 — feature-compatibility matrix dashboard.
 *
 * Renders the BACKEND_MATRIX from /api/v1/capabilities/matrix
 * as a side-by-side comparison the operator can scan to pick a
 * STORAGE_TYPE.
 *
 * Matrix transpose: capabilities as ROWS, backends as COLUMNS.
 * The opposite layout (per-backend rows like the bench page)
 * answers "what does extractor X score on N metrics?" — useful
 * when N is small and rows are the unit of comparison. The
 * matrix's unit of comparison is the capability question
 * ("which backend supports embedding similarity?") which reads
 * cleanest by scanning down a capability row across columns.
 *
 * Auth posture — same as bench:
 *   * ``/api/v1/capabilities/matrix`` (backend) is unauth
 *     (repo-level documentation).
 *   * ``/capabilities`` (this page) lives inside the auth-gated
 *     ``(app)/`` shell where every other operator-facing page
 *     lives. An anonymous reviewer uses the public API
 *     directly.
 *
 * Three-state fetch (loading / error / loaded) mirrors the
 * bench dashboard. The matrix is small and frozen
 * server-side, so no refresh-on-tab-switch dance is needed —
 * a manual Refresh button covers the "after a deploy bump"
 * case.
 */
export function CapabilitiesPage() {
  const [data, setData] = useState<CapabilityMatrixResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/capabilities/matrix')
      const text = await resp.text()
      if (!resp.ok) {
        const detail = safeParse<{ error?: string; detail?: string }>(text)
        throw new Error(
          detail?.error ||
            detail?.detail ||
            `Matrix fetch failed (${resp.status})`
        )
      }
      const parsed = JSON.parse(text) as CapabilityMatrixResponse
      setData(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <PageHeader
        kicker="Gate 5 · Multi-DB"
        title="Backend capabilities"
        description={
          'Feature-compatibility matrix across the supported ' +
          'graph storage backends. Pick a STORAGE_TYPE for your ' +
          'deployment based on which capabilities you need; ' +
          'cells annotated as runtime-detected may flip True ' +
          'after the backend bootstraps.'
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        }
      />

      {/* Skeleton only fires on the FIRST load (data still
          null). Reviewer-flagged Low on commit b6677a8:
          pre-fix every refresh re-collapsed the page to a
          skeleton-or-error state because the data-render gate
          included ``!loading``. A slow or failing refresh
          dropped the operator back to a blank or error-only
          view and lost the last-known matrix. Now the data
          stays rendered during refresh — the button's
          spinning RefreshCw icon is the only "in flight"
          signal — and the error card surfaces ABOVE the
          stale data instead of replacing it. */}
      {loading && data === null && <MatrixSkeleton />}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Could not load capability matrix</p>
          <p className="mt-1 text-destructive/80">{error}</p>
          {data && (
            <p className="mt-2 text-xs text-destructive/70">
              Showing the last successful load below; click Refresh to
              retry.
            </p>
          )}
        </Card>
      )}

      {data && (
        <>
          <MatrixTable backends={data.backends} />
          <BackendDetail backends={data.backends} />
        </>
      )}
    </div>
  )
}

// ---- Sub-components --------------------------------------------------------

function MatrixSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function MatrixTable({ backends }: { backends: BackendMatrixEntry[] }) {
  return (
    <Card className="overflow-x-auto p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--line)' }}>
            <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Capability
            </th>
            {backends.map((backend) => (
              <th
                key={backend.name}
                className="pb-2 px-4 text-center text-xs font-medium"
              >
                <div className="font-medium text-foreground">
                  {backend.display_name}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  STORAGE_TYPE={backend.name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAPABILITY_LABELS.map(({ field, label, description }) => (
            <tr
              key={field}
              className="border-b last:border-b-0"
              style={{ borderColor: 'var(--line)' }}
            >
              <td className="py-2 pr-4">
                <Tooltip content={description}>
                  <span className="cursor-help font-medium">{label}</span>
                </Tooltip>
              </td>
              {backends.map((backend) => (
                <td key={backend.name} className="py-2 px-4 text-center">
                  <CapabilityCell
                    backend={backend}
                    field={field}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function CapabilityCell({
  backend,
  field,
}: {
  backend: BackendMatrixEntry
  field: keyof BackendCapabilities
}) {
  const value = backend.default_capabilities[field]
  const isDynamic = backend.dynamic_flags.includes(field)

  // Three-symbol display:
  //   * Green Check — supported, static
  //   * Amber AlertCircle + label — runtime-detected (the
  //     default value below is the safe floor; live instance
  //     may report higher)
  //   * Dash — not supported
  // Pre-fix the bench page's "render the value as just T/F"
  // approach would have collapsed the runtime-detected case
  // into a flat False, losing the load-bearing nuance the
  // dynamic_flags annotation exists to preserve.
  if (isDynamic) {
    return (
      <Tooltip content="Runtime-detected: matrix shows the conservative default; the live backend may report this as True after bootstrap.">
        <span className="inline-flex items-center gap-1 text-xs">
          <AlertCircle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
          <span className="font-mono">
            {value ? 'true*' : 'false*'}
          </span>
        </span>
      </Tooltip>
    )
  }
  if (value) {
    return (
      <Check
        className="mx-auto h-4 w-4 text-green-700 dark:text-green-400"
        aria-label="supported"
      />
    )
  }
  return (
    <Minus
      className="mx-auto h-4 w-4 text-muted-foreground"
      aria-label="not supported"
    />
  )
}

function BackendDetail({ backends }: { backends: BackendMatrixEntry[] }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Layers className="h-4 w-4" />
        Per-backend details
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {backends.map((backend) => (
          <div
            key={backend.name}
            className="rounded-md border p-3"
            style={{ borderColor: 'var(--line)' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{backend.display_name}</div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {backend.name}
                </div>
              </div>
              <InstallHint extras={backend.extras} />
            </div>
            {backend.notes.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {backend.notes.map((note, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span aria-hidden>•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function InstallHint({ extras }: { extras: string[] }) {
  // Memory backend ships with the base package; the matrix
  // surfaces this as an empty extras array. Render a neutral
  // "no extra needed" badge so operators don't see "blank
  // cell, what does that mean?" Pin against an empty <></>
  // render that would leave a hole in the layout.
  if (extras.length === 0) {
    return (
      <Badge variant="secondary" className="text-[10px]">
        no extra
      </Badge>
    )
  }
  // The matrix advertises ``[age]`` for AGE (the user-facing
  // top-level backend extra), not the lower-level
  // ``[postgres]`` group. Render the install command verbatim
  // so operators can copy-paste.
  const extraStr = extras.join(',')
  return (
    <Tooltip content={`pip install 'graphora-server[${extraStr}]'`}>
      <Badge variant="outline" className="font-mono text-[10px]">
        [{extraStr}]
      </Badge>
    </Tooltip>
  )
}

// ---- Helpers ---------------------------------------------------------------

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
