# Thích Cầm Rìu (Ném Rìu 3D)

Trò chơi ném rìu 3D offline sử dụng **Three.js (r128)**, mô hình `.glb` (nén Meshopt), **Web Audio API** và **Capacitor** để đóng gói APK Android, tổ chức theo kiến trúc **ES Modules**.

## Tính năng chính

- **Cơ chế ném vật lý**: Tính toán trọng lực, lực cản không khí, độ xoay của rìu và kiểm tra góc lưỡi khi chạm bia (chỉ cắm khi lưỡi rìu hướng vào bia).
- **3 loại rìu**: `🪓 Rìu Viking`, `⚔️ Rìu 2 Lưỡi`, `🪓 Tomahawk` với quỹ đạo và điểm cắm riêng.
- **Hệ thống màn chơi & điểm**: Bia thay đổi theo màn (bia tròn / gốc cây), xoay và di chuyển ngang/dọc ở các màn cao; tính điểm theo vòng, Bullseye và chuỗi combo.
- **Chu kỳ Ngày / Đêm & Thời tiết**: Chuyển đổi giữa Tự động, Ngày và Đêm (sao trời, lửa trại) cùng hiệu ứng thời tiết (nắng, mưa, tuyết).
- **Camera theo rìu & Tự ném**: Theo dõi đường bay rìu ở chế độ slow-motion hoặc bật chế độ tự ném.
- **Photo Mode**: Di chuyển camera tự do quanh sân đấu (hỗ trợ cả joystick cảm ứng trên mobile).
- **Xem lại (Replay) & Lưu video**: Tua lại cú ném gần nhất, chỉnh tốc độ (`0.5x`, `1x`, `2x`) và xuất video `.webm` (lưu vào thư mục `video/` khi chạy qua `server.js`).

## Cách chạy trên trình duyệt

Yêu cầu **Node.js**:

```bash
npm start
```

Sau đó mở trình duyệt tại:

```text
http://localhost:8765/index.html
```

> Lưu ý: Cần chạy qua local HTTP server để trình duyệt nạp được ES Modules và các file `.glb` trong `assets/`.

## Build APK (Android / Capacitor)

- **Cách nhanh trên Google Colab**: Mở [Build_APK_ThichCamRiu.ipynb](Build_APK_ThichCamRiu.ipynb) và chạy lần lượt các cell để tự động cài Java, Node.js, Android SDK, sinh launcher icon từ `assets/icon-arcade-3d.png` và build `ThichCamRiu-debug.apk`.
- **Build cục bộ** (khi đã có Android SDK):

```bash
npm install
npm run build:web
npx cap add android   # hoặc: npm run cap:sync
python3 scripts/generate-android-icons.py
cd android && ./gradlew assembleDebug
```

## Điều khiển

| Thao tác / Phím | Chức năng |
| --- | --- |
| **Nhấn giữ + kéo + thả** | Tích lực, chỉnh độ cao/hướng và ném rìu |
| `P` / `Esc` / `Space` | Tạm dừng / Tiếp tục |
| `F` | Bật / Tắt camera theo rìu |
| `G` | Bật / Tắt chế độ tự ném (Dev mode) |
| `H` | Bật / Tắt hiển thị Hitbox (Dev mode) |
| `V` | Chuyển chế độ thời tiết |
| `T` | Chuyển chế độ thời gian (Tự động / Ngày / Đêm) |
| `C` | Bật / Tắt Photo Mode (`Esc` để thoát) |
| `WASD` / Mũi tên, `Q`/`E`, Cuộn chuột | Di chuyển, lên/xuống, zoom trong Photo Mode |

## Cấu trúc thư mục

```text
├── index.html                    # Trang chính nạp CSS, Three.js và src/main.js
├── Nem_Riu_3D.html               # Trang chuyển hướng về index.html
├── styles.css                    # Giao diện HUD, thanh lực, Photo Mode, Replay Bar
├── manifest.webmanifest          # Cấu hình PWA / icon 512x512
├── package.json                  # Scripts build & dependencies Capacitor
├── capacitor.config.json           # Cấu hình appId, appName và webDir (www)
├── Build_APK_ThichCamRiu.ipynb   # Notebook Google Colab tự động build APK
├── server.js                     # HTTP server tĩnh (cổng 8765) & API POST /save-video
├── ghi_chu_du_an.md              # Ghi chú lịch sử chỉnh sửa dự án
├── scripts/
│   ├── prepare-web.mjs           # Đóng gói bản web sạch vào thư mục www/
│   └── generate-android-icons.py # Sinh bộ Android launcher icon từ assets/icon-arcade-3d.png
├── vendor/                       # Thư viện cục bộ (three.min.js, GLTFLoader.js)
├── assets/                       # Icon và các mô hình 3D .glb (rìu, bia, cây thông, đá, cỏ)
└── src/
    ├── main.js                   # Khởi chạy, nạp GLB, vòng lặp chính & vòng đời app
    ├── constants.js              # Hằng số vật lý, điểm số, cấu hình loại rìu
    ├── state.js                  # Trạng thái dùng chung giữa các module
    ├── i18n.js                   # Đa ngôn ngữ (Tiếng Việt / English)
    ├── audio.js                  # Âm thanh tổng hợp bằng Web Audio API
    ├── scene.js                  # Thiết lập Three.js scene, camera, ánh sáng, bầu trời
    ├── shaders.js                # Shader toon, lửa trại, gió cây/cỏ
    ├── textures.js               # Texture tạo bằng Canvas (cỏ, gỗ, đá, bia)
    ├── weather.js                # Hiệu ứng thời tiết (mưa, tuyết, sấm sét)
    ├── meshopt_decoder.module.js # Bộ giải mã Meshopt cho file .glb
    ├── assets.js                 # Nạp GLB, tô màu đỉnh, tạo rìu, bia và môi trường
    ├── aim.js                    # Tính vector ngắm và tọa độ đầu lưỡi rìu
    ├── hud.js                    # Cập nhật HUD, overlay thông báo, popup điểm
    ├── replay.js                 # Ghi frame, phát lại và xuất video .webm
    ├── photo.js                  # Chế độ Photo Mode
    ├── render.js                 # Rìu trên tay, vệt bay, chấm ngắm và render khung hình
    ├── physics.js                # Logic ném, va chạm bia, cắm rìu và mảnh gỗ
    ├── game.js                   # Quản lý màn chơi, tính thắng/thua và update theo frame
    └── input.js                  # Xử lý sự kiện chuột, cảm ứng và bàn phím
```
