Tháng 9/2026, tôi chuyển toàn bộ frontend của một hệ thống quản lý đơn hàng (OMS) đang chạy production từ JavaScript sang TypeScript. Từ lúc thêm `tsconfig.json` đến lúc tắt `allowJs` là 10 ngày. Hôm nay codebase có hơn 2.100 file TypeScript, không còn file JavaScript nào, bật `strict`, và cả repo chỉ còn 3 dòng `@ts-expect-error`.

Con số 10 ngày nghe có vẻ liều. Thật ra phần chuyển đổi là phần dễ. Phần quyết định nằm ở mười tháng dọn dẹp trước đó và ở cách chia việc trong mười ngày ấy. Bài này kể lại cả hai.

## Vì sao không chuyển ngay từ đầu

Khi tôi nhận repo, nó có khoảng 1.400 file JavaScript, build bằng Create React App, state nằm trong Redux, và các thư mục được chia theo loại file (components, pages, actions) chứ không theo nghiệp vụ. Thêm TypeScript vào một codebase như vậy thì được type cho từng file, nhưng type không nói được điều gì về ranh giới giữa các phần, vì ranh giới chưa tồn tại.

Nên tôi làm theo thứ tự ngược lại: dựng cấu trúc trước, thêm type sau.

1. **Chuyển build từ Create React App sang Vite** (tháng 11/2025). Build và deploy nhanh hơn hẳn, và quan trọng hơn là vòng phản hồi ngắn lại cho mọi việc phía sau.
2. **Tổ chức lại theo module nghiệp vụ** (tháng 11/2025 đến đầu 2026). Bảy module: auth, account, product, inbound, outbound, report, service. Mỗi module có pages, components, queries và routes riêng, và chỉ lộ ra ngoài qua một cửa.
3. **Đưa server state từ Redux sang TanStack Query** (tháng 4/2026). Mỗi domain dữ liệu có một hàm gọi API, một query, một bộ key. Đây chính là nơi sau này type mang lại nhiều giá trị nhất.
4. **Để lint giữ kiến trúc thay cho trí nhớ.** Tám script kiểm tra trong CI: module không được import ruột của module khác, không có vòng import, query key hai phía phải khớp. Ngày 1/9 tôi gỡ 18 vòng import cuối cùng.

Sau bốn bước này, mỗi module là một khối có biên rõ ràng. Chuyển sang TypeScript lúc đó trở thành việc lặp lại một công thức trên từng khối.

## Mười ngày

Ngày 10/9/2026, repo có 1.687 file JavaScript và chưa có file TypeScript nào.

**Ngày đầu: chỉ làm hạ tầng.** Thêm `tsconfig.json` thay cho `jsconfig.json`, nối ESLint, Vite, Vitest và tám script kiến trúc với đuôi `.ts`/`.tsx`, thêm bước type-check vào CI, và ghi quy tắc chuyển đổi vào tài liệu hướng dẫn của repo. Rồi tôi chuyển đúng một file sang `.tsx`, một file "chim hoàng yến", để chứng minh cả chuỗi công cụ chạy thông từ editor tới CI. Chưa có file nghiệp vụ nào được đụng tới.

**Ngày thứ hai: một module thử nghiệm.** Tôi chọn một module nhỏ (service, khoảng 60 file) và chuyển trọn vẹn nó: routes, queries, components, pages. Mục đích không phải là xong một module, mà là kiểm chứng công thức: thứ tự chuyển trong một module, cách đặt type cho response, những lỗi nào lặp lại. Khi công thức đứng vững, cũng trong ngày đó tôi áp dụng nó cho auth, report và các component dùng chung.

**Những ngày tiếp theo: lặp lại theo lô nhỏ.** Mỗi commit là một thư mục: một trang, một nhóm component, một lớp queries. Lô nhỏ thì dễ review, và khi một lô làm vỡ type ở chỗ khác thì biết ngay nó là lô nào. Có hai lần tôi phải dừng để dọn lỗi type mà các lô trước để lại; với lô lớn, hai lần đó sẽ là hai ngày mò mẫm.

**Ngày cuối (20/9): đóng cửa.** Khi file `.js` cuối cùng biến mất, tôi tắt `allowJs`. Từ đó không ai, kể cả tôi, thêm lại được file JavaScript vào repo.

## Làm việc này với AI agent

Phần lớn các lô chuyển đổi do AI agent viết nháp, tôi review từng diff. Ba thứ khiến cách làm này chạy được:

- **Công thức nằm trong repo, không nằm trong prompt.** Quy tắc chuyển đổi được viết vào `AGENTS.md`, nên phiên làm việc nào của agent cũng bắt đầu từ cùng một chuẩn.
- **Ghi chú bàn giao giữa các phiên.** Một thư mục `notes/` ghi lại lô nào xong, lô nào dở, điều gì đã quyết. Agent không nhớ được phiên trước; file thì nhớ.
- **CI là trọng tài.** Type-check, lint kiến trúc và bộ test chạy trên mỗi pull request. Agent viết sai thì CI chặn, không cần tôi phát hiện bằng mắt.

Không có ba thứ này, tốc độ của agent chỉ tạo ra lỗi nhanh hơn.

## Type tìm ra lỗi thật

Hết mười ngày, mọi file đã là TypeScript nhưng nhiều response từ API vẫn còn lỏng. Hai ngày tiếp theo tôi đặt type cho lớp dữ liệu theo từng domain, dựa trên payload thật của API chứ không đoán. Đây là lúc TypeScript trả công:

- ba lỗi cache và hai lỗi crash ở các luồng nhập hàng và hoàn trả;
- hai thông báo "thành công" hiện ra cả khi request thất bại;
- 88 query hiện thông báo lỗi hai lần;
- nhiều query nuốt mất lỗi của chính nó, nên màn hình trống mà không báo gì.

Không lỗi nào trong số này là lỗi "sai kiểu dữ liệu" theo nghĩa hẹp. Chúng lộ ra vì việc đặt type buộc tôi đọc lại từng luồng dữ liệu và trả lời câu hỏi: chỗ này nhận gì, trả gì, khi lỗi thì sao.

## Nếu làm lại

- **Dựng biên trước khi thêm type.** Nếu chỉ được giữ một bài học, tôi giữ bài này.
- **Một ngày cho hạ tầng và một file thử.** Rẻ hơn nhiều so với phát hiện giữa chừng rằng CI chưa hề chạy type-check.
- **Thử nghiệm trên một module nhỏ**, và viết công thức ra giấy trước khi nhân rộng.
- **Lô nhỏ, một thư mục một commit.**
- **Tắt `allowJs` ngay khi có thể.** Một cuộc chuyển đổi không có điểm kết thúc sẽ kéo dài mãi.
- **Đặt type cho dữ liệu từ payload thật.** Type đoán sai còn tệ hơn không có type, vì nó trông đáng tin.

Kết quả sau cùng không chỉ là đuôi file đổi từ `.js` sang `.ts`. Chu kỳ release ngắn đi một nửa, hotfix trên production gần như không còn, và người mới, hay agent mới, mở repo ra là biết mỗi thứ nằm ở đâu.
