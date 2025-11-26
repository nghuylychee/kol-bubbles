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

### Khác biệt giữa Development và Production

⚠️ **Development (npm run dev)**:
- ✅ Button "Fetch Data" hiển thị - có thể fetch dữ liệu real-time từ Apify
- ✅ Avatar loading - load hình ảnh từ Instagram qua Vite proxy
- ✅ Tất cả tính năng hoạt động đầy đủ

⚠️ **Production (GitHub Pages)**:
- ❌ Button "Fetch Data" bị ẩn - không thể gọi API từ GitHub Pages
- ❌ Avatar loading bị tắt - Instagram CORS policy rất nghiêm ngặt
- ✅ Hiển thị initials (chữ cái đầu) thay vì avatar
- ✅ Dùng dữ liệu từ CSV files (mock data hoặc data đã fetch trước)

### API và Proxy

⚠️ **Chú ý**: Các tính năng sau sẽ KHÔNG hoạt động trên GitHub Pages:

1. **Apify API proxy** (`/api/apify`) - Không có button Fetch Data trên production
2. **Image proxy** (`/api/image-proxy`) - Avatar loading bị tắt trên production

**Lý do**: 
- GitHub Pages chỉ host static files (HTML, CSS, JS), không có server để xử lý proxy
- Instagram có CORS policy rất nghiêm ngặt, các public CORS proxy thường bị block
- Để tránh lỗi và cải thiện UX, avatar loading đã được tắt hoàn toàn trên production

**Giải pháp đã áp dụng**:

✅ **Avatar Loading**: Đã tắt hoàn toàn trên production, sử dụng initials thay thế
✅ **Fetch Data Button**: Chỉ hiển thị ở development mode

Nếu bạn muốn deploy với API và avatar loading đầy đủ, cần:

#### Option 1: Deploy với Backend riêng (Khuyến nghị)

Deploy backend server (Node.js/Express) lên:
- **Vercel** (Miễn phí, dễ dùng nhất)
- **Netlify Functions** 
- **Railway**
- **Render**

Frontend gọi API đến backend server này để xử lý:
- Apify API calls
- Image proxy để bypass Instagram CORS

#### Option 2: Sử dụng Vercel/Netlify để deploy toàn bộ app

Thay vì GitHub Pages, deploy lên Vercel hoặc Netlify:
- Hỗ trợ serverless functions
- Có thể tạo API routes để proxy requests
- Vẫn miễn phí cho personal projects

#### Option 3: Dùng mock data hoàn toàn

Cách đơn giản nhất - chỉ dùng CSV files:
- Tắt hoàn toàn API fetching
- Dùng mock data từ `kol-data.csv`
- Không cần avatar (dùng initials)
- ✅ **Đây là cách hiện tại đang được áp dụng**

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

### Lỗi 404 khi load file CSV (kol-data.csv, kol-data-fetched.csv)

✅ **Đã được fix!** 

**Nguyên nhân**: Các file trong thư mục `public/` được fetch với đường dẫn tuyệt đối (ví dụ `/kol-data.csv`), nhưng trên GitHub Pages với base path `/repo-name/`, đường dẫn đúng phải là `/repo-name/kol-data.csv`.

**Giải pháp**: Đã sử dụng `import.meta.env.BASE_URL` trong code để tự động thêm base path:

```javascript
// Trước (sai):
fetch('/kol-data.csv')

// Sau (đúng):
fetch(`${import.meta.env.BASE_URL}kol-data.csv`)
```

Vite sẽ tự động thay thế:
- Local dev: `BASE_URL = '/'`
- GitHub Pages: `BASE_URL = '/repo-name/'`

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


