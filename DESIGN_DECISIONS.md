# MOBA 设计决策记录

版本：0.1.1。日期：2026-10-01。当前阶段：M0。

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

## ADR 003 固定 Tick 与 30 Hz 候选决策

状态：固定 Tick/表现解耦原则 accepted；30 Hz 为首选默认候选和 provisional baseline，最终 Tick 率未决、未实测。

选择：当前基线 30 Hz、渲染可 30/60 FPS，Session 锁定 tickRate，持续时间按率转换、攻击保留余数。前台四步/250 ms 过载策略仍是基线；不在运行中动态改率。本轮不改 60 Hz、不创建探针源码。

依据与代价：降低每秒模拟次数可能有 CPU/电耗收益，但这是待测假设。约 33.3 ms 的步长和接近一 Tick 的常规插值延迟可能影响摇杆/瞄准/释放反馈，不能由理论帧率证明可接受。

M1/M3 比较 A：30 Hz Simulation + 60 Hz Rendering + 当前插值；B：30 Hz Simulation + 60 Hz Rendering + 即时输入反馈/安全 VisualProxy 预测；C：必要时 60 Hz Simulation + 60 Hz Rendering。C 的插值/反馈与对应 A/B 配对记录。M1 基础移动/UI，M3 技能按下/拖动/释放、碰墙/控制/取消与热态；指标、条件、暂定阈值见 PERFORMANCE_BUDGET 第 3.3 节。

接受最终 30 Hz 的条件：有非旗舰/高档参考的 touch→UI、视觉移动、权威移动结果及手感评估，CPU/每秒成本、电量/热量记录或明确缺口；说明是否采用 B、预测范围和纠正误差，为什么响应可接受。A/B 不达目标、精度或成本需要对照时完成 C。M3 决策记录前不大量制作正式英雄/内容；没有证据继续标记 provisional baseline。

决策证据状态：A 未测；B 未测；C 必要性待 M1/M3 评估、未测。当前没有“30 Hz 手感已通过”结论。后续改率需重编时间/容量证书、更新内容与存档兼容，不把 30/60 Hz 不同离散步长要求成逐 Tick hash 相等。

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

理由：有可测量初始目标，避免以用户旗舰手机代表最低性能。代价：初始数值可能需要根据真机和正式内容调整。复审：M1、M4、M7、M9、M10；未实测不标记通过。

## ADR 013 当前不实施真人联网

状态：deferred。

选择：只保留 CommandSink/ObservationSource/CheckpointCodec 契约；不写 socket、rollback、同步或服务端。候选未来服务器权威快照，M11 独立设计与验证。

理由：先保证单机闭环、规则和架构稳定。代价：联网仍是完整工作阶段，可能要求数值、协议与投影调整，不能宣传“已经预留所以轻松上线”。

## ADR 014 阶段范围与正式地图

状态：accepted 的范围，地图具体形式 proposed。

选择：M3 战斗验证、M6 单线对局 MVP、M7 单机十席 5v5 MVP、M10 稳定离线发行。当前仅 M0，不实现任何游戏系统。

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
