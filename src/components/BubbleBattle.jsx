import { useEffect, useRef, useState } from 'react';
import './SnakeGame.css';
import { getCachedAvatar, cacheAvatar, loadAvatarWithQueue } from '../utils/avatarCache';
import { getProxiedImageUrl, isInstagramImage, fetchImageAsBlob } from '../utils/imageProxy';

// Bubble class (similar to Snake but represents as bubble)
class Bubble {
  constructor(id, name, color, x, y, avatarUrl, totalFollowers, initials) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.avatarUrl = avatarUrl;
    this.totalFollowers = totalFollowers;
    this.initials = initials;
    
    // Bubble properties - Scale with followers
    this.x = x;
    this.y = y;
    this.vx = 0; // velocity x
    this.vy = 0; // velocity y
    this.speed = 2; // Movement speed
    this.direction = Math.random() * Math.PI * 2; // Random initial direction
    this.targetDirection = this.direction;
    // Radius scales with followers - chỉ giới hạn min, không giới hạn max
    // Scale lớn hơn: min 30px, mỗi 1M followers = 15px
    this.radius = Math.max(30, 30 + (totalFollowers / 1000000) * 15);
    
    // AI properties
    this.aiTarget = null;
    this.aiMode = 'wander'; // wander, chase, flee
    this.aiUpdateTimer = 0;
    this.aiUpdateInterval = 30; // Update AI every 30 frames
    
    // State
    this.isDead = false;
    this.respawnTimer = 0;
    this.respawnDelay = 180; // 3 seconds at 60fps
    
    // Combat cooldown to prevent spam
    this.lastCombatTime = 0;
    this.combatCooldown = 1000; // 1 second in milliseconds
  }
  
  // Update bubble position and AI
  update(canvas, allBubbles, foods) {
    if (this.isDead) {
      // Không respawn, chỉ return
      return;
    }
    
    // Update AI
    this.updateAI(canvas, allBubbles, foods);
    
    // Smooth direction change
    let diff = this.targetDirection - this.direction;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.direction += diff * 0.1; // Smooth turning
    
    // Move bubble - kết hợp velocity từ collision và direction
    const baseVx = Math.cos(this.direction) * this.speed;
    const baseVy = Math.sin(this.direction) * this.speed;
    
    // Apply velocity với decay để giảm dần lực đẩy
    this.vx = this.vx * 0.9 + baseVx * 0.1;
    this.vy = this.vy * 0.9 + baseVy * 0.1;
    
    this.x += this.vx;
    this.y += this.vy;
    
    // Wrap around screen
    if (this.x < 0) this.x = canvas.width;
    if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height;
    if (this.y > canvas.height) this.y = 0;
  }
  
  // AI behavior - Improved strategy (same as Snake)
  updateAI(canvas, allBubbles, foods) {
    this.aiUpdateTimer++;
    if (this.aiUpdateTimer < this.aiUpdateInterval) return;
    this.aiUpdateTimer = 0;
    
    // Calculate rank (0 = smallest, 1 = largest)
    const allRadii = allBubbles.filter(b => !b.isDead).map(b => b.radius).sort((a, b) => a - b);
    const myRankIndex = allRadii.indexOf(this.radius);
    const rankRatio = allRadii.length > 1 ? myRankIndex / (allRadii.length - 1) : 0.5;
    
    // Strategy based on rank
    const isSmall = rankRatio < 0.3; // Bottom 30%
    const isMedium = rankRatio >= 0.3 && rankRatio < 0.7; // Middle 40%
    const isLarge = rankRatio >= 0.7; // Top 30%
    
    // Find nearest threat (larger bubble)
    let nearestThreat = null;
    let minThreatDist = isSmall ? 300 : 200; // Small bubbles more cautious
    
    for (const bubble of allBubbles) {
      if (bubble.id === this.id || bubble.isDead) continue;
      if (bubble.radius <= this.radius * 1.2) continue; // Only fear significantly larger bubbles
      
      const dist = this.distance({ x: this.x, y: this.y }, { x: bubble.x, y: bubble.y });
      if (dist < minThreatDist) {
        minThreatDist = dist;
        nearestThreat = bubble;
      }
    }
    
    // Find nearest prey (smaller bubble)
    let nearestPrey = null;
    let minPreyDist = isLarge ? 400 : 250; // Large bubbles hunt more aggressively
    
    for (const bubble of allBubbles) {
      if (bubble.id === this.id || bubble.isDead) continue;
      if (bubble.radius >= this.radius * 0.6) continue; // Hunt smaller bubbles
      
      const dist = this.distance({ x: this.x, y: this.y }, { x: bubble.x, y: bubble.y });
      if (dist < minPreyDist) {
        minPreyDist = dist;
        nearestPrey = bubble;
      }
    }
    
    // Find nearest food
    let nearestFood = null;
    let minFoodDist = isSmall ? 350 : 200; // Small bubbles prioritize food more
    
    for (const food of foods) {
      const dist = this.distance({ x: this.x, y: this.y }, food);
      if (dist < minFoodDist) {
        minFoodDist = dist;
        nearestFood = food;
      }
    }
    
    // Decide behavior based on rank and situation
    if (nearestThreat && minThreatDist < (isSmall ? 250 : 150)) {
      // FLEE from larger bubble (priority 1 for small bubbles)
      this.aiMode = 'flee';
      const angle = Math.atan2(this.y - nearestThreat.y, this.x - nearestThreat.x);
      this.targetDirection = angle;
    } else if (isLarge && nearestPrey && minPreyDist < 300) {
      // HUNT mode for large bubbles - aggressive chasing
      this.aiMode = 'hunt';
      const angle = Math.atan2(nearestPrey.y - this.y, nearestPrey.x - this.x);
      this.targetDirection = angle;
    } else if (isSmall && nearestFood && minFoodDist < 300) {
      // PRIORITIZE food for small bubbles to grow
      this.aiMode = 'grow';
      const angle = Math.atan2(nearestFood.y - this.y, nearestFood.x - this.x);
      this.targetDirection = angle;
    } else if (isMedium && nearestPrey && minPreyDist < 200) {
      // Opportunistic hunting for medium bubbles
      this.aiMode = 'chase';
      const angle = Math.atan2(nearestPrey.y - this.y, nearestPrey.x - this.x);
      this.targetDirection = angle;
    } else if (nearestFood && minFoodDist < 180) {
      // GO TO food when nothing else to do
      this.aiMode = 'food';
      const angle = Math.atan2(nearestFood.y - this.y, nearestFood.x - this.x);
      this.targetDirection = angle;
    } else {
      // WANDER randomly
      this.aiMode = 'wander';
      if (Math.random() < 0.08) {
        this.targetDirection = this.direction + (Math.random() - 0.5) * Math.PI * 0.3;
      }
    }
    
    // Avoid screen edges
    const edgeMargin = 100;
    if (this.x < edgeMargin) {
      this.targetDirection = 0; // Go right
    } else if (this.x > canvas.width - edgeMargin) {
      this.targetDirection = Math.PI; // Go left
    }
    if (this.y < edgeMargin) {
      this.targetDirection = Math.PI / 2; // Go down
    } else if (this.y > canvas.height - edgeMargin) {
      this.targetDirection = -Math.PI / 2; // Go up
    }
  }
  
  // Grow bubble (increase size)
  grow(amount = 10) {
    this.totalFollowers += amount;
    // Radius sẽ được update real-time trong draw(), không cần update ở đây
  }
  
  // Eat food
  eatFood(food, foods) {
    const dist = this.distance({ x: this.x, y: this.y }, food);
    if (dist < this.radius + 5) {
      this.grow(10); // Increase followers by 10 points
      const index = foods.indexOf(food);
      if (index > -1) {
        foods.splice(index, 1);
      }
      return true;
    }
    return false;
  }
  
  // Distance helper
  distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Die - không respawn nữa
  die() {
    this.isDead = true;
    // Không set respawn timer, không respawn lại
  }
  
  // Draw bubble with avatar and info
  draw(ctx, images, loadingAvatars) {
    if (this.isDead) return;
    
    // Update radius real-time based on current followers (đảm bảo size update real-time)
    // Chỉ giới hạn min, không giới hạn max - scale theo followers
    this.radius = Math.max(30, 30 + (this.totalFollowers / 1000000) * 15);
    
    // Draw bubble circle with gradient
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      0,
      this.x,
      this.y,
      this.radius
    );
    
    // Create color variations
    const baseColor = this.color;
    const lighterColor = this.lightenColor(baseColor, 0.3);
    const darkerColor = this.darkenColor(baseColor, 0.2);
    
    gradient.addColorStop(0, lighterColor);
    gradient.addColorStop(0.7, baseColor);
    gradient.addColorStop(1, darkerColor);
    
    // Draw main bubble
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = baseColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw avatar in center
    const avatarSize = this.radius * 0.6;
    const isLoading = loadingAvatars && loadingAvatars.has(this.id);
    const img = images[this.id];
    
    // Validate image object before drawing
    const isValidImage = img && 
                         img instanceof HTMLImageElement && 
                         img.complete && 
                         img.naturalWidth > 0;
    
    // Draw avatar background circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, avatarSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw avatar border
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    if (this.avatarUrl && isValidImage && !isLoading) {
      // Avatar loaded successfully
      try {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, avatarSize - 1, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(
          img,
          this.x - avatarSize + 1,
          this.y - avatarSize + 1,
          (avatarSize - 1) * 2,
          (avatarSize - 1) * 2
        );
        ctx.restore();
      } catch (error) {
        // Fallback to initials if drawImage fails
        ctx.restore();
        ctx.fillStyle = '#2c3e50';
        ctx.font = `bold ${avatarSize * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.initials || this.name.substring(0, 2).toUpperCase(), this.x, this.y);
      }
    } else if (isLoading) {
      // Show loading spinner
      const spinnerRadius = avatarSize * 0.35;
      const time = Date.now() / 1000;
      const rotation = (time * 2) % (Math.PI * 2);
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(rotation);
      
      ctx.strokeStyle = '#5865F2';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, spinnerRadius, 0, Math.PI * 1.5);
      ctx.stroke();
      
      ctx.restore();
    } else {
      // Draw initials
      ctx.fillStyle = '#2c3e50';
      ctx.font = `bold ${avatarSize * 0.8}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.initials || this.name.substring(0, 2).toUpperCase(), this.x, this.y);
    }
    
    // Draw name ABOVE bubble
    const nameFontSize = Math.max(12, Math.min(18, this.radius * 0.25));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.font = `bold ${nameFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Truncate long names
    const maxLength = Math.floor(this.radius / 3);
    const displayName = this.name.length > maxLength 
      ? this.name.substring(0, maxLength) + '...'
      : this.name;
    
    const nameY = this.y - this.radius - 8;
    ctx.strokeText(displayName, this.x, nameY);
    ctx.fillText(displayName, this.x, nameY);
    
    // Draw follower count BELOW bubble
    ctx.font = `bold ${Math.max(10, Math.min(14, this.radius * 0.2))}px Arial`;
    ctx.fillStyle = '#b9bbbe';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Format follower count - giờ là điểm số, hiển thị trực tiếp
    const totalFollowers = this.totalFollowers;
    const followerText = totalFollowers.toLocaleString();
    
    const followerY = this.y + this.radius + 8;
    ctx.strokeText(followerText, this.x, followerY);
    ctx.fillText(followerText, this.x, followerY);
    
    ctx.globalAlpha = 1;
  }
  
  // Helper: Lighten color
  lightenColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount * 255);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount * 255);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  // Helper: Darken color
  darkenColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export default function BubbleBattle({ data, onBubbleClick }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [bubbles, setBubbles] = useState([]);
  const [foods, setFoods] = useState([]);
  const [images, setImages] = useState({});
  const gameLoopRef = useRef(null);
  
  // Camera system for large map
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [followBubbleId, setFollowBubbleId] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [combatLogs, setCombatLogs] = useState([]);
  const [logQueue, setLogQueue] = useState([]);
  const followBubbleIdRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [loadingAvatars, setLoadingAvatars] = useState(new Set());
  const activeEffectsRef = useRef([]); // Store active effects for real-time rendering
  
  // Large map size
  const MAP_WIDTH = 4000;
  const MAP_HEIGHT = 3000;
  
  // Initialize bubbles
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create bubbles from KOL data on large map - tất cả bắt đầu công bằng
    const STARTING_FOLLOWERS = 100; // Tất cả bắt đầu với 100 điểm
    const newBubbles = data.map(kol => {
      return new Bubble(
        kol.id,
        kol.name,
        kol.color || kol.snakeColor,
        Math.random() * MAP_WIDTH,
        Math.random() * MAP_HEIGHT,
        kol.avatar_url,
        STARTING_FOLLOWERS, // Tất cả bắt đầu bằng nhau
        kol.initials
      );
    });
    
    setBubbles(newBubbles);
    
    // Load avatar images (same as SnakeGame)
    const loadImages = async () => {
      const imgMap = {};
      const loadingSet = new Set();
      
      data.forEach(kol => {
        if (kol.avatar_url) {
          loadingSet.add(kol.id);
        }
      });
      setLoadingAvatars(loadingSet);
      
      for (const kol of data) {
        if (!kol.avatar_url) continue;
        
        try {
          const cachedBlobUrl = getCachedAvatar(kol.avatar_url);
          if (cachedBlobUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve) => {
              img.onload = () => {
                imgMap[kol.id] = img;
                setLoadingAvatars(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(kol.id);
                  return newSet;
                });
                setImages(prev => ({ ...prev, [kol.id]: img }));
                resolve();
              };
              
              img.onerror = () => {
                setLoadingAvatars(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(kol.id);
                  return newSet;
                });
                resolve();
              };
              
              img.src = cachedBlobUrl;
            });
            continue;
          }
          
          let loadFn;
          if (isInstagramImage(kol.avatar_url)) {
            loadFn = () => fetchImageAsBlob(kol.avatar_url);
          } else {
            loadFn = () => {
              return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(kol.avatar_url);
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = kol.avatar_url;
              });
            };
          }
          
          const resultUrl = await loadAvatarWithQueue(kol.avatar_url, loadFn);
          
          if (resultUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve) => {
              img.onload = () => {
                imgMap[kol.id] = img;
                setLoadingAvatars(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(kol.id);
                  return newSet;
                });
                setImages(prev => ({ ...prev, [kol.id]: img }));
                resolve();
              };
              
              img.onerror = () => {
                if (resultUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(resultUrl);
                }
                setLoadingAvatars(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(kol.id);
                  return newSet;
                });
                resolve();
              };
              
              img.src = resultUrl;
            });
          } else {
            setLoadingAvatars(prev => {
              const newSet = new Set(prev);
              newSet.delete(kol.id);
              return newSet;
            });
          }
        } catch (error) {
          console.warn(`Failed to load avatar for ${kol.name}:`, error);
          setLoadingAvatars(prev => {
            const newSet = new Set(prev);
            newSet.delete(kol.id);
            return newSet;
          });
        }
      }
      
      console.log(`📸 Loaded ${Object.keys(imgMap).length} avatars`);
    };
    
    loadImages();
    
    // Spawn initial foods on large map
    const initialFoods = [];
    for (let i = 0; i < 200; i++) {
      initialFoods.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT
      });
    }
    setFoods(initialFoods);
    
    // Center camera on map
    const initialCamera = {
      x: MAP_WIDTH / 2 - window.innerWidth / 2,
      y: MAP_HEIGHT / 2 - (window.innerHeight - 100) / 2,
      zoom: 1
    };
    setCamera(initialCamera);
    cameraRef.current = initialCamera;
  }, [data]);
  
  // Keep followBubbleIdRef and cameraRef in sync
  useEffect(() => {
    followBubbleIdRef.current = followBubbleId;
  }, [followBubbleId]);
  
  useEffect(() => {
    if (!followBubbleIdRef.current) {
      cameraRef.current = camera;
    }
  }, [camera]);
  
  // Tự động cân chỉnh camera khi zoom thay đổi
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Lấy camera hiện tại từ state
    const currentZoom = camera.zoom;
    const currentX = camera.x;
    const currentY = camera.y;
    
    const viewportWidth = canvas.width / currentZoom;
    const viewportHeight = canvas.height / currentZoom;
    
    // Tính bounds với buffer nửa màn hình
    let maxX, maxY, minX, minY;
    
    if (viewportWidth >= MAP_WIDTH) {
      minX = MAP_WIDTH / 2 - viewportWidth / 2;
      maxX = MAP_WIDTH / 2 - viewportWidth / 2;
    } else {
      minX = 0;
      maxX = MAP_WIDTH - viewportWidth;
    }
    
    if (viewportHeight >= MAP_HEIGHT) {
      minY = MAP_HEIGHT / 2 - viewportHeight / 2;
      maxY = MAP_HEIGHT / 2 - viewportHeight / 2;
    } else {
      minY = 0;
      maxY = MAP_HEIGHT - viewportHeight;
    }
    
    // Clamp camera position ngay lập tức
    const clampedX = Math.max(minX, Math.min(maxX, currentX));
    const clampedY = Math.max(minY, Math.min(maxY, currentY));
    
    // Nếu camera cần điều chỉnh, update ngay
    if (Math.abs(currentX - clampedX) > 0.1 || Math.abs(currentY - clampedY) > 0.1) {
      const newCamera = { x: clampedX, y: clampedY, zoom: currentZoom };
      setCamera(newCamera);
      cameraRef.current = newCamera;
    }
  }, [camera.zoom]); // Chỉ trigger khi zoom thay đổi
  
  // Game loop with camera
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || bubbles.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    
    const gameLoop = () => {
      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const currentCamera = followBubbleIdRef.current ? cameraRef.current : camera;
      
      // Save context and apply camera transform
      ctx.save();
      ctx.translate(-currentCamera.x, -currentCamera.y);
      ctx.scale(currentCamera.zoom, currentCamera.zoom);
      
      // Draw grid on large map
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;
      const gridSize = 100;
      const startX = Math.floor(camera.x / gridSize) * gridSize;
      const startY = Math.floor(camera.y / gridSize) * gridSize;
      const endX = Math.ceil((camera.x + canvas.width) / gridSize) * gridSize;
      const endY = Math.ceil((camera.y + canvas.height) / gridSize) * gridSize;
      
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, MAP_HEIGHT);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(MAP_WIDTH, y);
        ctx.stroke();
      }
      
      // Draw map boundaries
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 5;
      ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      
      // Draw foods
      ctx.fillStyle = '#ff6b6b';
      foods.forEach(food => {
        ctx.beginPath();
        ctx.arc(food.x, food.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Update bubbles and collect collision data
      const currentTime = Date.now();
      const newCollisions = [];
      
      bubbles.forEach(bubble => {
        // Update with large map bounds
        bubble.update({ width: MAP_WIDTH, height: MAP_HEIGHT }, bubbles, foods);
        
        // Check ALL collisions: bubble with other bubble
        bubbles.forEach(otherBubble => {
          if (bubble.id === otherBubble.id || bubble.isDead || otherBubble.isDead) return;
          
          // Skip if either bubble is on cooldown
          if (currentTime - bubble.lastCombatTime < bubble.combatCooldown) return;
          if (currentTime - otherBubble.lastCombatTime < otherBubble.combatCooldown) return;
          
          // Prevent duplicate detection
          if (bubble.id > otherBubble.id) return;
          
          const dist = Math.sqrt(
            Math.pow(bubble.x - otherBubble.x, 2) + Math.pow(bubble.y - otherBubble.y, 2)
          );
          
          // Check if collision happened (bubble collision)
          const collisionRadius = bubble.radius + otherBubble.radius;
          
          if (dist < collisionRadius) {
            // Combat! Tăng damage để game nhanh hơn (500-5000 followers)
            const followerChange = Math.floor(Math.random() * 4500) + 500;
            
            // Randomly decide who gains and who loses
            const randomWinner = Math.random() < 0.5 ? bubble : otherBubble;
            const randomLoser = randomWinner === bubble ? otherBubble : bubble;
            
            // Winner gains followers and grows (radius sẽ được update real-time trong draw())
            randomWinner.totalFollowers += followerChange;
            
            // Loser loses followers and shrinks (radius sẽ được update real-time trong draw())
            const newLoserFollowers = randomLoser.totalFollowers - followerChange;
            randomLoser.totalFollowers = Math.max(0, newLoserFollowers);
            
            // Check if loser is defeated (followers <= 0)
            const isDefeated = randomLoser.totalFollowers <= 0;
            if (isDefeated) {
              randomLoser.die(); // Không respawn nữa
            }
            
            // Set cooldown for both bubbles
            bubble.lastCombatTime = currentTime;
            otherBubble.lastCombatTime = currentTime;
            
            // Create collision effect - ADD TO REF IMMEDIATELY for real-time rendering
            const collisionEffect = {
              x: (bubble.x + otherBubble.x) / 2,
              y: (bubble.y + otherBubble.y) / 2,
              followerChange: followerChange,
              winner: randomWinner.id,
              loser: randomLoser.id,
              winnerName: randomWinner.name,
              loserName: randomLoser.name,
              winnerAvatar: randomWinner.avatarUrl,
              loserAvatar: randomLoser.avatarUrl,
              winnerFollowers: randomWinner.totalFollowers,
              loserFollowers: randomLoser.totalFollowers,
              timestamp: currentTime,
              id: Math.random(),
              isDefeated: isDefeated // Flag để log khi bị đánh bại
            };
            
            // Add to ref immediately for real-time rendering in this frame
            activeEffectsRef.current.push(collisionEffect);
            
            // Chỉ add to state nếu bị đánh bại (để log)
            if (isDefeated) {
              newCollisions.push(collisionEffect);
            }
            
            // Push apart với lực mạnh hơn - văng xa ra
            const pushAngle = Math.atan2(bubble.y - otherBubble.y, bubble.x - otherBubble.x);
            const pushForce = 8; // Tăng lực đẩy
            bubble.direction = pushAngle;
            bubble.vx = Math.cos(pushAngle) * pushForce;
            bubble.vy = Math.sin(pushAngle) * pushForce;
            otherBubble.direction = pushAngle + Math.PI;
            otherBubble.vx = Math.cos(pushAngle + Math.PI) * pushForce;
            otherBubble.vy = Math.sin(pushAngle + Math.PI) * pushForce;
          }
        });
        
        // Check food eating
        foods.forEach(food => {
          bubble.eatFood(food, foods);
        });
        
        bubble.draw(ctx, images, loadingAvatars);
      });
      
      // Clean old effects from ref (older than 1 second)
      activeEffectsRef.current = activeEffectsRef.current.filter(eff => currentTime - eff.timestamp < 1000);
      
      // Draw ALL active effects in real-time (from ref, not state)
      activeEffectsRef.current.forEach(effect => {
        const age = currentTime - effect.timestamp;
        const progress = Math.min(1, age / 1000);
        const alpha = Math.max(0, 1 - progress);
        
        if (alpha <= 0) return;
        
        // Animated size - starts small, grows, then shrinks
        const maxSize = 50;
        let size;
        if (progress < 0.3) {
          // Growing phase (0-300ms)
          size = maxSize * (progress / 0.3);
        } else {
          // Shrinking phase (300-1000ms)
          size = maxSize * (1 - (progress - 0.3) / 0.7);
        }
        size = Math.max(10, size);
        
        const particleRadius = Math.max(2, 6 * alpha);
        
        // Draw explosion effect with glow
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer glow
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw particles (more particles for better effect)
        ctx.globalAlpha = alpha * 0.9;
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12;
          const particleDistance = size * (1.2 + progress * 0.8);
          const particleX = effect.x + Math.cos(angle) * particleDistance;
          const particleY = effect.y + Math.sin(angle) * particleDistance;
          
          ctx.fillStyle = i % 2 === 0 ? '#ffd93d' : '#ff6b6b';
          ctx.beginPath();
          ctx.arc(particleX, particleY, particleRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Draw damage pop-up text (animated upward) - chỉ số màu đỏ
        const textOffsetY = -size - 20 - (progress * 30); // Moves upward as time passes
        ctx.globalAlpha = Math.max(0.3, alpha);
        ctx.fillStyle = '#ff0000'; // Màu đỏ
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        
        // Draw damage text with shadow - chỉ số, không có dấu +/-
        const textY = effect.y + textOffsetY;
        ctx.strokeText(
          `${effect.followerChange}`,
          effect.x,
          textY
        );
        ctx.fillText(
          `${effect.followerChange}`,
          effect.x,
          textY
        );
        
        ctx.globalAlpha = 1;
      });
      
      // Chỉ log khi có KOL bị đánh bại (không log combat thường)
      if (newCollisions.length > 0) {
        // Chỉ add logs cho những collision có isDefeated = true
        newCollisions.filter(collision => collision.isDefeated).forEach(collision => {
          setLogQueue(prev => [...prev, {
            id: collision.id,
            timestamp: collision.timestamp,
            winnerName: collision.winnerName,
            loserName: collision.loserName,
            winnerAvatar: collision.winnerAvatar,
            loserAvatar: collision.loserAvatar,
            followerChange: collision.followerChange,
            winnerFollowers: collision.winnerFollowers,
            loserFollowers: collision.loserFollowers
          }]);
        });
      }
      
      // Clean old combat logs (for state management)
      setCombatLogs(prev => 
        prev.filter(log => Date.now() - log.timestamp < 2000)
      );
      
      // Restore context
      ctx.restore();
      
      // Spawn new food - tăng spawn rate (0.3 thay vì 0.1)
      if (foods.length < 200 && Math.random() < 0.3) {
        foods.push({
          x: Math.random() * MAP_WIDTH,
          y: Math.random() * MAP_HEIGHT
        });
      }
      
      // Update camera to follow bubble continuously - giới hạn camera bounds chặt chẽ hơn
      if (followBubbleIdRef.current) {
        const followBubble = bubbles.find(b => b.id === followBubbleIdRef.current);
        
        if (followBubble && !followBubble.isDead) {
          // Lấy zoom từ cameraRef để đảm bảo sync với zoom hiện tại
          const currentZoom = cameraRef.current.zoom || camera.zoom;
          const viewportWidth = canvas.width / currentZoom;
          const viewportHeight = canvas.height / currentZoom;
          
          const targetX = followBubble.x - viewportWidth / 2;
          const targetY = followBubble.y - viewportHeight / 2;
          
          const lerpFactor = 0.15;
          // Giới hạn camera: bound right luôn ở cạnh phải màn hình, bound bottom luôn ở cạnh dưới màn hình
          // maxX = MAP_WIDTH - viewportWidth để bound right ở cạnh phải
          // maxY = MAP_HEIGHT - viewportHeight để bound bottom ở cạnh dưới
          let maxX, maxY, minX, minY;
          
          if (viewportWidth >= MAP_WIDTH) {
            // Viewport lớn hơn map width, center camera
            minX = MAP_WIDTH / 2 - viewportWidth / 2;
            maxX = MAP_WIDTH / 2 - viewportWidth / 2;
          } else {
            // Viewport nhỏ hơn map: maxX để bound right ở cạnh phải màn hình
            minX = 0;
            maxX = MAP_WIDTH - viewportWidth;
          }
          
          if (viewportHeight >= MAP_HEIGHT) {
            // Viewport lớn hơn map height, center camera
            minY = MAP_HEIGHT / 2 - viewportHeight / 2;
            maxY = MAP_HEIGHT / 2 - viewportHeight / 2;
          } else {
            // Viewport nhỏ hơn map: maxY để bound bottom ở cạnh dưới màn hình
            minY = 0;
            maxY = MAP_HEIGHT - viewportHeight;
          }
          
          // Clamp target position trước khi lerp
          const clampedTargetX = Math.max(minX, Math.min(maxX, targetX));
          const clampedTargetY = Math.max(minY, Math.min(maxY, targetY));
          
          cameraRef.current.x = cameraRef.current.x + (clampedTargetX - cameraRef.current.x) * lerpFactor;
          cameraRef.current.y = cameraRef.current.y + (clampedTargetY - cameraRef.current.y) * lerpFactor;
          
          // Final clamp để đảm bảo không vượt bounds
          cameraRef.current.x = Math.max(minX, Math.min(maxX, cameraRef.current.x));
          cameraRef.current.y = Math.max(minY, Math.min(maxY, cameraRef.current.y));
        }
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [bubbles, foods, images, camera, followBubbleIdRef]);
  
  // Get sorted bubbles for leaderboard - hiển thị tất cả (kể cả đã chết) và filter theo search
  const getSortedBubbles = () => {
    let filtered = [...bubbles]; // Không filter bỏ isDead, hiển thị tất cả
    
    // Filter theo search query
    if (leaderboardSearch.trim()) {
      const searchLower = leaderboardSearch.toLowerCase().trim();
      filtered = filtered.filter(b => 
        b.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort: KOL sống trước, sau đó sort theo followers
    return filtered.sort((a, b) => {
      // KOL sống luôn đứng trước KOL chết
      if (a.isDead !== b.isDead) {
        return a.isDead ? 1 : -1;
      }
      // Nếu cùng trạng thái, sort theo followers
      return b.totalFollowers - a.totalFollowers;
    });
  };
  
  // Mouse/Touch handlers for camera pan
  const handleMouseDown = (e) => {
    if (followBubbleId) {
      setFollowBubbleId(null);
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    // Tính viewport size dựa trên zoom hiện tại
    const currentZoom = camera.zoom;
    const viewportWidth = canvas.width / currentZoom;
    const viewportHeight = canvas.height / currentZoom;
    
    // Giới hạn camera: bound right luôn ở cạnh phải màn hình, bound bottom luôn ở cạnh dưới màn hình
    // maxX = MAP_WIDTH - viewportWidth để bound right ở cạnh phải
    // maxY = MAP_HEIGHT - viewportHeight để bound bottom ở cạnh dưới
    let maxX, maxY, minX, minY;
    
    if (viewportWidth >= MAP_WIDTH) {
      minX = MAP_WIDTH / 2 - viewportWidth / 2;
      maxX = MAP_WIDTH / 2 - viewportWidth / 2;
    } else {
      minX = 0;
      maxX = MAP_WIDTH - viewportWidth;
    }
    
    if (viewportHeight >= MAP_HEIGHT) {
      minY = MAP_HEIGHT / 2 - viewportHeight / 2;
      maxY = MAP_HEIGHT / 2 - viewportHeight / 2;
    } else {
      minY = 0;
      maxY = MAP_HEIGHT - viewportHeight;
    }
    
    // Tính vị trí mới và clamp ngay
    const newX = camera.x - dx;
    const newY = camera.y - dy;
    
    const newCamera = {
      ...camera,
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY))
    };
    
    setCamera(newCamera);
    cameraRef.current = newCamera;
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle canvas click
  const handleClick = (e) => {
    if (isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to world coordinates - cần tính với zoom hiện tại
    const currentZoom = camera.zoom;
    const worldX = (mouseX / currentZoom) + camera.x;
    const worldY = (mouseY / currentZoom) + camera.y;
    
    // Find clicked bubble
    for (const bubble of bubbles) {
      if (bubble.isDead) continue;
      
      const dist = Math.sqrt((worldX - bubble.x) ** 2 + (worldY - bubble.y) ** 2);
      if (dist < bubble.radius * 1.5) {
        // Toggle follow mode
        if (followBubbleId === bubble.id) {
          setFollowBubbleId(null);
        } else {
          setFollowBubbleId(bubble.id);
        }
        
        // Also open detail panel
        if (onBubbleClick) {
          onBubbleClick(data.find(kol => kol.id === bubble.id));
        }
        return;
      }
    }
  };
  
  // Zoom controls - force camera vào vị trí để không lộ bound bottom và right
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const zoomSpeed = 0.1;
    const newZoom = e.deltaY < 0 
      ? Math.min(2, camera.zoom + zoomSpeed)
      : Math.max(0.5, camera.zoom - zoomSpeed);
    
    // Tính viewport size với zoom mới
    const viewportWidth = canvas.width / newZoom;
    const viewportHeight = canvas.height / newZoom;
    
    // Tính bounds mới dựa trên zoom mới
    // Bound right luôn ở cạnh phải màn hình, bound bottom luôn ở cạnh dưới màn hình
    // maxX = MAP_WIDTH - viewportWidth để bound right ở cạnh phải
    // maxY = MAP_HEIGHT - viewportHeight để bound bottom ở cạnh dưới
    let maxX, maxY, minX, minY;
    
    if (viewportWidth >= MAP_WIDTH) {
      minX = MAP_WIDTH / 2 - viewportWidth / 2;
      maxX = MAP_WIDTH / 2 - viewportWidth / 2;
    } else {
      minX = 0;
      maxX = MAP_WIDTH - viewportWidth;
    }
    
    if (viewportHeight >= MAP_HEIGHT) {
      minY = MAP_HEIGHT / 2 - viewportHeight / 2;
      maxY = MAP_HEIGHT / 2 - viewportHeight / 2;
    } else {
      minY = 0;
      maxY = MAP_HEIGHT - viewportHeight;
    }
    
    // Force clamp camera position ngay lập tức để không lộ bound
    // Đảm bảo camera không vượt quá bounds với zoom mới
    let clampedX = Math.max(minX, Math.min(maxX, camera.x));
    let clampedY = Math.max(minY, Math.min(maxY, camera.y));
    
    // Nếu camera đang ở ngoài bounds, force về bounds
    if (camera.x < minX) clampedX = minX;
    if (camera.x > maxX) clampedX = maxX;
    if (camera.y < minY) clampedY = minY;
    if (camera.y > maxY) clampedY = maxY;
    
    setCamera({ x: clampedX, y: clampedY, zoom: newZoom });
    cameraRef.current = { x: clampedX, y: clampedY, zoom: newZoom };
  };
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'l' || e.key === 'L') {
        setShowLeaderboard(prev => !prev);
      } else if (e.key === 'Escape') {
        setFollowBubbleId(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  // Process log queue
  useEffect(() => {
    if (combatLogs.length > 0) return;
    
    if (logQueue.length > 0) {
      const nextLog = logQueue[0];
      setCombatLogs([{ ...nextLog, timestamp: Date.now() }]);
      setLogQueue(prev => prev.slice(1));
    }
  }, [combatLogs, logQueue]);
  
  return (
    <div className="snake-game-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight - 100}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="snake-canvas"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
      
      {/* Leaderboard Sidebar */}
      <div className={`leaderboard-sidebar ${showLeaderboard ? 'open' : ''}`}>
        <div className="leaderboard-header">
          <h3>🏆 LEADERBOARD</h3>
          <button className="close-btn" onClick={() => setShowLeaderboard(false)}>✕</button>
        </div>
        <div className="leaderboard-search-container" style={{ padding: '10px', borderBottom: '2px solid #90EE90' }}>
          <input
            type="text"
            placeholder="Search KOL..."
            value={leaderboardSearch}
            onChange={(e) => setLeaderboardSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '2px solid #90EE90',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '14px'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="leaderboard-content">
          {getSortedBubbles().map((bubble, index) => (
            <div 
              key={bubble.id}
              className={`leaderboard-entry ${followBubbleId === bubble.id ? 'following' : ''} ${bubble.isDead ? 'dead' : ''}`}
              onClick={() => {
                if (!bubble.isDead) {
                  setFollowBubbleId(followBubbleId === bubble.id ? null : bubble.id);
                }
              }}
              style={{
                opacity: bubble.isDead ? 0.5 : 1,
                cursor: bubble.isDead ? 'not-allowed' : 'pointer'
              }}
            >
              <span className={`rank ${index < 3 && !bubble.isDead ? 'top-three' : ''}`}>
                #{index + 1}
              </span>
              {bubble.isDead && (
                <span style={{ fontSize: '16px', marginRight: '4px' }}>💀</span>
              )}
              <span 
                className="color-dot" 
                style={{ backgroundColor: bubble.color }}
              />
              <span className="name">{bubble.name}</span>
              <span className="follower-score">{bubble.totalFollowers.toLocaleString()}</span>
            </div>
          ))}
          {getSortedBubbles().length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#b9bbbe' }}>
              No KOLs found
            </div>
          )}
        </div>
      </div>
      
      {/* Leaderboard Toggle Button */}
      {!showLeaderboard && (
        <button className="leaderboard-toggle-btn" onClick={() => setShowLeaderboard(true)}>
          <span className="icon">🏆</span>
          <span className="text">Leaderboard (L)</span>
        </button>
      )}
      
      {/* Combat Logs (Top Center) */}
      <div className="combat-logs">
        {combatLogs.map(log => {
          const age = Date.now() - log.timestamp;
          const fadeIn = Math.min(1, age / 250);
          const fadeOut = age > 1700 ? Math.max(0, 1 - (age - 1700) / 300) : 1;
          const opacity = Math.min(fadeIn, fadeOut);
          
          return (
            <div 
              key={log.id} 
              className="combat-log-entry"
              style={{ opacity }}
            >
              <div className="log-combatant">
                <div className="log-avatar">
                  {log.winnerAvatar ? (
                    <img src={log.winnerAvatar} alt={log.winnerName} />
                  ) : (
                    <div className="log-avatar-initials">{log.winnerName.substring(0, 2).toUpperCase()}</div>
                  )}
                </div>
                <div className="log-name">{log.winnerName}</div>
                <div className="log-change positive">+{log.followerChange}</div>
              </div>
              
              <div className="log-vs">VS</div>
              
              <div className="log-combatant">
                <div className="log-avatar">
                  {log.loserAvatar ? (
                    <img src={log.loserAvatar} alt={log.loserName} />
                  ) : (
                    <div className="log-avatar-initials">{log.loserName.substring(0, 2).toUpperCase()}</div>
                  )}
                </div>
                <div className="log-name">{log.loserName}</div>
                <div className="log-change negative">-{log.followerChange}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Follow Indicator */}
      {followBubbleId && (
        <div className="follow-indicator">
          📹 Following: <strong>{bubbles.find(b => b.id === followBubbleId)?.name}</strong>
          <button onClick={() => setFollowBubbleId(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

