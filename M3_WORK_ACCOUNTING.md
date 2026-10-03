<!-- current-state:start -->
# M3 工作计账与容量证明

<!-- current-state:json {"schema":"moba-document-current-state-v1","version":"0.4.3","phase":"M3","baseCommit":"c7ed67a9582f211335d4ed55414595969d696ebf","candidate":"输入误锁 documentation-respun repair candidate，等待独立窄复核","productReview":"PASS_SOURCE_REVIEW","documentationReview":"PENDING_NARROW_REVIEW","softwareExitFinal":"NOT_DECLARED","toolbarBlocker":"CLOSED_ON_ANDROID_DEVICE","currentAndroidBlocker":"skill-control interstitial gap → unintended authoritative targetLock","androidGapRetest":"NOT_EXECUTED","overall":"BLOCKED","androidOverall":"BLOCKED","formalAB":"NOT_COMPLETED","thermalBattery20min":"NOT_COMPLETED","secondTier4GB":"NOT_COMPLETED","portrait":"UNAVAILABLE","tickRate":30,"tickRateStatus":"provisional","modeA":"default","modeB":"experimental","modeC":"not-triggered","pushed":false,"deployed":false,"androidAcceptanceResumed":false,"nextPhaseStarted":false,"contentHash":"f166a531","certificate":"6f60c23c","m2Certificate":"74b0fd50","jointCertificate":"6d8796a9","toolbarFixVersion":"0.4.2","nextPhase":"M4"} -->

当前：M3 0.4.3 输入误锁 documentation-respun repair candidate，等待独立窄复核。

基线：`c7ed67a9582f211335d4ed55414595969d696ebf`（althanor/moba main）；version=0.4.3，phase=M3；contentHash=f166a531，certificate=6f60c23c，M2=74b0fd50，joint=6d8796a9。

产品源码独立审核=PASS_SOURCE_REVIEW；本轮文档窄复核=PENDING_NARROW_REVIEW；software-exit final=NOT_DECLARED。

0.4.2 toolbar blocker=CLOSED_ON_ANDROID_DEVICE；后续发现 skill-control interstitial gap → unintended authoritative targetLock；Android gap blocker retest=NOT_EXECUTED。M3 overall=BLOCKED；Android overall=BLOCKED。

formal A/B=NOT_COMPLETED；20min thermal/battery=NOT_COMPLETED；second-tier ~4GB=NOT_COMPLETED；portrait=UNAVAILABLE。30Hz provisional；A=default / B=experimental / C=not-triggered。

push=false；deploy=false；继续 Android 验收=false；进入下一阶段=false（本候选不得进入 M4）。状态源：docs/current-status.json；历史记录不充当当前状态。
<!-- current-state:end -->

基线 M2 实例化规则、完整 Hook/Replacement 深度 fuel、动态遍历 scans、索引 lookups、immutable/canonical/hash structure、startup/command 独立预算仍保留。M3 使用相同 executeRoot/CapacityGuard/FactQueue；没有另一套战斗队列或 Phaser authority。

## 注册内容/profile

`content/m2-fixture.json` 与 `m2-profile.json` 保持原内容；`m3-battle.json` 与 `m3-profile.json` 是显式注册的新 Ruleset/profile pair。validate:content 拒绝遗漏的新 JSON。M2 contentHash 4302def2 不变；engine/compiler 为 0.4.3/m3-bounded-v2，重新生成 M2 与 M3 certificate。

M3 contentHash `f166a531`，certificate `6f60c23c`，profile `m3-debug-logical-v1`，30 Hz。maxUnits=454、statusesGlobal=3632、projectilePool=128、AreaPool=64、gridCells≤256、actions≤16、obstacles≤16、query result≤454。

| tick work | certificate | fault limit | configured profile |
|---|---:|---:|---:|
| operations | 11,008,976 | 16,777,216 | 16,777,216 |
| hooks | 0 | 1 | 1 |
| queries | 6,754 | 8,192 | 8,192 |
| ast | 9,052,512 | 16,777,216 | 16,777,216 |
| formula | 3,666,050 | 4,194,304 | 4,194,304 |
| scans | 11,942,675,740 | 17,179,869,184 | 17,179,869,184 |
| facts | 76,997,876 | 134,217,728 | 134,217,728 |
| lookups | 2,816,429,754 | 4,294,967,296 | 4,294,967,296 |
| structure | 937,134,428,736 | 1,099,511,627,776 | 1,099,511,627,776 |

Roots certificate=5,654，fault/profile roots=8,192；FactQueue=1，是同步 lossless consumption 的 queue peak，不是丢弃 Facts。summary 只限制诊断 raw retention=2000，所有 produced/consumed/counts 完整保留。

Startup certificate：`{"operations": 0, "hooks": 0, "queries": 0, "ast": 0, "formula": 0, "scans": 629883, "facts": 0, "lookups": 84444, "structure": 5241694166}`；command certificate：`{"operations": 0, "hooks": 0, "queries": 0, "ast": 0, "formula": 0, "scans": 576574, "facts": 0, "lookups": 514, "structure": 10699776}`。全部 scope 分别检查 actual≤certificate≤fault limit≤profile，不能把 startup/command 隐藏在 Tick work 里。

## 新 producer closure

| Producer | 实例上限 | 每实例每 Tick root 上限 | provenEffects |
|---|---:|---:|---|
| m3.action | 454 | 8 | 六个 action release Effect 及 compiler-owned cost reserve/spend/commit/release/refund |
| m3.movement | 454 | 3 | compiler-owned intent/step；P0 neutralize + P2 latest intent + P3 step |
| m3.projectile | 128 | 1 | projectile on-hit Effect，仅当前完整有序 primary batch |
| m3.area | 64 | 8 | enter/pulse/exit/expiry Effect；覆盖旧实例 expiry、同 Tick 新实例和上一 Tick death-exit |
| fixture | 10 | 2 | 原注册 debug Effects，无 aim 的 spawn/displace 明确拒绝 |

每 actor 同 Tick 至多一个 validated start attempt，包括 resource failure；每 actor 只有一个 active action。手动 cancel、release commit、release Effect、阶段结束/受控中断有限。一个普通 committed leaf 最多中断其目标的一次 active action，inline cost+event 留在该 root；surcharge 加 operations/facts/AST、资源处理、控制重验、indexed grid update 和结构节点，不能偷偷另起 cost root。

MovementStep 是 P3 root，不在每个 projectile 之外做隐形全图扫描。三次 movement root 上限包含 resume 的 P0 neutral clear、P2 最新 intent、P3 一次 step；forced/dash/normal 不在同 Tick 重复移动。Projectile/Area 旧实例 P0 expiry 先释放 quota；新实例可能当 Tick 命中/结束，维护事件保守覆盖两组 pool。Area 的 8-root envelope 覆盖最多 old exit+expiry、new enter+exit+pulse、deferred death exit，未按“通常只有一次 pulse”打折。

## Query/索引证明

令 U=454、C=实际 grid cells≤256，sortCost(U)=U×(1+2×ceil(log2 U))。一个 query 最多读 C 个 bucket 和 C×U 条 target 引用，去重后最多 U 个唯一候选。scan 上界为 C+C×U+4U+sortCost(U)；lookup 上界为 C+C×U+4U+4。完整 target swept AABB 插入所有中间 cells，避免只插两个端点造成高速目标漏检。

Grid update 的 private member slot map 消除全 roster 删除扫描；每 cell 的 indexed bucket/member 读和去重 Set.has 逐次 charge lookup。Action/Movement/entity/definition getters、Projectile hit membership、Area previous/current membership、Resource reservation/current 索引、gameplay command replay/history membership 都有计账。Map/Set 构造/遍历仍逐遍 scan，不能以 lookup 代替元素访问。

控制重验、动作 ready/recharge、目标维护、grid rebuild/update、relative projectile sweep、Area membership/death-exit、deferred roots、输入队列/history/eviction、观察 DTO、reservation、动作/移动/projectile/Area snapshots、canonical hash/freezing 进入 maintenance 或所属 root。P5 direct/teleport/spatialTargets 查询有额外 root query/scan/lookup bound。snapshot 可复用冻结节点，但首次构造及 canonical 字符读取计入 structure。

所有新 callback 是固定引擎 owner/诊断端口，代码路径逐项证明；Content 不能注入 callback。编译拒绝 forged M3 producer、reserved intrinsic Effects、Hook intrinsic/spawner 引用、异步 projectile/Area recursive spawn、未显式 primary fanout 的 multi-hit/Area batch、非法 grid/spawn/charge。

## 验证与性能分离

正式联合 M3 测试自行编译 454-spawn fixture（HP 100000、128 projectile×326 targets、64 Area×128 targets、454 action completion、2608 CC expiry 与 Area pulse）；并验证 Hook Replacement 引发同 root inline CC cancellation、command 600 次 history/eviction、scan conservation、startup scope 和 root work。此 fixture 的内容/hash 独立，不能冒充精确四单位模板的性能。

M2 454×454、20-root、4096 indexed cardinality、producer mismatch、完整 Fact delivery 都保留。逻辑最大 profile 是有限性的保守上界，数值很大，不代表 realtime 或承诺每秒能处理它。正常玩法另见 reports/m3-gameplay-performance.json，4-unit 与 64-unit/8-active 两个脚本、三轮、60 Tick warmup、300 Tick measurement、所有 hash 一致。Android A/B 与热态单独等待，不能从桌面成本宣布 Android PASS。

<!-- historical/superseded:start -->
0.4.1 修复的 CSS 变换在 controller/presentation，Movement recovery 在每个既有 obstacle/candidate 的固定标量计算中；没有新增 query/集合访问/lookup/结构快照，完整 work/profile 数值保持。engine/compiler 语义版本重新绑定，证书由 fa762b92 变为 b1434902；全部 scope 与原 M2 极限再次回归。

## 0.4.2 authority work unchanged 证明（历史）

基线 main c95a6d76 的已复核 0.4.1。authority 源码只改 compiler ENGINE_VERSION 和 runtime 的 engine binding literal 为 0.4.2；内容四份 JSON、全部 producers/effects、空间与扫描/lookup/structure 成本模型、Action/Movement/Projectile/Area owner、guard 和 Tick 调度逐字未改。toolbar 去重/计数、held contact 重采只在 presentation；输入仍经原 controller/Session/command scope，单次恢复至多一个 held joystick latest move，不新增 authority producer/root 类别或同 Tick root envelope。

重新编译 certificate af8e1f05，旧 b1434902 不再用于 0.4.2；contentHash f166a531、profile m3-debug-logical-v1、全部 root/producer/maintenance/Tick/startup/command 数值与 0.4.1 一致。固定 454/128/64 envelope、scan conservation、producer binding、actual≤certificate≤fault≤configured profile 必须在本轮完整 check 再次实测；报告不从 0.4.1 复制。presentation/debug 观察数据不进入权威结构或 hash。
<!-- historical/superseded:end -->
## 0.4.3 authority work unchanged 证明

基线 main c7ed67a9582f211335d4ed55414595969d696ebf/0.4.2。product 修复只有 touchLayout 的有限 CSS skill-control envelope 与 GameplayController begin 分类；不增加 authority producer、query、scan、lookup、structure 工作。Simulation/content 源码除了 compiler/runtime engineVersion 0.4.3 两处绑定逐字不变，四份 content/profile JSON 均逐字不变；新 charge fixture 仅属于测试。M2/M3 证书经 validate:content 正式重新生成与 profile 验证。M3 af8e1f05→6f60c23c，M2→74b0fd50；contentHash f166a531/4302def2 与全部 numeric certificate/profile scope 不变。

完整门禁重新执行 logical/joint/M2 extreme/representative profile，不复制旧报告。fixed envelope 454/128/64，joint release/CC expiry 与 M2 Hook/Replacement 集成原样保留。新增 UI geometry 不纳入 authority capacity/hash；输入仍经正式 Session.submit，gap 根本不产生 targetLock，不是事后回滚。成本与每个实际值以本轮生成 reports 为准。

## Documentation consistency respin：authority unchanged

与第一份0.4.3候选对照，所有src/、content四JSON、package/lock、既有tests、其余tools及构建配置逐字未改；唯一工具变化为check-docs及新文档状态helper。engine仍0.4.3，capacity算法不动；正式重验contentHash f166a531、M3 6f60c23c、M2 74b0fd50、joint 6d8796a9及全部actual counters/hash必须完全相同，否则停止调查。生成报告为本轮实测，CPU波动不当作authority变化或AndroidPASS。
