# Portfolio cá nhân song ngữ (EN/VI)

Trang portfolio một trang cho frontend developer: React 19, TypeScript, Vite 8, Tailwind CSS 4, Motion và React Three Fiber. Mỗi ngôn ngữ có URL riêng (`/en`, `/vi`), được prerender thành HTML tĩnh, nên link chia sẻ lên Facebook, LinkedIn, Zalo hiện đúng tiêu đề, mô tả và ảnh mà không cần chạy JavaScript.

Bản đang chạy: **https://kietnguyen.io.vn**. Toàn bộ nội dung (hồ sơ, kinh nghiệm, dự án, CV) nằm trong một file: [`src/data/profile.ts`](src/data/profile.ts).

## Chạy dự án

Cần Node.js 22.12 trở lên và pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:5173 (tự chuyển sang /en hoặc /vi)
```

| Lệnh              | Tác dụng                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm dev`        | Sinh asset rồi chạy dev server                                                                        |
| `pnpm build`      | Sinh asset, build, prerender, kiểm tra ngân sách bundle. Kết quả ở `dist/`                            |
| `pnpm preview`    | Xem bản build tại http://127.0.0.1:4173, mô phỏng Vercel (clean URL, trang 404 thật)                  |
| `pnpm check`      | typecheck + lint + format + test + build. Chạy trước khi deploy                                       |
| `pnpm qa`         | Kiểm tra trên Chrome thật: responsive, bàn phím, đổi ngôn ngữ, 3D và fallback. Cần `pnpm build` trước |
| `pnpm lighthouse` | Đo Lighthouse mobile cho `/en`, `/vi` và mọi trang bài viết. Cần `pnpm build` trước                   |
| `pnpm cv`         | Sinh `cv-en.pdf` và `cv-vi.pdf` (bố cục CV riêng, 2 trang A4) từ `profile.ts`                         |
| `pnpm cv:private` | Bản CV có số điện thoại (đọc từ `private/contact.json`), ghi vào `private/`, không lên trang          |
| `pnpm assets`     | Chỉ sinh lại ảnh OG, icon, font                                                                       |

`pnpm qa`, `pnpm cv` và `pnpm lighthouse` dùng Chrome cài sẵn trên máy. Nếu Chrome nằm ở chỗ khác, đặt biến `CHROME_PATH`.

## Sửa nội dung

### Thông tin cá nhân: `src/data/profile.ts`

Mọi trường văn bản có dạng `{ en: '...', vi: '...' }`. Thiếu một ngôn ngữ là TypeScript báo lỗi ngay, và `pnpm test` cũng kiểm tra không có chuỗi rỗng.

```ts
tagline: {
  en: 'I build fast, accessible React interfaces that scale.',
  vi: 'Xây dựng giao diện React nhanh, dễ tiếp cận và mở rộng tốt.',
},
```

Thêm một dự án: thêm một phần tử vào mảng `projects`. Giao diện tự cập nhật, không cần sửa component.

```ts
{
  id: 'my-app',                       // duy nhất, không dấu
  name: 'My App',
  description: { en: '...', vi: '...' },
  tech: ['React', 'TypeScript'],
  demoUrl: 'https://...',
  repoUrl: 'https://github.com/...',
  visual: 'dashboard',                // hình minh hoạ: 'dashboard' | 'components' | 'map' | 'generic'
},
```

Phần đầu mỗi thẻ dự án là một cửa sổ trình duyệt thu nhỏ. Mặc định nó vẽ một bản wireframe theo `visual`. Khi có ảnh chụp thật, đặt file vào `public/` rồi thêm trường `image`, ảnh sẽ thay cho wireframe:

```ts
image: {
  src: '/projects/my-app.webp',       // nên dùng tỉ lệ 16:9, khoảng 800×380
  width: 800,
  height: 380,
  alt: { en: 'My App home screen', vi: 'Màn hình chính của My App' },
},
```

Kỹ năng (`skills`) và kinh nghiệm (`experience`) hoạt động tương tự. `endYear: null` nghĩa là "Hiện tại".

Các trường `seo.title`, `seo.description` quyết định tiêu đề và mô tả khi chia sẻ link.

Một số trường điều khiển các chi tiết trang trí:

| Trường         | Hiển thị ở đâu                                                                        |
| -------------- | ------------------------------------------------------------------------------------- |
| `stats`        | Dải bốn con số dưới hero. Mỗi số gồm `prefix` + `value` + `suffix`, có hiệu ứng đếm   |
| `availability` | Nhãn trạng thái có chấm nhấp nháy ở hero và phần Liên hệ. Đặt `open: false` để ẩn     |
| `focus`        | Dòng chữ tự gõ dưới chức danh, và mảng `focus` trong thẻ code ở phần Giới thiệu       |
| `timeZone`     | Đồng hồ giờ địa phương ở footer. Dùng tên múi giờ IANA, ví dụ `Asia/Ho_Chi_Minh`      |
| `skills`       | Ngoài phần Kỹ năng, còn sinh ra dải chữ chạy dưới hero và dòng `stack` trong thẻ code |

Thẻ code `about.ts` ở phần Giới thiệu không cần sửa tay. Nó tự lấy tên, chức danh, địa điểm, kỹ năng và `focus` từ `profile.ts`.

### Chữ trên giao diện: `src/i18n/dictionary.ts`

Menu, nút, tiêu đề section, trang 404 nằm ở đây. Để thêm một chuỗi mới:

1. Thêm key vào object `en`.
2. Thêm đúng key đó vào object `vi`. Nếu quên, TypeScript báo lỗi tại `vi`.
3. Dùng trong component: `const { t } = useLang();` rồi `t('ten.key')`.

### Bài viết: `src/content/`

Mỗi bài có trang riêng ở `/en/writing/<slug>` và `/vi/writing/<slug>`, được prerender thành HTML tĩnh (đọc được khi tắt
JavaScript, có thẻ chia sẻ dạng bài viết và JSON-LD `BlogPosting`). Để thêm một bài:

1. Viết nội dung vào `src/content/writing/<slug>.vi.md` và `<slug>.en.md`. Không có dòng tiêu đề `# ...`: tiêu đề đặt
   ở bước 2. Hỗ trợ: `##` và `###`, đoạn văn, danh sách `-` và `1.`, trích dẫn `>`, khối code, **đậm**, _nghiêng_,
   `code` và [liên kết](https://...). Liên kết chỉ nhận `https://`, đường dẫn bắt đầu bằng `/`, hoặc `#`.
2. Thêm một mục vào đầu mảng `ARTICLES` trong `src/content/articles.ts`: slug, ngày, tiêu đề, tóm tắt, chủ đề, thời
   gian đọc.
3. Chạy `pnpm test`: test báo nếu thiếu một ngôn ngữ, còn dòng `#`, hoặc thời gian đọc không khớp với nội dung
   (230 từ một phút).

Bài tự xuất hiện ở mục "Bài viết" trên trang chủ, trong sitemap, trong bảng lệnh (Ctrl/Cmd + K) và trong những gì Kai
biết, và có ảnh xem trước riêng mang tiêu đề bài khi chia sẻ đường dẫn (xem "Ảnh Open Graph"). Nội dung bài được tải riêng cho trang bài đó, không làm nặng trang chủ. Mục "Bài viết" không in ra giấy.

Bài viết về một dự án: thêm `article: '<slug>'` vào dự án đó trong `profile.ts`, thẻ dự án sẽ có link "Đọc bài viết" (ẩn khi in). Đi từ trang chủ sang bài và ngược lại, trình duyệt hỗ trợ View Transitions giữa hai trang (Chrome, Edge, Safari 18.2 trở lên) cho trang mờ chuyển và tiêu đề bài trượt từ danh sách sang trang bài: cả hai nơi mang cùng `view-transition-name` (`articleTransitionName` trong `articles.ts`). Trình duyệt khác chỉ chuyển trang bình thường, và người bật "giảm chuyển động" không có hiệu ứng này.

Bài đăng ở nơi khác (Viblo, LinkedIn, bài nói) vẫn khai báo ở `profile.writing`; chúng mở trong tab mới.

### CV

Hai file `public/cv-en.pdf` và `public/cv-vi.pdf` có bố cục CV riêng (dải tiêu đề tối có ảnh và thông tin liên hệ, các mục đánh số, kinh nghiệm dạng timeline), nhưng nội dung lấy thẳng từ `profile.ts`, nên CV luôn khớp với trang. Sau khi sửa `profile.ts`:

```bash
pnpm cv
```

- Bố cục và kiểu chữ nằm ở [`scripts/cv-template.mjs`](scripts/cv-template.mjs); [`scripts/cv.mjs`](scripts/cv.mjs) in nó ra PDF bằng Chrome.
- CV luôn gọn trong 2 trang: script thử cỡ chữ từ 9.2pt xuống 8pt và dừng ở cỡ lớn nhất vừa 2 trang. Nếu 8pt vẫn tràn, script báo lỗi và không ghi file; khi đó hãy rút gọn phần kinh nghiệm hoặc mô tả dự án.
- CV gồm: tóm tắt (trường `cvSummary` trong `profile.ts`, viết riêng theo giọng CV), kinh nghiệm, các dự án nổi bật (dự án có `cvLine` in thành một hàng ngang, còn lại là thẻ), cách làm việc với AI, kỹ năng, học vấn và ghi nhận, "Đang tìm hiểu". Dải bốn số liệu chỉ có trên trang. Phần "Dự án khác" không in vì kinh nghiệm đã nhắc tới. Chân mỗi trang có tên và số trang.
- Chữ trong file PDF nằm đúng thứ tự đọc (tiêu đề mục, chức danh, rồi từng gạch đầu dòng), để phần mềm lọc hồ sơ và thao tác sao chép đọc được đúng. Vì vậy template không dùng `position` cho phần tử có chữ; giữ nguyên tắc này khi sửa.
- Địa chỉ portfolio chỉ được in khi `siteUrl` (hoặc biến `SITE_URL`) không còn là tên miền giữ chỗ.
- Lệnh ghi PDF vào `public/` (nguồn, bản build sau sẽ dùng) và vào `dist/` nếu đã có bản build. Nút "Tải CV" tự chọn file theo ngôn ngữ đang xem.
- Muốn xem file HTML trung gian: `CV_KEEP_HTML=1 pnpm cv`, rồi mở `.cv/cv-vi.html`.

Nếu muốn dùng CV tự thiết kế, chép đè hai file trong `public/` và đừng chạy `pnpm cv` nữa.

## Thay hình ảnh

### Ảnh đại diện

1. Chuẩn bị ảnh vuông, tối thiểu 512×512, định dạng WebP hoặc AVIF, nên dưới 60 KB.
2. Đặt vào `public/`, ví dụ `public/avatar.webp`.
3. Sửa trong `profile.ts`:

```ts
avatar: { src: '/avatar.webp', width: 512, height: 512 },
```

`width` và `height` phải đúng kích thước thật của file để trang không bị giật layout khi ảnh tải xong.

### Ảnh Open Graph (ảnh xem trước khi chia sẻ link)

`public/og-en.png` và `public/og-vi.png` được **sinh tự động** từ `profile.ts` (tên, vị trí, tagline, nhãn `seo.ogLabel`) mỗi lần chạy `pnpm dev` hoặc `pnpm build`. Bạn không cần sửa tay. Như ở hero và đầu CV, tên gọi (`givenName`) được viết bằng Playfair Display nghiêng với màu chuyển.

Mỗi bài viết có ảnh riêng cho từng ngôn ngữ, `public/og/<slug>-<lang>.png`, mang tiêu đề bài, thời gian đọc và tên tác giả; trang bài dùng ảnh này thay cho ảnh chung. Ảnh được sinh từ `src/content/articles.ts` cùng lúc, cỡ chữ tiêu đề tự chọn theo độ dài. Tiêu đề quá dài (không vừa ba dòng ở cỡ nhỏ nhất) thì script báo lỗi và yêu cầu rút gọn.

- Muốn đổi bố cục hoặc màu: sửa hàm `ogFrame` (nền chung), `ogTree` (trang chủ) hoặc `articleOgTree` (bài viết) trong [`scripts/generate-assets.mjs`](scripts/generate-assets.mjs), chạy `pnpm assets`, rồi mở file PNG để xem. Đổi giao diện ảnh thì tăng `OG_DESIGN` trong [`src/seo/head.ts`](src/seo/head.ts): đường dẫn ảnh đổi theo, nên LinkedIn tải ảnh mới thay vì giữ ảnh cũ.
- Sau khi deploy, Facebook, LinkedIn và Zalo lưu cache ảnh cũ khá lâu. Dùng [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) hoặc [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) để buộc tải lại.

### Favicon

Sửa `public/favicon.svg`. Các file `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` được sinh lại từ SVG này. Giữ nguyên thuộc tính `rx="14"` trên ô nền, vì script dựa vào nó để tạo bản vuông tràn viền cho iOS.

## Màu sắc và giao diện

Bảng màu nằm trong [`src/styles.css`](src/styles.css): token thương hiệu trong khối `@theme`, màu theo từng theme trong `:root[data-theme='dark']` và `:root[data-theme='light']`.

Khi đổi màu, chạy `pnpm test`. File `src/test/contrast.test.ts` đọc trực tiếp các giá trị trong `styles.css` và báo lỗi nếu một cặp chữ/nền không đạt WCAG AA.

### Theme tối và sáng

Trang mở ở giao diện tối với mọi người, bất kể hệ điều hành đang để sáng hay tối. Nút theme chuyển giữa Tối và Sáng, và lựa chọn được lưu vào `localStorage` để lần sau giữ nguyên.

### Lớp "high tech"

Trừ bảng lệnh và bot hướng dẫn (hai thứ dùng được thật), các chi tiết dưới đây chỉ để trang trí: chúng được ẩn khỏi trình đọc màn hình và tắt khi người dùng bật "giảm chuyển động". Không chi tiết nào tải thêm thư viện.

| Chi tiết                                                                         | Nằm ở đâu                                                                                                                          |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Nền lưới, số thứ tự lớn `01` đến `06`                                            | [`Section.tsx`](src/components/sections/Section.tsx), `tech-grid` và `section-numeral` trong CSS                                   |
| Vòng HUD và khung ngắm quanh khối cầu                                            | `Hud` trong [`HeroVisual.tsx`](src/components/hero/HeroVisual.tsx)                                                                 |
| Dòng chữ tự gõ                                                                   | [`Typewriter.tsx`](src/components/ui/Typewriter.tsx)                                                                               |
| Dải chữ chạy                                                                     | [`TechMarquee.tsx`](src/components/sections/TechMarquee.tsx)                                                                       |
| Thẻ code                                                                         | [`CodeCard.tsx`](src/components/sections/CodeCard.tsx)                                                                             |
| Wireframe dự án                                                                  | [`ProjectVisual.tsx`](src/components/sections/ProjectVisual.tsx)                                                                   |
| Vệt sáng theo con trỏ, tia sáng chạy viền                                        | `[data-spotlight]` trong CSS và [`useSpotlight.ts`](src/hooks/useSpotlight.ts)                                                     |
| Chỉ số đo trực tiếp và đồng hồ ở footer                                          | [`Vitals.tsx`](src/components/layout/Vitals.tsx), [`Footer.tsx`](src/components/layout/Footer.tsx)                                 |
| Đường xu hướng ở dải số liệu                                                     | [`Sparkline.tsx`](src/components/ui/Sparkline.tsx), trường `trend` của từng mục trong `stats`                                      |
| Toạ độ, X / Y con trỏ, chế độ WEBGL hoặc CSS quanh khối cầu                      | `Hud` trong [`HeroVisual.tsx`](src/components/hero/HeroVisual.tsx), trường `coordinates`                                           |
| Chữ kicker tự "giải mã"                                                          | [`Decode.tsx`](src/components/ui/Decode.tsx)                                                                                       |
| Thanh trạng thái cố định ở đáy                                                   | [`StatusBar.tsx`](src/components/layout/StatusBar.tsx)                                                                             |
| Bảng lệnh (⌘K, Ctrl K hoặc `/`)                                                  | [`CommandPalette.tsx`](src/components/layout/CommandPalette.tsx), tải lười khi mở lần đầu                                          |
| Tiêu đề nét mảnh, tên riêng bằng chữ serif nghiêng                               | [`Hero.tsx`](src/components/hero/Hero.tsx), [`SectionHeading.tsx`](src/components/ui/SectionHeading.tsx), `accent-serif` trong CSS |
| Nền sao trôi chậm khi cuộn (chỉ ở giao diện tối)                                 | `.starfield` và utility `stars` trong CSS                                                                                          |
| Mục lục dọc `00` đến `06` bên phải (từ 1280px)                                   | [`SectionRail.tsx`](src/components/layout/SectionRail.tsx)                                                                         |
| Header thành viên thuốc kính nổi sau khi cuộn (từ 768px)                         | [`Header.tsx`](src/components/layout/Header.tsx)                                                                                   |
| Mạng lưới đơn hàng quanh khối cầu                                                | [`OrderNetwork.tsx`](src/components/hero/OrderNetwork.tsx); bản tĩnh là `ORBITS` trong `HeroVisual.tsx`                            |
| Huy hiệu "AI-native Developer" ở hero và khối "Phát triển cùng AI, có kiểm soát" | [`AiWorkflow.tsx`](src/components/sections/AiWorkflow.tsx), nội dung ở `ai` trong `profile.ts`                                     |
| Kai, chatbot ở góc dưới phải                                                     | [`Assistant.tsx`](src/components/assistant/Assistant.tsx), bảng chat tải lười, AI qua [`api/chat.js`](api/chat.js)                 |

Muốn bỏ chi tiết nào, xoá component tương ứng khỏi nơi nó được gọi. Không phần nào phụ thuộc phần nào.

Khách không bật "giảm chuyển động" trong hệ điều hành vẫn dừng được mọi thứ tự chuyển động (WCAG 2.2.2): nút "Tạm dừng chuyển động" ở footer, và cùng lệnh đó trong bảng lệnh. Lựa chọn được lưu vào `localStorage` (`portfolio:motion`); script trong `<head>` đặt `data-motion="paused"` lên `<html>` trước khi vẽ, nên tải lại trang không thấy gì chạy rồi mới dừng. Khi đã dừng: CSS giữ yên mọi lớp `animate-*`, mắt và đèn của bot; dòng tự gõ đứng ở cụm đầu; bot không bay; khối cầu 3D không tải mà dùng bản tĩnh. Hoạt ảnh mở bảng (chat, bảng lệnh, menu) vẫn chạy vì chúng chỉ chạy một lần. Logic nằm ở [`src/lib/motion.ts`](src/lib/motion.ts).

### Font

| Font                     | Dùng cho                                               | Độ đậm        |
| ------------------------ | ------------------------------------------------------ | ------------- |
| Inter                    | Chữ thường và giao diện (`--font-sans`)                | 400, 500, 700 |
| Space Grotesk            | Tiêu đề h1 đến h3 và các con số lớn (`--font-display`) | 300, 500, 700 |
| Playfair Display nghiêng | Riêng chữ tên trong tiêu đề hero (`--font-serif`)      | 400           |
| Monospace của hệ thống   | Nhãn kiểu bảng điều khiển (`--font-mono`)              | không tải gì  |

Chỉ có subset latin và vietnamese, tự lưu trong `public/fonts` (bước sinh asset chép từ `@fontsource`). Muốn một phần tử ngoài h1 đến h3 dùng font tiêu đề, thêm class `font-display`.

Cả ba họ font đều phát hành theo giấy phép SIL Open Font License 1.1: được dùng miễn phí, kể cả cho mục đích thương mại, được nhúng và tự lưu trữ trên web; điều không được làm là bán riêng bản thân font. Bước sinh asset chép kèm nguyên văn giấy phép vào `public/fonts/LICENSE-*.txt`, đúng yêu cầu "giấy phép đi cùng font" của OFL.

Đổi font: sửa các khối `@font-face`, hai font dự phòng (`Inter Fallback`, `Space Grotesk Fallback`) và `--font-sans` / `--font-display` trong [`src/styles.css`](src/styles.css), danh sách `PAGE_FONTS` trong [`scripts/generate-assets.mjs`](scripts/generate-assets.mjs) và các dòng preload trong [`src/seo/head.ts`](src/seo/head.ts). Font dự phòng có số đo khớp với font thật để chữ không nhảy khi font tải xong; đổi font thì phải đo lại.

### Kai, chatbot ở góc dưới phải

Kai là một nút thật (có tên, nhận Tab, đóng bằng Esc). Bảng chat có hai cách trả lời:

- **Chip câu hỏi**: trả lời ngay trong trình duyệt bằng câu trong `dictionary.ts` (các khoá `bot.*`) điền giá trị từ `profile.ts`, kèm link tới đúng mục của trang. Luôn hoạt động, không cần AI. Thêm câu hỏi: thêm một dòng vào `TOPICS` trong [`AssistantPanel.tsx`](src/components/assistant/AssistantPanel.tsx) và hai khoá `bot.q.*`, `bot.a.*` cho cả hai ngôn ngữ.
- **Câu hỏi gõ tự do**: do Google Gemini trả lời, đi qua hàm phía server `/api/chat`. Ô nhập chỉ hiện khi hàm này báo đã có khoá API; khi đó dòng ghi chú dưới ô nhập nói rõ câu hỏi được gửi tới Gemini.

Bật AI:

1. Lấy khoá tại https://aistudio.google.com/apikey.
2. Trên Vercel: Project → Settings → Environment Variables, thêm `GEMINI_API_KEY`, rồi deploy lại.
3. Thử ở máy: chép `.env.example` thành `.env.local`, điền khoá, chạy `pnpm build && pnpm preview`. (`pnpm dev` không chạy hàm `/api/chat`, nên ở đó Kai chỉ có chip câu hỏi.)

Không bao giờ đưa khoá vào mã nguồn hay git; `.env*` đã nằm trong `.gitignore`.

Cách hàm hoạt động ([`server/chat.js`](server/chat.js), được [`api/chat.js`](api/chat.js) gọi trên Vercel):

- Khoá chỉ nằm ở server. Trình duyệt chỉ gửi ngôn ngữ và tối đa 10 lượt hội thoại, mỗi lượt tối đa 400 ký tự.
- Kai chỉ được nói về hồ sơ: nội dung cho phép là [`server/knowledge.js`](server/knowledge.js), sinh tự động từ `profile.ts` mỗi lần build. Sửa hồ sơ là Kai biết theo. **Hãy commit file này** vì hàm được deploy kèm nó.
- Chỉ nhận yêu cầu từ chính trang này (kiểm tra header `Origin`), giới hạn 6 câu mỗi phút và 40 câu mỗi ngày cho mỗi địa chỉ IP. Giới hạn này lưu trong bộ nhớ của từng bản chạy nên chỉ ở mức tương đối; trần cứng là hạn mức của khoá.
- Hết hạn mức hoặc Gemini lỗi: Kai báo cho khách và các chip câu hỏi vẫn dùng được.
- Model mặc định là `gemini-flash-lite-latest`; đổi bằng biến `GEMINI_MODEL`.

Lưu ý về gói miễn phí của Gemini: Google ghi rõ nội dung gửi lên được dùng để cải thiện sản phẩm của họ. Vì vậy ghi chú trong bảng chat nhắc khách không nhập thông tin riêng tư.

Ở lượt xem đầu tiên của mỗi phiên trình duyệt, đầu của bot bay ra từ khối cầu, lượn một vòng rồi đáp vào vòng tròn ở góc (vòng tròn đứng yên). Đường bay được sinh từ danh sách điểm trong [`scripts/bot-path.mjs`](scripts/bot-path.mjs): sửa `WAYPOINTS` rồi chạy `node scripts/bot-path.mjs && pnpm format`, đừng sửa tay các keyframe trong CSS. Đường bay chỉ dùng từ 1024px, nơi hero chia hai cột; dưới mức đó khối cầu nằm dưới phần chữ nên đầu bot chỉ bật ra trong vòng tròn ở góc (`bot-pop`). Giữ `WIDE_FLIGHT` trong `Assistant.tsx` khớp với media query trong CSS. Lời chào cạnh bot tự ẩn khi khách cuộn quá 40px hoặc chạm vào chỗ khác. Người bật "giảm chuyển động" hoặc đã tạm dừng chuyển động không thấy đường bay.

Thanh trạng thái chỉ lặp lại thông tin đã có ở chỗ khác (mục đang xem, phần trăm đã cuộn, giờ địa phương) nên được ẩn khỏi trình đọc màn hình và không nằm trong thứ tự Tab. Bảng lệnh thì ngược lại: đó là một hộp thoại thật, dùng được hoàn toàn bằng bàn phím, tìm được cả khi gõ tiếng Việt không dấu.

Bảng "Trang này, đo trực tiếp" ở footer đọc TTFB, FCP, LCP và CLS của chính lượt xem đó bằng Performance API của trình duyệt. Không có dữ liệu nào được gửi đi. Trình duyệt chưa hỗ trợ một chỉ số sẽ hiện "đang đo" ở ô đó.

### In và chế độ tương phản cao

In trang (Ctrl/Cmd + P) cho ra bản in gọn của chính trang web (khác với file CV tải về, xem mục CV): nền trắng, tiêu đề chữ đậm, bỏ header, footer, bot và mọi trang trí, các chip kỹ năng thành chữ thường, link dự án được ghi rõ địa chỉ, phần Liên hệ được bỏ vì dòng đầu trang đã có email và link hồ sơ. Với nội dung hiện tại, mỗi ngôn ngữ in ra 4 trang A4.

Ở chế độ tương phản cao của Windows, nút vẫn có viền, ngôn ngữ và mục menu đang chọn vẫn phân biệt được, các lớp trang trí được ẩn.

## Hiệu ứng 3D

Khối cầu ở hero nằm trong một chunk riêng, chỉ được tải khi tất cả điều kiện sau đúng:

- trình duyệt tạo được WebGL bằng GPU thật;
- máy có hơn 4 nhân CPU và hơn 4 GB RAM (nếu trình duyệt cho biết);
- không bật Save-Data, không bật "giảm chuyển động";
- màn hình rộng từ 768px.

Các trường hợp còn lại, và khi WebGL lỗi hoặc chạy quá chậm, trang hiển thị giọt nước tĩnh bằng CSS với ba quỹ đạo quanh nó. Logic nằm ở [`src/lib/device.ts`](src/lib/device.ts) và [`src/components/hero/HeroVisual.tsx`](src/components/hero/HeroVisual.tsx). Hình dạng và màu khối cầu chỉnh trong [`src/components/hero/shaders.ts`](src/components/hero/shaders.ts).

Hình 3D vẽ lại câu tagline: lõi chất lỏng ở giữa, bao quanh là một lớp vỏ gồm các nút (kênh bán và kho), và những "đơn hàng" chạy theo các cung nối giữa các nút lớn. Số nút, số tuyến và tốc độ chỉnh ở đầu [`src/components/hero/OrderNetwork.tsx`](src/components/hero/OrderNetwork.tsx). Mạng lưới được dựng cố định (không ngẫu nhiên) nên lần nào vào trang cũng giống nhau.

Mười hai nút lớn nói rõ vai trò: sáu **kênh bán** là vòng tròn có tâm sáng, sáu **kho** là hình thoi. Sáu luồng đơn đi từ một kênh bán vào lõi (lõi gợn một vòng sáng ở chỗ đơn chạm vào), khuất bên trong, rồi ló ra phía bên kia và bay tới một kho (kho lóe sáng); năm tuyến còn lại nối thẳng các nút với nhau. Mỗi đơn là một vệt sáng liền nét; đường nối rõ ở phía trước lõi và mờ dần phía sau. Bấm vào khối cầu thì một loạt đơn bay từ lõi tỏa ra mọi nút lớn (bấm liên tục: tối đa ba loạt cùng lúc; vòng sáng trên lõi bão hòa dần chứ không cộng dồn). Kéo chuột ngang để xoay cả cảnh; buông tay thì nó quay chậm dần rồi dừng. Trên màn cảm ứng, vuốt dọc vẫn cuộn trang. Cho tới lần kéo hay bấm đầu, khung HUD có dòng gợi ý "Kéo · Bấm". Các phần của cảnh báo cho nhau qua [`sceneBus.ts`](src/components/hero/sceneBus.ts): mạng lưới báo chỗ đơn vào lõi, lõi gợn sóng từ đó; `DragSpin` trong [`Scene3D.tsx`](src/components/hero/Scene3D.tsx) báo cú bấm. Lưới hình cầu của lõi là icosphere đã gộp đỉnh trùng (khoảng 10 nghìn đỉnh thay vì 65 nghìn), nên shader chạy ít hơn khoảng 6 lần cho cùng một hình.

Từ 1280px trở lên, mạng lưới ấy theo người xem xuống cả trang dưới dạng một bản vẽ nét mảnh nằm sau các mục ([`OrderFlowBackdrop.tsx`](src/components/layout/OrderFlowBackdrop.tsx), các dáng và phép tính ở [`orderFlow.ts`](src/components/layout/orderFlow.ts)): vẫn lõi, sáu kênh bán, sáu kho, nhưng mỗi mục một dáng và một chỗ ở lề (About: mặt cắt lõi; Skills: hai quỹ đạo; Experience: trục thời gian; Projects: bản đồ tuyến; Writing: một quỹ đạo dẹt; Contact: các nút hội tụ về lõi). Giống câu chuyện chiếc bánh ở trang bakery, vị trí cuộn được đổi thành một số dáng liên tục: trong lúc đọc một mục, dáng đứng yên (chỉ lắc nhẹ theo cuộn); qua ranh giới giữa hai mục, các nút đổi chỗ lần lượt và cả hình trượt tới chỗ mới đúng theo tỉ lệ cuộn, cuộn lui thì đi lui. Rời hero, bản vẽ đi xuống từ phía trên, nơi khối cầu vừa khuất. Một vòng `requestAnimationFrame` đuổi theo vị trí cuộn và tự dừng khi đã tới, ghi thẳng style nên không có lần render lại nào. Khi giảm chuyển động hoặc tạm dừng chuyển động, mỗi mục hiện thẳng dáng của nó, không trượt. Độ đậm của bản vẽ là `--flow-alpha` trong `styles.css`.

## Deploy lên Vercel

1. Đưa thư mục này lên một repository Git (GitHub, GitLab hoặc Bitbucket).
2. Trên Vercel chọn **Add New → Project**, import repository. Không cần chỉnh gì: `vercel.json` đã khai báo lệnh build, thư mục `dist`, clean URL, cache và security headers.
3. Bấm **Deploy**.

Hoặc dùng CLI: `pnpm dlx vercel` rồi `pnpm dlx vercel --prod`.

### Domain

Thẻ canonical, Open Graph và sitemap cần URL tuyệt đối. Lúc build, URL được chọn theo thứ tự:

1. biến môi trường `SITE_URL` (ví dụ `https://khoa.dev`);
2. domain production mà Vercel tự cung cấp;
3. giá trị `siteUrl` trong `profile.ts` (hiện là `https://kietnguyen.io.vn`; địa chỉ `kiet-nguyen-dev.vercel.app` của Vercel chuyển hướng về tên miền này).

Trên Vercel bạn thường không cần làm gì. Nếu deploy ở nơi khác, đặt `SITE_URL` trước khi build:

```bash
SITE_URL=https://ten-mien-cua-ban.com pnpm build
```

### Trang 404

Vercel tự phục vụ `dist/404.html` với mã trạng thái 404 cho mọi đường dẫn không tồn tại. Trang hiển thị theo ngôn ngữ ở đầu đường dẫn (`/en/...` là tiếng Anh, `/vi/...` là tiếng Việt); đường dẫn không có ngôn ngữ thì theo ngôn ngữ đã lưu, nếu chưa có thì theo ngôn ngữ trình duyệt.

## Cấu trúc thư mục

```
├─ index.html              template cho bước prerender
├─ vercel.json             cấu hình deploy
├─ api/chat.js             hàm Vercel cho chatbot (/api/chat)
├─ server/                 logic của hàm chat và knowledge.js (sinh từ profile.ts)
├─ .env.example            mẫu biến môi trường (GEMINI_API_KEY)
├─ scripts/                sinh asset, prerender, kiểm tra bundle, QA, Lighthouse, in CV, đường bay của bot, server xem trước
├─ public/                 favicon.svg, avatar.webp, 404-illustration.svg, CV (các file khác được sinh tự động)
└─ src/
   ├─ data/profile.ts      NỘI DUNG: sửa ở đây
   ├─ content/             bài viết: articles.ts (danh sách) và writing/*.md (nội dung)
   ├─ i18n/                từ điển giao diện, logic chọn và chuyển ngôn ngữ
   ├─ theme/               dark/light, script chống nháy màu
   ├─ seo/                 thẻ meta, Open Graph, hreflang, JSON-LD
   ├─ components/          layout, hero (3D), sections, assistant (bot hướng dẫn), ui
   ├─ hooks/               vị trí cuộn, vệt sáng con trỏ, chỉ số đo trực tiếp, đồng hồ, bảng lệnh
   ├─ lib/                 phát hiện máy yếu, tính contrast, công thức Web Vitals, tìm kiếm không dấu, đọc Markdown
   ├─ pages/               Page (trang chính), ArticlePage (trang bài viết), NotFound (404)
   └─ test/                unit test, test a11y, test contrast
```

## Kết quả đã đo

Đo ngày 23/11/2026 trên bản build production, chạy cục bộ (macOS, Apple M4, Chrome, Node 24), nội dung thật trong `profile.ts`. Kết quả sau khi deploy có thể khác theo mạng và máy chủ; chạy lại `pnpm qa` và `pnpm lighthouse` để có số của bạn.

| Hạng mục                                           | Kết quả                                                                                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`, `pnpm lint`, `pnpm format:check` | Đạt, 0 lỗi, 0 warning                                                                                                                                |
| `pnpm test`                                        | 185/185 test đạt                                                                                                                                     |
| `pnpm build`                                       | Đạt, không warning                                                                                                                                   |
| JS tải ban đầu                                     | 141.2 KB gzip (ngân sách 150 KB). Tải lười: chunk 3D 235 KB, bảng chat 3.5 KB, bảng lệnh 3.0 KB, mỗi bài viết 3.4 đến 6.5 KB, bộ đọc Markdown 1.4 KB |
| `pnpm qa`                                          | 87/87 kiểm tra đạt, ở 7 độ rộng từ 320px đến 2560px. Phần AI của chatbot chạy với một máy chủ giả lập Gemini                                         |
| Lighthouse mobile `/en`                            | Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100                                                                                   |
| Lighthouse mobile `/vi`                            | Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100                                                                                   |
| Lighthouse mobile 6 trang bài viết (`/en`, `/vi`)  | Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100                                                                                   |
| In trang (Ctrl/Cmd + P)                            | 4 trang A4 mỗi ngôn ngữ, nền sáng, không còn phần nào bị ẩn                                                                                          |
| `pnpm cv`                                          | 2 trang A4 mỗi ngôn ngữ, cỡ chữ 8pt (Anh) và 8.1pt (Việt)                                                                                            |
| Chế độ tương phản cao (giả lập)                    | Nút có viền, mục đang chọn phân biệt được                                                                                                            |

Chưa kiểm tra: trình duyệt Safari và Firefox, thiết bị di động thật, trình đọc màn hình thật, máy in thật và chế độ tương phản cao trên Windows thật. Phần in và tương phản cao mới chỉ được kiểm tra bằng chế độ giả lập của Chrome.

## Ghi chú phiên bản

- **TypeScript 6.0.3** thay vì 7.x: `typescript-eslint` chưa hỗ trợ TypeScript 7.
- **three 0.182.0** thay vì bản mới nhất: từ 0.183, three in cảnh báo deprecated ra console khi dùng cùng React Three Fiber 9.8.
- Không dùng `@react-three/drei` và `react-router`: site không cần, bỏ đi để bundle nhỏ hơn.
