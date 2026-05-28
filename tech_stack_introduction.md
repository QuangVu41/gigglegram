# GIỚI THIỆU CÔNG NGHỆ VÀ CƠ SỞ HẠ TẦNG HỆ THỐNG

Dưới đây là phần giới thiệu chi tiết về các công nghệ cốt lõi cấu thành nên hạ tầng và phần mềm của mạng xã hội **Gigglegram**, được phân nhóm một cách khoa học theo các tầng kiến trúc của hệ thống.

---

## I. NHÓM 1: CÔNG NGHỆ ẢO HÓA VÀ ĐIỀU PHỐI HẠ TẦNG (VIRTUALIZATION & ORCHESTRATION)

### 1.1. Docker (Containerization)

- **Định nghĩa và Bản chất:** Docker là một nền tảng mã nguồn mở cho phép tự động hóa quy trình triển khai, đóng gói và chạy các ứng dụng dưới dạng các container ảo hóa ở cấp độ hệ điều hành (Operating System-level Virtualization). Khác với các máy ảo truyền thống (Virtual Machines - VMs) cần mang theo một hệ điều hành khách (Guest OS) riêng biệt, các container Docker chia sẻ chung nhân hệ điều hành (Kernel) của máy host và chỉ cô lập các tài nguyên ứng dụng. Cơ chế này giúp các container Docker cực kỳ gọn nhẹ, có tốc độ khởi động tính bằng mili-giây và tiêu tốn rất ít tài nguyên phần cứng.
- **Vai trò trong hệ thống Gigglegram:**
  - **Nhất quán môi trường:** Đảm bảo mã nguồn của dự án hoạt động đồng nhất từ máy tính cá nhân của lập trình viên (Local Development), môi trường kiểm thử (Staging) cho đến môi trường vận hành thực tế trên đám mây (Production), loại bỏ hoàn toàn lỗi phát sinh do sự khác biệt giữa các hệ điều hành.
  - **Đóng gói dịch vụ (Containerization):** Do Gigglegram được thiết kế theo kiến trúc Microservices, mỗi dịch vụ backend chạy độc lập (như Auth Service, Posts Service, Feed Service, Real-time Service) được đóng gói thành các Docker Image riêng biệt thông qua kỹ thuật xây dựng nhiều giai đoạn (Multi-stage Build), giúp giảm tối đa dung lượng ảnh lưu trữ và tăng tốc độ tải ảnh khi triển khai.

### 1.2. Kubernetes (K8s) & GKE (Container Orchestration)

- **Định nghĩa và Bản chất:** Kubernetes (thường gọi tắt là K8s) là một nền tảng mã nguồn mở được thiết kế để điều phối, quản trị và tự động hóa quy trình triển khai, co giãn (scaling) cũng như quản lý vòng đời của các container ứng dụng (Container Orchestration). Kubernetes nhóm các container cấu thành một ứng dụng vào các đơn vị logic gọi là Pods để dễ dàng định danh, cấp phát tài nguyên và quản lý mạng nội bộ.
- **Vai trò trong hệ thống Gigglegram:**
  - **Quản trị hạ tầng đám mây:** Hệ thống Gigglegram sử dụng Kubernetes được quản lý trên Google Kubernetes Engine (GKE) làm hạ tầng vận hành cốt lõi, tự động phân bổ và chạy hàng chục Pods phân tán trên các nút máy chủ vật lý.
  - **Cân bằng tải và Khám phá dịch vụ (Load Balancing & Service Discovery):** K8s tự động phân phối lượng truy cập từ người dùng đến các Pods thông qua các dịch vụ nội bộ (K8s Services), đảm bảo hệ thống không bị quá tải tại một điểm duy nhất.
  - **Tự động co giãn (Auto-scaling):** Khi có lượng truy cập đột biến (ví dụ: giờ cao điểm người dùng xem Reels hoặc đăng bài), cơ chế Horizontal Pod Autoscaler (HPA) của K8s tự động nhân bản thêm số lượng Pods backend để đáp ứng nhu cầu tải và tự động thu nhỏ lại khi lưu lượng giảm để tiết kiệm chi phí phần cứng.
  - **Cơ chế tự phục hồi (Self-healing):** K8s giám sát liên tục trạng thái sức khỏe của các dịch vụ. Nếu một Pod backend bị treo hoặc sập do lỗi bộ nhớ (OOM), K8s sẽ tự động hủy Pod đó và khởi tạo lại Pod mới thay thế ngay lập tức mà không làm gián đoạn trải nghiệm người dùng.

### 1.3. CI/CD Pipeline với GitHub Actions

- **Định nghĩa và Bản chất:** GitHub Actions là nền tảng tự động hóa quy trình CI/CD (Tích hợp liên tục và Triển khai liên tục) được tích hợp trực tiếp vào hệ sinh thái quản lý mã nguồn GitHub. Nó cho phép lập trình viên định nghĩa các quy trình tự động (workflows) dưới dạng tệp YAML để tự động hóa việc biên dịch, kiểm thử và phân phối ứng dụng ngay khi có sự kiện đẩy mã nguồn lên kho lưu trữ (git push, pull request).
- **Vai trò trong hệ thống Gigglegram:**
  - **Tự động hóa xây dựng Docker Images:** Khi mã nguồn được merge vào nhánh chính, GitHub Actions tự động kích hoạt tiến trình build Docker Image cho từng microservice backend và đóng gói ứng dụng web frontend, sau đó đẩy lên Google Artifact Registry (GAR) của dự án một cách an toàn.
  - **Bảo mật và Triển khai tự động:** Tận dụng giao thức Workload Identity Federation của Google Cloud để liên kết bảo mật không cần mật khẩu giữa GitHub và GCP, sau đó gọi Helm và kubectl để tự động nâng cấp các Deployments tương ứng chạy trên cụm Google Kubernetes Engine (GKE).

---

## II. NHÓM 2: CƠ SỞ DỮ LIỆU VÀ QUẢN LÝ DỮ LIỆU (DATABASE & DATA PERSISTENCE)

### 2.1. PostgreSQL (Cơ sở dữ liệu quan hệ)

- **Định nghĩa và Bản chất:** PostgreSQL là một hệ quản trị cơ sở dữ liệu quan hệ - đối tượng mã nguồn mở (Object-Relational Database Management System - ORDBMS) có tính ổn định, độ tin cậy và khả năng chịu tải cực kỳ cao. PostgreSQL tuân thủ chặt chẽ tiêu chuẩn ngôn ngữ SQL chuẩn và hỗ trợ toàn diện các thuộc tính giao dịch ACID (Atomicity, Consistency, Isolation, Durability) nhằm bảo vệ tính toàn vẹn của dữ liệu tuyệt đối.
- **Vai trò trong hệ thống Gigglegram:**
  - **Lưu trữ dữ liệu có cấu trúc cốt lõi:** PostgreSQL được chọn làm cơ sở dữ liệu trung tâm để quản lý các thực thể quan trọng của mạng xã hội như: tài khoản người dùng, thông tin bảo mật và phân quyền (kết hợp thư viện Better-Auth), danh sách bài viết, mối quan hệ theo dõi (Followers - Following), lượt thích (Likes), bình luận (Comments) và cấu hình hệ thống.
  - **Hỗ trợ dữ liệu bán cấu trúc:** Tận dụng kiểu dữ liệu `JSONB` của PostgreSQL để lưu trữ linh hoạt siêu dữ liệu (metadata) của các tệp đa phương tiện như tọa độ GPS, mã lọc hình ảnh, thông số kỹ thuật của video mà vẫn đảm bảo hiệu năng truy vấn nhanh nhờ cơ chế đánh chỉ mục chuyên dụng GIN (Generalized Inverted Index).

### 2.2. Drizzle ORM (Ánh xạ quan hệ đối tượng cho TypeScript)

- **Định nghĩa và Bản chất:** Drizzle ORM là một thư viện ánh xạ quan hệ đối tượng (Object-Relational Mapping - ORM) thế hệ mới được thiết kế đặc trị cho TypeScript và JavaScript. Khác biệt với các ORM thế hệ cũ như Hibernate, TypeORM hay Prisma thường đi kèm các lớp trừu tượng phức tạp và làm giảm hiệu năng truy vấn, Drizzle hoạt động theo triết lý "SQL-like" (gần gũi tối đa với SQL thuần). Drizzle không yêu cầu biên dịch schema ra một ngôn ngữ trung gian khác, giúp loại bỏ hoàn toàn các chi phí hiệu năng chạy ẩn (zero-overhead) và tận dụng tối đa sức mạnh kiểm tra kiểu tĩnh (compile-time type safety) của TypeScript.
- **Vai trò trong hệ thống Gigglegram:**
  - **Đảm bảo an toàn kiểu dữ liệu (Strict Type Safety):** Tích hợp sâu vào mã nguồn backend NestJS của Gigglegram. Mọi schema định nghĩa bằng code TypeScript tự động định hình nên các kiểu dữ liệu đầu vào (Insert) và đầu ra (Select), giúp phát hiện 100% lỗi sai kiểu dữ liệu ngay từ lúc viết mã (Compile-time) thay vì đợi đến lúc chạy thử (Runtime).
  - **Quản lý vòng đời cơ sở dữ liệu (Migrations):** Sinh tự động các mã script SQL Migration từ các thay đổi trong schema TypeScript, hỗ trợ đồng bộ hóa cấu trúc cơ sở dữ liệu PostgreSQL một cách chính xác, minh bạch và dễ dàng theo dõi lịch sử qua Git.

### 2.3. Redis (In-Memory Database & Caching)

- **Định nghĩa và Bản chất:** Redis (Remote Dictionary Server) là một kho lưu trữ cấu trúc dữ liệu khóa - giá trị trong bộ nhớ (In-Memory Key-Value Database) mã nguồn mở siêu nhanh. Vì toàn bộ dữ liệu của Redis được lưu trữ và truy xuất trực tiếp trên bộ nhớ truy cập ngẫu nhiên (RAM) thay vì ổ đĩa vật lý (HDD/SSD), Redis mang lại độ trễ cực thấp ở mức dưới một mili-giây (sub-millisecond latency) cho cả hai thao tác đọc và ghi dữ liệu.
- **Vai trò trong hệ thống Gigglegram:**
  - **Bộ đệm bảng tin (Feed Caching):** Để người dùng không phải chờ đợi lâu khi tải trang chủ, hệ thống lưu sẵn danh sách bài viết của bảng tin (Home Feed) vào Redis dưới dạng danh sách liên kết đã được sắp xếp (Sorted Set). Khi người dùng mở ứng dụng, hệ thống chỉ mất vài mili-giây để lấy dữ liệu từ Redis thay vì phải chạy câu lệnh JOIN PostgreSQL vô cùng nặng nề.
  - **Quản lý phiên đăng nhập (Session Store):** Lưu trữ mã xác thực phiên làm việc (Session Token) của Better-Auth. Mỗi yêu cầu HTTP gửi đến API Gateway đều qua Redis kiểm tra quyền truy cập tức thì, giảm tải tối đa cho cơ sở dữ liệu chính.
  - **Bộ đếm thời gian thực (Real-time Counters):** Quản lý bộ đếm số lượt xem (Views), lượt thích (Likes) và thông báo chưa đọc. Dữ liệu đếm được cập nhật liên tục trên Redis trước khi ghi nhận định kỳ (sync) xuống PostgreSQL để giảm tải tần suất ghi đĩa.

---

## III. NHÓM 3: GIAO TIẾP VÀ TRUYỀN THÔNG ĐA DỊCH VỤ (COMMUNICATION & INTEGRATION)

### 3.1. Giao thức gRPC và Protocol Buffers

- **Định nghĩa và Bản chất:** **gRPC** là một framework thực thi thủ tục từ xa (Remote Procedure Call) mã nguồn mở, hiệu năng cao do Google phát triển, hoạt động trên nền tảng giao thức HTTP/2. gRPC sử dụng **Protocol Buffers** (Protobuf) làm Ngôn ngữ định nghĩa giao diện (Interface Definition Language - IDL) và định dạng tuần tự hóa dữ liệu nhị phân siêu nén, thay thế hoàn toàn cho các cuộc gọi REST API truyền thống sử dụng dữ liệu định dạng JSON cồng kềnh.
- **Vai trò trong hệ thống Gigglegram:**
  - **Giao tiếp đồng bộ hiệu năng cao (Synchronous Call):** Được áp dụng cho các tương tác đòi hỏi kết quả phản hồi tức thời giữa các microservices nội bộ. API Gateway gọi các microservice (Auth, Settings, Users) thông qua các thủ tục gRPC giúp tối ưu hóa băng thông mạng nội bộ, tận dụng khả năng multiplexing của HTTP/2 và giảm độ trễ giao tiếp xuống mức tối thiểu.
  - **Ràng buộc giao tiếp chặt chẽ:** Tệp Protobuf đóng vai trò là "bản hợp đồng" giao tiếp bất biến giữa các dịch vụ, đảm bảo tính nhất quán về mặt dữ liệu và phát hiện xung đột kiểu dữ liệu ngay trong quá trình build dự án.

### 3.2. Kiến trúc hướng sự kiện (Event-driven Architecture) với Kafka

- **Định nghĩa và Bản chất:** **Apache Kafka** là một nền tảng truyền phát sự kiện phân tán (Distributed Event Streaming) mã nguồn mở, hoạt động theo cơ chế Xuất bản - Đăng ký (Publish-Subscribe) dựa trên một nhật ký ghi sự kiện bất biến và phân tán (immutable distributed log). Kafka được thiết kế để xử lý hàng triệu sự kiện mỗi giây với khả năng chịu lỗi cực cao thông qua cơ chế nhân bản (replication) phân tán.
- **Vai trò trong hệ thống Gigglegram:**
  - **Giao tiếp bất đồng bộ (Asynchronous Call):** Giải quyết bài toán tách rời liên kết (decoupling) giữa các microservices. Khi một người dùng tạo bài đăng mới, Posts Service chỉ cần đẩy sự kiện `post-created` lên Kafka Topic và phản hồi ngay lập tức cho người dùng.
  - **Xử lý song song:** Các dịch vụ liên quan khác như Feed Service (để cập nhật bảng tin cho hàng nghìn người theo dõi) và Notification Service (gửi thông báo real-time) sẽ đồng thời tiêu thụ (consume) sự kiện từ Kafka để xử lý ngầm (background processes) mà không làm nghẽn luồng xử lý chính của người dùng.

---

## IV. NHÓM 4: CÔNG NGHỆ FRONTEND VÀ TRẢI NGHIỆM NGƯỜI DÙNG (FRONTEND & UX)

### 4.1. Next.js và React Server Components (RSC)

- **Định nghĩa và Bản chất:** **Next.js** (sử dụng kiến trúc App Router) là một React framework mã nguồn mở phổ biến dùng để phát triển các ứng dụng web tối ưu hóa cao cho Production. Tính năng cốt lõi của framework này là hỗ trợ **React Server Components (RSC)** - cho phép kết xuất (render) các component UI trực tiếp trên phía máy chủ và chỉ truyền tải dữ liệu HTML tối giản về phía client mà không kèm theo các tệp mã nguồn JavaScript không cần thiết (zero bundle size impact).
- **Vai trò trong hệ thống Gigglegram:**
  - **Tối ưu hóa tải trang đầu tiên (FCP) & SEO:** Các trang hiển thị thông tin như trang chi tiết bài viết, trang cá nhân (Profile) được kết xuất sẵn thông qua RSC trên server, lấy dữ liệu trực tiếp từ các dịch vụ dữ liệu nhằm hiển thị lập tức cho người dùng và các bot tìm kiếm (Google, Bing), loại bỏ hiện tượng nhấp nháy màn hình trắng (hydration delay).
  - **Tối ưu hóa dung lượng Bundle Client:** Hệ thống tách biệt rõ ràng giữa thành phần tĩnh (xử lý trên server bằng RSC) và các thành phần tương tác động như thanh nhập bình luận, nút tim, hay bộ biên tập ảnh (chạy trên client qua Client Components `"use client"`), giúp ứng dụng di động tải cực nhanh kể cả dưới điều kiện mạng di động 3G/4G.

### 4.2. Shadcn UI

- **Định nghĩa và Bản chất:** **Shadcn UI** không phải là một thư viện UI Component truyền thống được đóng gói sẵn để cài đặt qua npm (như Ant Design hay Material UI). Thay vào đó, đây là một bộ thiết kế và mã nguồn mở được xây dựng trên nền tảng **Radix UI** (đảm bảo khả năng tiếp cận và phím tắt chuẩn của WAI-ARIA) kết hợp với **Tailwind CSS** dùng để tạo kiểu dáng. Lập trình viên trực tiếp sao chép mã nguồn các thành phần UI (Button, Dialog, Sheet, Select...) vào dự án, mang lại quyền kiểm soát 100% đối với mã nguồn hiển thị.
- **Vai trò trong hệ thống Gigglegram:**
  - **Nhất quán và cao cấp về giao diện:** Giúp Gigglegram sở hữu giao diện người dùng tối giản, hiện đại và chuẩn xác theo phong cách của các ứng dụng mạng xã hội hàng đầu.
  - **Tính tùy biến cao:** Toàn bộ thành phần UI của Gigglegram được đồng bộ qua hệ thống màu OKLCH trong `globals.css`, giúp dễ dàng phát triển chế độ giao diện tối (Dark mode) và tối ưu hóa hiển thị linh hoạt trên màn hình điện thoại di động (mobile-first UI).

### 4.3. TanStack Query (React Query)

- **Định nghĩa và Bản chất:** **TanStack Query** là thư viện quản lý trạng thái máy chủ (Server-state Management) hàng đầu cho các ứng dụng React và Next.js. Trạng thái máy chủ (dữ liệu lấy từ database hoặc các API bên ngoài) có tính chất bất định, nằm ngoài tầm kiểm soát trực tiếp của client và cần được cập nhật liên tục. TanStack Query giải quyết triệt để các vấn đề về lưu trữ bộ đệm (caching), tự động lấy lại dữ liệu ngầm (background refetching), đồng bộ hóa dữ liệu và tối ưu hóa số lượng request lên server.
- **Vai trò trong hệ thống Gigglegram:**
  - **Tối ưu hóa Server-Side Rendering (SSR):** Phối hợp chặt chẽ với cơ chế App Router của Next.js 16. Sử dụng mô hình `HydrationBoundary` để nạp trước (prefetch) dữ liệu từ phía máy chủ rồi chuyển giao trạng thái đó xuống phía Client một cách mượt mà, triệt tiêu hoàn toàn trạng thái màn hình trắng khi tải trang.
  - **Trải nghiệm người dùng thông minh:** Quản lý bộ đệm bảng tin (Feed) và danh sách Reels. Khi người dùng quay lại tab ứng dụng, dữ liệu tự động được làm mới ngầm. Đồng thời hỗ trợ cơ chế phân trang và cuộn vô chậm (Infinite Scroll) vô cùng mượt mà.

---

## V. NHÓM 5: XỬ LÝ VÀ PHÂN PHỐI PHƯƠNG TIỆN TRUYỀN THÔNG (MEDIA PROCESSING & DELIVERY)

### 5.1. Google Transcoder API và Định dạng HLS

- **Định nghĩa và Bản chất:** **Google Cloud Transcoder API** là dịch vụ đám mây chuyên nghiệp dùng để mã hóa và chuyển đổi định dạng video ở quy mô lớn với tốc độ cao. **HLS** (HTTP Live Streaming) là giao thức truyền phát video dựa trên HTTP do Apple phát triển. HLS hoạt động bằng cách chia nhỏ video gốc thành hàng loạt phân đoạn ngắn (tệp `.ts` từ 2-6 giây) và liên kết chúng lại bằng một tệp chỉ mục chính (tệp `.m3u8`). Giao thức này hỗ trợ cơ chế Adaptive Bitrate Streaming (truyền phát thích ứng theo băng thông) - tự động thay đổi độ phân giải video dựa trên tốc độ mạng của người dùng.
- **Vai trò trong hệ thống Gigglegram:**
  - **Tối ưu hóa tải video thời gian thực:** Khi người dùng upload một video (Reels hoặc Video Bài đăng) lên Google Cloud Storage (GCS), hệ thống tự động kích hoạt Transcoder API để chuyển đổi video thành định dạng HLS.
  - **Tiết kiệm tài nguyên và nâng cao UX:** Thiết bị di động của người dùng xem video trên Gigglegram thông qua luồng `.m3u8` sẽ chỉ tải trước một vài phân đoạn video ngắn thay vì phải tải toàn bộ tập tin video MP4 nặng nề, giúp video phát gần như lập tức và không bị hiện tượng giật lag khi mạng yếu.

---

## VI. NHÓM 6: TRÍ TUỆ NHÂN TẠO TẠO SINH (GENERATIVE AI IN SOCIAL NETWORK)

### 6.1. Ứng dụng Generative AI trong Quản trị và Sáng tạo nội dung

- **Định nghĩa và Bản chất:** Ứng dụng Trí tuệ nhân tạo tạo sinh (Generative AI) trong hệ thống bao gồm việc tích hợp các mô hình ngôn ngữ lớn (Large Language Models - LLMs) và các mô hình thị giác máy tính (Computer Vision Models) nhằm tự động hóa quy trình phân tích văn bản, nhận diện hình ảnh và đưa ra các quyết định kiểm duyệt nội dung một cách tự động.
- **Vai trò trong hệ thống Gigglegram:**
  - **Kiểm duyệt nội dung tự động bằng AI (AI Moderation):** Toàn bộ hình ảnh và video người dùng đăng tải được quét qua mô hình kiểm duyệt thông minh (Vision API) để tự động phát hiện, gắn thẻ cảnh báo hoặc làm mờ (sensitive content overlay) đối với các hình ảnh bạo lực, nhạy cảm hoặc vi phạm chính sách trước khi hiển thị cho cộng đồng.
  - **Dịch thuật bài viết đa ngôn ngữ (AI Translation):** Ứng dụng trí tuệ nhân tạo để dịch tức thời nội dung mô tả bài viết và các bình luận (giữa tiếng Anh và tiếng Việt) trực tiếp trên Client chỉ với một chạm ("Xem bản dịch"), giúp tăng tính tương tác kết nối giữa các người dùng toàn cầu.
  - **Tự động hóa hỗ trợ quản trị:** Hỗ trợ Admin phân loại nhanh và tự động đưa ra đề xuất xử lý đối với các báo cáo vi phạm (reports) gửi lên hệ thống Dashboard quản trị dựa trên mức độ nghiêm trọng của nội dung bài đăng.
