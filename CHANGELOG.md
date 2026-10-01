# MOBA 变更记录

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
