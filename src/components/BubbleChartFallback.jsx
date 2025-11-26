import { useState, useEffect } from 'react';

export default function BubbleChartFallback({ data, onBubbleClick, width, height }) {
  const [bubbles, setBubbles] = useState([]);

  useEffect(() => {
    if (data && data.length > 0) {
      const processedBubbles = data.slice(0, 20).map((kol, index) => {
        const minFollowers = Math.min(...data.map(d => d.total_followers));
        const maxFollowers = Math.max(...data.map(d => d.total_followers));
        const normalized = (kol.total_followers - minFollowers) / (maxFollowers - minFollowers);
        const size = 40 + (normalized * 100); // 40px to 140px
        
        return {
          ...kol,
          x: Math.random() * (width - size),
          y: Math.random() * (height - size),
          size: size
        };
      });
      setBubbles(processedBubbles);
    }
  }, [data, width, height]);

  const formatFollowers = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  return (
    <div 
      style={{ 
        width, 
        height, 
        position: 'relative', 
        background: '#36393f',
        overflow: 'hidden'
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: '#dcddde',
          fontSize: '14px',
          background: 'rgba(0,0,0,0.5)',
          padding: '10px',
          borderRadius: '4px'
        }}
      >
        Fallback Mode: {bubbles.length} bubbles
      </div>
      
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          onClick={() => onBubbleClick && onBubbleClick(bubble)}
          style={{
            position: 'absolute',
            left: bubble.x,
            top: bubble.y,
            width: bubble.size,
            height: bubble.size,
            borderRadius: '50%',
            background: bubble.color || '#32CD32',
            border: '2px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: Math.max(10, bubble.size / 8),
            fontWeight: 'bold',
            textAlign: 'center',
            transition: 'transform 0.2s ease',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
        >
          <div style={{ fontSize: Math.max(8, bubble.size / 10) }}>
            {bubble.name.length > 8 ? bubble.name.substring(0, 6) + '..' : bubble.name}
          </div>
          <div style={{ fontSize: Math.max(6, bubble.size / 12), opacity: 0.8 }}>
            {formatFollowers(bubble.total_followers)}
          </div>
        </div>
      ))}
    </div>
  );
}
