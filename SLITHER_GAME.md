# KOL Snakes - Slither.io Game Mode 🐍

## Concept Overview

Chuyển từ Bubble Chart sang game Slither.io với AI tự động:
- Mỗi KOL là một con rắn với màu sắc riêng
- AI tự động điều khiển di chuyển và tấn công
- Hệ thống death/respawn tự động
- Avatar hiển thị ở đầu rắn
- Growth mechanics và food system

## Features Implemented

### 1. Snake Class 🐍
- **Segments**: Mỗi rắn có nhiều segments tạo thành body
- **Length**: Dựa trên followers (totalFollowers / 500,000)
- **Speed**: 2 pixels/frame
- **Smooth Movement**: Interpolation cho chuyển động mượt mà
- **Wrap-around**: Rắn xuất hiện phía đối diện khi ra khỏi màn hình

### 2. AI Behaviors 🤖

#### **Wander Mode** (Mặc định)
- Di chuyển ngẫu nhiên
- Thay đổi hướng nhẹ nhàng
- Tránh edge của màn hình

#### **Chase Mode** (Tấn công)
- Phát hiện rắn nhỏ hơn trong bán kính 200px
- Chỉ chase rắn nhỏ hơn 70% kích thước
- Đuổi theo để cắn đuôi

#### **Flee Mode** (Chạy trốn)
- Phát hiện rắn lớn hơn trong bán kính 150px
- Chạy ngược hướng để tránh
- Ưu tiên sống sót

#### **Food Mode** (Ăn)
- Tìm food gần nhất trong bán kính 200px
- Di chuyển đến để ăn và grow

### 3. Collision System 💥
- **Head vs Body**: Rắn chết khi đầu va vào thân rắn khác
- **Winner Bonus**: Rắn thắng grow thêm 5 segments
- **Self-collision**: Không tự va vào thân mình
- **Respawn**: Tự động hồi sinh sau 3 giây

### 4. Visual Design 🎨

#### **Snake Rendering**
- Body: Màu gradient theo KOL color
- Head: Lớn hơn 1.5x body segments
- Border: Viền trắng 2-3px cho rõ ràng
- Alpha: Body có opacity gradient (0.6 → 1.0)

#### **Avatar Display**
- Hiển thị ở đầu rắn (head)
- Circular clip để vừa với head
- Size: 2.5x radius của head
- Fallback: Nếu không load được avatar

#### **Name Tag**
- Hiển thị trên đầu rắn
- Font: Bold 14px Arial
- Stroke: Black outline cho dễ đọc
- Fill: White text

### 5. Food System 🍎
- **Spawn**: Random trên map
- **Amount**: Duy trì ~50 foods
- **Visual**: Đỏ (#ff6b6b), radius 5px
- **Effect**: +2 segments khi ăn

### 6. Game Loop ⚡
- **FPS**: 60 frames per second
- **Canvas**: Full screen rendering
- **Grid**: Background grid 50x50px
- **Dark Theme**: #1a1a1a background

## Controls & Interaction

### User Interaction
- **Click Snake**: Mở detail panel của KOL
- **View Only**: AI tự động chơi, không control
- **Responsive**: Mobile-friendly

### AI Update Cycle
- Update AI every 30 frames (~0.5s)
- Evaluate threats, prey, food
- Make decision based on priority
- Smooth direction interpolation

## Technical Details

### Performance Optimizations
1. **Canvas Rendering**: Hardware accelerated
2. **AI Throttling**: Update mỗi 30 frames thay vì mỗi frame
3. **Distance Caching**: Tính distance hiệu quả
4. **Segment Limiting**: Max length để tránh quá nhiều segments

### Collision Detection
```javascript
// Check head vs body segments (skip first 3 for fair play)
for (let i = 3; i < otherSnake.segments.length; i++) {
  if (distance(head, segment) < radius * 2) {
    // Collision!
  }
}
```

### Growth Mechanics
- **Initial**: 10 + (followers / 10k) segments (1 segment per 10,000 followers!)
- **Food**: +2 segments per food
- **Kill**: +5 segments when killing another snake

## Game Balance

### Snake Sizes (1 segment = 10k followers)
| Followers | Starting Length | Example |
|-----------|----------------|---------|
| 100K | 10 segments | Small snake |
| 1M | 100 segments | Medium snake |
| 5M | 500 segments | Large snake |
| 10M | 1,000 segments | Huge snake |
| 17M+ | 1,700+ segments | MASSIVE snake! |

### AI Priorities
1. **Survival** (flee from larger) - Highest
2. **Hunt** (chase smaller) - Medium
3. **Grow** (eat food) - Medium
4. **Wander** (explore) - Lowest

## Known Features
- ✅ Smooth snake movement
- ✅ AI decision making (chase/flee/wander)
- ✅ Collision detection
- ✅ Death and respawn
- ✅ Avatar on snake head
- ✅ Name tags
- ✅ Food spawning and eating
- ✅ Growth mechanics
- ✅ Click to view KOL details
- ✅ Responsive design
- ✅ Dark theme with grid

## Future Enhancements (Optional)
- [ ] Leaderboard showing top snakes
- [ ] Kill counter và stats
- [ ] Power-ups và special abilities
- [ ] Sound effects
- [ ] Particle effects khi ăn/chết
- [ ] Mini-map
- [ ] Zoom controls
- [ ] Replay system

## Usage

Game tự động chạy khi load page:
1. Mỗi KOL được spawn như một snake
2. AI tự động điều khiển movement
3. Snakes tương tác với nhau (tấn công/trốn)
4. Click vào snake để xem thông tin KOL
5. Game loop chạy liên tục 60 FPS

**Enjoy watching the KOL battle! 🎮🐍**

