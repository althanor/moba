# MOBA 变更记录

## 0.4.2 — M3 Android toolbar multitouch repair candidate（等待独立源码复核）

- 基线 main c95a6d76f34a9f8621586a9bd84160f71061170d/0.4.1；此前软件出口已独立复核，Android A/B 因真实 toolbar blocker 暂停。
- touch/pen 主按钮 pointerdown 接第二触点；按 click provenance 去重，鼠标/键盘/可访问性保留，不依赖计时窗口。
- control 不 clear input，其他九种 action 保留清理；CC 结束重采仍 held 的 contacts，经原正式 Command 恢复意图。
- 新增真实 CDP Canvas+DOM 双/三指、停止/恢复、逐 action count、一次重建/切模式/下载与 unit 事件模型回归；原163 tests保留。
- 升版并重新绑定证书；authority/content/profile 数值不变；完整软件门禁和成本以本轮报告为准。
- 保留用户已有 Android A/B 功能事实；竖屏因设备操作时防转屏保护为 UNAVAILABLE；移动中 control/B prediction→control 结论 pending。
- 不推送 main、不部署 Pages；M3 整体/Android未PASS，30 Hz provisional、A默认/Bexperimental/C未触发，不进入M4。

后续状态：下方 0.4.1 当时的候选措辞是历史；用户现已确认它通过独立复核并推送 c95a6d76，正式真机验收已开始但被新 blocker 暂停。

## 0.4.1 — M3 software repair candidate（等待再次独立复核）

- 修正 CSS→world 向量独立轴缩放，保留屏幕摇杆 analog magnitude；aim preview 在同时移动时跟随当前授权源位置。
- Movement 独立 penetration recovery，ignore 明确包含 path+endpoint，projectile 原始 t=0 overlap 命中语义保留。
- root/docs MILESTONES 当前状态唯一；check:docs 增加当前阶段矛盾/历史标记门禁，build/docs/check 共用 source phase。
- 原 131 tests 保留，新增 aspect、penetration/replay 和 semantic status；全 11 门禁重新执行，engine/compiler 重新绑定证书。
- 0.4.0 最终软件出口声明因独立复核阻塞撤回；复核前禁止 main/Pages/正式 Android A/B/M4；A 默认、B experimental、30 Hz provisional，C 不因这轮 bug 触发。

## 0.4.0 — M3 software candidate（真机等待）

- 基于用户确认正式收口的 M2 0.3.1/main c57fa8c，重新读取最新规范和全部 ADR。
- 通用 Action/cost/refund/charge/cooldown、movement intent/step Operation、collision/grid/spatial、swept Projectile、Area，均接既有结算链。
- 数据基础英雄、极简触屏战斗场、多指/瞄准/取消/锁定/控制挑战、A/B 软件测量、原 ?probe 入口。
- 更新所有 M3 producer/certificate/profile；保留 M2 合法极限与全回归；正常 gameplay profile 与 logical maximum 分列。
- Android gameplay/第二档/持续冷热态/电量/温度/降频 BLOCKED；30 Hz provisional、A 默认、B experimental、C 未触发，不进入 M4。

## 0.3.1 2026-10-02 M2 scan accounting 修订候选

0.3.0 最终软件收口撤回：4096 个合法 constant formula 的反例揭示未计账 Array.find，不能以旧 scans 证明全部非 Operation 工作。ADR 023 记录反例、受影响不变量和修订。

- 新增 Session 私有 definition/certificate 索引、带 session/generation 校验的直接 Entity lookup、版本绑定 attribute trace 索引；保留原 contentHash/稳定迭代顺序，不向 presentation/controllers 暴露。
- status/hook/shield/resource/query/diagnostic/maintenance 每一遍元素访问计 scans；稳定合并排序有可移植读取界。lookups/structure、startup/command 证书和 profile 开局验证覆盖固定解析、冻结/序列化/hash/归档，不能移出 scans 后不证明。
- producer certificate 保存 provenEffects，最终 guard 在任何 Operation 前拒绝 mismatch。诊断 participant 独立复制，避免不合格 Hook 的 Fact 冻结后阻断后续合法 Hook。
- 增加 4096×三类 definition 反例、454 直接解析、手算 conservation、大 Tag/盾类型/属性读取、深冻结及 producer 负例。原 454×454、20 roots、到期/周期/维护完整峰值和 M1 全部回归保持。
- compiler m2-indexed-v2 /profile m2-headless-v2，工程与锁文件 0.3.1；依赖不变。最终 11 软件门禁和旧/新成本见 M2_TEST_REPORT 与原始 JSON。

状态为独立复核候选，不宣称最终 M2 收口。Android 性能 DEFERRED，桌面成本不是性能 PASS。不进入 M3，不推送远端 main。

## 0.3.0 2026-10-02 M2 属性、状态与战斗内核

基于远端 main 163df7ee30c92d9c0f7ab6b6374ebe08475d9a4a / 0.2.1。完整读取当前规范和 ADR；Actions run 36938625773 attempt 1 的 validation/build/artifact/deploy 成功后才实施 M2。本地交付未冒称已推送部署，M2 出口及完整门禁状态见 docs/M2_ACCEPTANCE.md。

- 新增 contracts/content、content/compiler/validation、foundation 确定性数据工具；JSON 严格 schema、引用/稳定 ID、量纲/数值范围、属性 DAG、有限 Hook 触发图与冻结 CompiledCatalog。validate:content 正式编译合法 fixture/profile，取消 NOT_APPLICABLE_M1；未登记 JSON 拒绝。
- 分层实现 attributes/resources/status/combat features、shared formulas、kernel guards/FactQueue 和 runtime 调度；基础/加法/百分比/乘法/Override/转换/Clamp 各阶段可诊断，缓存按状态版本失效。
- P0 半开区间到期与再生，P5 稳定串行 DFS Operation/Replacement/Post 派生，P6 单次死亡，P9 冻结完成边界。免疫、控制能力入口、独立 Modifier 来源、护盾优先序、防死、资源不足与幂等均使用通用数据。拒绝尝试不触发 Post Hook；无 hero-specific 分支或任意 JS 内容。
- 联合 CapacityCertificate 覆盖 F/B/R/D/S、完整二次扇出、全部 producer/根并发、Modifier/状态/护盾/资源/死亡维护及非 Operation 工作；推导 next-power-of-two fault limit，profile 开局覆盖。动态无证明路径拒绝开局，运行时定位真实证书/上限违例。
- Damage breakdown 保留来源链、Operation 时刻的公式节点/属性 DAG 祖先与 Modifier 贡献、抗性/护盾/HP/过量/防死/最大值 Clamp 等阶段与原因；单同步非重入 FactQueue 全量消费。full 归档保留全部记录；summary 保留全量种类计数和最近 2000 条调试记录，produced=consumed，不少结算。raw DTO 不向 presentation/controllers 开放。
- 新增属性、内容负例、战斗、容量、资源量守恒、同 seed/commands replay、失控 AST 故障与完整 454-target 并发峰值自动化；保留 M1 测试。新增 test:content/test:capacity，完整 check 纳入真实内容与容量门禁。
- 主 Ruleset 20 根 ×454 主/二次目标并与维护/到期重合：4,574,049 Operation、9,135,386 Fact 完整消费；actual≤certificate≤limit。另有 829,457 Operation /1,655,282 全量归档 Fact 的独立联合 fixture。报告含 profile、证书、实际值和成本，不用削目标/漏 Hook/少结算换通过。
- 文档规范 0.1.3，新增 ADR 021/022、M2 实现/验收/报告；工程与锁文件 0.3.0，依赖版本不变。构建追溯 phase=M2；M1 30 Hz provisional /A 默认/B 实验/C 未触发和 Phaser 配置保持。

性能缺口：联合峰值单 Tick 为秒级，full trace 约 GiB heap，未满足性能预算；这些是桌面诊断成本，非 Android/热态 PASS。尚不支持 ExtraHealthLayer、一般 ResourceRoute、动作预留/退款、完整驱散类别、复活/奖励、Information/Checkpoint/Bot。schema 拒绝未支持字段。本轮没有进入 M3。

## 0.2.1 2026-10-01 M1 真机验收收口

M1 按规范0.1.2的正式修订标准可以结束；M2就绪但未实施。规范修订保留0.1.1架构不变量，不降低权威隔离/逻辑正确性，不删除最低设备和长期性能要求。

- 收录用户高档Android Edge153实际PASS：横屏/多指、pause/step/resume、后台/锁屏/竖屏无catch-up且明确恢复、Session recreate及Canvas/renderer生命周期；S0 empty≈197.97s/5938Ticks，Frame p95=17.1ms、Frame CPU p95=0.4ms、Tick CPU p95=0.1ms。
- 记录Phaser3.90.0 limit:60→0修复（d4124a6）：原额外limiter导致约30FPS，修复立即恢复约60FPS；根因机制与未采逐RAF trace的推断边界见ADR020。修复前约30FPS A/B仅诊断，不参与正式定案。
- ADR003采用修正版正式60FPS三轮A/B：A默认、B实验性presentation-only≤1Tick、C当前不触发；B无稳定工程收益且纠正≈6world/Tick。保持30Hz provisional baseline，M3真实技能/墙体/CC/取消窗口/负载再评估，不直接改60Hz。run-level p95中位数不当合并事件p95，capture→accept不当首次权威位移或物理发光。
- ADR019正式修订M1出口：A/B各20分钟冷热态/电量/温度/降频及第二档约4GB非旗舰为DEFERRED / non-blocking performance validation，未执行而非PASS；M3复审、首个代表性性能基线补测，M7低档45分钟完整对局及M10最低设备/兼容矩阵发行门禁保留。
- README/M1_ACCEPTANCE改为GitHub Pages优先，仓库althanor/moba，成功修复部署run36868684893/attempt1已核实，本地preview为fallback。Pages不降低触控/生命周期/性能要求，云端浏览器不替代Android。旧格式真机JSON未嵌SHA，关联依据用户声明与仓库部署链，不冒称逐轮原始文件已核验。
- 构建输出build-info.json并嵌入测量导出的相同commit/run/attempt；Actions缺字段或checkout SHA不一致时失败，本地/未知/dirty明确标记。导出移除失真的“Android全部待用户执行”硬编码，也不自动宣布某新样本硬件PASS。
- 新增实际Phaser.Game配置回归；实际将limit临时改回60，测试如预期失败exit1，恢复后全门禁通过。新增构建追溯正反例；浏览器门禁改用/moba/生产构建并验证元数据与下载JSON相同。
- 同步根目录/docs七对全文规范和验收副本，修正“M0无工程”等过期状态及相对链接；新增check:docs避免漂移。依赖版本不升级，工程版本/lockfile为0.2.1，打包版本从manifest读取。
- 实际运行npm ci、typecheck、lint、check:deps、check:docs、validate:content、test:unit、test:sim、build、test:browser、check：全适用门禁exit0，24unit/architecture +16simulation/replay +4production-browser=44项PASS；deps42文件/80边。content明确NOT_APPLICABLE_M1，不伪造正式内容编译。历史软件探针JSON保留，未重新做桌面性能定案。

已知边界：第二设备与长期热态正式延期；最低能力/最终Tick率、物理touch-to-photon、真机主动context loss单独证据、A/B原始样本/完整分位数及首次权威位移p95未验证。Phaser大chunk提示保留。新收口构建未另做Android硬件测试，不把旧构建PASS自动套到新导出。当前无M1软件架构出口阻塞；正式内容/战斗/技能/地图/Bot/PWA仍按原阶段实施。

## 0.2.0 2026-10-01 M1 工程骨架与核心基础

M0 已正式结束，按 0.1.1 的 M1 范围创建 Phaser/TypeScript/Vite 工程与唯一 lockfile；当前停在 M1，Android 真机出口未完成，未进入 M2。

- 建立 foundation/contracts、私有 Simulation/EntityStore、Session、参数化 FixedTick 与空 Observation/RenderDelta。最小 generation 复用/退休与 Session/match 隔离；没有全局 World/ServiceLocator。
- Phaser 空场景仅网格/矩形/圆。application 桥接唯一单调时钟，4 步/250ms过载暂停，暂停集合/显式恢复/单步/重开/生命周期清理。
- Android 多指 Pointer 采样及按 Tick 合并；取消/失焦/旋转/overlay/context loss 清理。A普通插值、B非权威 VisualProxy，窗口≤一步、按新样本纠正；不改 World/碰撞/视野/资源。
- 建立 strict 无DOM core编译、lint、白名单/SCC/别名/类型/动态导入门禁、未知命令校验、有界重试和测量缓冲。
- validate:content 明确 NOT_APPLICABLE_M1，当前只阻止正式内容提前进入，不伪造 schema/capacity/disclosure 通过。
- 软件时间戳区分采集/入队/Tick完成/POST_RENDER；记录实际样本与分位数、Tick/帧CPU及每秒成本、同 Tick 预测误差。电量/温度/物理触屏延迟未测。
- 40 项自动测试全部通过：20 unit/architecture、16 simulation/replay、4 Chromium browser。npm run typecheck/lint/check:deps/test:unit/test:sim/build/check 实际 exit0；browser额外通过，content阶段入口明确N/A。A/B桌面各三轮100手势，原始报告随工程保存。
- 更新原规范执行状态、ADR003与新增ADR017/018、依赖/实现/测试/Android验收文档、许可文本、SHA256 manifest。完整源码、规范、测试、报告和 dist一并交付。

已知缺口：Android两档真机/S0/冷热态/电量/最低能力与C必要性；最终Tick率未接受。Phaser大chunk提示保留，正式内容/战斗/存档/PWA等仍按后续阶段实施。详见 docs/M1_TEST_REPORT.md 和 docs/M1_ACCEPTANCE.md。

## 0.1.1 2026-10-01 M0 外部审核修订

整体架构保留；本轮只改七份规范，仍停 M0。没有创建 src、package.json、探针/测试源码或游戏系统，也没有进入 M1。

### 修订条款清单

| 文件与条款 | 具体修订 |
| --- | --- |
| ARCHITECTURE §1.2 §3 §5.1 §8 | 新增同层 Information 与 Disclosure/Reveal/PerceptionEvent 契约；内容编译纳入联合容量证书；原始事实不直接外发 |
| ARCHITECTURE §7.1～7.4 | 30 Hz 改为 provisional baseline；时间按 tickRate；A/B/必要 C 探针、VisualProxy 安全边界和决策出口 |
| ARCHITECTURE §9 §10～13 | 空间视野与字段披露分开；全部信息情景/权限字段、授权存档/目录/Debug 测试与系统归属 |
| COMBAT_PIPELINE §1 §2 §6.2～6.4 | 撤销独立固定根/Operation 限额；定义 F/B/R/D/S、Croot/Ctick、生产者/维护上界、推导故障限额、envelope/非 Operation guard、人工算例 |
| COMBAT_PIPELINE §7 §8 §10 | 助攻按真实时间换算；有限披露不赋予可选目标；最大合法扇出与并发/权限回归 |
| PERFORMANCE_BUDGET §1～3 | 逻辑容量与 CPU 门禁分开；统一证书公式/profile、广播工作量；30 Hz 预算仍为未测目标；A/B/C 各延迟、CPU、电量/热量和测量方法 |
| PERFORMANCE_BUDGET §5～8 | 音频按披露精度输出；保存真实时间/授权状态；新增 S7 响应与 S8 容量峰值，actual/certificate/limit 调试 |
| MILESTONES M0～M7 | M0 修订范围；M1 基础/M3 技能探针与大量实现前决策门禁；M2 容量、M4 信息、M5 保存、M6 Bot、M7 最大合法并发验收 |
| CODING_RULES §3 §5 §8.1～8.4 | validate:content 纳入证书/权限；禁止容量/信息/预测越界；新增合法大范围/并发、披露矩阵与同率/跨率测试门禁 |
| DESIGN_DECISIONS ADR 001 003 006 008 010 012 015 016 | Tick 状态重定义；联合容量证明和独立信息披露 ADR；持久化/AI/预算说明同步 |

### 修订理由与验证范围

- 范围查询容量覆盖单位总量，不意味着单根/整 Tick Operation 足够；必须证明所有合法扇出和生产者重合，故障限额用于发现越 envelope/失控行为。
- 事件存在、来源身份、位置精度与空间可见/目标选择是不同权限；由权威 Information 统一求值，Bot 不获得隐藏 World。
- 固定 Tick/表现解耦保留；30 Hz 未永久定案，A/B/必要 C 数据及采用预测的依据后续写 ADR 003。
- 本次可核查内容：七份文档结构/链接、声明导入 DAG、跨文档公式/权限/时间/阶段一致性、人工算例与打包范围。
- 未实施内容：真实 Ruleset 容量编译、guard/游戏运行测试、TypeScript/build、Android 延迟/CPU/电量/热态探针。初始延迟/性能阈值和算例不是已验证事实。

下方 0.1.0 为历史记录；与当前规则冲突处以 0.1.1 文档和上述修订为准。

## 0.1.0 2026-10-01

### 新增

- docs/ARCHITECTURE.md：完整系统边界、状态所有者、导入白名单、数据流、Entity/组件、数据驱动、生命周期、Tick、事件、存档/配置、Debug 和目标目录。
- docs/COMBAT_PIPELINE.md：P0～P9 阶段、同 Tick 排序、攻击/施法、伤害/治疗/护盾/资源/控制、Hook 派生、归因/奖励/复活、位移/视野与商店事务规范。
- docs/CODING_RULES.md：开发流程、严格类型、依赖门禁、状态/时间/公式约束、测试设计、资源许可与报告要求。
- docs/MILESTONES.md：M0～M11 分阶段范围、依赖与出口标准，单线 MVP、5v5 MVP、PWA 和联网边界。
- docs/PERFORMANCE_BUDGET.md：Android 设备候选、5v5 实体/事件/路径容量、CPU/GPU/内存/存档预算、压力与热态测量。
- DESIGN_DECISIONS.md：采用约束、候选算法、待定正式数值、复审里程碑和当前不实施范围。

### 行为与范围

- 采用独立权威模拟层，Phaser 负责表现；玩家、Bot 和回放共享命令入口。
- 规范导入图和模拟内部依赖为 DAG，权威规则使用明确阶段与受限 Operation/Hook。
- 默认 30 Hz 模拟、单机后台暂停、内容版本固定，保持未来联网边界但不实现网络。
- 本次只创建架构文档，没有源代码、package.json、游戏系统、运行 Demo、画面或第三方资源。

### 验证

- 文档路径、相对链接、Markdown 结构、系统覆盖、依赖白名单 DAG 与跨文档阶段/限额一致性在交付前核查。
- TypeScript、Vite build、运行测试、Android 真机与性能实测：不适用或尚未实施，没有报告为通过。
- 性能数值和部分技术选择为初始目标，具体依赖版本、最低设备、地图/导航/视野和正式战斗数值仍待后续阶段验证。
