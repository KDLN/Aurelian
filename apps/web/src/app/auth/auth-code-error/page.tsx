export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-[#231913] text-[#f1e5c8] flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="mb-4">
          Sorry, we couldn't sign you in. This could be because:
        </p>
        <ul className="list-disc list-inside text-left mb-6 space-y-1">
          <li>The magic link has expired</li>
          <li>The magic link has already been used</li>
          <li>There was a technical issue</li>
        </ul>
        <a 
          href="/lobby" 
          className="inline-block bg-[#8B4513] hover:bg-[#A0522D] px-6 py-2 rounded transition-colors"
        >
          Try Again
        </a>
      </div>
    </div>
  )
}