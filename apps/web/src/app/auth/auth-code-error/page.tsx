'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  
  // Get all URL parameters for debugging
  const allParams = searchParams ? Array.from(searchParams.entries()) : [];

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      {error ? (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
          <p className="text-red-300">{error}</p>
        </div>
      ) : (
        <p className="mb-4">
          Sorry, we couldn't sign you in. This could be because:
        </p>
      )}
      
      {/* Debug info */}
      {allParams.length > 0 && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs">
          <p className="text-blue-300 font-bold mb-2">🔍 Debug Info - URL Parameters:</p>
          {allParams.map(([key, value]) => (
            <div key={key} className="text-blue-200">
              <strong>{key}:</strong> {value}
            </div>
          ))}
        </div>
      )}
      
      <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs">
        <p className="text-yellow-300 font-bold mb-2">🔍 Current URL:</p>
        <p className="text-yellow-200 break-all">{typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
      </div>
      {!error && (
        <ul className="list-disc list-inside text-left mb-6 space-y-1">
          <li>The magic link has expired</li>
          <li>The magic link has already been used</li>
          <li>There was a technical issue</li>
        </ul>
      )}
      <div className="space-y-2">
        <Link 
          href="/" 
          className="inline-block bg-[#8B4513] hover:bg-[#A0522D] px-6 py-2 rounded transition-colors"
        >
          Back to Home
        </Link>
        <br />
        <a 
          href="/lobby" 
          className="inline-block text-[#f1e5c8] hover:text-white underline"
        >
          Try Lobby Instead
        </a>
      </div>
    </>
  );
}

export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-[#231913] text-[#f1e5c8] flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <Suspense fallback={
          <div>
            <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
            <p className="mb-4">Loading error details...</p>
          </div>
        }>
          <ErrorContent />
        </Suspense>
      </div>
    </div>
  )
}