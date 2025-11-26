# Hướng dẫn Deploy lên GitHub Pages

## 📋 Yêu cầu trước khi deploy

1. Có tài khoản GitHub
2. Repository đã được push code lên GitHub
3. Code đang ở nhánh `main`

## 🚀 Các bước deploy

### Bước 1: Cấu hình GitHub Pages

1. Truy cập vào repository của bạn trên GitHub
2. Click vào tab **Settings** (Cài đặt)
3. Ở sidebar bên trái, tìm và click vào **Pages**
4. Trong phần **Build and deployment**:
   - **Source**: Chọn `GitHub Actions`
   
   ![GitHub Pages Settings](https://docs.github.com/assets/cb-49777/mw-1440/images/help/pages/pages-source-github-actions.webp)

### Bước 2: Push code lên GitHub

Nếu bạn chưa push code lên GitHub, thực hiện các lệnh sau:

```bash
# Thêm tất cả file vào git
git add .

# Commit với message
git commit -m "Add GitHub Pages deployment"

# Push lên GitHub
git push origin main
```

### Bước 3: Chờ deployment tự động chạy

1. Sau khi push, GitHub Actions sẽ tự động chạy
2. Vào tab **Actions** trong repository để xem tiến trình
3. Workflow "Deploy to GitHub Pages" sẽ xuất hiện và chạy
4. Đợi khoảng 2-3 phút để build và deploy hoàn thành

### Bước 4: Truy cập website

Sau khi deploy thành công, website của bạn sẽ có địa chỉ:

```
https://<username>.github.io/<repository-name>/
```

Ví dụ:
- Username: `johndoe`
- Repository: `kol-bubbles-git`
- URL: `https://johndoe.github.io/kol-bubbles-git/`

## 🔄 Deploy lại sau khi chỉnh sửa code

Mỗi lần bạn push code mới lên nhánh `main`, GitHub Actions sẽ tự động build và deploy lại:

```bash
git add .
git commit -m "Update features"
git push origin main
```

## 🛠️ Deploy thủ công

Nếu muốn deploy thủ công mà không cần push code:

1. Vào tab **Actions** trong repository
2. Click vào workflow "Deploy to GitHub Pages"
3. Click nút **Run workflow** ở góc phải
4. Chọn nhánh `main` và click **Run workflow**

## ❗ Lưu ý quan trọng

### API và Proxy

⚠️ **Chú ý**: Các tính năng sau sẽ KHÔNG hoạt động trên GitHub Pages:

1. **Apify API proxy** (`/api/apify`)
2. **Image proxy** (`/api/image-proxy`)

**Lý do**: GitHub Pages chỉ host static files (HTML, CSS, JS), không có server để xử lý proxy.

**Giải pháp**:

#### Option 1: Gọi API trực tiếp từ frontend (Đơn giản nhất)

Chỉnh sửa file `src/utils/apifyService.js`:

```javascript
// Thay vì dùng proxy:
const response = await fetch('/api/apify/...')

// Gọi trực tiếp:
const response = await fetch('https://api.apify.com/v2/...', {
  headers: {
    'Authorization': `Bearer ${apiToken}`
  }
})
```

**Lưu ý**: API token sẽ bị lộ trong network requests.

#### Option 2: Sử dụng CORS proxy bên thứ 3

Dùng các service như:
- https://corsproxy.io
- https://api.allorigins.win
- https://cors-anywhere.herokuapp.com

```javascript
const proxyUrl = 'https://corsproxy.io/?';
const apiUrl = 'https://api.apify.com/v2/...';
const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
```

#### Option 3: Deploy backend riêng (Khuyến nghị cho production)

Deploy một backend server (Node.js/Express) lên:
- Vercel
- Netlify Functions
- Railway
- Heroku

Sau đó frontend gọi API đến backend server này.

### Xử lý hình ảnh

Đối với việc load hình ảnh từ các nguồn khác:
- Nếu nguồn hỗ trợ CORS: Có thể load trực tiếp
- Nếu không hỗ trợ CORS: Cần dùng CORS proxy bên thứ 3

## 📝 File đã được cấu hình

Các file sau đã được setup sẵn cho GitHub Pages:

1. **.github/workflows/deploy.yml**: GitHub Actions workflow
2. **vite.config.js**: Cấu hình base URL tự động
3. **package.json**: Scripts để build

## 🐛 Xử lý lỗi thường gặp

### Lỗi 404 khi truy cập

- Kiểm tra GitHub Pages đã được enable
- Đợi 2-3 phút sau khi deploy xong
- Kiểm tra URL có đúng format: `username.github.io/repo-name`

### CSS/JS không load

- Kiểm tra file `vite.config.js` có cấu hình `base` đúng
- Clear cache trình duyệt (Ctrl+Shift+R hoặc Cmd+Shift+R)

### Workflow không chạy

- Kiểm tra tab Actions đã được enable trong Settings > Actions
- Kiểm tra file `.github/workflows/deploy.yml` có đúng format
- Xem logs trong tab Actions để biết lỗi cụ thể

## 📊 Theo dõi deployment

Để xem chi tiết quá trình deploy:

1. Vào tab **Actions**
2. Click vào workflow run gần nhất
3. Xem logs của từng step:
   - Checkout code
   - Setup Node.js
   - Install dependencies
   - Build
   - Deploy

## 🎉 Hoàn thành!

Nếu làm theo đúng các bước trên, website của bạn đã được deploy thành công lên GitHub Pages!

---

**Cần hỗ trợ?** Mở Issue trong repository này hoặc tham khảo:
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)


