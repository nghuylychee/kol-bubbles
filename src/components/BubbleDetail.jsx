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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="lock-icon">
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1z"/>
                </svg>
              </div>
              <div className="stat-value stat-value-locked">Locked</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="url(#instagram-gradient)" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <defs>
                    <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" style={{ stopColor: '#FD5949' }} />
                      <stop offset="50%" style={{ stopColor: '#D6249F' }} />
                      <stop offset="100%" style={{ stopColor: '#285AEB' }} />
                    </linearGradient>
                  </defs>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </div>
              <div className="stat-value">{formatNumber(kol.followers_ig)}</div>
            </div>
            <div className="stat-item stat-item-locked">
              <div className="stat-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M12.53.02C1.803-.094-3.83 11.445 3.926 19.343c1.824 1.857 4.183 2.888 6.653 2.888.184 0 .368-.004.551-.014v-.003c1.957-.109 3.753-.755 5.192-1.863 2.895-2.225 4.535-5.734 4.535-9.68-.002-7.344-5.973-11.67-8.327-10.653zm-.005 15.367l.003-.006-.003.006zm-2.053.078c.688-.234 1.354-.548 1.984-.919a13.81 13.81 0 01-1.984.919zm8.36-7.25c-.037 5.007-3.866 9.184-8.542 9.54-.584.045-1.171.049-1.752.012-.033-.001-.066-.004-.098-.006-.526-.039-1.049-.118-1.564-.236-1.449-.334-2.806-.978-3.991-1.893-4.042-3.121-5.352-8.668-2.976-13.326C2.333 0.197 5.544-.39 8.58.344c2.53.611 4.728 2.151 6.104 4.276a10.85 10.85 0 011.582 4.306c.193 1.083.243 2.191.141 3.291-.008.084-.022.169-.034.254-.119.816-.345 1.607-.683 2.346a10.46 10.46 0 01-1.472 2.443c-.034.043-.068.087-.103.13.798-1.147 1.336-2.465 1.565-3.861a8.61 8.61 0 00-.073-2.944 8.74 8.74 0 00-1.147-3.016 8.97 8.97 0 00-2.298-2.623c-.041-.032-.082-.064-.124-.095a8.92 8.92 0 00-3.103-1.548c-.046-.013-.091-.026-.137-.038-1.343-.324-2.77-.325-4.113-.002-2.534.608-4.637 2.309-5.776 4.671-1.419 2.941-1.067 6.41.944 9.025 1.527 1.985 3.825 3.227 6.344 3.428.543.043 1.091.043 1.634 0 .02-.001.039-.003.059-.004 4.201-.319 7.596-3.744 7.635-7.946.003-.362-.017-.724-.058-1.084-.031-.27-.078-.538-.14-.802-.478-2.033-1.768-3.747-3.568-4.735a6.738 6.738 0 00-3.107-.745c-2.271 0-4.388 1.139-5.642 3.038-.019.029-.038.058-.056.087a6.723 6.723 0 00-.963 3.48c0 3.726 3.029 6.755 6.755 6.755a6.76 6.76 0 005.018-2.244 6.737 6.737 0 001.737-4.511 6.75 6.75 0 00-.793-3.169 6.777 6.777 0 00-2.244-2.46 6.767 6.767 0 00-3.281-.849c-2.271 0-4.366 1.138-5.611 3.044a6.713 6.713 0 00-1.042 3.51 6.76 6.76 0 009.863 6.023c1.211-.625 2.224-1.6 2.931-2.82.022-.038.043-.077.064-.116a6.72 6.72 0 00.793-3.166 6.755 6.755 0 00-6.755-6.755 6.76 6.76 0 00-5.018 2.244 6.737 6.737 0 00-1.737 4.511c0 1.127.275 2.235.793 3.205a6.768 6.768 0 002.224 2.44c.043.032.087.063.131.093a6.772 6.772 0 003.287.849c2.951 0 5.479-1.996 6.278-4.711.046-.156.086-.314.121-.473.191-.876.243-1.778.154-2.674-.209-2.091-1.232-3.987-2.823-5.228a8.86 8.86 0 00-5.455-1.867c-4.903 0-8.884 3.981-8.884 8.884 0 4.903 3.981 8.884 8.884 8.884 1.678 0 3.336-.475 4.795-1.373a8.865 8.865 0 003.635-4.344c.028-.068.055-.136.081-.205a8.827 8.827 0 00.559-3.099 8.884 8.884 0 00-8.884-8.884z" fill="#010101"/>
                  <path d="M9 5.5c-.276 0-.5.224-.5.5v2c0 .276.224.5.5.5s.5-.224.5-.5V6c0-.276-.224-.5-.5-.5zm0 4c-.276 0-.5.224-.5.5v5c0 .276.224.5.5.5s.5-.224.5-.5v-5c0-.276-.224-.5-.5-.5z" fill="#EE1D52"/>
                  <path d="M15 9.5c-.276 0-.5.224-.5.5v5c0 .276.224.5.5.5s.5-.224.5-.5v-5c0-.276-.224-.5-.5-.5z" fill="#69C9D0"/>
                </svg>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" style={{ marginRight: '8px' }}>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '8px', opacity: 0.5 }}>
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1z"/>
                </svg>
              </div>
              {kol.link_ig && (() => {
                // Convert "@username" to full URL for display
                const igUrl = kol.link_ig.startsWith('@') 
                  ? `https://www.instagram.com/${kol.link_ig.replace(/^@/, '')}/`
                  : kol.link_ig;
                return (
                  <a href={igUrl} target="_blank" rel="noopener noreferrer" className="social-link">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="url(#instagram-gradient-link)" style={{ marginRight: '8px' }}>
                      <defs>
                        <linearGradient id="instagram-gradient-link" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" style={{ stopColor: '#FD5949' }} />
                          <stop offset="50%" style={{ stopColor: '#D6249F' }} />
                          <stop offset="100%" style={{ stopColor: '#285AEB' }} />
                        </linearGradient>
                      </defs>
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
                  </a>
                );
              })()}
              <div className="social-link social-link-locked" title="Coming soon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                TikTok
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '8px', opacity: 0.5 }}>
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

