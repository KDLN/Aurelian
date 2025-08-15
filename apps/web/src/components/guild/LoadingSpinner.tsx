interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export default function LoadingSpinner({ size = 'medium', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6', 
    large: 'w-8 h-8'
  };

  return (
    <div className="game-center" style={{ padding: '20px' }}>
      <div 
        className={`${sizeClasses[size]} border-2 border-gray-600 border-t-yellow-500 rounded-full animate-spin`}
        style={{
          borderColor: '#533b2c #533b2c #d4af37 #533b2c',
          animation: 'spin 1s linear infinite'
        }}
      />
      {text && (
        <div className="game-small game-muted" style={{ marginTop: '8px' }}>
          {text}
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}