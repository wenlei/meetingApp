# 光域新能会议室 App

Android 当前线上版本、签名指纹、安装包校验值及另一款 eplant App 的独立发布信息，统一登记在 [Android 发布台账](ANDROID_RELEASES.md)。

故障与后续交接先读 [DEVDOCS/DEVDOC.md](DEVDOCS/DEVDOC.md)。截至 2026-10-08，线上、第二台 PFEM10 和模拟器为 `1.0.13 / 24460500`。两端原生在线升级通过；模拟器账号日程 CRUD 和受邀 API 权限通过。真机新功能完整操作、原 PKT110 本轮升级及会议内邀请等边界仍待覆盖。

本 fork 当前只发布独立 Android App，固定连接 `https://113.46.187.140:18001`，不使用公开的 `meet.jit.si`。Android 应用标识为 `com.guangyuxinneng.meeting`。iOS 暂不构建、不发布，待 Android 版本稳定后再单独讨论。

## 账号与入会

1. App 登录页用 HTTPS 向 18003 的 `/api/sessions` 发送内部账号凭证。公开注册入口不在 App 中。
2. 只把账号服务返回的会话令牌放进 iOS Keychain / Android Keystore；不在手机上持久化密码。
3. App 启动后用 `/api/me` 确认会话仍有效，并显示当前登录的用户名。管理员停用账号或重设密码后，下一次在线校验会要求重新登录。
4. 每次加入本系统会议前，App 用会话令牌向 18001 的 `/account/api/mobile-token` 领取绑定会议室的 Jitsi JWT。即使邀请链接包含别人的 `jwt` 参数，也不会直接使用它。
5. JWT 由服务端签名，签名密钥不进入 App。Jitsi 从 JWT 的用户信息设置参会者身份；App 把个人资料中的显示名称设为只读，并隐藏 Jitsi 原有的第二套登录入口。分享邀请链接时，Jitsi 原有的 `getInviteURL` 会去掉 JWT 参数。
6. 退出登录会移除本机会话令牌，并请求账号服务撤销该会话。已签发的会议 JWT 和已经建立的 Jicofo 会话不会因此立即失效；若需要立即踢出正在开会的用户，还需单独实现服务端强制断开机制。

语言沿用 Jitsi 原有的设置项。设置页顶部显示当前账号，中间保留语言与各项会议配置，底部依次放指纹／面容登录、应用更新、退出登录，不占用会议首页；常用分组默认展开，其余使用带 SVG 图标的紧凑折叠卡片。用户首次仍须使用内部账号密码登录；在已录入指纹或面容的设备上，可以从设置页开启生物识别快捷登录。开启时会先完成一次设备验证，再把会话令牌迁入受生物识别保护的 Keychain／Keystore，删除普通本机凭证。下次冷启动自动发起生物识别验证，通过后仍会向 `/api/me` 校验账号状态；生物识别取消、令牌失效或设备生物识别设置变化时，可改用账号密码登录。退出登录会清除两类本机凭证。App 每次启动会自动读取 18001 的 `/android/version.json`：新版优先比较 Android versionCode，旧清单则回退比较显示版本号；发现新版后直接提示下载，Android 仍会显示系统安装确认。

目前 App 要求先登录内部账号；匿名访客仍可使用网页访客邀请链接。在 App 内输入或粘贴会议室名称/链接可以加入。Android 已注册 18001 的 HTTPS 地址过滤器，但系统是否直接唤起 App 仍取决于设备的链接打开设置。iOS 暂不构建、不发布。

## App 账号日程邀请（1.0.13 已发布）

首页的“安排会议 · 邀请参会者”打开日程表单。日期和起止时间按 UTC+8 保存。会议室名称留空时生成随机 ASCII 名称；非空输入沿用 6–64 位英文字母、数字、`-`、`_` 规则，也可粘贴本系统无凭证邀请链接。不另设中文显示标题，已有网页日程标题仍保留。

参会者按姓名或 `@用户名` 搜索，可多选最多 50 位内部账号。App 复用账号服务的事件和参会者关系。保存后双方账号日程可读取同一事件，App 的“近期日程”显示详情和加入入口。组织者可修改和取消；受邀者只读。会议内主持人的参会者列表也有账号邀请入口，已有同房间预约优先复用。

App 不写手机系统日历，不自动拉人进入通话，不授予主持权限。取消日程不会结束通话。保存成功立即刷新本端；其他端回前台、下拉或每 90 秒刷新。网络写入结果不确定时，必须先刷新检查，不能自动重复提交。

自动回归、构建、模拟器日程 CRUD、受邀账号 API 权限及第二台手机网络升级通过。用户确认后发布 1.0.13 / 24460500；真机完整功能操作、受邀端 UI 和会议内邀请仍待补测。详见发布记录，不将已发布等同于全部边界已验证。

## 验证

- `npm run tsc:ci`
- `node branding/tests/meeting-schedule.cjs`
- `npx eslint react/features/internal-account react/features/app/actions.native.ts react/features/app/functions.native.ts react/features/mobile/navigation/components/RootNavigationContainer.tsx react/features/settings/components/native/ConferenceSection.tsx`
- iOS 模拟器：`cd ios && pod install`，再用 Xcode 构建 `JitsiMeet` scheme。命令行构建需要启用模拟器本地签名（`CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=`）；完全关闭签名会让 iOS Keychain 报缺少 entitlement，无法验证登录页。真机仍需本组织的 Apple Developer Team。
- Android：安装 Android SDK 后从 `android/` 构建。已通过 `:app:assembleDebug` 和 `:app:assembleRelease`；正式版使用专用长期密钥签名。Jitsi Android SDK 手动登记原生模块，因此新增模块也必须加入 `ReactHostHolder.getReactNativePackages()`。发布前须确认 APK 中的 JS bundle 已更新；构建脚本已把生成的 bundle 显式设为资源合并输入，同时要校对两个产物的 SHA-256 并以模拟器界面复核。

2026-10-01 已将服务端 `/account/api/mobile-token` 部署到 18001；公网未认证 POST 返回 401。下载页为 <https://113.46.187.140:18001/android/>，首页有二维码入口。2026-10-02 当前 Android 发布为 `1.0.9` / `24460100`，包的大小、哈希、签名位置与回滚限制见 `ANDROID_RELEASES.md` 及 `DEVDOCS/deploy.md`。正式版构建使用 Java 21，沿用长期签名密钥；iOS 未构建或发布。下面 1.0.7/1.0.6 段落为历史记录，不表示当前故障已完成全部验收。

1.0.7 将 App 登录、设置和账号卡片恢复为无标题栏、无关闭按钮；启用过的生物识别在登录时先验证，取消或失败后才显示密码输入。App 的 Expand 参数提高到 `768`，并修正低帧率下的计时。源代码、APK 签名、哈希、模拟器覆盖安装与启动已核对；公网更新清单返回 1.0.7。真机指纹行为仍待复测。

1.0.6 历史记录：当时将登录、设置分组、当前账号和更新弹窗统一为 macOS 风格标题栏，仅保留关闭按钮；常驻卡片可收起。此设计已在 1.0.7 中撤回。退出登录仍为设置最下方独立按钮。分隔线仅位于相邻条目之间。登录保留小篆“光”图标、半透明玻璃层和原始 Fera Prism 离线实时绘制，只有 Expand，不切换 Gather 或反转时钟；当时 Speed 512、Soften 15px、Noise 30%，五色配方不变。

首次密码认证成功后，有可用生物识别且该账号未主动关闭时，自动尝试系统验证并存储受保护令牌；取消或设备不支持不妨碍密码登录。设置内关闭的偏好按账号保留，不会下次自动重开。退出登录清除普通和生物识别令牌。应用内更新下载完整 APK，校验大小、SHA-256、包名、版本与签名后才交给系统安装器，仍需用户确认安装；固定版本文件名避免更新过程中替换下载内容。

1.0.8 及以前仅服务器下载 URL 版本化，客户端复用 `updates/update.apk`；1.0.9 已通过 `UpdateArtifacts` 改为 code/hash 版本化本地文件和 URI。校验通过不意味着安装器使用了新文件，必须以安装后的系统版本为终点。旧客户端可能需从下载页取得带版本号的文件覆盖安装一次，不用卸载。

1.0.6 已通过类型检查、卡片交互和生物识别逻辑测试、正式签名校验、模拟器完整 APK 覆盖安装及登录页截图核对。APK 内 JS bundle 与本次生成文件一致；服务器上传前后校验通过，公网更新清单确认 1.0.6。此次没有连接真机，真实生物识别与真机视觉尚未复测；实际受邀会议的跨账号端到端展示仍需未来邀请记录复测。

登录动画维护：参数位于 `branding/login-prism-recipe.json`；`branding/extract-fera-prism.cjs` 从用户提供的 JSX 导出抽取 Prism 原始依赖，生成 `feraPrismEngine.generated.ts`。运行时文档由 `loginPrismHTML.ts` 生成，禁用所有网络访问，不接收登录凭据。原生 WebView 在首次绘制完成后淡入，并在 App 转入后台时暂停；系统减少动态效果开启时显示静帧。

## Android 发布签名

统一构建入口：`bash branding/build-android-release.sh`。版本名称和内部版本号只在 `branding/android-release.json` 修改；Gradle 不再按当前时间生成版本号。脚本检查磁盘空间，运行检查并构建、对齐和签名两个 APK。`prepare-android-release.cjs` 从 APK 核验实际包名、版本、架构、长期签名以及内置 JS bundle 与本次生成文件的一致性，核验完成才写更新清单。同一个已发布版本不能替换为不同的安装包；任何后续修正都必须递增版本名称和内部版本号。

发布时先上传带版本号的不可变 APK，核对上传后的校验值，并从旧版 App 的原生下载器实际下载、验证、交给系统安装器、确认安装后的版本与界面。通过后才切换首页下载链接、固定 APK 别名和 `version.json`，最后按两版保留规则清理旧包。不能仅凭清单写着新版或构建命令成功就声称用户已能升级。

发布密钥仅在本机 `/Users/wenlei/.local/share/guangyu-meeting/signing/meeting-release.p12`，未提交到 Git，也未上传服务器。口令在 macOS 钥匙串项目 `com.guangyuxinneng.meeting.android-signing`（账号 `wenlei`）。证书 SHA-256 指纹：`D9:E7:C3:FB:23:51:CD:11:68:59:24:15:26:A0:56:6F:48:8D:05:EC:76:8D:6D:09:B0:D0:E9:E1:02:61:A8:3A`。请将密钥文件和钥匙串口令分别备份到组织的安全存储；遗失后无法以相同身份更新已安装的 App。后续更新必须继续使用这枚签名密钥，且 Android `versionCode` 必须高于上一版。发布时应先完成 unsigned release 构建，再用 Android SDK `zipalign` 和 `apksigner` 签名、验证，并更新服务器上的 APK 与 SHA-256 校验文件。

真机测试至少覆盖：首次登录、重启后保持身份、用不同账号依次登录同一设备、创建会议、加入别人创建的会议、复制不含 JWT 的邀请链接、停用账号后无法新建会议、退出登录后重新进入必须验证身份，以及两人音频和三人桥接会议。
