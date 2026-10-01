# MOBA 设计决策记录

版本：0.1.2。日期：2026-10-01。当前阶段：M1 已收口；M2 就绪但未实施；工程 0.2.1。

accepted 表示采用的架构约束而非已实现；proposed 表示需验证的候选；provisional baseline 表示后续实现暂用但尚未接受为最终选择；deferred 表示当前不实施。技术资料只核实平台行为，预算/探针提案不等于性能和手感事实。

## ADR 001 独立模拟层与 Phaser 表现

状态：accepted。

选择：simulation 不依赖 Phaser/DOM；Phaser 使用权威信息策略过滤后的 Observation/RenderDelta/PerceptionEvent。application 是全工程组合根，simulation/runtime 是模拟内部组合根。

理由：让复杂数值、规则顺序、回放和存档可在 headless 环境验证，避免动画/帧率改变战斗；同时保留未来服务器运行模拟的选择。代价是额外投影和桥接代码，需要严格维护可见信息与资源生命周期。

替代：直接把英雄继承为 Phaser Sprite 并由 Scene 更新全部状态。此方式不适合作为本项目长期权威架构。复审：仅在明确测得桥接成本或可维护性问题时调整接口，不反向把规则挪回 UI。

## ADR 002 模块与功能域依赖采用 DAG

状态：accepted。

选择：foundation → contracts → 并列 content/simulation/controllers/presentation/platform → application 的分层；模拟内部 kernel → shared → features → runtime。方向描述为被依赖层到使用层，实际 import 指向低层；以 ARCHITECTURE 的白名单表为准。

理由：隔离英雄内容、战斗、UI、Bot 和平台，阻止循环依赖。跨功能操作通过有类型 Operation 由组合根分发，查询通过纯 DTO。代价是 contracts 和调度表要维护，不能把所有服务塞进 Context。

复审：M1 导入扫描落实时检验 alias、类型导入和 barrel；新增模块须更新白名单和强连通分量测试。

## ADR 003 固定 Tick 与 M1 A/B 收口决策

状态：固定 Tick/表现解耦 accepted；A 为当前默认 presentation；B 为实验性 presentation-only 路径；C 当前不触发；30 Hz 仍是 provisional baseline，最终率未决。

选择：Session 锁定 30 Hz 当前运行基线，保留参数化测试；四步/250 ms 过载暂停、不补后台时间、不动态改率。渲染目标 60 FPS，Phaser limiter 关闭，详见 ADR 020。A 使用 previous/current 插值；B VisualProxy 窗口最多一 Tick，只读授权样本/本地意图，不能修改 World、碰撞、视野、资源、RNG 或任何权威状态/hash。未改变默认 Simulation 为 60 Hz。

证据：2026-10-01 用户在同一高档 Android、Edge 153/Chromium、系统 60 Hz、低像素配置、速度 180 world units/s 上完成修正版的正式三轮 A/B。逐轮数字见 M1_ACCEPTANCE.md 与 reports/android-m1-user-summary.json。三轮 run-level p95 中位数：A/B Visual 5.2/5.8 ms，UI 13.2/14.0 ms，capture→accept 27.1/26.9 ms；Frame CPU p95 约 4.9/5.9 ms（用户汇总）。不是合并事件 p95，不是物理 touch-to-photon；accept 不是首次权威位移。报告未提供全部逐阶段 count/p50/p99/原始 JSON，不伪造这些信息。软件 hash/隔离由自动测试独立验证。

B 三轮 correctionFraction=1，correction p95/max 约 6 world units，对应 180/30=6 world units/Tick。没有稳定、可重复且有工程意义的响应收益；UI 与 Frame CPU 成本倾向更高，并持续增加预测/reconciliation 复杂度。这支持 A 默认与 B 实验保留，不证明所有预测方案无用，也不证明最终 30 Hz 游戏手感。修复前约 30 FPS 数据仅留作诊断，不参与上述定案。

C 的触发修订：有效响应不达标、短动作精度存在实际问题，或模拟率 CPU/成本对照有明确必要性时执行；B 单独无收益不自动触发 C。本次 UI/视觉基础软件响应低于暂定阈值，没有新的响应/精度证据要求 C，暂不实施。权威首次位移指标和真实技能手感仍在 M3 细化，不能用 accept 指标宣称它们已 PASS。

复审：M3 在真实技能、墙体、单位阻挡、CC、急转、取消窗口及代表性负载下重评 A/B，必要时 C。ADR 019 延期的低档设备、冷热态/电量/降频要在代表性性能门禁补齐；未完成决策门禁前不大量制作正式英雄/内容。接受最终率需记录两档真机响应、CPU/每秒成本、手感、预测安全和热态证据或明确未决；改率须新 Session、时间量化/容量证书/版本与存档复审。跨率不要求逐 Tick hash 相等。

## ADR 004 单机后台与严重过载暂停

状态：accepted。

选择：后台、锁屏、竖屏/context loss 按 pause reason 集合暂停；恢复不补后台 Tick，重置时钟/输入并显式恢复。严重前台过载也暂停，fault 只能恢复最近完整兼容检查点。

理由：浏览器不能保证持续后台循环，单机无需玩家离开时由 Bot 继续摧毁基地。代价：严重卡顿可能暂停；周期检查点以外的进度在强制终止/fault 时可能丢失。复审：联网阶段改由服务器权威时间，不能复用“不追赶”作为网络校正方案。

## ADR 005 轻量 ECS 与唯一状态所有者

状态：accepted。

选择：EntityRef(index,generation)，组件纯数据，System 分阶段执行；先用类型化存储，不先引入复杂 ECS 框架或全面 SoA。功能域是唯一写入者，跨域使用 Operation/只读投影。

理由：支持实体组合、来源归因和存档；避免英雄继承树。代价：存储和查询接口需要实现与基准测试。复审：M7 有剖析数据后才决定热点 SoA/现有库替换，保留语义和迁移测试。

## ADR 006 有类型队列与受限 Hook

状态：accepted。

选择：Command、Operation、Hook、DomainFact 分离；阶段排序和工作栈执行。叶子原子提交，不承诺整 Tick 自动回滚；根/Tick 限额由 ADR 015 联合容量证书推导，trigger/fuel/envelope guard 检测非法派生，不能让合法大范围内容受旧独立常数限制。

理由：复杂技能可通用扩展且结果可审计，避免无序 EventEmitter 重入。代价：必须规定 Hook 可写字段、来源快照、替换策略、溢出故障处理。复审：M2 对反伤/资源路由/死亡保护验证，扩展能力同时维护阶段和测试。

## ADR 007 数值 公式与属性转换

状态：accepted，正式平衡数值 proposed。

选择：FormulaRegistry 集中管理，内容 formulaId/受限 AST，属性转换 DAG。权威有限 number 保留小数，UI 舍入不回写，金币/经验默认整数；MVP 承诺同构建同版本可重放，不承诺跨设备逐 bit 确定性。

理由：可表达原创复杂机制并自动测试。代价：编译器需要量纲/范围/循环检查；未来联网可能需要更严格数值策略。

暂定：抗性、穿透、急速及真实伤害默认政策按 COMBAT_PIPELINE；不声称复制其他 MOBA 当前补丁。候选装备槽 6、攻速/史诗目标/生命层规则须在正式 Ruleset 讨论后定值。复审：M2/M5 和每个原创英雄 M8 实施。

## ADR 008 Bot 使用过滤感知与统一命令

状态：accepted；策略模型 proposed。

选择：Bot 只能读同席位信息权限过滤的 Perception/PerceptionEvent 与 observedTick 记忆，和玩家共享 Command 校验。可利用合法方向/声音/播报但无隐藏 World 访问。局部 100 ms、战术 200 ms 按 tickRate 转换并锁定，避免率对照改变 AI 频率。

理由：不以全知读取或跳过控制规则伪造智能，保留 replay/未来席位替换。代价：团队协作与信息记忆要单独设计。候选策略：局部有限状态机 + 评分决策，团队层共享已知信息与目标意图。复审：M6/M7，以可解释性、停滞、性能和游玩结果评估，不先实现复杂学习模型。

## ADR 009 视野 空间与导航

状态：proposed。

候选：动态/静态均匀网格；导航栅格或导航网格配合增量 A*；队伍视野位图、静态遮挡和草丛区域规则，视觉迷雾单独平滑。

理由：易于控制范围查询和移动端成本。待定：地图世界尺寸、逻辑单元精度、草丛攻击暴露、遮挡线算法、路径预算。代价：粗网格可能损害贴墙/远距离视野，细网格可能占 CPU/内存。

复审：M1 探针、M4 规则验证、M7 压力测试。无论采用哪个算法，都保持权威位置/视野独立于 Sprite 和视觉贴图。

## ADR 010 存档与内容版本固定

状态：accepted。

选择：IndexedDB 保存设置、结果、两份 Checkpoint/回放；边界聚合模拟和控制器，包含 Information 授权/历史、tickRate 和容量证书标识。VisualProxy/预测轨迹不入权威存档。对局恢复严格匹配引擎/规则/内容/率与证书；迁移用纯函数和 fixtures。

理由：避免新数值错误继承旧对局，完整保留 Bot 与计划任务。代价：旧版本对局可能无法在新版本继续，须保留文件并明确说明。资源缓存不作为备份，提供主动导出/导入。

复审：M5 完整恢复等价性，M10 PWA 更新/缓存/迁移。Service Worker 不执行后台模拟，对局中不切代码版本。

## ADR 011 2D 横屏与资源格式

状态：proposed；Phaser/TypeScript/Vite/WebGL、触屏优先为 accepted。

候选：2D 俯视战场，必要 HUD 用 Canvas，菜单用 DOM，16:9～22:9 适配，正式产物为 Vite 多文件 dist，后期 PWA。不要求单文件 HTML，不做 3D 美术管线。

理由：降低 Android 首版成本并适合当前技术栈。代价：视觉方向还需单独确认；正式视角/地图比例和低端 backbuffer 需触屏验证。复审：M1/M3/M9，改变视角不改变战斗坐标和规则。

## ADR 012 性能预算与最低能力

状态：proposed。

候选：约 4 GB 非旗舰 Android，低画质 30 FPS；30 Hz 是未最终接受的当前逻辑基线。标准 Tick p95 ≤6 ms、压力 ≤12 ms 是目标，容量修订后峰值要重新验证；Operation/队列容量按证书/profile 推导，不能把算例数值当最终预算。

待定：具体最低 SoC、Android 和 Chromium 版本、WebGL1 兼容范围、真实 draw calls 和视野精度。候选测试工具 Vitest/fast-check/Playwright/依赖扫描器，版本在 M1 锁定。

理由：有可测量初始目标，避免以用户旗舰手机代表最低性能。代价：初始数值可能需要根据真机和正式内容调整。复审：M3、M4、M7、M9、M10；M1 仅高档基础实测通过，低档候选按 ADR 019 延期，未实测不标记通过。

## ADR 013 当前不实施真人联网

状态：deferred。

选择：只保留 CommandSink/ObservationSource/CheckpointCodec 契约；不写 socket、rollback、同步或服务端。候选未来服务器权威快照，M11 独立设计与验证。

理由：先保证单机闭环、规则和架构稳定。代价：联网仍是完整工作阶段，可能要求数值、协议与投影调整，不能宣传“已经预留所以轻松上线”。

## ADR 014 阶段范围与正式地图

状态：accepted 的范围，地图具体形式 proposed。

选择：M3 战斗验证、M6 单线对局 MVP、M7 单机十席 5v5 MVP、M10 稳定离线发行。当前 M1，仅实现空外壳、最小实体及几何响应 fixture，正式游戏系统仍未实现。

候选正式地图为三线加野区，两队各五席；正式大小、波次、目标、复活、助攻窗和平衡数值在 M4/M5/M7 按 Ruleset 定义。MVP 的基础英雄可重复填席位，原创英雄按完整原稿在 M8 实施。

理由：分阶段验证，尽早暴露规则和规模成本。代价：早期交付不等于长期完整游戏；每阶段需明确缺口。

## ADR 015 联合 Ruleset 容量证明

状态：accepted 的规范；编译器、正式 Ruleset 证书、EngineCapacityProfile 和真机性能尚未实现/验证。

修正：旧查询 512/单位 454 与单根 128 Operation 不兼容，旧单 Tick/根数量常数也未证明并发。撤销独立固定 Operation/根上限，以 COMBAT_PIPELINE 第 6.2～6.4 节为公式唯一来源：Croot(e)=S_e+F_e×(B_e+R_e+D_e)，Ctick=Mmax+Σ_k[N_k×max(Croot(e), e 属于 k)]，CrootCount=Σ_k N_k。F_e 覆盖全部合法目标，R/D 包含完整 Replacement/Hook/二次扇出，N/M 包含所有生产者与维护最坏重合。

选择：Lroot(e)、Ltick、LrootCount 分别为对应证书上界的 roundUpPow2，profile 必须覆盖它们才可开局；Qmax 当前 512、Umax 当前候选 454。无法静态判定用可证明有限 envelope 和运行时 guard，不能用平均情况或对局中剪目标解决。已认证合法工作≤证书≤故障限额；违规/无限循环仍故障冻结，CPU 超载另行暂停。

人工示例：F=454、B=3、R=1、D=4、S=2 →Croot=3634、Lroot=4096；仅在最多两个此根且其他全部工作≤1200 的假设下 →Ctick=8468、Ltick=16384。它不是正式容量或十席并发限制；真实 profile 要由实际内容证明和成本测量推导。

理由：正常大范围内容完整执行，故障 guard 聚焦违反合法上界的行为。代价：联合编译、生产者/延迟任务分析与工作量计数更复杂；保守上界可能很大，需要优化和真实基准，而非假称有限就足够快。

复审：M2 证书/独立模型与最大目标测试，M4/M5/M7 加地图/成长/并发时重编；每次内容、Tick 率、上限或合法组合改变重算。证书算术需检查整数溢出，无法表达的上界阻止编译；不在运行时回绕计数。

## ADR 016 空间视野与信息披露分离

状态：accepted 的架构边界；策略数据和实现待 M4。

选择：Visibility 负责空间视野/草丛/隐身及目标选择证据；新增同层 Information 负责 DisclosurePolicy、RevealPolicy、授权历史与 PerceptionEvent。runtime 注入空间快照/事实/策略，两者不互相导入实现。contracts 定义 DTO，content 编译规则，application 分发授权结果；模块 DAG 方向不变。

策略表达 recipient、eventType、source/targetDisclosure、positionPrecision、duration、private/team/public audience 和 local/global spatialScope。允许未知源声音、方向提示、全局预警/击杀/目标播报、team Ping、匿名事件、最后位置、队伍共享与主动显形；这些不是全部单位状态访问权。RevealPolicy 区分空间显形和仅字段授权，可针对隐身/草丛明确例外。

UI/音频/小地图不决定权限，Bot 使用同席位过滤结果；不提供隐藏原始事实、精确声源参数或可关联私有 ID。声音/信息授权不自动使单位可选，队伍分享不能放大授权。持续信息/公开事件有期限、去重、保存和输出工作量证书。

理由：空间不可见仍可有合法信息，避免“所有声音和小地图都等同视野”阻止游戏设计。代价：要维护字段/精度/接收者矩阵、授权组合和隐私回归。复审：M4 权限矩阵，M5 恢复/到期，M6/M7 Bot 和队伍信息，M9 所有表现通道与匿名方向音频。

## ADR 017 M1 骨架、工程门禁与依赖锁定

状态：accepted 的 M1 实施范围；高档参考基础 Android 已验收，最低能力与最终 Tick 率未定。

选择：Phaser 3.90.0、TypeScript 5.9.3、Vite 7.3.1、Vitest 3.2.4、ESLint 9.39.1 / typescript-eslint 8.48.1、Playwright 1.56.1。具体版本经 npm 元数据与安装树核实，唯一 package-lock.json；不声称使用当日最新版本。Node 实测 24.19.0，生产转换目标 Chromium 107，浏览器最低能力仍是候选。选择已知 Phaser 3 API 和 Vite 7 分支，升级必须另做回归。

application 显式创建 Session、Simulation、ProbeController、Phaser 与平台监听器。Simulation 私有 World 通过冻结 facade 隔离，表现仅得到复制冻结的授权 DTO，没有 World 指针。EntityRef 维持 index/generation；Kernel 访问通过额外的 session scope，外部 Command 通过 matchId 隔离。调用方必须为新 Session 提供新的 ID；组合根使用单调 session token，不能复用。

参数化 FixedTick 接收外部单调时间脉冲；Phaser 的 Scene.update 只调用这一入口，忽略平滑 delta。4 步 / 250 ms 过载规则和明确恢复不补时间已落实。纯编译边界使用 ES2022 lib、types=[]；AST 导入扫描检查别名、type-only、再导出、动态 import、SCC 和内部功能域白名单；单独的反例测试证明拒绝能力。

代价：M1 的调试 hash 使用有界命令历史和确定顺序，包含 Tick、探针状态、实体 generation、队列、去重窗口；FNV32 仅用于诊断，不是存档/安全校验和。未来 Checkpoint 与严格 replay 格式仍在 M5，M1 不伪造保存恢复。fault 不可直接解除，当前只能重建 Session。

validate:content 在 M1 只确认正式内容目录为空，输出 NOT_APPLICABLE_M1；发现正式内容直接失败。未实现 Schema/属性 DAG/容量证明/权限编译，不能宣称内容校验已通过。

复审：M2 建正式 content 编译及 CapacityCertificate，M3 替换响应 fixture 为通用 Movement/Actions 并复测，M5 完整存档。M1 真机证据、正式延期项与出口见 M1_ACCEPTANCE.md。

## ADR 018 响应 fixture 与测量边界

状态：accepted 的 M1 探针方法；手感结论 provisional。

响应 fixture 是一个公开的、归本地调试席位所有的几何点，速度 180 world units/s，无碰撞、地图、资源、生命、技能、敌人和隐藏信息。debugProbeDirection 不是正式 MoveCommand，正式功能目录只留空位置，不注册战斗 Operation/Hook。empty 模式没有实体且 Observation/RenderDelta 为空。这个例外只服务 M1 已授权的移动响应探测，M3 必须改为正式通用系统，不向正式内容开放。

A 使用 previous/current 插值；B 使用立即触控标记及 presentation 私有 VisualProxy，预测只参考已授权本地样本和本地意图，时长 clamp 到一个 step，下一权威样本重基准。取消、失焦、暂停、拒绝、Session 变化取消代理；discontinuity 禁止插值/预测。M1 无控制/死亡系统，这些取消入口的实景验收到 M3，不能称已验证。A 的一般 Pointer 标记也在帧内显示，比较主要是视觉代理，不人为延迟 A 的普通 UI。

采集统一用 platform.performance.now。输入原始事件采集、控制器入队、完成 P3/P9 边界、Phaser POST_RENDER 分开记录。权威位置提交的时间用完成 step 的外层时间估计，包含当前空 P4–P9 开销，未来 phase tracing 再细化。POST_RENDER 只证明软件渲染提交，未测 GPU 合成/屏幕发光。Tick CPU 单独包围 simulation.step；帧 CPU 为 Scene.update 至 POST_RENDER 区间（含模拟/表现/Debug，不含区间外浏览器/合成器），每秒成本按采集会话 wall time 统计，包含暂停时间。

每指每帧只标记实际绘制的最新样本；Controller 按 Tick 只消费最新移动意图，缺失/合并样本通过 captured 与各指标 count 区分，不能伪造每个事件都有权威位移。begin/end 通常零方向，权威接受时间与真正移动延迟分别列出；没有位置变化则不计为移动成功。所有日志/采样缓冲有界（2000），命令重试历史 512，过窗重复明确拒绝。

桌面自动化固定生产 dist，通过 CDP 输入，不使用 HMR 运行作测量，避免测试中源码重载污染；三轮交替 A/B 各 100 次手势。数据仅用于软件测量基线，不能支持 Android 电耗/温度/最终 30 Hz 决策。高档 Android 正式三轮结果已按用户报告收录；非旗舰与长期热态按 ADR 019 延期，物理端到端仍未测。C 当前不触发，M3 复审；M1 没有接受最终率。

## ADR 019 M1 验收策略修订与正式延期

状态：accepted；2026-10-01，依据用户实际 Android 结果和明确不再执行本阶段长负载/不因找设备阻塞工程的决定。同步修订 MILESTONES、PERFORMANCE_BUDGET、CODING_RULES、ARCHITECTURE 与 M1_ACCEPTANCE，取代 0.1.1 将两档设备/空壳长期测试同时绑定 M1 出口的要求。

理由：M1 仅有空壳与公开几何响应点，没有真实技能、碰撞、地图或 Bot；20 分钟 A/B 的代表性及电池百分比信息有限，当前执行成本高。第二档约 4 GB 非旗舰仍是长期支持门槛，但寻找设备不应阻塞已验证的软件架构。高档参考基础生命周期、三轮真实 60 FPS A/B 和约 198 秒零实体 S0 提供本阶段实际证据；不推广到最低设备或完整玩法。

正式状态：A/B 各约 20 分钟持续负载、冷热态温度/降频、电量百分比比较，以及第二档约 4 GB Android 都是 DEFERRED / non-blocking performance validation，未执行、不是 PASS。M3 开始复审，在首个代表性实战负载性能基线执行相同亮度/刷新/充电/环境的配对测试；两档设备分别验证生命周期、响应、CPU、帧时、资源及可获取的热态/电量信息。接口不可用单列 unavailable，不能造温度或 mWh。M7 低档 45 分钟完整对局、M10 最低设备/发布兼容矩阵仍是强制门禁；未来缺失仍阻塞对应性能/发行结论。

代价与边界：当前不能接受最低 SoC/OS/Chromium、低档性能、热稳定、电耗优势或永久 30 Hz。物理 touch-to-photon 未测，WebGL loss 的 Android 人工触发未报告，逐阶段原始样本/权威首次位移 p95 尚未提交，诚实保留测量缺口；不要求重做用户已通过的基础生命周期。本轮不删长期要求，不减权威隔离/导入/逻辑正确性门禁，不实施任何 M2 系统。

出口：M1 必需软件门禁通过且当前基础真机项 PASS 后，可正式结束；以上明确延期项不阻塞 M1 软件架构出口。M2 可以开始，须另有明确阶段任务。本决定不是完整游戏、最终手感或发行认证。

## ADR 020 Phaser 限帧修复与可追溯真机构建

状态：accepted 的 M1 配置修复与回归保护。

问题：Phaser 3.90.0 原 fps={target:60,limit:60,smoothStep:false} 在 Android Edge 153、系统 60 Hz 下长期约 30 FPS，frame p50/p95 约 31–34 ms。用户将 limit 改为 0 后立即稳定约 60 FPS，正式 A/B 与 S0 均在修正版完成。修复 commit 为 d4124a6402809363d3e866c50d6c110c90ff241c；Pages Actions run 36868684893/attempt 1 的 build、门禁、artifact upload 与 deploy 均经仓库记录核实成功。

根因：应用把 fps.limit 误用作目标值。锁定源码 [TimeStep.js](https://github.com/phaserjs/phaser/blob/v3.90.0/src/core/TimeStep.js) 中 target 不设置浏览器刷新率；limit>0 选择 stepLimitFPS，等待累计 delta>=1000/limit 才调用 Game，随后 delta 清零。60 Hz RAF 间隔轻微短于 16.667 ms 时可跳过当前帧并形成隔帧调用，这与真机症状一致；没有逐 RAF trace，具体设备时间戳/相位是机制推断，不冒称已独立测得。确认的应用修复是禁用该额外门槛，不改变 Simulation rate，不归因于 World、GPU 负载或所谓“30 Hz 只能渲染 30 FPS”。

选择：fps={target:60,limit:0,smoothStep:false}，遵循浏览器 RAF。它不是强制屏幕 60 Hz，未来高刷新率设备实际 Rendering 仍应记录/控制变量。tests/unit/presentation-fps.test.ts 截获实际 Phaser.Game 构造参数，重新引入 limit:60 会失败；依赖升级须重测。已通过的 Android 生命周期无需重复。

构建：Android 正式验收优先 https://althanor.github.io/moba/ ，仓库 althanor/moba，GitHub Actions npm ci/check 后构建 /moba/ artifact 再部署。每次验收记录完整 commit、run/attempt 与构建 JSON；Vite 同时输出 build-info.json，并将同一元数据写入测量导出。本地/压缩包标记 local、dirty/unknown 和无 Actions 信息，不能冒充 Pages 构建。构建追溯缺字段或checkout SHA与GITHUB_SHA不一致时Actions build失败。workingTreeDirty按实际git状态报告，Actions生成报告也可能使其为true，不伪造干净工作树。云端浏览器不能替代 Android，Pages 不降低多指/生命周期/性能要求，本地 preview 为 fallback。

证据局限：本次旧格式真机 JSON 未内嵌 commit；测试采用修正版由用户声明，仓库修复与成功部署链独立核实，两者合并形成收口记录，不声称从每轮原始 JSON 验证 SHA。新字段服务后续追溯；当前新收口构建未另做 Android 验收，不自动套用旧硬件 PASS。
