import NewSaleForm from '@/app/sales/newSaleForm'

export default async function Page({ params }: { params: Promise<{ storeId: string }> }) {
  const resolvedParams = await params
  return <NewSaleForm params={resolvedParams} />
}
