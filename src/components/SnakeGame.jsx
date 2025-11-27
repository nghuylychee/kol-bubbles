import { useEffect, useRef, useState } from 'react';
import './SnakeGame.css';
import { getCachedAvatar, cacheAvatar, loadAvatarWithQueue } from '../utils/avatarCache';

// Snake class
class Snake {
  constructor(id, name, color, x, y, avatarUrl, totalFollowers, initials) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.avatarUrl = avatarUrl;
    this.totalFollowers = totalFollowers;
    this.initials = initials;
    
    // Snake properties - Scale with followers
    this.segments = [{ x, y }]; // Head position
    this.length = Math.max(10, Math.floor(totalFollowers / 10000)); // 1 segment per 10k followers
    this.speed = 3;
    this.direction = Math.random() * Math.PI * 2; // Random initial direction
    this.targetDirection = this.direction;
    // Radius scales with followers (10-30px)
    this.radius = Math.max(10, Math.min(30, 10 + (totalFollowers / 1000000) * 2));
    
    // AI properties
    this.aiTarget = null;
    this.aiMode = 'wander'; // wander, chase, flee
    this.aiUpdateTimer = 0;
    this.aiUpdateInterval = 30; // Update AI every 30 frames
    
    // State
    this.isDead = false;
    this.respawnTimer = 0;
    this.respawnDelay = 180; // 3 seconds at 60fps
  }
  
  // Update snake position and AI
  update(canvas, allSnakes, foods) {
    if (this.isDead) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.respawn(canvas);
      }
      return;
    }
    
    // Update AI
    this.updateAI(canvas, allSnakes, foods);
    
    // Smooth direction change
    let diff = this.targetDirection - this.direction;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.direction += diff * 0.1; // Smooth turning
    
    // Move head
    const head = this.segments[0];
    const newHead = {
      x: head.x + Math.cos(this.direction) * this.speed,
      y: head.y + Math.sin(this.direction) * this.speed
    };
    
    // Wrap around screen
    if (newHead.x < 0) newHead.x = canvas.width;
    if (newHead.x > canvas.width) newHead.x = 0;
    if (newHead.y < 0) newHead.y = canvas.height;
    if (newHead.y > canvas.height) newHead.y = 0;
    
    // Add new head
    this.segments.unshift(newHead);
    
    // Remove tail if too long
    while (this.segments.length > this.length) {
      this.segments.pop();
    }
  }
  
  // AI behavior - Improved strategy
  updateAI(canvas, allSnakes, foods) {
    this.aiUpdateTimer++;
    if (this.aiUpdateTimer < this.aiUpdateInterval) return;
    this.aiUpdateTimer = 0;
    
    const head = this.segments[0];
    
    // Calculate rank (0 = smallest, 1 = largest)
    const allLengths = allSnakes.filter(s => !s.isDead).map(s => s.length).sort((a, b) => a - b);
    const myRankIndex = allLengths.indexOf(this.length);
    const rankRatio = allLengths.length > 1 ? myRankIndex / (allLengths.length - 1) : 0.5;
    
    // Strategy based on rank
    const isSmall = rankRatio < 0.3; // Bottom 30%
    const isMedium = rankRatio >= 0.3 && rankRatio < 0.7; // Middle 40%
    const isLarge = rankRatio >= 0.7; // Top 30%
    
    // Find nearest threat (larger snake)
    let nearestThreat = null;
    let minThreatDist = isSmall ? 300 : 200; // Small snakes more cautious
    
    for (const snake of allSnakes) {
      if (snake.id === this.id || snake.isDead) continue;
      if (snake.length <= this.length * 1.2) continue; // Only fear significantly larger snakes
      
      const dist = this.distance(head, snake.segments[0]);
      if (dist < minThreatDist) {
        minThreatDist = dist;
        nearestThreat = snake;
      }
    }
    
    // Find nearest prey (smaller snake)
    let nearestPrey = null;
    let minPreyDist = isLarge ? 400 : 250; // Large snakes hunt more aggressively
    
    for (const snake of allSnakes) {
      if (snake.id === this.id || snake.isDead) continue;
      if (snake.length >= this.length * 0.6) continue; // Hunt smaller snakes
      
      const dist = this.distance(head, snake.segments[0]);
      if (dist < minPreyDist) {
        minPreyDist = dist;
        nearestPrey = snake;
      }
    }
    
    // Find nearest food
    let nearestFood = null;
    let minFoodDist = isSmall ? 350 : 200; // Small snakes prioritize food more
    
    for (const food of foods) {
      const dist = this.distance(head, food);
      if (dist < minFoodDist) {
        minFoodDist = dist;
        nearestFood = food;
      }
    }
    
    // Decide behavior based on rank and situation
    if (nearestThreat && minThreatDist < (isSmall ? 250 : 150)) {
      // FLEE from larger snake (priority 1 for small snakes)
      this.aiMode = 'flee';
      const angle = Math.atan2(head.y - nearestThreat.segments[0].y, head.x - nearestThreat.segments[0].x);
      this.targetDirection = angle;
    } else if (isLarge && nearestPrey && minPreyDist < 300) {
      // HUNT mode for large snakes - aggressive chasing
      this.aiMode = 'hunt';
      const angle = Math.atan2(nearestPrey.segments[0].y - head.y, nearestPrey.segments[0].x - head.x);
      this.targetDirection = angle;
    } else if (isSmall && nearestFood && minFoodDist < 300) {
      // PRIORITIZE food for small snakes to grow
      this.aiMode = 'grow';
      const angle = Math.atan2(nearestFood.y - head.y, nearestFood.x - head.x);
      this.targetDirection = angle;
    } else if (isMedium && nearestPrey && minPreyDist < 200) {
      // Opportunistic hunting for medium snakes
      this.aiMode = 'chase';
      const angle = Math.atan2(nearestPrey.segments[0].y - head.y, nearestPrey.segments[0].x - head.x);
      this.targetDirection = angle;
    } else if (nearestFood && minFoodDist < 180) {
      // GO TO food when nothing else to do
      this.aiMode = 'food';
      const angle = Math.atan2(nearestFood.y - head.y, nearestFood.x - head.x);
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
    if (head.x < edgeMargin) {
      this.targetDirection = 0; // Go right
    } else if (head.x > canvas.width - edgeMargin) {
      this.targetDirection = Math.PI; // Go left
    }
    if (head.y < edgeMargin) {
      this.targetDirection = Math.PI / 2; // Go down
    } else if (head.y > canvas.height - edgeMargin) {
      this.targetDirection = -Math.PI / 2; // Go up
    }
  }
  
  // Check collision with other snake
  checkCollision(otherSnake) {
    if (this.isDead || otherSnake.isDead || this.id === otherSnake.id) return false;
    
    const head = this.segments[0];
    
    // Check collision with other snake's body (not head)
    for (let i = 3; i < otherSnake.segments.length; i++) {
      const segment = otherSnake.segments[i];
      const dist = this.distance(head, segment);
      if (dist < this.radius + otherSnake.radius) {
        return true;
      }
    }
    
    return false;
  }
  
  // Die and prepare to respawn
  die() {
    this.isDead = true;
    this.respawnTimer = this.respawnDelay;
  }
  
  // Respawn at random position (if completely dead)
  respawn(canvas) {
    this.isDead = false;
    this.segments = [{
      x: Math.random() * MAP_WIDTH,
      y: Math.random() * MAP_HEIGHT
    }];
    this.direction = Math.random() * Math.PI * 2;
    this.targetDirection = this.direction;
    this.length = Math.max(10, Math.floor(this.totalFollowers / 10000)); // 1 segment per 10k followers
  }
  
  // Grow snake
  grow(amount = 3) {
    this.length += amount;
  }
  
  // Eat food
  eatFood(food, foods) {
    const head = this.segments[0];
    const dist = this.distance(head, food);
    if (dist < this.radius + 5) {
      this.grow(2);
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
  
  // Draw snake with simple slither.io style
  draw(ctx, images, loadingAvatars) {
    if (this.isDead) return;
    
    // Draw body segments (simple slither.io style)
    if (this.segments.length > 1) {
      // Draw body segments
      for (let i = this.segments.length - 1; i >= 0; i--) {
        const segment = this.segments[i];
        
        // Size gradient - slightly smaller at tail
        const sizeRatio = 0.85 + (i / this.segments.length) * 0.15;
        const segmentRadius = this.radius * sizeRatio;
        
        // Darker inner color
        const innerColor = this.darkenColor(this.color, 0.25);
        
        // Outer border (bright)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(segment.x, segment.y, segmentRadius + 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner fill (darker)
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.arc(segment.x, segment.y, segmentRadius - 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Simple shine (top-left)
        if (i < this.segments.length - 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(
            segment.x - segmentRadius * 0.25,
            segment.y - segmentRadius * 0.25,
            segmentRadius * 0.35,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }
    
    // Draw head info: Name -> Avatar -> Follower
    const head = this.segments[0];
    const avatarSize = this.radius * 1.5;
    
    // Calculate font sizes
    const nameFontSize = Math.max(12, Math.min(18, this.radius * 1.2));
    const followerFontSize = Math.max(10, Math.min(14, this.radius * 0.9));
    
    // Draw name ABOVE avatar (white with shadow)
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
    
    const nameY = head.y - avatarSize - 8;
    ctx.strokeText(displayName, head.x, nameY);
    ctx.fillText(displayName, head.x, nameY);
    
    // Draw AVATAR in the middle
    // Draw avatar background circle (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(head.x, head.y, avatarSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw avatar border
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw avatar image, loading spinner, or initials
    const isLoading = loadingAvatars && loadingAvatars.has(this.id);
    
    if (this.avatarUrl && images[this.id] && !isLoading) {
      // Avatar loaded successfully
      const img = images[this.id];
      ctx.save();
      ctx.beginPath();
      ctx.arc(head.x, head.y, avatarSize - 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        img,
        head.x - avatarSize + 2,
        head.y - avatarSize + 2,
        (avatarSize - 2) * 2,
        (avatarSize - 2) * 2
      );
      ctx.restore();
    } else if (isLoading) {
      // Show loading spinner
      const spinnerRadius = avatarSize * 0.35;
      const time = Date.now() / 1000; // Convert to seconds
      const rotation = (time * 2) % (Math.PI * 2); // 2 rotations per second
      
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(rotation);
      
      // Draw spinning arc
      ctx.strokeStyle = '#5865F2';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, spinnerRadius, 0, Math.PI * 1.5); // 3/4 circle
      ctx.stroke();
      
      ctx.restore();
    } else {
      // Draw initials (no avatar or failed to load)
      ctx.fillStyle = '#2c3e50';
      ctx.font = `bold ${avatarSize * 0.8}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.initials || this.name.substring(0, 2).toUpperCase(), head.x, head.y);
    }
    
    // Draw follower count BELOW avatar (gray with shadow)
    ctx.font = `bold ${followerFontSize}px Arial`;
    ctx.fillStyle = '#b9bbbe';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Format follower count
    const totalFollowers = this.totalFollowers;
    let followerText;
    if (totalFollowers >= 1000000) {
      followerText = `${(totalFollowers / 1000000).toFixed(1)}M`;
    } else if (totalFollowers >= 1000) {
      followerText = `${(totalFollowers / 1000).toFixed(0)}K`;
    } else {
      followerText = totalFollowers.toString();
    }
    
    const followerY = head.y + avatarSize + 8;
    ctx.strokeText(followerText, head.x, followerY);
    ctx.fillText(followerText, head.x, followerY);
    
    ctx.globalAlpha = 1;
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

export default function SnakeGame({ data, onSnakeClick }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [snakes, setSnakes] = useState([]);
  const [foods, setFoods] = useState([]);
  const [images, setImages] = useState({});
  const gameLoopRef = useRef(null);
  
  // Camera system for large map (keep state for non-follow updates)
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [followSnakeId, setFollowSnakeId] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false); // Hidden by default
  const [collisionEffects, setCollisionEffects] = useState([]); // Collision animations
  const [combatLogs, setCombatLogs] = useState([]); // Combat log messages
  const [logQueue, setLogQueue] = useState([]); // Queue for sequential logs
  const followSnakeIdRef = useRef(null); // Ref for accessing in game loop
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 }); // Use ref instead of state for better performance
  const [loadingAvatars, setLoadingAvatars] = useState(new Set()); // Track loading avatars
  
  // Large map size
  const MAP_WIDTH = 4000;
  const MAP_HEIGHT = 3000;
  
  // Initialize snakes
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create snakes from KOL data on large map
    const newSnakes = data.map(kol => {
      return new Snake(
        kol.id,
        kol.name,
        kol.snakeColor || kol.color, // Use vibrant snake color
        Math.random() * MAP_WIDTH,
        Math.random() * MAP_HEIGHT,
        kol.avatar_url,
        kol.total_followers,
        kol.initials
      );
    });
    
    setSnakes(newSnakes);
    
    // Load avatar images using avatarCache (same as bubble chart)
    const loadImages = async () => {
      const imgMap = {};
      const loadingSet = new Set();
      
      // Mark all as loading initially
      data.forEach(kol => {
        if (kol.avatar_url) {
          loadingSet.add(kol.id);
        }
      });
      setLoadingAvatars(loadingSet);
      
      for (const kol of data) {
        if (!kol.avatar_url) continue;
        
        try {
          // Check cache first
          const cachedImg = getCachedAvatar(kol.id);
          if (cachedImg) {
            imgMap[kol.id] = cachedImg;
            console.log(`✅ Loaded cached avatar for ${kol.name}`);
            setLoadingAvatars(prev => {
              const newSet = new Set(prev);
              newSet.delete(kol.id);
              return newSet;
            });
            setImages(prev => ({ ...prev, [kol.id]: cachedImg }));
            continue;
          }
          
          // Load with queue and cache
          const img = await loadAvatarWithQueue(kol.avatar_url, kol.id);
          if (img) {
            imgMap[kol.id] = img;
            cacheAvatar(kol.id, img);
            console.log(`✅ Loaded avatar for ${kol.name}`);
            setLoadingAvatars(prev => {
              const newSet = new Set(prev);
              newSet.delete(kol.id);
              return newSet;
            });
            setImages(prev => ({ ...prev, [kol.id]: img }));
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
  
  // Keep followSnakeIdRef and cameraRef in sync
  useEffect(() => {
    followSnakeIdRef.current = followSnakeId;
  }, [followSnakeId]);
  
  // Sync cameraRef with camera state for non-follow updates (drag, zoom)
  useEffect(() => {
    if (!followSnakeIdRef.current) {
      cameraRef.current = camera;
    }
  }, [camera]);
  
  // Game loop with camera
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || snakes.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    
    const gameLoop = () => {
      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Use cameraRef for smooth follow without re-renders
      const currentCamera = followSnakeIdRef.current ? cameraRef.current : camera;
      
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
      
      // Update snakes and collect collision data
      const newCollisions = [];
      
      snakes.forEach(snake => {
        // Update with large map bounds
        snake.update({ width: MAP_WIDTH, height: MAP_HEIGHT }, snakes, foods);
        
        // Check ALL collisions: head with any part of other snake (including head)
        snakes.forEach(otherSnake => {
          if (snake.id === otherSnake.id || snake.isDead || otherSnake.isDead) return;
          
          const head = snake.segments[0];
          let hasCollided = false;
          
          // Check head collision with ALL segments of other snake (including head - segment[0])
          for (let i = 0; i < otherSnake.segments.length; i++) {
            const segment = otherSnake.segments[i];
            const dist = Math.sqrt(
              Math.pow(head.x - segment.x, 2) + Math.pow(head.y - segment.y, 2)
            );
            
            // Check if collision happened
            const collisionRadius = i === 0 
              ? snake.radius + otherSnake.radius  // Head-to-head: both full radius
              : snake.radius + otherSnake.radius * 0.8; // Head-to-body: slightly smaller
            
            if (dist < collisionRadius) {
              hasCollided = true;
              
              // Combat! Random gain/loss (100-1000 followers)
              const followerChange = Math.floor(Math.random() * 900) + 100;
              
              // Randomly decide who gains and who loses
              const randomWinner = Math.random() < 0.5 ? snake : otherSnake;
              const randomLoser = randomWinner === snake ? otherSnake : snake;
              
              // Winner gains followers
              randomWinner.totalFollowers += followerChange;
              randomWinner.length = Math.max(10, Math.floor(randomWinner.totalFollowers / 10000));
              
              // Loser loses followers
              randomLoser.totalFollowers = Math.max(10000, randomLoser.totalFollowers - followerChange);
              randomLoser.length = Math.max(10, Math.floor(randomLoser.totalFollowers / 10000));
              
              // Store collision for effect
              newCollisions.push({
                x: (head.x + segment.x) / 2,
                y: (head.y + segment.y) / 2,
                followerChange: followerChange,
                winner: randomWinner.id,
                loser: randomLoser.id,
                winnerName: randomWinner.name,
                loserName: randomLoser.name,
                winnerAvatar: randomWinner.avatarUrl,
                loserAvatar: randomLoser.avatarUrl,
                winnerFollowers: randomWinner.totalFollowers,
                loserFollowers: randomLoser.totalFollowers,
                timestamp: Date.now(),
                id: Math.random()
              });
              
              // Push apart or bounce back
              const pushAngle = Math.atan2(head.y - segment.y, head.x - segment.x);
              snake.direction = pushAngle;
              if (i === 0) {
                // Head-to-head: push both apart
                otherSnake.direction = pushAngle + Math.PI;
              }
              
              break; // Only process one collision per frame
            }
          }
        });
        
        // Check food eating
        foods.forEach(food => {
          snake.eatFood(food, foods);
        });
        
        snake.draw(ctx, images, loadingAvatars);
      });
      
      // Add collision effects and combat logs
      if (newCollisions.length > 0) {
        setCollisionEffects(prev => [...prev, ...newCollisions]);
        
        // Add combat logs to queue
        newCollisions.forEach(collision => {
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
        
        // No longer spawn food from collisions
      }
      
      // Clean old collision effects and combat logs
      setCollisionEffects(prev => 
        prev.filter(eff => Date.now() - eff.timestamp < 1000)
      );
      setCombatLogs(prev => 
        prev.filter(log => Date.now() - log.timestamp < 2000) // Keep for 2 seconds
      );
      
      // Draw collision effects
      collisionEffects.forEach(effect => {
        const age = Date.now() - effect.timestamp;
        const progress = Math.min(1, age / 1000); // Clamp 0 to 1
        const alpha = Math.max(0, 1 - progress); // Clamp 0 to 1
        
        // Skip if fully faded
        if (alpha <= 0) return;
        
        const size = Math.max(5, 30 + progress * 50); // Ensure positive size
        const particleRadius = Math.max(1, 5 * alpha); // Ensure positive radius
        
        // Draw explosion effect
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw particles
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          const particleX = effect.x + Math.cos(angle) * size * 1.5;
          const particleY = effect.y + Math.sin(angle) * size * 1.5;
          
          ctx.fillStyle = '#ffd93d';
          ctx.beginPath();
          ctx.arc(particleX, particleY, particleRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Draw change text (simpler for small numbers)
        if (effect.followerChange > 0) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#ffd93d';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          const textY = Math.max(20, effect.y - size - 10);
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
        }
        
        ctx.globalAlpha = 1;
      });
      
      // Restore context
      ctx.restore();
      
      // Minimap now rendered as DOM element, not on canvas
      
      // Spawn new food
      if (foods.length < 200 && Math.random() < 0.1) {
        foods.push({
          x: Math.random() * MAP_WIDTH,
          y: Math.random() * MAP_HEIGHT
        });
      }
      
      // Update camera to follow snake continuously (every frame) - using ref for performance
      if (followSnakeIdRef.current) {
        const followSnake = snakes.find(s => s.id === followSnakeIdRef.current);
        
        if (followSnake && !followSnake.isDead && followSnake.segments.length > 0) {
          const head = followSnake.segments[0];
          
          // Calculate target to keep snake perfectly centered
          // Account for zoom: actual viewport in world space = canvas size / zoom
          const viewportWidth = canvas.width / cameraRef.current.zoom;
          const viewportHeight = canvas.height / cameraRef.current.zoom;
          
          // Target camera position to center the snake
          const targetX = head.x - viewportWidth / 2;
          const targetY = head.y - viewportHeight / 2;
          
          // Update camera ref directly (no re-render, smoother performance)
          const lerpFactor = 0.15; // Smooth interpolation
          cameraRef.current.x = Math.max(0, Math.min(MAP_WIDTH - viewportWidth, 
            cameraRef.current.x + (targetX - cameraRef.current.x) * lerpFactor));
          cameraRef.current.y = Math.max(0, Math.min(MAP_HEIGHT - viewportHeight,
            cameraRef.current.y + (targetY - cameraRef.current.y) * lerpFactor));
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
  }, [snakes, foods, images, camera, followSnakeIdRef]);
  
  
  // Get sorted snakes for leaderboard (moved outside draw function)
  const getSortedSnakes = () => {
    return [...snakes]
      .filter(s => !s.isDead)
      .sort((a, b) => b.length - a.length)
      .slice(0, 10);
  };
  
  // Mouse/Touch handlers for camera pan
  const handleMouseDown = (e) => {
    // Disable follow mode when manually dragging
    if (followSnakeId) {
      setFollowSnakeId(null);
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    const newCamera = {
      ...camera,
      x: Math.max(0, Math.min(MAP_WIDTH - window.innerWidth, camera.x - dx)),
      y: Math.max(0, Math.min(MAP_HEIGHT - (window.innerHeight - 100), camera.y - dy))
    };
    
    setCamera(newCamera);
    cameraRef.current = newCamera;
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle canvas click (when not dragging) - Click ANY segment
  const handleClick = (e) => {
    if (isDragging) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to world coordinates
    const worldX = mouseX + camera.x;
    const worldY = mouseY + camera.y;
    
    // Find clicked snake - check ALL segments
    for (const snake of snakes) {
      if (snake.isDead) continue;
      
      // Check all segments, not just head
      for (const segment of snake.segments) {
        const dist = Math.sqrt((worldX - segment.x) ** 2 + (worldY - segment.y) ** 2);
        if (dist < snake.radius * 1.5) {
          // Toggle follow mode
          if (followSnakeId === snake.id) {
            setFollowSnakeId(null);
          } else {
            setFollowSnakeId(snake.id);
          }
          
          // Also open detail panel
          if (onSnakeClick) {
            onSnakeClick(data.find(kol => kol.id === snake.id));
          }
          return; // Exit after finding clicked snake
        }
      }
    }
  };
  
  // Zoom controls
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = e.deltaY < 0 
      ? Math.min(2, camera.zoom + zoomSpeed)
      : Math.max(0.5, camera.zoom - zoomSpeed);
    
    setCamera(prev => ({ ...prev, zoom: newZoom }));
  };
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'l' || e.key === 'L') {
        setShowLeaderboard(prev => !prev);
      } else if (e.key === 'Escape') {
        setFollowSnakeId(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  // Process log queue - show logs sequentially
  useEffect(() => {
    // If there's a log currently showing, wait for it to finish
    if (combatLogs.length > 0) return;
    
    // If queue has logs and no log is showing, show the next one
    if (logQueue.length > 0) {
      const nextLog = logQueue[0];
      setCombatLogs([{ ...nextLog, timestamp: Date.now() }]); // Set current time as timestamp
      setLogQueue(prev => prev.slice(1)); // Remove from queue
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
        <div className="leaderboard-content">
          {getSortedSnakes().map((snake, index) => (
            <div 
              key={snake.id}
              className={`leaderboard-entry ${followSnakeId === snake.id ? 'following' : ''}`}
              onClick={() => setFollowSnakeId(followSnakeId === snake.id ? null : snake.id)}
            >
              <span className={`rank ${index < 3 ? 'top-three' : ''}`}>
                #{index + 1}
              </span>
              <span 
                className="color-dot" 
                style={{ backgroundColor: snake.color }}
              />
              <span className="name">{snake.name}</span>
              <span className="follower-score">{(snake.totalFollowers / 1000000).toFixed(1)}M</span>
            </div>
          ))}
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
          const fadeIn = Math.min(1, age / 250); // Fade in over 250ms
          const fadeOut = age > 1700 ? Math.max(0, 1 - (age - 1700) / 300) : 1; // Fade out last 300ms (1700-2000ms)
          const opacity = Math.min(fadeIn, fadeOut);
          
          return (
            <div 
              key={log.id} 
              className="combat-log-entry"
              style={{ opacity }}
            >
              <div className="log-combatant">
                <div className="log-avatar">
                  {log.winnerAvatar && images[log.winnerAvatar] ? (
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
                  {log.loserAvatar && images[log.loserAvatar] ? (
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
      {followSnakeId && (
        <div className="follow-indicator">
          📹 Following: <strong>{snakes.find(s => s.id === followSnakeId)?.name}</strong>
          <button onClick={() => setFollowSnakeId(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

