import CryptoDetailClient from './crypto-detail-client';

export default async function CryptoDetailPage({ 
  params 
}: { 
  params: Promise<{ locale: string; id: string }> 
}) {
  const { locale, id } = await params;
  
  return <CryptoDetailClient assetId={parseInt(id)} />;
}