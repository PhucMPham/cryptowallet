import P2PClient from './p2p-client';

export default async function P2PPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  
  return <P2PClient />;
}
