import { useState, useEffect } from 'react';
import { getCachedAvatar } from '../utils/avatarCache';

export default function BubbleDetail({ kol, onClose }) {
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (kol?.avatar_url) {
      // Check cache first
      const cached = getCachedAvatar(kol.avatar_url);
      if (cached) {
        setAvatarUrl(cached);
      } else {
        // Use original URL if not cached
        setAvatarUrl(kol.avatar_url);
      }
    } else {
      setAvatarUrl(null);
    }
  }, [kol?.avatar_url]);

  if (!kol) return null;

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="side-panel" onClick={(e) => e.stopPropagation()}>
      <button className="side-panel-close" onClick={onClose}>×</button>
      <div className="side-panel-header">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={kol.name}
            className="kol-avatar-img"
            onError={() => setAvatarUrl(null)}
          />
        ) : (
          <div className="kol-avatar" style={{ backgroundColor: kol.color }}>
            {kol.initials}
          </div>
        )}
        <h2>{kol.name}</h2>
      </div>
        <div className="side-panel-body">
          <div className="follower-stats">
            <div className="stat-item">
              <div className="stat-label">Total Followers</div>
              <div className="stat-value">{formatNumber(kol.total_followers)}</div>
            </div>
            <div className="stat-item stat-item-locked">
              <div className="stat-label">
                Facebook
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="lock-icon">
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1z"/>
                </svg>
              </div>
              <div className="stat-value stat-value-locked">Locked</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Instagram</div>
              <div className="stat-value">{formatNumber(kol.followers_ig)}</div>
            </div>
            <div className="stat-item stat-item-locked">
              <div className="stat-label">
                TikTok
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="lock-icon">
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1z"/>
                </svg>
              </div>
              <div className="stat-value stat-value-locked">Locked</div>
            </div>
          </div>
          <div className="social-links">
            <h3>Social Media Links</h3>
            <div className="links-list">
              <div className="social-link social-link-locked" title="Coming soon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1z"/>
                </svg>
                Facebook
              </div>
              {kol.link_ig && (() => {
                // Convert "@username" to full URL for display
                const igUrl = kol.link_ig.startsWith('@') 
                  ? `https://www.instagram.com/${kol.link_ig.replace(/^@/, '')}/`
                  : kol.link_ig;
                return (
                  <a href={igUrl} target="_blank" rel="noopener noreferrer" className="social-link">
                    Instagram
                  </a>
                );
              })()}
              <div className="social-link social-link-locked" title="Coming soon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1z"/>
                </svg>
                TikTok
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

