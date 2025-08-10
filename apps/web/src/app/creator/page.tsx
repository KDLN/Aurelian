
import dynamic from 'next/dynamic';

const CharacterCreator = dynamic(() => import('./CharacterCreator'), { 
  ssr: false,
  loading: () => <div style={{padding: 20, color: '#f1e5c8'}}>Loading character creator...</div>
});

export default function CreatorPage() {
  return <CharacterCreator />;
}
