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
  // Keying by transform_id forces a fresh ExplorerShell whenever the
  // user navigates between transforms — caches (graph data, schema
  // ontology, filter selections) do not bleed from one transform into
  // another. Cheaper and more reliable than resetting each piece of
  // state via useEffect; the React idiom for "this is a new thing"
  // is exactly the key.
  return <ExplorerShell key={transform_id} transformId={transform_id} />
}
