# M1 验收状态与 Android 操作

2026-10-01，工程 0.2.0。软件门禁通过；**Android 真机验收待用户执行**。M1 不能标记完整出口通过，下一阶段未启动。

## 验收矩阵

| 项目 | 当前证据 | 状态 |
| --- | --- | --- |
| 工程 / 目录 / 依赖锁定 | npm 实际安装、唯一 lockfile、导入检查 | 软件通过 |
| strict / lint / deps / build / check | reports/check.json | 软件通过 |
| Session / FixedTick / EntityRef / 空通路 | unit/sim/replay | 软件通过 |
| 30/60/120 FPS 同率一致性 | 15/30/60 Hz 各率逐 Tick hash，对比相同命令流 | 软件通过 |
| VisualProxy 安全 / presentation 隔离 | 冻结 DTO、私有 World、等价 hash、一步窗口、纠正回归 | 软件通过 |
| 多指/cancel/失焦/旋转/重开/context loss | Chromium 自动化 | 桌面通过；真机待补 |
| A/B 采样 | 桌面三轮各 100 手势、原始/汇总 JSON | 软件证据；Android 未测 |
| 空外壳 S0 / 冷热态 / CPU / 电量 | 可选空模式与导出器；真机 S0 三分钟和热态记录缺失 | 待用户执行 |
| 非旗舰约 4 GB 候选 | 无实际设备 | 未验收，最低 SoC/OS/Chromium 未定 |
| 高档参考 | 用户手机可用，但本环境不能控制硬件 | 未验收 |
| 物理 touch-to-photon | 软件 POST_RENDER 不含屏幕发光 | 未测，可选高速摄影；保留误差缺口 |
| C 的必要性 | 桌面基础阈值参考，不足以排除 Android/M3 需求 | 未决，尚未实现 C 真机配置 |
| 最终 Tick 率 | ADR 003 | 30 Hz 仍 provisional baseline |
| 正式内容校验/容量 | 明确 NOT_APPLICABLE_M1 | M2+ 尚未实现 |

## 安装与基础功能

按 README 的 Termux 私有目录流程 npm ci → build → preview，Android Chromium 打开 http://127.0.0.1:4173/ 。先记下 Android/Chrome 版本、设备/SoC、屏幕刷新、分辨率、电量/温度、亮度、是否充电。导出 JSON 自动含 userAgent、WebGL、MAX_TEXTURE_SIZE、DPR/backbuffer、Session 参数；精确设备/电耗/温度需要手动记录，不能根据 RAM 推断性能。

1. 横屏启动，确认网格、一个绿色框/几何块、Tick 持续增加，error 区域为空。竖屏必须暂停，转回横屏后 Tick 不自动补算，点击恢复继续。
2. 左半屏一个手指按住拖动，右半屏再放第二指，面板应显示 2 个指针；右指移开不能使左指失效。取消/系统手势或离开后不得残留方向/按住状态。
3. 点击暂停，等待两秒，Tick 不动；单步准确 +1，仍暂停；恢复继续。切后台至少十秒、锁屏再返回，保持暂停，点击恢复后不补后台 Tick。
4. 按住移动时旋转、切后台、打开浏览器覆盖或系统返回；再次进入应清空指针和代理。完整系统行为因设备而异，记录复现步骤及 Chrome 版本。
5. 重建 Session 20 次，每次新 Tick 从 0 起，新 Session ID；Canvas 保持一个，输入正常，导出无旧 Session 状态。不是 20 次重建 WebGL 上下文；renderer 由应用持有，Session 数据单独释放。
6. 真机 WebGL context loss 如设备/调试工具可触发，记录暂停/恢复/几何重建；不能触发时标记 unavailable。桌面已自动覆盖，不冒充真机通过。

## A/B 三轮响应记录

两台设备：至少一台非旗舰候选（约 4 GB，仅候选）与用户高档参考。每组同亮度/充电/屏幕刷新、空公开平面、速度 180 world units/s、30 Hz simulation、60 FPS rendering target 和低像素配置。两分钟预热，记录环境温度/电量。不要在一轮中切组，切 A/B 会创建新 Session 并清空测量。

轮次建议 A→B、B→A、A→B。每组每轮至少 100 次开始/拖动/释放手势，左指起点固定，拖动至少 60 CSS px，并保持约 100 ms，让采样覆盖多个 Tick，然后释放；右侧同时输入用于多指校验，可单列。结束点按“导出测量”，保存每轮 JSON，命名设备-组别-轮次。

导出报告检查 captured、按阶段 count、UI/visual/authority p50/p95/p99/max。begin/end 可能没有位置变化，因此 authority movement 主要看有效 move 样本；accepted 时间另列。滑动事件在帧/Tick 合并时缺失结果 count 是真实缺口，应延长保持时间或追加手势，不把捕获数等同已响应数。不可把预留规则等待称为采集延迟。

初始目标来自 PERFORMANCE_BUDGET §3.3：UI p95 ≤50 ms、visual p95 ≤80 ms、authority p95 ≤80 ms，仅待验证门槛。软件测量含 CPU 渲染提交，不含触屏硬件/合成/发光；若有高速摄影可补物理端到端，否则明确缺口。纠正次数/比例/误差在 reconciliation/correctionWorld，单位 world units；M1 平面没有墙，穿墙/受控/技能情景保留到 M3。

同时检查 frameMs/tickCpuMs/frameCpuMs、simulationCpuMsPerSecond、measuredFrameCpuMsPerSecond。POST_RENDER 帧区间是本页可测主线程工作，不等于全浏览器主线程占用或 GPU 时间；不要相加重复计算 simulation 子区间。

## 空外壳与电量/热态

点击空外壳，保持前台三分钟 S0，导出一次；这是框架/时钟/零实体成本，不能用响应探针替代。A/B 各约 20 分钟同负载，记录冷态/热态帧时、电量百分比与设备可用温度/降频信息。缓冲仅保留最近 2000 样本，分段导出，累计 CPU 另存；必要时在冷态/热态分别开启新组别会话。长时间无操作的帧/CPU能测，输入延迟需在对应冷热段重新采集。

电池百分比仅粗估；没有温度/功耗接口就写 unavailable，不生成 mWh。45 分钟完整对局属于 M7/M10，M1 没有正式对局可验收，不能提前宣称通过。

若 Android A/B 达不到响应目标、B 误差不可接受或成本/精度需要对照，回传 JSON 与手感说明，按新 Session 加 C（60 Hz，明确插值/代理配置），仍需写 ADR 003。不要直接把当前默认 30 改 60 或运行中切率。最终最低能力与 Tick 选择均等待真实数据；M3 必须再复测技能与控制。

## 尚未完成与下一步

补齐两档 Android 的安装/生命周期/S0/A/B/冷热态记录，判断 C 是否需要，更新 ADR 003 和出口状态。这是本轮下一步，M2 未启动。正式存档、内容编译、战斗、移动/碰撞、Information 权限矩阵、Bot、PWA 均按原里程碑保留，不能把未来内容计为 M1 已实现。
