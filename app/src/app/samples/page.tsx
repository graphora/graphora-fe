import { SamplesGalleryPage } from './samples-page'

/**
 * Server-component entry for /samples (the unauthenticated
 * public gallery). The client component carries fetch +
 * filter state.
 */
export default function Page() {
  return <SamplesGalleryPage />
}
