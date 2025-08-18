'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InventoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new unified storage page
    router.replace('/storage');
  }, [router]);

  return (
    <div style={{ 
      padding: 20, 
      background: '#1a1511', 
      minHeight: '100vh', 
      color: '#f1e5c8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center' }}>
        <p>Redirecting to Storage...</p>
      </div>
    </div>
  );
}