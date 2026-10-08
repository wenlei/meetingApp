# Android 发布台账

故障与验收状态以 [DEVDOCS/NOW.md](DEVDOCS/NOW.md) 为准：1.0.13 已发布。模拟器和第二台 PFEM10 原生在线升级通过，系统读回 1.0.13 / 24460500。模拟器日程 CRUD 和受邀账号 API 权限通过；真机完整功能、更新取消重试及网络/等候室边界仍待覆盖。

会议室线上状态核实于 2026-10-08；eplant 状态沿用 2026-10-01 的核实结果。两个 App 的包名、签名密钥和下载目录完全独立，不能混用。本文件不保存任何密码、私钥内容或账号令牌。每次发布后应更新版本号、versionCode、APK SHA-256、下载地址及发布日期。

| 项目 | eplant／聚光智维 | 光域新能会议室 |
|---|---|---|
| 源码 | `/Users/wenlei/Documents/GitHub/eplant/mobile`（Flutter） | `/Users/wenlei/Documents/GitHub/meetingApp`（Jitsi React Native fork） |
| Android 包名 | `com.eplant.eplant_ops` | `com.guangyuxinneng.meeting` |
| 线上版本 | `0.18.44` | `1.0.13` |
| versionCode | `170` | `24460500` |
| 下载地址 | <http://focus.xiaoxianglink.com/app/download?platform=android> | <https://113.46.187.140:18001/android/guangyu-meeting.apk> |
| 服务器 APK | `/root/infra/eplant/app_dist/rongkun-hub-v0.18.44.apk`（121.40.121.163） | `/opt/jitsi-download/guangyu-meeting.apk`（113.46.187.140；由 18001 服务提供） |
| 本地发布包 | `/Users/wenlei/Documents/GitHub/eplant/mobile/build/app/outputs/flutter-apk/app-release.apk` | `/Users/wenlei/Documents/GitHub/jitsi-ecs-deploy/android-download/guangyu-meeting-1.0.13-24460500-arm64-v8a.apk`（默认）及 `guangyu-meeting-1.0.13-24460500-universal.apk`（备用） |
| APK SHA-256 | `37686cf5bdd7e2b99e82b58c9da69088ec93c2c9514fc836a2b7bc8ea2eec599` | `42495005e774ac6564cda908a027b3a8a8ddbbb3dae7ec5bda8790d32bad8ccc`（arm64） |
| 发布签名 SHA-256 | `6B:10:0B:75:F9:42:E5:08:1F:F4:E8:77:FA:51:FD:4B:1A:36:AA:75:72:46:84:2A:77:AC:2D:BC:56:5D:7A:CA` | `D9:E7:C3:FB:23:51:CD:11:68:59:24:15:26:A0:56:6F:48:8D:05:EC:76:8D:6D:09:B0:D0:E9:E1:02:61:A8:3A` |
| 签名文件 | `/Users/wenlei/eplant-release.jks`（alias `eplant`） | `/Users/wenlei/.local/share/guangyu-meeting/signing/meeting-release.p12`（alias `guangyu-meeting`） |
| 口令位置 | eplant 密码库；不写入仓库 | macOS 钥匙串服务 `com.guangyuxinneng.meeting.android-signing`，账号 `wenlei` |

## 已核实与未核实

- 当前：2026-10-08 发布 1.0.13 / 24460500。两个包大小为 37,798,042 / 109,725,203 字节；universal SHA-256 为 `96d294ed8acfb088d26038517d443a43d72c27cd740eec7a6c37bb204240486d`。模拟器和第二台 PFEM10 从 1.0.12 原生在线升级通过。复用候选字节，未重新构建；用户确认后切换正式清单，元数据备份为 `/opt/jitsi-download/backups/24460500-before-1.0.13`。新功能测试和剩余边界见 `branding/releases/1.0.13.json`。本地/服务器分发保留 1.0.13 和 1.0.12；1.0.10 二进制及本地候选重复别名已清理，元数据和长期密钥保留。以下为历史记录。

- 当前：2026-10-07 发布 1.0.12 / 24460400。两个包大小为 37,789,850 / 109,721,107 字节；universal SHA-256 为 `9fec0328bdde45ee676cc9a7a7b7954bfb6642fcc040c4de64bf382667d6ed74`。手机/模拟器双向中英文设备切换提示通过，提示不会被重连页覆盖；手机设置与公网发布信息一致。正式源码为 `a9872d4`，沿用已验证候选字节。1.0.11 未发布，失败原因和范围见 `branding/releases/1.0.12.json` 与 ADR-006。以下为历史发布记录。

- 当前：2026-10-07 发布 1.0.10 / 24460200。两个包大小为 37,789,850 / 109,721,107 字节；universal SHA-256 为 `4b408663e0ab1b5c4b83258259e96ff595bb6c4ea84cc60111cddba7a705fb23`。完整身份和验收边界见 `branding/releases/1.0.10.json`。手机、模拟器与服务端已启用设备切换；匿名访客保留，真实候选超时安全撤回。元数据备份 `/opt/jitsi-download/backups/24460200-before-1.0.10`。
- 以下 1.0.9 及以前段落为历史记录，不覆盖本轮追加验收。

- 当前：2026-10-02 发布 `1.0.9 / 24460100`。两个包大小分别为 37,785,754 / 109,717,011 字节；universal SHA-256 为 `144e6229d3f4cce9176e1ac1a72e478cf82978f4cf4715fd550ef41ae12822e7`。完整记录见 `branding/releases/1.0.9.json`。签名、bundle、线上字节与清单验证通过；模拟器显式版本化交接后系统读回 1.0.9。真机本轮未连接，不能称为已完成连续更新/随机入会真机验收。上一版元数据备份为 `/opt/jitsi-download/backups/24460100-before-1.0.9`。
- 下文 1.0.8 及以前内容为历史记录，不是当前线上版本。

- 2026-10-02 当前发布为 `1.0.8 / 24460000`。arm64 大小 37,785,754 字节；universal 大小 109,717,011 字节、SHA-256 `616cb513b3ddfa15543fb83456a707947c55dbab8d06c95b6b7edef87a11ed36`。沿用长期签名。版本来源统一至 `branding/android-release.json`，APK 身份与 bundle 校验后才生成清单。
- 模拟器 1.0.7 → 1.0.8 原生在线下载及安装通过；随后 PKT110 真机发现固定 `update.apk` URI 仍触发旧版识别。缓存 APK 身份/哈希正确，同文件换独立文件名后安装器显示 1.0.8，最终系统读回 1.0.8。**该对照不代表产品更新器已修复**，详见 [BUG-001](DEVDOCS/bugs.md)。
- 以下为历史发布时记录，其中“当前”“健康”“已验证”的措辞只反映当时判断，不覆盖上述真机事故结论。历史回退路径需按现存包重新核实。

- 会议室当前发布：2026-10-02，`1.0.7` / `24456500`。App 卡片恢复无标题栏、无关闭按钮；已有指纹凭证时先显示生物识别验证，取消或失败后显示密码输入。App 的 Expand 参数提高到 `768`，并修复低帧率时动画时间被截断；网页端速度独立调整。两包沿用原签名，arm64 为 37,785,754 字节，通用包为 109,717,011 字节，通用包 SHA-256 为 `784fe111183939c2e29bea40c1ebf60e314eb6e325675c58b103a1f1cdc5f936`。类型检查、四项回归测试、模拟器覆盖安装与启动通过；APK 内 JS bundle 与生成文件一致。服务器暂存文件校验后切换下载页与更新清单。回退到上一版时使用 `/opt/jitsi-download/` 中 1.0.6 的两个不可变 APK 及备份的 `version.json`，不是旧备份目录中的 APK 副本。真实指纹及真机 UI 仍待手机验证。
- 以下 1.0.6 记录为历史验证，不代表当前版本。
- 会议室当前发布：2026-10-02，`1.0.6` / `24456400`。macOS 风格标题栏用于登录、设置分组、当前账号和更新弹窗，只保留关闭按钮；常驻卡片可收起后点击标题恢复，退出登录保持独立。Expand 速度为 `512`（1.0.5 的两倍），模糊 15px、噪点 30% 不变。首次密码登录成功后默认尝试系统生物识别验证，用户主动关闭的偏好按账号保留，取消或不支持时密码登录不受影响。
- 当前包：arm64 为 37,785,754 字节；通用包为 109,717,011 字节，SHA-256 `145d504c4f781e51d3b4f138f5df783c47b4991596f4c5fa8540d8af6906ea04`。正式签名延续原密钥。类型检查、卡片交互及生物识别逻辑测试通过；模拟器使用完整 APK 覆盖安装、版本查询和登录页面截图检查通过。APK 内 JS bundle 与本次生成的 bundle 哈希一致。此次没有在线真机，未验证真实指纹及真机 UI。
- 发布先上传暂存目录并校验两个 APK，再更新固定版本文件和旧下载别名，最后原子替换 `version.json`；公网清单已确认 1.0.6。回滚文件位于 `/opt/jitsi-download/backups/24456400-before-mac-cards`。后续构建使用 Java 21：`JAVA_HOME=/Users/wenlei/Library/Java/JavaVirtualMachines/ms-21.0.9/Contents/Home`。
- 1.0.5（2026-10-01，`24456301`）已加入应用内完整 APK 下载、大小／SHA-256／包名／版本／签名校验和系统安装器交接；不是增量包。此次保留该更新机制。旧版浏览器安装失败曾确认是下载文件被截断；不要把未下载完的文件提交安装。
- 以下 1.0.4 记录为历史验证，不代表当前版本。
- eplant：2026-10-01 公网 `/app/meta` 报 `0.18.44` / `170`；本地 APK 与服务器 `/root/infra/eplant/app_dist/rongkun-hub-v0.18.44.apk` 的 SHA-256 相同。包名、versionCode 和签名指纹均从本地 APK 读取。
- 会议室：2026-10-01 重新发布 `1.0.4`（versionCode `24456088`）。登录背景不再使用压缩动画 WebP，而是在离线 WebView 中实时运行用户提供的 Fera 原始 Prism 渲染器；只使用 Expand，不切换 Gather、不反转或重置时间。保留五色配方，Speed 64、Soften 15px、Noise 30%、20 条镜像条带。背景不接收账号数据，原生登录表单仍独立。Android 模拟器运行采样约 60 帧/秒，动画时钟为 0.768 单位/秒；真机性能未复测。设置卡片只在相邻条目之间插入分隔线，末项无底线。保留浅灰绿 `#F1F4EF` 背景、米白 `#FCFDF9` 卡片、设置末尾独立退出按钮（浅玫瑰底 `#F8E9E6`、深红字 `#773B3C`、对比度 7.19:1），以及近期日程标题和空状态说明。启动时自动检查 `version.json`，按更高 versionCode 提示下载。默认 arm64 正式包约 36 MB，通用备用包约 105 MB，后者 SHA-256 为 `035974de95624d4ca4a6dc8e8c5d11f79dd394997277922427f0dbdb484dc94e`。此次正式签名与模拟器覆盖安装已验证；服务器发布前后均通过文件哈希校验，发布前备份在 `/opt/jitsi-download/backups/24456088-before-expand`。此前版本曾在 PKT110 真机覆盖安装；此次真机未连接，未重复验证真机。
- 两枚签名文件目前都在本机；**异地安全备份尚未核实**。不要只备份 APK：丢失签名文件或口令后，无法给已安装 App 发布可覆盖安装的更新。备份签名文件和口令时应分开保存，不要提交到 Git 或上传到 APK 下载服务器。

## 下次发布必须核对

1. 各自沿用原签名密钥，并使 `versionCode` 高于已发布版本；不要把 eplant 与会议室的密钥、包名或下载目录交叉使用。
2. 用 `apksigner verify --print-certs` 检查最终 APK 的证书指纹，用 `aapt dump badging` 检查包名、版本及 versionCode，再计算 SHA-256。
3. 上传后从分发服务器核对文件大小和 SHA-256；更新版本元数据，并在两台真实设备上做覆盖安装与登录／更新测试。
4. 更新本台账及各项目发布文档。eplant 详见 `/Users/wenlei/Documents/GitHub/eplant/mobile/docs/发布配置.md` 与 `/Users/wenlei/Documents/GitHub/eplant/app_dist.md`；会议室详见 `/Users/wenlei/Documents/GitHub/meetingApp/INTERNAL_APP.md`。

## 会议室 Android 构建保留规则

- 当前保留 1.0.12、1.0.10。2026-10-07 预览并删除本地/服务器各两个 1.0.9 APK，删除本地候选目录四个冗余 APK。失败的 1.0.11 已清理；保留元数据、签名密钥。1.0.9 如无其他备份需重新构建。以下为此前清理记录。

- 分发目录保留 1.0.10 和 1.0.9，每版含 arm64/universal，另有当前固定别名。2026-10-07 在真机更新与核心切换通过后，预览并清理本地 6 个、服务器 4 个 1.0.7/1.0.8 旧产物；历史元数据、密钥保留。旧二进制不可直接从分发目录恢复，须另有安全副本或从源码重建。没有清理 eplant。
- 新版先完成签名、包名／版本、文件大小及 SHA-256 检查，上传后再做公网下载与安装验证。**只有确认新版健康且上一版可回退时**，才运行 `branding/prune-android-releases.cjs`：先不带 `--apply` 预览，再带 `--apply` 清理。本机使用分发目录的 `version.json` 和 `version-上一版.json`；服务器使用当前 `version.json` 和发布前备份的上一版 `version.json`。`prepare-android-release.cjs` 会自动保存被替换的本机版本清单。
- 2026-10-02 已按此规则清理本机 17 个旧文件、服务器 23 个旧文件（含旧备份 APK）。旧二进制文件已删除，无法直接从服务器下载；需要旧版时只能从源码重新构建。签名密钥和历史文字记录未删除。这项规则仅适用于会议室 App，未清理 eplant 发布物。
