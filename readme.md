# Ném Rìu 3D

Trò chơi ném rìu 3D trên trình duyệt sử dụng **Three.js (r128)**, mô hình `.glb` và **Web Audio API**, tổ chức theo kiến trúc **ES Modules**.

## Tính năng chính

- **Cơ chế ném vật lý**: Tính toán trọng lực, lực cản không khí, độ xoay của rìu và kiểm tra góc lưỡi khi chạm bia (chỉ cắm khi lưỡi rìu hướng vào bia).
- **3 loại rìu**: `🪓 Rìu Viking`, `⚔️ Rìu 2 Lưỡi`, `🪓 Tomahawk` với quỹ đạo và điểm cắm riêng.
- **Hệ thống màn chơi & điểm**: Bia thay đổi theo màn (bia tròn / gốc cây), xoay và di chuyển ngang/dọc ở các màn cao; tính điểm theo vòng, Bullseye và chuỗi combo.
- **Chu kỳ Ngày / Đêm**: Chuyển đổi giữa Tự động, Ngày và Đêm (có sao trời và lửa trại thắp sáng hai bên bia).
- **Camera theo rìu & Tự ném**: Theo dõi đường bay rìu ở chế độ slow-motion hoặc bật chế độ tự ném.
- **Photo Mode**: Di chuyển camera tự do quanh sân đấu và chụp ảnh `.png`.
- **Xem lại (Replay) & Lưu video**: Tua lại cú ném gần nhất, chỉnh tốc độ (`0.5x`, `1x`, `2x`) và xuất video `.webm` (lưu trực tiếp vào thư mục `video/` khi chạy qua `server.js`).

## Cách chạy dự án

Yêu cầu **Node.js** (không cần cài thêm package ngoài).

```bash
node server.js
```

Sau đó mở trình duyệt tại:

```text
http://localhost:8765/Nem_Riu_3D.html
```

> Lưu ý: Cần chạy qua local HTTP server để trình duyệt nạp được ES Modules và các file `.glb` trong `assets/`.

## Điều khiển

| Thao tác / Phím | Chức năng |
| --- | --- |
| **Nhấn giữ + kéo + thả** | Tích lực, chỉnh độ cao/hướng và ném rìu |
| `P` / `Esc` / `Space` | Tạm dừng / Tiếp tục |
| `F` | Bật / Tắt camera theo rìu |
| `G` | Bật / Tắt chế độ tự ném |
| `T` | Chuyển chế độ thời gian (Tự động / Ngày / Đêm) |
| `C` | Bật / Tắt Photo Mode (`Esc` để thoát) |
| `WASD` / Mũi tên, `Q`/`E`, Cuộn chuột | Di chuyển, lên/xuống, zoom trong Photo Mode |

## Cấu trúc thư mục

```text
├── Nem_Riu_3D.html     # Trang chính nạp CSS, Three.js và src/main.js
├── styles.css          # Giao diện HUD, thanh lực, Photo Mode, Replay Bar
├── server.js           # HTTP server tĩnh (cổng 8765) & API POST /save-video
├── assets/             # Các mô hình 3D định dạng .glb (rìu, bia, cây thông, đá)
├── video/              # Thư mục lưu video replay .webm
├── ghi_chu_du_an.md    # Ghi chú lịch sử chỉnh sửa dự án
└── src/
    ├── main.js         # Điểm khởi chạy, nạp GLB và vòng lặp chính
    ├── constants.js    # Hằng số vật lý, điểm số, cấu hình loại rìu
    ├── state.js        # Trạng thái dùng chung giữa các module
    ├── audio.js        # Âm thanh tổng hợp bằng Web Audio API
    ├── scene.js        # Thiết lập Three.js scene, camera, ánh sáng, bầu trời
    ├── assets.js       # Nạp GLB, tô màu đỉnh, tạo rìu, bia và môi trường
    ├── aim.js          # Tính vector ngắm và tọa độ đầu lưỡi rìu
    ├── hud.js          # Cập nhật HUD, overlay thông báo, popup điểm
    ├── replay.js       # Ghi frame, phát lại và xuất video .webm
    ├── photo.js        # Chế độ Photo Mode và chụp ảnh màn hình
    ├── render.js       # Rìu trên tay, vệt bay, chấm ngắm và render khung hình
    ├── physics.js      # Logic ném, va chạm bia, cắm rìu và mảnh gỗ
    ├── game.js         # Quản lý màn chơi, tính thắng/thua và update theo frame
    └── input.js        # Xử lý sự kiện chuột, cảm ứng và bàn phím
```
