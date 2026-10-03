# M1 收口软件验证报告

历史阶段记录（historical/superseded）：下方保留原版本当时的状态、证据与结论，不作为当前阶段/交付状态；现行状态见 docs/current-status.json 与 M3 验收。架构约束及未来硬门禁继续有效。

<!-- historical/superseded:start -->
2026-10-01；工程0.2.1 / 规范0.1.2。本轮仅M1文档收口、Phaser配置回归和构建追溯；M2未实施。本轮全部适用软件门禁已实际运行通过，结果在reports/check.json；当前无M1出口阻塞，长期性能/兼容项目仍按正式延期追踪。

## 本轮实际门禁

| 命令 | 结果 |
| --- | --- |
| npm ci / npm ls --depth=0 | 安装成功；九个直接依赖保持精确原版本 |
| npm run typecheck | PASS / exit0；完整工程与无DOM core |
| npm run lint | PASS / exit0 |
| npm run check:deps | PASS / exit0；42文件/80边、白名单/SCC/别名/类型/动态导入、manifest/lock/安装版本 |
| npm run check:docs | PASS / exit0；根目录/docs七对全文副本一致 |
| npm run validate:content | NOT_APPLICABLE_M1；空内容guard执行成功，正式编译未实现，非内容PASS |
| npm run test:unit | PASS / exit0；24项、7文件 |
| npm run test:sim | PASS / exit0；16项、3文件 |
| npm run build | PASS / exit0；24模块，build-info.json与生产资源生成 |
| npm run test:browser | PASS / exit0；4项，/moba/固定生产构建与preview，无HMR；含导出/asset元数据等价 |
| npm run check | PASS / exit0；串行全门禁 |
| limit:0→60负向回归实验 | 如预期FAIL / exit1；实际Game参数断言失败，源码恢复后完整check通过 |

合计44项自动测试PASS；负向回归实验为证明保护有效，未留失败配置。报告：reports/check.json、reports/browser.json、reports/fps-regression.json。执行环境Node24.19.0/npm11.9.0，Playwright Chromium141/Linux/SwiftShader，不代表AndroidGPU/热态。已核对Pages旧修复run的build/check/artifact/deploy成功，新收口产物本轮只做软件回归。构建保留Phaser>500KB chunk提示，未提高阈值隐藏它。

本轮创建/修改文件：九份要求文档及根目录/docs镜像，docs/M1_IMPLEMENTATION.md、DEPENDENCIES.md；package.json/lock版本、vite.config.ts、playwright.config.ts；application导出与vite-env类型；两个unit回归文件、browser导出检查；build-info工具/类型、check:docs与check组织器、打包版本入口；用户真机汇总与软件报告、更新dist/manifest。simulation/controllers/foundation/contracts权威实现未修改，没有新增任何M2系统。

## 本轮范围与证据

- 用户Android真实结果单列M1_ACCEPTANCE.md和reports/android-m1-user-summary.json；真机不是本环境执行，不重做已PASS生命周期。
- 核实修复commit d4124a6402809363d3e866c50d6c110c90ff241c与成功Pages Actions run36868684893/attempt1。新增实际Phaser.Game配置回归、构建元数据测试、下载导出追溯检查和根目录/docs一致性门禁。
- 依赖保持原精确版本，Simulation运行基线30 Hz，A默认/B实验/C不触发。长期热态和第二设备正式DEFERRED，不是PASS。
- 本轮不重新执行桌面A/B性能探针：已有正式60 FPS真机三轮证据，桌面仅需软件正确性回归。

## 历史0.2.0软件工程记录（诊断用途）

以下为原交付时记录，日期/40项计数及“真机待测”仅描述当时状态，不覆盖上方当前收口或M1_ACCEPTANCE。原约33ms帧间隔A/B仅为诊断，不再用于正式方案定案；原始reports/software-probe JSON保留。

# M1 实际交付与测试报告

2026-10-01；工程 0.2.0 / 规范基线 0.1.1。M0 已结束，停在 M1；Android 真机验收待用户执行；未进入 M2。

## 实际门禁

| 命令 | 实际结果 |
| --- | --- |
| npm run typecheck | PASS；完整工程/测试及不含 DOM 的纯 core 两个编译边界 |
| npm run lint | PASS；包括权威环境 API 与无种子随机禁用 |
| npm run check:deps | PASS；38 文件 / 77 边，白名单/SCC/alias/type-only/动态导入/公开入口/精确版本 |
| npm run validate:content | NOT_APPLICABLE_M1；空内容阶段 guard 执行成功；正式验证未实现，非正式内容通过 |
| npm run test:unit | PASS；20 项，5 文件，包含 scanner/lint 的拒绝反例 |
| npm run test:sim | PASS；16 项，3 文件，包含逐 Tick replay/hash、Session、预测安全与纠正 |
| npm run build | PASS；Vite 24 模块，已附 dist |
| npm run test:browser | PASS；4 项 Chromium 自动化 |
| npm run check | PASS / exit 0；上述门禁串行，失败不继续 |
| npm run probe:software | PASS / exit 0；固定 dist，A/B 各 3×100 手势，含原始数据 |

机器可读证据：reports/check.json、reports/browser.json、reports/software-probe/{A,B}-round-{1,2,3}.json、summary.json。浏览器 Chromium 141.0.7390.37，Linux x86_64 / SwiftShader；Node 24.19.0、npm 11.9.0。没有 Android 设备、电量/热量或物理屏幕延迟实测。

## 覆盖与实际修复

- 30/60/120 FPS 在各自固定 15/30/60 Hz simulation 下重放相同命令；逐 Tick hash 与最终状态一致。30 Hz 转向 fixture 的手算终点 (0,90) 验证，跨 simulation rate 不要求相互逐 Tick hash 一样。
- generation 复用使旧句柄持续无效；pending despawn 即无效；到上限退休；不同 Session scope 不互通。
- Session 创建/暂停原因集合/恢复/单步/过载/结束/销毁/20 次重开；Tick 中 end/dispose 保留当前完整边界；fault 不可直接恢复。
- pointer 多指各自独立，取消/失焦/旋转/Overlay 清理；浏览器 CDP 两指、touchcancel、blur/focus、portrait、20 次重开、WebGL loss/restore。
- private World 和复制冻结 DTO 防止表现写入；VisualProxy 开关不改变权威 hash，预测长度至多一个 step；Tick 对齐误差测试不将正常位移算为错误。
- AST 反例证明 alias 类型越层、re-export/dynamic/import-type 环、自环、computed import、大小写、feature 跨域、Phaser 侵入、测试 helper 侵入会失败。lint 反例证明 DOM/计时器/random/performance 驱动权威会失败。
- 首轮 TypeScript 查出 Phaser 3.90 无 resolution 字段，按安装类型修复；Vite 在当前容器绑定全接口会触发 networkInterfaces 环境错误，开发/测试改为明确 loopback；JSON retry fixture 曾错误复用已拒绝 sequence，改成不同请求 ID；context restore 测试保留 loss 前扩展句柄；软件采样改为固定生产 dist 并直接持有 Vite 子进程，验证完成后退出，无 HMR 污染。

## A/B 软件测量

每组每轮 300 原始 begin/move/end、100 visual 与100 authority movement 样本；A/B 顺序三轮交替。UI 为 POST_RENDER CPU 提交；authority 为 simulation.step 完成上界估计；这些值不包含物理触屏/GPU 合成/屏幕发光。每组的 p50/p95/p99/max、分阶段与原始时间戳均保留，下面仅取 p95 便于查看。

| 组 / 轮 | UI / visual / authority 样本数 | UI p95 ms | visual p95 ms | authority p95 ms | Tick CPU p95 ms | 帧间隔 p95 ms | simulation CPU ms/s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A / 1 | 300 / 100 / 100 | 26.3 | 33.9 | 33.2 | 0.100 | 33.6 | 0.803 |
| B / 1 | 300 / 100 / 100 | 26.4 | 17.6 | 33.4 | 0.100 | 33.6 | 1.031 |
| B / 2 | 300 / 100 / 100 | 26.7 | 17.6 | 33.5 | 0.100 | 33.6 | 0.804 |
| A / 2 | 300 / 100 / 100 | 26.7 | 17.6 | 16.9 | 0.100 | 33.6 | 0.848 |
| A / 3 | 300 / 100 / 100 | 26.8 | 17.7 | 17.0 | 0.100 | 33.6 | 0.752 |
| B / 3 | 300 / 100 / 100 | 26.3 | 17.5 | 33.3 | 0.100 | 33.6 | 0.820 |

B 纠正频率/误差详见每轮 reconciliation；旧的一步预测与下个观察权威 Tick 对齐，迟到采样仍保持一步窗口。三轮最大误差分别为 6, 6, 12 world units。多 Tick 一帧或取消可能增加纠正，不能据这一空平面数据称预测已适用于碰墙/技能/受控。A UI 同样即时，区别是本地视觉代理；数据反映采集相位差，不能只拿最快一轮证明 B/30 Hz 的最终手感。

当前软件样本的初始延迟门槛未触发，但不据此排除 C 的 Android/M3 必要性。Phaser rendering target 为 60，实际帧间隔也有约 33 ms 样本，没有把 target 写成实测稳定 60 FPS。详细主线程帧区间与每秒 CPU、纠正比例见 JSON；M1 空外壳/单点 CPU 不能代表正式5v5容量或峰值。

## 创建 / 修改文件

创建完整工程、源码、测试、构建工具、候选目录占位与 dist；修改七份原规范的执行状态/ADR/CHANGELOG，保留 0.1.1 的 M1 边界和长期规则。

新增根文件：README.md、package.json、package-lock.json、tsconfig.json、tsconfig.core.json、vite.config.ts、vitest.config.ts、playwright.config.ts、eslint.config.mjs、index.html、ASSET_LICENSES.md、FILE_MANIFEST.json。新增文档：M1_IMPLEMENTATION.md、M1_ACCEPTANCE.md、DEPENDENCIES.md、本报告；content/README.md 明确正式内容为空。候选 feature 等目录只含 .gitkeep。

具体代码/测试/工具清单：

- src/application/composition/boot.ts
- src/application/debug/probe-recorder.ts
- src/application/index.ts
- src/application/session/fixed-tick.ts
- src/application/session/session.ts
- src/contracts/commands/probe.ts
- src/contracts/components/entity.ts
- src/contracts/index.ts
- src/contracts/observations/shell.ts
- src/contracts/ports/shell.ts
- src/controllers/index.ts
- src/controllers/player/probe-controller.ts
- src/foundation/index.ts
- src/main.ts
- src/platform/browser/lifecycle.ts
- src/platform/index.ts
- src/presentation/index.ts
- src/presentation/input/pointer-tracker.ts
- src/presentation/phaser/entities/visual-proxy.ts
- src/presentation/phaser/scenes/probe-scene.ts
- src/presentation/probe.ts
- src/simulation/index.ts
- src/simulation/kernel/entity-store.ts
- src/simulation/runtime/shell.ts
- src/style.css
- src/vite-env.d.ts
- tests/architecture/dependencies.test.ts
- tests/browser/probe.spec.ts
- tests/replay/frame-rate.test.ts
- tests/simulation/session.test.ts
- tests/simulation/shell.test.ts
- tests/unit/clock.test.ts
- tests/unit/entity-store.whitebox.test.ts
- tests/unit/foundation.test.ts
- tests/unit/input.test.ts
- tools/check-deps.d.mts
- tools/check-deps.mjs
- tools/check.mjs
- tools/package-project.py
- tools/run-software-probe.mjs
- tools/validate-content.mjs

## 风险 / 未完成 / 下一步

Android 非旗舰+高档两档真机、S0 三分钟空外壳、A/B 操作与软件/物理误差、约20分钟电量/热态、最低能力与 C 必要性尚未验收，步骤见 M1_ACCEPTANCE.md。30 Hz 保持 provisional baseline，M1 不完整出口。

构建保留 Phaser >500 KB chunk 提醒（gzip 约332KB），source map 为调试额外体积，不提高阈值隐藏提示。ESLint 锁定分支的 npm 支持期提醒已记录。当前 Linux headless 缺少中文系统字形，截图汉字显示方框；DOM 文本与操作测试正常，Android 系统字体显示待真机检查，本轮未引入字体素材。

M1 没有正式内容编译、容量证书、存档、伤害/技能/碰撞/视野/装备/Bot/PWA；没有通过空壳伪称这些系统完成。下一步为补齐 M1 真机证据，更新 ADR 003，再由新的明确阶段任务进入后续阶段。本轮不进入 M2。
<!-- historical/superseded:end -->
