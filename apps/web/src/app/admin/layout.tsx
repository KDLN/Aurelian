import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#231913] text-[#f1e5c8]">
      <nav className="bg-[#2a1f17] border-b border-[#8b6f31]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/admin" className="flex items-center space-x-2">
              <span className="text-xl font-bold">⚡ Aurelian Admin</span>
            </Link>
            
            <div className="flex items-center space-x-6">
              <Link
                href="/admin/items"
                className="text-[#c5a572] hover:text-[#f1e5c8] transition-colors"
              >
                Items
              </Link>
              <Link
                href="/admin/equipment"
                className="text-[#c5a572] hover:text-[#f1e5c8] transition-colors"
              >
                Equipment
              </Link>
              <Link
                href="/admin/blueprints"
                className="text-[#c5a572] hover:text-[#f1e5c8] transition-colors"
              >
                Blueprints
              </Link>
              <Link
                href="/admin/missions"
                className="text-[#c5a572] hover:text-[#f1e5c8] transition-colors"
              >
                Missions
              </Link>
              <Link
                href="/admin/hubs"
                className="text-[#c5a572] hover:text-[#f1e5c8] transition-colors"
              >
                Hubs
              </Link>
              <Link
                href="/"
                className="text-[#9a8464] hover:text-[#f1e5c8] transition-colors text-sm"
              >
                ← Back to Game
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      <main>{children}</main>
    </div>
  );
}