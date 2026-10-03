# M1 工程实现说明

历史核实记录：保留原版本/日期证据及契约，不作为当前工程版本、阶段或交付声明；现行状态见 docs/current-status.json。

<!-- historical/superseded:start -->
工程0.2.1；规范0.1.2保留M0架构不变量；2026-10-01。M1按修订验收标准收口，M2就绪但未实施。

## 系统与状态所有者

| 模块 | M1 已实现 | 下一阶段内容 |
| --- | --- | --- |
| foundation | 品牌 ID、有限数值、方向、Tick 时间转换、确定 hash、有版本 RNG、有界环形缓冲 | 复杂几何及规则性质测试 |
| contracts | EntityRef/scoped handle、调试 ProbeCommand/拒绝码、空 Observation/RenderDelta、窄 SimulationPort、PresentationHost、时钟/输入 DTO；未来通信/CheckpointCodec 类型 | 正式 Effect/Operation/Schema/Checkpoint DTO |
| simulation/kernel | 私有实体槽位、generation、pending despawn、P8 提交、溢出退休、Session 作用域 | 组件存储扩展 |
| simulation/runtime | 私有 ShellWorld、整数 Tick、命令合法性/有界去重/P1、P3 几何 fixture、P8/P9 空通路 | M2 Operation/Hook、正式信息与战斗 |
| application | 显式组合根、Session 生命周期、pause reason 集合、单步、参数化 FixedTick、Debug 测量 | 正式对局装配、Checkpoint 聚合 |
| controllers | 按 pointerId 的最小摇杆方向样本、按 Tick 去重、中性清理 | M3 技能输入；M6 Bot |
| presentation | Phaser/WebGL 空网格、几何占位、多指 Pointer、按钮/状态、插值、独立 VisualProxy | HUD/危险提示/正式资源 |
| platform | 单调外层时钟、visibility/focus/orientation/page/context loss、JSON 用户主动导出 | 存储与 PWA |
| content | 正式目录为空、阶段空内容 guard | M2+ 校验/编译/容量证书 |

产品导入仅通过公开入口；唯一白盒例外是 tests/unit/entity-store.whitebox.test.ts。presentation/probe.ts 是纯表现公开入口，允许 headless 预测测试而不加载 Phaser；application/index.ts 是纯 Session/时钟测试入口。其他空目录用 .gitkeep 保留，没有虚构实现。

## Session 与时间

Session 为 loading → running ↔ paused → ended → disposed。Session 不拥有 DOM/Phaser。暂停、结束、销毁请求在同步 Tick 完成屏障生效；destroy 幂等。异常/fault 不允许直接恢复，M1 仅重建 Session，M5 才提供完整兼容 Checkpoint 恢复。

pause reason 包括 user/hidden/orientation/contextLost/overload/fault。解除一个原因不会覆盖其他原因；回到前台/横屏/context restore 仅清除对应原因，必须再点击恢复。按住状态清理在 controller 和 presentation；Simulation 接收 neutralize 的入口标记，在下一 P1 才把探针方向置零并提交旧队列取消结果，新采集的输入保留。

FixedTick 接受一次 Scene.update 传来的外层单调时间，忽略 Phaser delta。每帧至多 4 Tick；前台 elapsed >250 ms，或四步后还有整步积压，暂停 overload。恢复丢弃 accumulator、重建基准，不补后台时间、不跳 tickIndex、不放大 dt。tickRate 只在新 Session 配置中锁定；运行基线 30 Hz，单元测试另用 15/60 Hz，没有宣布最终率。

## 几何探针与输出

响应 fixture 不属于正式 Movement 功能域：一个本地调试席位几何点，速度 180 world units/s，纯公开空平面，无地图、碰撞、资源、可受伤目标。P0 时间；P1 最小调试命令；P2 空；P3 fixture 位移；P4–P7 空；P8 结构提交；P9 复制授权 probe 或空输出。没有战斗 Operation/Hook 实现，也没有正式十席 Match 开局/内容证书。

empty 模式完全无实体。response-probe 只披露明确归本地席位所有的几何点；没有隐藏单位，Information/Visibility/DisclosurePolicy 的正式矩阵仍待 M4，不把这个固定空授权通路称为完整信息系统。World 只存在于 simulation/runtime 私有实现，产品无法取得 World/可变组件数组。Observation/RenderDelta 是复制并冻结的小 DTO，历史快照不随下一 Tick 变化。

EntityRef 仍为 index/generation；Kernel API 额外要求 session scope。Command 必须携带 matchId，组合根每次创建使用新 ID。槽位 pending 即无效；P8 释放；generation 到上限退休槽位，永不回绕。Debug hash 包括 fixture、实体槽位、Tick、命令队列/去重/中性入口，排除帧 accumulator、VisualProxy 和其它表现状态。hash 是 M1 FNV32 诊断值，无密码学/跨设备/正式存档保证。

## A/B 与软件测量

A 为 30 Hz simulation、60 Hz rendering target、previous/current 插值。B 保持相同权威路径，使用 presentation 私有 VisualProxy。两组都有正常即时 Pointer UI；B 的主要额外差异是视觉代理，没有故意拖慢 A 的普通 UI。Phaser fps={target:60,limit:0,smoothStep:false}关闭额外limiter；原limit=60导致真机约30 FPS，修复后正式约60 FPS三轮支持A默认、B实验。实际刷新另测，不据target数字称达标；ADR003/020记录根因与回归。

代理只读取授权本地样本与本地输入。预测时长不超过一个 step，下一权威样本重新定基准；取消/拒绝/失焦/暂停/Session 变化清理，discontinuity 不预测、不插值。正式控制/死亡/碰墙场景没有系统，保留在 M3 验收。预测误差比较旧的一步预测与下一观察到的权威 Tick 坐标，避免把正常帧间移动算成误差；迟到样本超一步仍保持原预测窗口，不扩展成多步预测。报告 reconciliation 总数、纠正次数/比例、最大误差。

软件时间戳分为原始采集、入队、完整 simulation.step 提交、Phaser POST_RENDER。权威移动时间取 step 完成时外层单调时间，是 P3 提交的上界估计，包含空 P4–P9；UI/visual 时间是软件渲染提交，未测物理屏幕发光。输入样本被 Tick/帧合并时保留各指标实际 count，零方向或未移动不计为权威移动样本。

Tick CPU 包围 simulation.step；帧 CPU 为 Scene.update 至 POST_RENDER，包含模拟/表现/Debug，排除区间外浏览器/合成器。每秒 CPU 分母是采集会话 wall time，暂停也会包含，比较必须持续前台固定条件。电量/热量/系统进程内存/真实 GPU 时间不可用，不生成假数据。采样/追踪有界 2000 条，超出仅保留最近窗口；累计 CPU 独立计数。

采集结果存 reports/software-probe，阶段验收见 M1_ACCEPTANCE.md，版本与锁定依据见 DEPENDENCIES.md。M1 调试 shell 的 build 是开发验收产物，不能视为正式发行游戏；未来正式发行需关闭作弊与内部 Debug 权限。

构建/测量导出携带同一commit与Actions run/attempt；本地dirty/unknown明确标记，不进入权威hash。根目录/docs规范副本一致性门禁check:docs已加入check。当前硬件PASS与DEFERRED见M1_ACCEPTANCE.md，未测的热态/第二设备不自动变为PASS。
<!-- historical/superseded:end -->
