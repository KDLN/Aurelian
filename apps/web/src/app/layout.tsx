
import React from 'react';
import './globals.css';
import ClientProviders from '@/components/ClientProviders';
import Link from 'next/link';

export const metadata = { 
  title: 'Aurelian'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en">
      <body style={{fontFamily:'ui-monospace,Menlo,Consolas,monospace',margin:0}} className="bg-white text-slate-900">
        <div style={{
          display:'flex',
          gap:12,
          alignItems:'center',
          padding:12,
          borderBottom:'4px solid #533b2c',
          background:'#2a1f1a',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background:'#6e462b',
            border:'4px solid #986540',
            borderRadius:8,
            padding:'6px 12px',
            letterSpacing:2,
            textTransform:'uppercase',
            color:'#f1e5c8',
            fontSize: 'clamp(12px, 2.5vw, 16px)'
          }}>Aurelian</div>
          <Link href="/" style={{color:'#f1e5c8',fontSize:'clamp(12px, 2.5vw, 14px)'}}>Home</Link>
          <Link href="/creator" style={{color:'#f1e5c8',fontSize:'clamp(12px, 2.5vw, 14px)'}}>Creator</Link>
          <Link href="/play" style={{color:'#f1e5c8',fontSize:'clamp(12px, 2.5vw, 14px)'}}>Play</Link>
        </div>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
