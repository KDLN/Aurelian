'use client';

import { useUserDataQuery } from '@/hooks/useUserDataQuery';

export default function WalletDisplay() {
  const { wallet, isLoading } = useUserDataQuery();

  if (isLoading) {
    return (
      <div style={{ marginTop: '1rem' }}>
        <h3>Your Gold</h3>
        <div className="game-pill">Loading...</div>
      </div>
    );
  }

  if (!wallet) {
    return null;
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <h3>Your Gold</h3>
      <div className="game-pill game-pill-good" style={{ fontSize: '18px', textAlign: 'center' }}>
        {wallet.gold.toLocaleString()}g
      </div>
    </div>
  );
}