# KOL Bubbles - Interactive Bubble Chart Visualization

Ứng dụng React + Vite để visualize dữ liệu KOL (Key Opinion Leaders) dưới dạng bubble chart tương tác.

## Tính năng

- 📊 Bubble chart tương tác với D3.js
- 🔍 Tìm kiếm và lọc KOL
- 🖼️ Avatar loading với queue system (tối đa 2 concurrent requests)
- 📱 Responsive design
- 🎨 UI hiện đại với animations

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deploy lên GitHub Pages

### Cách 1: Tự động với GitHub Actions (Khuyến nghị)

1. **Push code lên GitHub repository**
   ```bash
   git add .
   git commit -m "Setup GitHub Pages"
   git push origin main
   ```

2. **Bật GitHub Pages trong repository settings:**
   - Vào Settings → Pages
   - Source: chọn "GitHub Actions"
   - Save

3. **Cập nhật base path trong `vite.config.js`** (nếu cần):
   - Nếu repo name là `kol-bubbles`, giữ nguyên
   - Nếu repo name khác, thay `'/kol-bubbles/'` bằng `'/[your-repo-name]/'`
   - Nếu repo là `username.github.io`, đổi base thành `'/'`

4. **Workflow sẽ tự động chạy** khi bạn push code lên branch `main`
   - Xem progress tại tab "Actions" trong GitHub
   - Sau khi deploy xong, site sẽ có tại: `https://[username].github.io/kol-bubbles/`

### Cách 2: Deploy thủ công

```bash
# Build với base path cho GitHub Pages
npm run build:gh-pages

# Deploy thủ công (cần cài gh-pages)
npm install --save-dev gh-pages

# Thêm script vào package.json:
# "deploy": "gh-pages -d dist"

# Deploy
npm run deploy
```

## Cấu trúc Project

```
kol-bubbles/
├── src/
│   ├── components/      # React components
│   │   ├── BubbleChart.jsx
│   │   ├── BubbleDetail.jsx
│   │   ├── FilterPanel.jsx
│   │   ├── Header.jsx
│   │   └── SearchBar.jsx
│   ├── utils/          # Utilities
│   │   ├── avatarCache.js    # Avatar caching & queue
│   │   ├── imageProxy.js     # Image proxy (dev/prod)
│   │   ├── csvParser.js
│   │   └── ...
│   └── ...
├── public/              # Static files
├── .github/workflows/   # GitHub Actions
└── vite.config.js       # Vite configuration
```

## Lưu ý

- **Development**: Sử dụng Vite proxy cho image loading
- **Production (GitHub Pages)**: Sử dụng client-side CORS proxy (api.allorigins.win)
- Avatar loading được giới hạn 2 concurrent requests với delay 500ms để tránh rate limiting
- GitHub Pages không hỗ trợ server-side proxy, nên image proxy được xử lý ở client-side

## Tech Stack

- React 19
- Vite 7
- D3.js 7
- PapaParse (CSV parsing)
