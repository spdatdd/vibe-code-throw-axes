# Ghi chú dự án: Ném Rìu 3D

## 2026-11-23 — Fix cánh tay thực tế hơn
Vấn đề cũ: cánh tay là 1 khối hộp cứng (BoxGeometry) kéo thẳng từ vai tới tay,
không có khuỷu tay, luôn thẳng đơ dù tay đang ở tư thế nào -> nhìn giả.

Đã sửa (trong file .html, phần script):
- Thay 1 mesh `arm` (hộp cứng) bằng 4 mesh: `upperArm` (bắp tay, bọc tay áo
  màu xanh), `foreArm` (cẳng tay, màu da), `shoulderJ`/`elbowJ` (khớp vai,
  khớp khuỷu dạng cầu để che mối nối).
- Thêm hàm `placeBone(mesh, a, b)`: đặt 1 mesh hình trụ nằm giữa 2 điểm a-b,
  tự xoay + scale theo chiều dài đoạn đó.
- Thay hàm `linkArm()`: trước đây chỉ kéo thẳng vai->tay. Giờ dùng IK 2 đoạn
  (định luật cos trong tam giác vai-khuỷu-tay) để tính vị trí khuỷu tay thực,
  có hướng gập ưu tiên ra ngoài/xuống dưới (`POLE` vector) giống tư thế ném
  tự nhiên. Độ dài bắp tay/cẳng tay: SH_L=.58, FA_L=.56.
- Giữ nguyên animHand() (hoạt ảnh lên đà + vung tay) — chỉ thay cách vẽ
  khung xương tay, không đổi logic ném/vật lý rìu.

Đã kiểm tra: trích script ra, chạy `node --check` -> cú pháp hợp lệ; không
còn chỗ nào gọi biến `arm` cũ (grep ra 0 kết quả).

Lưu ý nếu cần tinh chỉnh thêm:
- Nếu thấy khuỷu tay gập sai hướng (vào trong thay vì ra ngoài) -> đổi vector
  `POLE` (hiện là hướng ra bên phải/xuống dưới/ra trước).
- Nếu thấy tay "duỗi quá đà" lúc vung mạnh (resolve IK bị kẹp ở maxR) -> tăng
  SH_L/FA_L lên một chút.
