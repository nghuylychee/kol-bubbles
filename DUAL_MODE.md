# Dual Mode System - Bubble & Slither 🎯🐍

## Overview

Application giờ hỗ trợ **2 chế độ xem** khác nhau:
1. **Bubble Mode** 🎯 - Bubble chart với va chạm vật lý
2. **Slither Mode** 🐍 - Snake battle game với AI

## Mode Toggle System

### Toggle Button trong Header
- **Location**: Bên phải Header, trước Filter Panel
- **Style**: Grouped buttons với active state
- **Icons**: 
  - Bubble: Circle icon
  - Snake: Curved line với head

### Visual Design

```
┌─────────────────────────────────┐
│  [🔵 Bubbles] [🐍 Snakes]       │  ← Active = Blue (#5865F2)
│   (active)     (inactive)       │  ← Inactive = Gray (#b9bbbe)
└─────────────────────────────────┘
```

### Responsive Behavior

**Desktop:**
- Full button với icon + text
- Padding: 0.5rem 1rem
- Gap: 0.5rem between buttons

**Mobile:**
- Icon only (text hidden)
- Full width toggle
- Centered layout

## Features by Mode

### 🎯 Bubble Mode

#### Features:
- ✅ D3 Force Simulation
- ✅ Collision physics
- ✅ Avatar at center of bubbles
- ✅ Size scales with followers
- ✅ Green gradient colors (dark → light)
- ✅ Click to view KOL details
- ✅ Responsive sizes
- ✅ Mobile optimized

#### Best For:
- 📊 Data visualization
- 👀 Quick overview of all KOLs
- 📱 Mobile viewing
- 🎨 Beautiful presentation

### 🐍 Slither Mode

#### Features:
- ✅ AI-controlled snakes
- ✅ Chase/Flee/Hunt behaviors
- ✅ Death & respawn system
- ✅ Food system & growth
- ✅ Avatar on snake head
- ✅ Large map (4000x3000)
- ✅ Camera pan & zoom
- ✅ Minimap
- ✅ Real-time battles

#### Best For:
- 🎮 Interactive gaming
- 🤖 Watching AI behaviors
- 📹 Camera exploration
- 💥 Battle entertainment

## Mode State Management

### App.jsx State
```javascript
const [viewMode, setViewMode] = useState('bubble'); // Default
```

### Conditional Rendering
```javascript
{viewMode === 'bubble' ? (
  <BubbleChart {...props} />
) : (
  <SnakeGame {...props} />
)}
```

### Title Changes
```javascript
{viewMode === 'bubble' ? 'KOL BUBBLES' : 'KOL SNAKES'}
```

## User Flow

1. **Initial Load**: Bubble mode (default)
2. **Click Toggle**: Switch to Slither mode
3. **Data Persists**: Same filtered data in both modes
4. **Search/Filter**: Works in both modes
5. **Click KOL**: Detail panel opens in both modes

## Shared Features

Both modes share:
- ✅ Same data source (`kol-data-fetched.csv`)
- ✅ Search functionality
- ✅ Filter (Top 10/20/50/All)
- ✅ KOL detail panel
- ✅ Responsive design
- ✅ Mobile support

## CSS Classes

### Mode Toggle
```css
.mode-toggle          // Container
.mode-button          // Individual button
.mode-button.active   // Active state
.mode-button:hover    // Hover state
```

### Button States
- **Default**: Transparent background, gray text
- **Hover**: Dark background (#2f3136)
- **Active**: Blue background (#5865F2), white text

## Implementation Details

### Toggle Handler
```javascript
const handleModeChange = (mode) => {
  setViewMode(mode);
};
```

### Props Passed to Header
```javascript
<Header
  viewMode={viewMode}
  onModeChange={handleModeChange}
  // ... other props
/>
```

### Mode-specific Rendering
```javascript
// Bubble Mode
<BubbleChart
  data={filteredData}
  onBubbleClick={handleBubbleClick}
  width={chartWidth}
  height={chartHeight}
/>

// Slither Mode
<SnakeGame
  data={filteredData}
  onSnakeClick={handleSnakeClick}
/>
```

## Performance Considerations

### Mode Switching
- **Fast**: No data reload needed
- **Smooth**: Instant mode change
- **Clean**: Previous mode unmounts cleanly

### Memory
- Only active mode uses resources
- Inactive mode completely unmounted
- No memory leaks

## Mobile Optimization

### Bubble Mode (Mobile)
- ✅ Smaller bubbles (30% of screen)
- ✅ Reduced collision iterations
- ✅ Throttled simulation (20fps)
- ✅ Simpler gradients
- ✅ No glow effects

### Slither Mode (Mobile)
- ✅ Touch-friendly controls
- ✅ Larger tap targets
- ✅ Icon-only toggle
- ✅ Responsive text sizes
- ✅ Optimized rendering

## Usage Examples

### Switch to Bubble Mode
```
User clicks "Bubbles" button
→ viewMode = 'bubble'
→ BubbleChart renders
→ Title changes to "KOL BUBBLES"
```

### Switch to Slither Mode
```
User clicks "Snakes" button
→ viewMode = 'slither'
→ SnakeGame renders
→ Title changes to "KOL SNAKES"
→ Camera initializes
→ AI starts running
```

## Future Enhancements (Optional)

- [ ] Save user's preferred mode (localStorage)
- [ ] Keyboard shortcut (e.g., 'B' for Bubble, 'S' for Slither)
- [ ] Smooth transition animation between modes
- [ ] Mode-specific settings panel
- [ ] Compare mode (split screen)
- [ ] 3rd mode: Grid/Table view

## Testing Checklist

- [x] Toggle switches mode correctly
- [x] Data persists between modes
- [x] Search works in both modes
- [x] Filter works in both modes
- [x] Click KOL works in both modes
- [x] Mobile responsive
- [x] Active state highlights correctly
- [x] No console errors on switch
- [x] Performance smooth in both modes

---

**Enjoy switching between Bubble visualization and Snake battles! 🎯🐍**

