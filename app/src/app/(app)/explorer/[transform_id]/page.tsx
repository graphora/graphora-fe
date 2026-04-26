import type { Metadata } from 'next'
import { ExplorerShell } from './explorer-shell'

export const metadata: Metadata = {
  title: 'Explorer · Graphora',
}

/**
 * Explorer route — `/explorer/<transform_id>`
 *
 * The dedicated graph-browsing surface that opens after extraction.
 * Distinct from the transform pipeline page (`/transform`) which is
 * upload-and-watch; the Explorer is review-and-inspect.
 *
 * Server component shell so the metadata above is honoured. The
 * actual data-fetching + tab rendering lives in ExplorerShell, which
 * is a client component (NVL is browser-only).
 */
export default async function ExplorerPage({
  params,
}: {
  params: Promise<{ transform_id: string }>
}) {
  const { transform_id } = await params
  return <ExplorerShell transformId={transform_id} />
}
