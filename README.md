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

## 🚀 Deploy lên GitHub Pages

Project đã được cấu hình sẵn để deploy tự động lên GitHub Pages với GitHub Actions.

### Các bước deploy (Siêu đơn giản!)

1. **Push code lên GitHub**
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

2. **Bật GitHub Pages** trong repository settings:
   - Settings → Pages
   - Source: chọn "GitHub Actions"
   - Save

3. **Xong!** 🎉 GitHub Actions sẽ tự động build và deploy
   - Xem progress tại tab "Actions"
   - Site sẽ có tại: `https://[username].github.io/[repo-name]/`

📖 **Xem hướng dẫn chi tiết**: [DEPLOY.md](./DEPLOY.md)

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

- **Development**: Sử dụng Vite proxy cho image loading, base path luôn là `/`
- **Production (GitHub Pages)**: Sử dụng client-side CORS proxy (api.allorigins.win)
- Avatar loading được giới hạn 2 concurrent requests với delay 500ms để tránh rate limiting
- GitHub Pages không hỗ trợ server-side proxy, nên image proxy được xử lý ở client-side

## Tech Stack

- React 19
- Vite 7
- D3.js 7
- PapaParse (CSV parsing)
