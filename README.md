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

## 🚀 Deploy Options

### ⚡ Option 1: Vercel (KHUYẾN NGHỊ - Nhanh gấp 5x!)

**Tốc độ**: Load 50 avatars trong ~10 giây (thay vì ~50 giây)

```bash
# 1. Commit & push code
git add .
git commit -m "Deploy to Vercel"
git push origin main

# 2. Import project trên vercel.com
# 3. Click Deploy
# 4. Done! 🎉
```

📖 **Xem hướng dẫn chi tiết**: [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)

### 🌐 Option 2: GitHub Pages (Đơn giản nhưng chậm hơn)

```bash
# 1. Push code
git push origin main

# 2. Bật GitHub Pages trong Settings → Pages
# Source: GitHub Actions
```

📖 **Xem hướng dẫn chi tiết**: [DEPLOY.md](./DEPLOY.md)

### 📊 So sánh nhanh:

| | Vercel | GitHub Pages |
|---|--------|--------------|
| Setup | 10 phút | 5 phút |
| Avatar speed | ⚡⚡⚡⚡⚡ | ⚡ |
| Rate limiting | Hiếm | Thường |
| Auto-deploy | ✅ | ✅ |
| Cost | FREE | FREE |

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

## Troubleshooting

### Lỗi 404 khi chạy local

Nếu bạn gặp lỗi 404 khi chạy `npm run dev` hoặc `npm run preview`:

1. **Đảm bảo đang chạy đúng command:**
   - `npm run dev` - Chạy dev server (base path: `/`)
   - `npm run build` - Build production (base path: `/`)
   - `npm run build:gh-pages` - Build cho GitHub Pages (base path: `/kol-bubbles/`)

2. **Kiểm tra base path trong `vite.config.js`:**
   - Dev mode luôn dùng base `/`
   - Chỉ khi build với `GITHUB_PAGES=true` thì mới dùng base path cho GitHub Pages

3. **Nếu vẫn lỗi, thử:**
   ```bash
   # Xóa dist folder và build lại
   rm -rf dist
   npm run build
   npm run preview
   ```

### Lỗi 404 trên GitHub Pages

1. **Kiểm tra repo name:**
   - Mở `.github/workflows/deploy.yml`
   - Workflow tự động detect repo name
   - Nếu repo name khác `kol-bubbles`, cập nhật trong `vite.config.js`:
     ```js
     base: '/your-repo-name/'
     ```

2. **Kiểm tra GitHub Pages settings:**
   - Settings → Pages → Source: "GitHub Actions"
   - Đảm bảo workflow đã chạy thành công

## Lưu ý

### Development vs Production

**Development (npm run dev)**:
- ✅ Button "Fetch Data" có thể fetch dữ liệu từ Apify API
- ✅ Avatar loading từ Instagram (qua Vite proxy - nhanh & ổn định)
- Base path: `/`

**Production (GitHub Pages)**:
- ❌ Button "Fetch Data" bị ẩn (không có server proxy cho Apify API)
- ✅ Avatar loading - **Smart loading với rate limit protection**
  - Sequential loading (1 avatar/second) để tránh rate limit
  - Multiple CORS proxy fallback (4 services)
  - Exponential backoff khi gặp 429 errors
  - Silent error handling (không spam console)
  - Graceful fallback về initials nếu fail
- ✅ Dùng dữ liệu từ CSV files
- Base path: `/repo-name/` (tự động từ GitHub Actions)

## Tech Stack

- React 19
- Vite 7
- D3.js 7
- PapaParse (CSV parsing)
