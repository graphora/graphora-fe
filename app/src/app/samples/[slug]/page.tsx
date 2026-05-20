import { SampleDetailPage } from './sample-detail-page'

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <SampleDetailPage slug={slug} />
}
