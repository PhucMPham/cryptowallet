import CryptoClient from './crypto-client';

export default async function CryptoPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  
  return <CryptoClient />;
}
