Phần lớn code tôi viết hiện bắt đầu từ một AI agent. Agent viết nhanh, nhưng nó không biết gì về quy ước của team: module đặt ở đâu, query đặt tên thế nào, thay đổi nào phải chạy những kiểm tra nào. Những gì agent biết về một codebase, nó học từ chính repository. Vì vậy, với tôi, repository đã trở thành prompt quan trọng nhất, và cũng là prompt bền nhất: nó không biến mất khi phiên làm việc kết thúc.

Bài toán khó hơn ở chỗ repository không phục vụ một agent mà bốn: Claude Code, Codex, Gemini CLI và GitHub Copilot, mỗi công cụ tìm hướng dẫn ở một chỗ khác nhau. Viết bốn bản quy tắc thì chỉ sau vài tuần sẽ có bốn phiên bản sự thật. Và điều đáng ngại nhất: khi cấu hình sai, không công cụ nào báo lỗi cả.

Bài này kể lại cách tôi giải bài toán đó trên frontend của Onflow OMS, sau sáu tháng vận hành, kèm cấu trúc thư mục và các đoạn cấu hình để bạn có thể dựng lại cho repository của mình. Các công cụ này thay đổi rất nhanh; mọi hành vi mô tả dưới đây đúng tại thời điểm viết, tháng 11/2026.

> **Cập nhật 23/11/2026.** Copilot giờ đọc thẳng `AGENTS.md`, và ở một số nơi (coding agent, CLI, code review) đọc cả `CLAUDE.md`; con trỏ trong `.github/` vì thế thành lớp dự phòng, còn các file `applyTo:` vẫn có việc riêng. Gemini CLI đã ngừng phục vụ tài khoản cá nhân từ 18/6/2026, khi Google chuyển sang Antigravity CLI; nó vẫn chạy với khóa API trả phí hoặc gói doanh nghiệp.

## Toàn cảnh

Trước khi đi vào từng phần, đây là toàn bộ bộ cấu hình, rút gọn:

```
AGENTS.md                         quy tắc: nguồn duy nhất
CLAUDE.md                         15 dòng, import AGENTS.md
notes/                            trạng thái của việc đang làm dở
.agents/
  skills/<tên>/SKILL.md           quy trình, viết một lần
  commands/                       slash command
.claude/
  skills -> ../.agents/skills     symlink, không phải bản sao
  commands -> ../.agents/commands
  agents/                         3 subagent
  hooks/session-start.sh
  settings.json
.codex/config.toml                giới hạn kích thước AGENTS.md
.gemini/settings.json             trỏ Gemini tới AGENTS.md
.github/
  copilot-instructions.md         trỏ Copilot tới AGENTS.md
  instructions/                   5 quy tắc theo đường dẫn
scripts/check-agent-config.js     linter cho chính bộ cấu hình này
```

## Một nguồn quy tắc, nhiều con trỏ

Mọi quy tắc nằm trong một file duy nhất: `AGENTS.md` ở gốc repository, quy ước mở mà Codex đọc trực tiếp. Ba công cụ còn lại không cần bản sao, chúng chỉ cần một con trỏ:

| Agent       | Cách nạp quy tắc                                                                           |
| ----------- | ------------------------------------------------------------------------------------------ |
| Codex       | Đọc `AGENTS.md` trực tiếp, với giới hạn kích thước được nâng trong `.codex/config.toml`    |
| Claude Code | `CLAUDE.md` import `AGENTS.md` bằng một dòng `@AGENTS.md`                                  |
| Gemini CLI  | `context.fileName` trong `.gemini/settings.json` trỏ tới `AGENTS.md`                       |
| Copilot     | `.github/copilot-instructions.md` dẫn về `AGENTS.md`, cộng năm file quy tắc theo đường dẫn |

Toàn bộ `CLAUDE.md`, phần cốt lõi, chỉ có thế này:

```md
# CLAUDE.md

@AGENTS.md

Every rule lives in AGENTS.md, imported above. A new rule goes there,
never here: this is the one file the other agents cannot see.
```

`CLAUDE.md` được giữ ngắn có chủ ý. Nó được nạp vào mọi phiên làm việc, dù có liên quan hay không, và không phải agent nào cũng đọc nó: Codex và Gemini CLI thì không, Copilot thì tùy nơi. Một quy tắc viết ở đó là một quy tắc chỉ một phần team agent biết.

Năm file quy tắc của Copilot phủ năm mảng hay gặp nhất: data layer, form, test, TypeScript và UI. Mỗi file khai báo `applyTo:` để Copilot chỉ áp quy tắc cho đúng nhóm đường dẫn.

## Quy tắc luôn mang theo, quy trình chỉ mở khi cần

Đến tháng 10/2026, `AGENTS.md` đã phình tới hơn 100 KB. Mọi thứ trong đó đều đúng, nhưng không phải thứ gì cũng cần cho mọi việc. Tôi tách lại theo một nguyên tắc đơn giản: thứ mà hầu hết tác vụ đều cần thì ở lại `AGENTS.md`, còn quy trình chi tiết chuyển thành **skill**, chỉ được mở khi đúng việc. File gốc giảm còn khoảng một nửa.

Hiện repository có bảy skill: tạo trang, thêm module, viết data layer, UI/UX, analytics, các quy tắc nghiệp vụ khó, và quy trình kiểm tra. Một agent đang sửa form không phải đọc hướng dẫn về analytics. Context gọn hơn thì agent tập trung hơn, và mỗi phiên tốn ít token hơn.

Skill được viết **một lần** trong `.agents/skills/`. Codex, Gemini CLI và Copilot đều tự quét thư mục này. Claude Code thì chỉ đọc `.claude/skills/`, nên ở đó là một symlink trỏ về `.agents/skills/`, không phải một bản sao:

```bash
ln -s ../.agents/skills .claude/skills
ln -s ../.agents/commands .claude/commands
```

Sao chép skill cho từng agent chính là cách nhanh nhất để bốn bản trôi xa nhau.

## Ba subagent, ba vai, model theo việc

Claude Code cho phép tách việc cho subagent, mỗi subagent có context riêng, công cụ riêng và model riêng. Tôi dùng ba, và không subagent nào được sửa code:

| Subagent | Việc                                                          | Model      | Công cụ             |
| -------- | ------------------------------------------------------------- | ---------- | ------------------- |
| Explorer | Tìm module sở hữu một domain, nơi đặt query, trang, key dịch  | Haiku      | Chỉ đọc file        |
| Reviewer | Đối chiếu thay đổi với quy tắc của repo trước khi commit      | Theo phiên | Đọc file, chạy lệnh |
| Verifier | Chạy đúng các kiểm tra mà thay đổi cần, chỉ báo phần thất bại | Theo phiên | Đọc file, chạy lệnh |

Mỗi subagent là một file Markdown với phần đầu khai báo. Explorer, rút gọn, trông như thế này:

```md
---
name: explorer
description: Finds which module owns a domain and where its code lives.
  Use before editing an unfamiliar module.
tools: Read, Grep, Glob
model: haiku
---

You locate code and hand back exact paths. You do not edit,
and you do not review.
```

Mỗi vai có một lý do riêng. Việc tìm mã cần đọc nhiều nhưng nghĩ ít, nên explorer chạy trên **Haiku**, model nhỏ và rẻ nhất. Giá trị của reviewer nằm ở context trống: người viết code đã quen mắt với chính diff của mình, còn reviewer nhìn nó lần đầu. Còn verifier giữ những trang log dài của test và lint trong context của riêng nó, chỉ gửi về phiên chính danh sách những gì thất bại.

Chọn model theo việc và giữ log ngoài context chính là hai cách tiết kiệm token hiệu quả nhất mà tôi biết. Cả hai đều nằm trong cấu hình, không phụ thuộc vào việc ai đó nhớ bật lên.

## Trí nhớ nằm trong file

Agent không nhớ phiên trước. Một việc lớn, như chuyển hơn 1.600 file sang TypeScript, luôn kéo dài qua nhiều phiên, đôi khi qua nhiều agent khác nhau. Nên tôi tách hai loại thông tin: **quy tắc** nằm trong `AGENTS.md`, còn **trạng thái của việc đang làm dở** nằm trong thư mục `notes/`, mỗi việc một file.

Quy tắc yêu cầu đọc `notes/` trước khi làm bất cứ điều gì. Nhưng một quy tắc chỉ là điều được mong đợi. Vì thế có thêm một **hook SessionStart**, khai báo trong `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh\""
          }
        ]
      }
    ]
  }
}
```

Script được gọi chỉ làm một việc: in tiêu đề của từng ghi chú đang mở. Mọi thứ hook in ra sẽ được đưa vào context của phiên mới. Phần cốt lõi của nó:

```bash
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
shopt -s nullglob
for note in notes/*.md; do
  printf -- '- %s: %s\n' "$note" "$(grep -m1 '^# ' "$note" | sed 's/^# //')"
done
```

Việc đọc ghi chú chuyển từ "hy vọng agent nhớ" thành điều chắc chắn xảy ra. Hai chi tiết nhỏ nhưng quan trọng. Hook im lặng khi gặp lỗi, vì một hook hay báo lỗi là hook sớm muộn sẽ bị tắt. Và ghi chú không bao giờ được tin hơn `git log` cùng kết quả kiểm tra: phiên viết ra nó có thể đã bị ngắt trước bước cuối.

## Mọi lỗi cấu hình đều im lặng

Đây là phần khiến tôi thay đổi cách nghĩ về cấu hình agent. Không lỗi nào dưới đây sinh ra thông báo:

- `AGENTS.md` vượt giới hạn 32 KB mặc định của Codex (hiện file vẫn khoảng 50 KB). Codex cắt file giữa chừng, và phần bị cắt lại là mục Verification ở cuối, phần dạy agent cách chứng minh thay đổi của mình chạy đúng.
- Symlink của Claude Code hỏng. Claude Code đơn giản là không có skill nào, và không hề nhắc tới.
- Một skill được đổi tên nhưng file cấu hình đi kèm vẫn gọi tên cũ. Lỗi này đã thực sự lên nhánh chính và qua được cả review: chỉ một dòng, trong một file không ai đọc lại.
- Một file quy tắc của Copilot lưu sai đuôi hoặc thiếu `applyTo:`. Copilot bỏ qua nó, không một lời.

Lỗi đầu tiên được chặn ngay bằng một dòng cấu hình cho Codex:

```toml
# .codex/config.toml
project_doc_max_bytes = 131072
```

Phần còn lại cần một công cụ riêng: `lint:agents`, một script Node khoảng 400 dòng, không dùng thư viện ngoài, là thứ duy nhất trong repo thật sự đọc những file cấu hình này. Nó so kích thước `AGENTS.md` với giới hạn đã cấu hình cho Codex, kiểm tra symlink còn trỏ đúng, tên skill khớp tên thư mục, file quy tắc của Copilot đúng tên và có `applyTo:`, mọi tài liệu chỉ gọi những skill đang tồn tại. Script chạy đầu tiên trong bước kiểm tra kiến trúc của CI. Cấu hình sai thì pull request đỏ, thay vì agent lặng lẽ làm sai.

Cấu hình cho agent cũng là code. Nó cần được review và kiểm thử như code.

## Hai repository, một hệ thống

Fulfillment Connect, sản phẩm tôi xây dựng từ một repository trống, dùng chung kiến trúc với OMS. Bộ cấu hình agent cũng vậy: tên skill, tên subagent, lệnh, file settings và chính linter được giữ giống hệt ở cả hai repository. Một thay đổi ở bên này được mang sang bên kia, không rẽ nhánh. Chỗ nào nội dung khác nhau, đó là vì bản thân sản phẩm khác nhau, không phải vì hai bộ quy tắc đã trôi xa.

## Bắt đầu từ đâu

Không cần dựng tất cả trong một ngày. Thứ tự tôi khuyên, mỗi bước chỉ làm khi bước trước đã thấy chật:

1. **Viết một `AGENTS.md` ngắn**: lệnh chạy dự án, cấu trúc thư mục, quy ước đặt tên, và cách kiểm tra một thay đổi. Phần cuối là phần agent cần nhất.
2. **Thêm con trỏ** cho từng công cụ team đang dùng. Con trỏ, không phải bản sao.
3. **Tách quy trình thành skill** khi `AGENTS.md` bắt đầu dài hơn những gì một tác vụ thường cần.
4. **Thêm subagent** cho những việc đọc nhiều nghĩ ít, như tìm mã và chạy kiểm tra, trên model rẻ hơn.
5. **Thêm ghi chú bàn giao và hook** khi đã có việc kéo dài qua nhiều phiên.
6. **Viết linter cho cấu hình** ngay khi có từ hai con trỏ trở lên. Đó là lúc lỗi im lặng bắt đầu có chỗ để trốn.

## Những điều tôi rút ra

- **Repository là prompt bền nhất.** Những gì agent cần biết nên nằm trong repo, được review cùng code, thay vì nằm trong trí nhớ của từng người.
- **Một nguồn, nhiều con trỏ.** Bốn công cụ, một bộ quy tắc. Mọi bản sao đều là một phiên bản sự thật đang chờ lệch đi.
- **Ngắn thứ luôn nạp, sâu thứ mở theo nhu cầu.** Quy tắc cốt lõi ở `AGENTS.md`, quy trình trong skill.
- **Chọn model theo việc.** Tìm kiếm không cần model mạnh nhất; review thì cần.
- **Kiểm thử cả cấu hình.** Thứ gì hỏng mà không báo lỗi thì phải có một bài kiểm tra thay nó lên tiếng.
- **Đừng thêm thứ không ai đọc.** Hai thư mục từng được thêm cho Codex mà Codex không hề đọc đã bị gỡ, và linter chặn chúng quay lại. Công cụ mới, kể cả MCP server, chỉ được thêm khi có một nhu cầu thật.

Một agent mạnh không tự làm nên chất lượng. Môi trường quanh nó mới làm nên: quy tắc rõ ràng, quy trình đúng lúc, kiểm tra không thể bỏ qua, và một người đọc từng diff. Khi repository nói rõ, agent làm đúng. Khi repository im lặng, agent đoán.
