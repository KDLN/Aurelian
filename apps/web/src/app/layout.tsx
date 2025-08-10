
export const metadata = { title: 'Aurelian' };
export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en">
      <body style={{fontFamily:'ui-monospace,Menlo,Consolas,monospace',background:'#231913',color:'#f1e5c8',margin:0}}>
        <div style={{display:'flex',gap:12,alignItems:'center',padding:12,borderBottom:'4px solid #533b2c',background:'#2a1f1a'}}>
          <div style={{background:'#6e462b',border:'4px solid #986540',borderRadius:8,padding:'6px 12px',letterSpacing:2,textTransform:'uppercase'}}>Aurelian</div>
          <a href="/" style={{color:'#f1e5c8'}}>Home</a>
          <a href="/creator" style={{color:'#f1e5c8'}}>Creator</a>
          <a href="/play" style={{color:'#f1e5c8'}}>Play</a>
        </div>
        {children}
      </body>
    </html>
  );
}
