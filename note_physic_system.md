# Thuật ngữ chuyên ngành Game cho hệ thống vật lý

### 1. Mô phỏng & Tích phân (Simulation & Integration)
* **Sub-stepping (Chia nhỏ bước thời gian):** Chia `dt` thành 3 bước `h = dt / 3` để tăng độ ổn định và tránh **Tunneling** (vật thể bay nhanh xuyên qua mặt bia mà không kịp bắt va chạm).
* **Semi-implicit Euler Integration (Tích phân Euler bán ẩn):** Cập nhật vận tốc trước (`v += a * h`) rồi mới cập nhật vị trí (`p += v * h`).
* **Time Dilation / Time Scale (Giãn thời gian / Slow-motion):** Nhân hệ số `0.42` lên `dt` khi `followCam` kích hoạt.

### 2. Động lực học vật rắn (Rigid Body Dynamics)
* **Projectile Motion / Ballistics (Chuyển động đạn đạo):** Quỹ đạo parabol dưới tác dụng của trọng lực (`GRAV`).
* **Linear Drag / Air Resistance (Lực cản tuyến tính):** Giảm dần vận tốc theo tỷ lệ `DRAG / mass`.
* **Mass & Rotational Inertia / Moment of Inertia (Khối lượng & Quán tính xoay):** Quyết định độ lớn vận tốc phóng, tốc độ xoay, lực cản và độ rung khi va chạm.
* **Angular Velocity & Torque (Vận tốc góc & Mô-men xoắn):** Xoay 3 trục (`pitch` / `th`, `yaw` / `yawAng`, `roll`) khi bay và khi bật nảy lệch tâm (**Off-center Impact / Angular Impulse**).
* **Ground Friction / Damping (Ma sát mặt đất & Giảm chấn):** Hãm vận tốc trượt và độ lắc khi rìu nằm xuống đất.

### 3. Phát hiện & Phản hồi va chạm (Collision Detection & Response)
* **Bounding Volume / AABB (Axis-Aligned Bounding Box):** Khối hộp bao bọc 3D cho rìu, giá đỡ bia, đá, cây thông và rìu rơi dưới đất.
* **Compound Collider (Collider tổ hợp):** Ghép 2 AABB riêng biệt (lưỡi rìu + thân/cán) cho cùng một vật thể rìu.
* **Broad-phase vs. Narrow-phase:** Kiểm tra nhanh bằng AABB (broad-phase) và kiểm tra chi tiết góc lưỡi/bán kính vòng bia (narrow-phase).
* **Debug Collider Visualization / Hitbox Overlay:** Lớp phủ màu nguyên khối bán trong suốt hiển thị vùng va chạm.
* **Collision Resolution / Penetration Push-out (Giải quyết va chạm & Đẩy tách lún):** Tính **Minimum Translation Vector (MTV)** theo trục `X`/`Z` để đẩy rìu khỏi vật cản và chống chồng lấn (**Non-penetration / Stacking Prevention**).
* **Restitution / Bounce Impulse (Hệ số nảy & Xung lực bật):** Phản hồi vận tốc ngược lại khi va chạm (`-0.45 * v`).
* **Parenting / Attachment on Impact (Gắn vào hệ tọa độ cha):** Gắn rìu cắm vào `TR` để xoay đồng bộ theo bia.
* **Object Pooling / Capping (Giới hạn số lượng đối tượng):** Giới hạn tối đa 5 rìu cắm và 5 rìu rơi để tiết kiệm tài nguyên.
