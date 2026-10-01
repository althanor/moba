# MOBA 工程编码与验证规范

版本：0.1.2。日期：2026-10-01。状态：M1 工程门禁已落实；后续阶段规则持续有效。

本规范约束后续 Phaser、TypeScript、Vite 工程的实现与修改。M1 可构建工程与相应门禁已落实；本文中正式内容、玩法和持久化要求按里程碑实施。

优先顺序：规则正确性 → 可测试性与稳定边界 → Android 可运行性与性能 → 表现质量。不得为了一个英雄绕过系统约束，也不得在未理解现有文件时重写整套工程。

## 1 每次开发任务的流程

1. 先阅读相关源文件、公开接口、测试、[ARCHITECTURE.md](ARCHITECTURE.md)、对应规则和 [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)。查明状态所有者和依赖路径。
2. 实现前说明影响哪些系统、改变哪些行为、哪些接口或数据版本可能受影响。若发现规则冲突，先记录明确选择，不静默改变。
3. 在已有边界内增量实现。新增复杂机制先定义 Operation/Component/Hook/Schema 和结算阶段，再增加数据实例。
4. 运行与修改相关的测试和内容校验，必要时增补数学/交互回归。测试失败先解决原因，不靠修改期望掩盖错误。
5. 运行类型检查、lint、依赖检查和生产构建。声明每项实际运行结果，未运行须写原因。
6. 完成受影响系统的回归；需要 Android 行为或性能证据时执行真机检查。
7. 更新规范、设计决策及 [CHANGELOG.md](CHANGELOG.md)，报告修改、文件、原因、验证、已知问题和下一步。

禁止悄悄删除功能、测试、资源或内容规则。重构必须保留行为或明确记录行为变更。不因为某阶段尚未完成而伪造测试、性能和 build 通过。

## 2 目录 导入与组合根

以 [ARCHITECTURE.md 第 2 节](ARCHITECTURE.md#2-模块依赖与循环依赖约束) 的导入白名单为唯一规则，不能把 type-only import 当豁免。边界类型定义在 contracts，foundation 不理解英雄、地图和对局。

application 显式构建 Session、内容、控制器、表现和平台适配；simulation/runtime 显式注册 feature 处理器。禁止全局 singleton World、ServiceLocator、未受控动态 import、模块加载时自动订阅 Event 和跨域共享可变缓存。注入的接口按用途小而明确，不用一个包含所有系统的巨型 GameContext。

feature 之间无直接实现依赖。需要其他功能数据时使用 contracts 的只读查询 DTO，需要改变其他功能时产生 Operation，不能直接修改组件或查到服务对象再调用。只读查询不可通过返回数组或 Map 暴露可变 World；生产模式优先使用投影/只读视图和约定，开发模式可加冻结/版本断言，不每 Tick deep-freeze 全世界。

依赖检查需覆盖：tsconfig alias、相对路径、再导出、动态导入、测试辅助混入产品、大小写不一致。文件依赖强连通分量有任何多节点环或自环均失败；模块白名单单独失败，避免“无环但反向导入”。设置依赖扫描器而不是只靠评审。

## 3 TypeScript 与构建要求

M1 建立严格 tsconfig，至少启用 strict、noUncheckedIndexedAccess、exactOptionalPropertyTypes、noImplicitOverride、useUnknownInCatchVariables、noFallthroughCasesInSwitch；配置符合所锁定 Vite/TypeScript 版本的 ESM 和 bundler module resolution。contracts 的纯数据与 simulation 编译边界不得依赖 DOM lib，presentation/platform 可以拥有环境类型。

输入边界以 unknown 接收，Schema 校验后才能转换类型；禁止用 as any 绕过内容、存档、命令和网络验证。非空断言只在已有断言/不变量保护的局部使用，并说明依据。Effect/Command discriminated union 必须 exhaustive，遗漏分支让类型检查失败。

ID 使用可区分类型或品牌类型，如 HeroDefId、AbilityDefId、EntityRef、ResourceId、TickIndex，避免全部裸 string/number 相互误传。数据对象命名字段必须携带单位语义：durationTicks、distanceWorld、screenCssX、ratePerSecond；不能让 UI 像素进入逻辑地图距离。

锁定具体依赖版本并提交唯一 lockfile。选择版本需检查 API/Android 支持，不能在多年开发中持续使用 latest 范围。Vite 的生产目标针对已记录 Android Chromium 范围；polyfill 和功能降级须显式配置，不能以开发机启动成功代替真机兼容。

Vite build 本身不替代 TypeScript 类型检查。M1 定义并实际验证以下统一脚本：

| 脚本约定 | 职责 |
| --- | --- |
| npm run typecheck | 完整项目与测试所需类型检查，通常基于 tsc --noEmit 或 project references |
| npm run lint | 代码规则、禁止环境 API、状态写入与未使用项 |
| npm run check:deps | 文件环、导入白名单、alias 和 type-only 依赖 |
| npm run validate:content | Schema、引用、属性/触发图、联合容量证书、Disclosure/Reveal 权限、资源与许可 |
| npm run test:unit | 纯规则和函数测试 |
| npm run test:sim | headless 模拟、交互、回放与持久化 |
| npm run test:browser | 支持环境中的触屏/生命周期/表现契约自动化 |
| npm run build | 类型门禁通过后生成 Vite 生产资源 |
| npm run check | 串行组织必要门禁，失败时退出非零 |

上述脚本已创建并实际运行。M1 的 validate:content 仅执行空内容阶段 guard，输出 NOT_APPLICABLE_M1，不能称正式内容校验通过；check:docs 另检查根目录/docs 副本一致性。

## 4 权威状态和执行语义

所有权威战斗状态只在模拟阶段处理器与 Operation 提交中写入。控制器拥有的感知记忆和 Session 命令入口状态在各自边界写入，并与模拟状态一起纳入检查点。组件是可序列化数据，不带计时器、闭包、Sprite、DOM、Promise。UI 修改按钮状态不会修改冷却，Phaser 动画回调不会提交攻击。

时间只由 Tick 推进，simulation 内禁止 Date.now、performance.now、requestAnimationFrame、setTimeout、setInterval 和 Math.random。性能测量在外层计时，传入的逻辑预算是固定工作量；不能按 CPU 实耗改变路径找到哪个答案或 Bot 做出什么决策。

随机性使用按用途分离的有版本 seeded RNG，例如 combat、spawn、AI；每条随机流状态入 Checkpoint。展示粒子用独立表现随机流，不能消费 combat RNG。排序必须显式，不能把对象键、集合插入或异步返回顺序当结算规则。

写入遵守阶段表和唯一 owner。对同 Tick 的事件、控制到期、生命/资源 Clamp、死亡去重、结构屏障与源快照的边界统一按 [COMBAT_PIPELINE.md](COMBAT_PIPELINE.md)。事务内出现非有限数值、超限、失效句柄或非法阶段要有明确拒绝/故障策略，不能吞错继续。

## 5 数据 内容与公式

每个内容 ID 全局稳定，在各自类型中唯一。引用支持跨文件验证，删除内容时报告所有引用者。Schema 包括 schemaVersion、必需字段、边界、数组长度、枚举、互斥条件；编译后的内容只读。

英雄/装备只能选择通用能力、定义参数和 Hook 组合。禁止在 Combat/Movement/Attributes 中写 if (heroId === ...)。扩展机制需要可复用语义、有独立测试和阶段规范，不能把英雄名称藏进 Tag 再恢复硬编码。

重要公式集中在 simulation/shared/formulas，数据使用 FormulaId/受限 AST 引用。Attributes 派生依赖以 DAG 编译，禁止运行时无界求固定点。伤害/治疗/资源/冷却/经验公式不得复制到 UI；UI 读已算数值和解释数据。

公式定义同时说明：单位、输入范围、上限、伤害指标、叠加桶、运算顺序、负值政策、有限性和舍入位置。不能先四舍五入给 UI，再拿显示值做战斗。原始 JSON 不允许函数、eval 或不可信脚本。

变更内容 Schema、存档、结算、RNG、命令、披露策略或 tickRate 需评估版本及兼容，重编内容/CapacityCertificate。MVP 存档/replay 严格匹配逻辑版本，不以“能够 parse”证明“继续玩正确”。

新增 Effect/Hook/生产者必须提供 F/B/Replacement/派生/共享工作上界和并发证据，按 COMBAT_PIPELINE 第 6 节计算 Croot、Ctick、profile 限额。禁止用平均概率或常规波次证明最大容量，禁止重置 rootId/分批到下一 Tick 绕过 guard。无法静态确定的分支声明可证明的有限 envelope；没有上界不能进入可发布 Ruleset。

信息权限只由 simulation/features/information 的策略求值决定。Visibility 提供空间证据，UI/音频/小地图/Controller 只消费授权 DTO。外发事件不得含被删字段的原始事实指针、因果 ID、精确音频参数或隐藏 EntityRef；方向/匿名/全局授权不自动赋予可选目标。Bot 使用相同席位权限，不能调用内部查询补齐隐藏状态。

30 Hz 为 provisional baseline，最终选择按 M1/M3 A/B/C 探针。时间按 session tickRate 编译，不能把冷却/AI/保存/助攻的 30 Hz Tick 常数写死。VisualProxy 预测仅在 presentation，不能写 World/碰撞/视野/资源或产生权威事件；反馈不能代替 CommandResult。固定率的 replay/hash 验证与跨率真实时间/量化容差对照分开。

## 6 生命周期与资源所有权

每个监听器、异步任务、纹理、音频、粒子、缓存和 worker 都有 owner 与 dispose/取消途径。dispose 必須可重复执行，不能重复扣资源或抛出与第一次不同的销毁错误。异步加载/保存附 session token，旧 Session 结果不能污染新 Session。

Modifier 清理同时释放属性贡献、Tag 来源、Hook 和定时项。死亡和销毁分开处理；源销毁后需要的快照不能保存在对象指针中。暂停原因用集合，恢复必须全部解除；旋转、后台、遮罩和 pointercancel 后不能残留移动方向或技能按住状态。

Save 在完整 Tick 边界复制 DTO，并以原子事务写入；不能在异步编码中继续读取 live World。迁移是纯函数，旧文件不先覆盖。缓存清理不会清除存档。Service Worker 版本激活不能在战斗中替换运行内容。

## 7 性能与 Android

遵守 [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md)。热路径优先复用工作数组、空间索引、查询缓冲和对象池；只有剖析证明收益才转换为复杂 SoA/worker。池对象复用必须重置全部字段并尊重 generation，不能让优化改变语义。

不做每帧全世界 JSON clone、DOM 全树刷新、Text 重建或全图每单位两两碰撞。逻辑查询使用空间结构；渲染不更新不可见对象的昂贵效果，仍保留完整模拟。粒子减少、贴图降级和音频合并可以降质，伤害事件、控制、视野信息规则不能降质。

多指触屏是首要输入，键鼠仅调试补充。控制键按 CSS 像素安全区域布局，场景回缩不压到不可点。必须测试 pointercancel、系统返回/覆盖、分辨率变化、锁屏和 context loss。横屏/全屏权限失败要仍可操作，不阻止启动。

资源优先原创生成。引入任何第三方正式资源时在根目录 ASSET_LICENSES.md 记录：asset ID、文件名/路径、来源 URL、作者、许可证名称/版本/文本链接、下载日期、修改情况、归属声明和用途。许可证不明确的素材只能隔离为未采用参考，不能进入正式构建。生成素材记录生成来源与修改，不伪造第三方许可证。

## 8 自动测试方案

### 8.1 目录与覆盖范围

| 测试目录 | 内容 | 必须覆盖的边界 |
| --- | --- | --- |
| tests/unit | 公式、几何、排序、Schema、ID、RNG | 抗性为 0/负值、穿透上限、duration 转换、零向量和非有限值 |
| tests/property | 数学和状态不变量生成测试 | 池量守恒、不能超上限/低于 0、同贡献顺序、转换 DAG |
| tests/simulation | Tick 阶段、Action、Effect、控制、地图、经济 | 同 Tick 边界、多来源状态、死亡/复活、事务失败 |
| tests/content | 全部 JSON、引用、容量/权限证书 | 最大扇出/Hook/生产者并发、未证明路径、非法字段授权、许可 |
| tests/replay | 同种子/命令、帧率驱动、RNG 子流 | 接受命令流一致、序列化排序一致、hash 定位差异 Tick |
| tests/persistence | Checkpoint、恢复、迁移、损坏文件 | 飞行投射物、充能/预留、区域重叠、Bot 记忆、视野历史 |
| tests/architecture | 白名单、依赖图、环境 API | alias/type-only/barrel/dynamic import 的循环和越界 |
| tests/browser | 适配层、输入、生命周期、表现预测 | 多指/技能各阶段反馈、取消/后台、匿名/方向消息、预测纠正 |
| tests/performance | 容量峰值、A/B/C 与浸泡 | 分列延迟、CPU/每秒成本、电量/热态、证书/实际量和内存趋势 |

M1 已锁定 Vitest、Playwright 与依赖扫描器的实际依赖，fast-check 仍为后续候选。浏览器自动化模拟触摸不能取代 Android 真机的 GPU、热降频、音频和系统生命周期验证。

### 8.2 核心不变量

- 生命、护盾和资源均为有限数值，并处于对应 policy 的合法范围；一个伤害 Operation 的所有去向和 overkill 可核算。
- 同一 Action 资源只提交一次；取消释放预留；同一 deathId 奖励一次；同一商店命令交易一次。
- 已销毁 EntityRef 永不被复用认作活实体；死亡和复活不意外丢装备/席位。
- 控制与 Tag 以来源计数，移除一个实例不消除其他实例的贡献。
- 结构迭代不被创建/销毁破坏；传送更新空间/视野；高速投射物不穿过有效碰撞目标。
- 内容和命令相同、Tick 数相同时，在同一逻辑版本得到相同权威 hash，渲染帧率不改变结果。
- 每个席位的 Projection 不含它无权得知的实时敌方字段；Bot 也遵守这一点。
- 每根/每 Tick/生产者实际工作≤联合容量证书≤profile 故障限额；最大合法目标完整结算，二次扇出和维护也计入。
- 同席位的 Bot/UI/音频/小地图共享权限求值；匿名/方向事件不携带精确隐藏字段，期限过后不继续跟踪。
- 同 simulation rate 下开启/关闭 VisualProxy、变更渲染 FPS 不改变 World/hash；跨率仅按声明真实时间容差验证。
- 存档恢复后同后续命令流得到同逐 Tick hash；导出编码规范排序，hash 排除纯表现数据。
- Session dispose 后无残留时钟、订阅、输入、异步状态写入或持续增长的资源集合。

### 8.3 测试编写和门禁

用规则手算例、不同来源的预期和性质测试验证复杂数值，避免测试只是复制同一实现公式。场景 fixtures 保存最小输入、内容 hash、命令流、失败 Tick、预期事实及 breakdown；遇到随机失败保存 seed，使其可重放。

新增复杂机制至少需要正常值、上下边界和与既有机制交互测试。回归测试以观察行为和不变量为主，不锁住无关内部类名。测试不得等待真实 setTimeout，模拟时间由手动 Tick 推进。

每次合入运行 typecheck、lint、check:deps、validate:content、相关 unit/sim 和 build；修改公开契约或战斗阶段时运行全 headless/replay/persistence。涉及触屏、生命周期或表现桥时运行 browser，并记录真机可用检查。里程碑必须跑完整验证集和其规模性能场景；已有检查通过后，没有新改动或未决问题就不无意义重复执行。

版本发布需记录设备/浏览器/构建/内容版本、全部门禁结果、基准场景和已知问题。Android 真机优先使用可追溯到完整 commit、GitHub Actions run/attempt 和 Pages artifact 的构建，本地 preview 为 fallback；云端浏览器不替代真机，部署途径不降低功能/性能验收。未能真机验证的关键项目不能标记为 Android 已验收。

### 8.4 本轮新增门禁

容量门禁在 M2 建立、每次新增内容重跑：覆盖目标数 0/1/128/129/454、每目标多操作、最大合法装备/Modifier Hook、Replacement、二次扇出、到期/死亡/延迟任务重合及全部根生产者；合法组合不 fault，故意越 envelope/无限循环必须诊断。人工算例不替代真实 Ruleset 编译与基于模型/生成测试的证书验证；只重复证书公式的测试不能证明估算正确。

披露门禁在 M4 建立：按 recipient×eventType×source/target 字段×positionPrecision×duration×scope 矩阵检查默认拒绝与显式允许，包括未知施法者可听、全局预警/播报、Ping、匿名事件、历史/队伍共享与隐身/草丛例外；检查原始 payload 和关联元数据，不只看是否隐藏图标。恢复与到期不能延长授权，声音许可不能改变目标选择。

Tick 门禁在 M1 基础、M3 技能情景复测，依 PERFORMANCE_BUDGET 第 3.3 节完成 A/B、必要 C、原始响应统计、CPU/电量/热态和预测安全测试。结果写 ADR 003；缺真机或端到端测量时标明缺口。M1 的 20 分钟冷热态/电量/降频与第二档 Android 按 ADR 019 标记 DEFERRED / non-blocking performance validation；其长期门禁仍保留，不能改为 PASS。大量正式英雄/内容实现前必须完成 M3 Tick 决策记录，不能用框架启动/FPS 数字替代手感验收。M1 基础软件门禁和高档 Android 响应已执行；容量/披露/正式技能仍按 M2/M4/M3 的阶段边界实施。

## 9 Debug 日志与错误

每条权威追踪包含 matchId、tick、phase、event/op/root/parent ID 和相关句柄；伤害提供各阶段量、Hook 修改、护盾/资源去向及归因。可只开启某实体/根的 tracing，避免全量日志破坏性能。

只读 Debug 和作弊操作分开。作弊也走 DebugCommand、注明已接受结果和 replay 标记。故障导出版本、seed、最近命令、队列计数与最近完整检查点，默认本地生成，用户主动导出，不自动上传。

可预期非法请求返回稳定 reason code；内容缺失在开局失败；权威异常或 overflow 暂停冻结，不隐藏；表现资源失败可替代并报告，但不可把替代流程写回战斗规则。

## 10 文档 版本与报告

重要规则必须进入 docs，聊天不能是唯一规范来源。跨文档修改要检查 Tick、目录、导入图、生命周期、存档版本和性能限额一致性。未定项以 proposed/deferred 标识，并附理由、验证条件和复审里程碑。

CHANGELOG 写用户可理解的行为与验证，不只列“优化/修复”。DESIGN_DECISIONS 的接受条目说明选择、理由、代价、替代方案和复审条件。每次任务报告固定提供：修改内容、涉及文件、设计原因、实际测试结果、已知问题、下一步；纯文档任务说明编译/运行测试不适用。

类型要求参考：[TypeScript strict 官方说明](https://www.typescriptlang.org/tsconfig/strict.html)。具体配置适配所锁定版本，不依赖本文未指定的版本号。
