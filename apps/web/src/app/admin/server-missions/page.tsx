'use client';

import ServerMissionAdmin from '@/components/admin/ServerMissionAdmin';

export default function ServerMissionsAdminPage() {
  return (
    <div className="game">
      <div style={{ margin: '20px auto', maxWidth: '1400px' }}>
        <ServerMissionAdmin />
      </div>
    </div>
  );
}