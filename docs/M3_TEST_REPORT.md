# M3 0.4.2 toolbar multitouch 软件修复报告

**M3 0.4.2 toolbar multitouch 软件修复候选，等待独立源码复核。** 本轮完整 `npm run check` 的11自动门禁PASS，184 tests=原163+新增21，无skipped、无flaky、所有browser retry=0。自动软件证据不代替独立复核或Android blocker复测；M3整体/Android整体仍BLOCKED，未推送main、未部署Pages、未进入M4。

基线：`althanor/moba` main `c95a6d76f34a9f8621586a9bd84160f71061170d` /0.4.1 /M3。远端main ref经只读核对并git fetch；独立工作树HEAD=精确基线。开始前重新完整读取19个指定文件，全部ADR001–024在DESIGN_DECISIONS.md，相关git blob/hash记录在reports/m3-042-baseline-verification.json。0.4.1此前独立源码复核通过来自用户确认；Android验收因本次新blocker暂停，不撤销此前合法功能证据。

## 根因与修复

真机确认Canvas第一touch持续时，DOM toolbar第二touch的合成click路径在A/B均无响应；单独control/pause与Canvas双指正常。第二独立问题是所有toolbar callback统一clearInput，control即使触发也主动丢joystick/skill contacts，无法测试受控与B prediction transition。

新事件模型：touch/pen主按钮pointerdown立即activation，不过滤非primary contact；鼠标仅click，键盘Enter/Space及可访问性/程序化click保留。touch/pen来源的PointerEvent click忽略；旧Chromium兼容MouseEvent的sourceCapabilities.firesTouchEvents同样忽略。pointerdown.preventDefault不是唯一去重机制；没有UA sniff、wall-clock窗口、延迟、重试。pointerup/cancel不重复执行调试动作，按下后action已经生效。逐按钮activation-count/source直接计数，不用幂等UI状态冒充一次调用。

control唯一不调用host.clearInput/scene.clearInput；仍使用原host.debug(control)→Session.submit→enemy bolt Action→Projectile→Effect/Operation→Status正式路径。pause/resume/step/recreate/modeA/modeB/export/empty/probe九种动作保留原清理，export仍清held joystick。

原CC权威规则会清movement intent。表现层在同Session、inputEnabled/alive且观察到canMove false→true时，对仍held的Canvas contacts各重采一次move，经原controller/Session/command恢复意图；不合成begin/end，不自行cast。清理、失pointer、暂停、后台、重建会清tracker及观察状态，不能复活旧input。重采时戳是软件事件，不当作新的物理touch。Action/CC/Movement/碰撞/penetration/CSS-world/analog/aim/sweep/Area逻辑逐字未改。

## 实际修改范围

- presentation：src/presentation/index.ts；新src/presentation/input/index.ts与toolbar.ts；src/presentation/phaser/scenes/battle-scene.ts。包含事件绑定/清理、held恢复与纯debug DOM观察。
- tests：tests/browser/battle.spec.ts只追加；新tests/unit/toolbar.test.ts。
- 版本绑定：package.json/package-lock.json；src/content/compiler/capacity.ts的ENGINE_VERSION与src/simulation/runtime/combat.ts的binding literal两行。
- 工具：tools/check.mjs候选状态文本；未改检查命令、范围、断言或容量算法。
- 文档：CHANGELOG、MILESTONES、M3_IMPLEMENTATION/TEST_REPORT/WORK_ACCOUNTING/ACCEPTANCE/DELIVERY、README、ADR024；规范当前状态header同步及root/docs副本。
- 生成物：本轮check/browser/content/M2 extreme/M3 joint/performance/software A/B/截图报告、baseline验证、生产dist和manifest/hash。精确路径/字节改动以patch为准。

## 原测试保留与新增21项

基线32个原测试源码逐字保留：31文件完整字节相同，battle.spec.ts的整个原文件作为未改前缀保留，包括全部原断言与afterEach；原163执行项本轮全部重跑。机器证明还核对66个authority/content/foundation/contracts/controllers/application相关源文件：除两行engine binding，逐字相同。1503×536 ultrawide A/B、低render FPS hash、M2 indexed/scan/producer/454×454/20-root回归保留。

新增15 unit：touch/pen各1；mouse+keyboard/accessibility、compatibility provenance、连续press/cancel、barrel/disabled/dispose各1；九种destructive action各1。新测试所有9种清理恰好一次，control两种输入均不清；一次touch/pen后兼容click不再执行。

新增6 browser（真实CDP touch，不用mouse替代双指）：
- `toolbar multitouch A: held joystick + control once, authority CC stops and held contact resumes`
- `toolbar multitouch B: held joystick + control once, authority CC stops and held contact resumes`
- `toolbar multitouch: held joystick + pause clears pointers, freezes Tick and resumes with neutral intent`
- `toolbar touch activation counts recreate/mode/export exactly once and emits one download`
- `toolbar desktop and keyboard/accessibility click each activate once; solo control still uses enemy action`
- `toolbar control preserves held joystick and skill contacts through a third CDP touch, without casting the held skill`

A/B control回归逐帧记录第一pointerId完整持续，activation count+1、enemy charge仅消耗1、HP仅损80、CC前移动/期间停步/结束无新touch事件自然恢复；B受控不预测。projectile active ID总数≤1（该75world短距可同Tick spawn/hit/despawn），enemy release/charge与一次damage也证明攻击一次，不将“未观察到存活sprite”冒充无攻击。touchEnd只指定需释放的toolbarcontact，第一contact一直保持；trace断言无end/cancel造成丢指。三指回归保留skill preview，未提前释放，CC后正常松技能。

pause第二指触发后pointer=0、Tick/位置冻结；保持旧Canvas contact时用第二指resume，不产生旧intent。touch和mouse的recreate/mode分别action count+1且Session serial仅+1；export只一个download。keyboard Enter/Space与程序化accessible click正常。browser所有17执行项均无重试、跳过或page fault。

## 全部11自动软件门禁

| 门禁 | 状态 | tests/结果 | 本轮耗时 |
|---|---|---:|---:|
| `npm run typecheck` | PASS | exit 0 | 3.47 s |
| `npm run lint` | PASS | exit 0 | 1.85 s |
| `npm run check:deps` | PASS | exit 0 | 0.53 s |
| `npm run check:docs` | PASS | exit 0 | 0.17 s |
| `npm run validate:content` | PASS | exit 0 | 0.89 s |
| `npm run test:unit` | PASS | 57 | 2.44 s |
| `npm run test:content` | PASS | 12 | 1.52 s |
| `npm run test:sim` | PASS | 75 | 3.23 s |
| `npm run test:capacity` | PASS | 23 | 95.26 s |
| `npm run build` | PASS | exit 0 | 8.09 s |
| `npm run test:browser` | PASS | 17 | 59.25 s |

57 unit/architecture +12 content +75 simulation/replay/property +23 capacity/performance +17 browser=184。生产构建桌面Chromium141软件回归，不能冒充Android硬件。完整check exit0；browser expected17/skipped0/unexpected0/flaky0/retry0。原三轮交替A/B软件测量保留，6个Session均running/version0.4.2/certificate af8e1f05；真实手感与热态未由它验收。

## 版本与容量

engine=0.4.2，compiler=m3-bounded-v2，contentHash=f166a531，certificateId=af8e1f05（旧0.4.1 b1434902不再用），profile=m3-debug-logical-v1，tickRate=30。maxUnits454、projectiles128、Areas64、grid≤256、actions/obstacles≤16、fanout≤454保持。

与基线逐字段比较：root/producer/maintenance/Tick/startup/command全部certificate数值相同，fault limits和configured profile完全相同；authority producer/query/scan/lookup/structure/content semantics未变。新version-bound证书本轮重新编译，不复制旧生成报告。所有scope actual≤certificate≤fault≤configured与scan conservation再次通过；完整表在M3_WORK_ACCOUNTING和reports/m3-content.json。

M3 joint fixture本轮certificate 06c72880：454 action completions、128 projectile×326 targets、64 Areas×128 targets、2608 CC expiry+pulse；同root Hook/Replacement/cancel-refund和command600history保持。release Tick actual Operations94,634/Facts94,896/scans28,184,273/structure12,001,232、roots1100，全部消费，无截断。

M2极限原4,574,049 Operations /9,135,386 Facts /163,705,610 scans /809,164,729 structure精确保留，Fact produced=consumed=9,135,386；454×454与20-root正式路径通过。桌面单次极端诊断78.377秒/Tick仍是逻辑容量性能债，不是代表性实时负载。

## 正常玩法成本（本轮重新测量）

30Hz，同命令3轮，各60Tick warmup+300measured，单位ms。

| profile | Tick p50 | Tick p95 | CPU ms/模拟秒 | final hash |
|---|---:|---:|---:|---|
| debug-battle-4 | 1.08–1.13 | 1.62–1.89 | 34.76–36.86 | 5716d35d |
| representative-64-eight-active | 5.65–6.01 | 6.78–7.83 | 172.24–182.89 | 1130166b |

logical maximum capacity与representative performance分别判断。软件input/UI/visual/acceptance/release/CPU/frame/correction细项见本轮reports/m3-gameplay-ab.json；不将运行间噪声称修复带来的性能改善，不决定最终rate/B策略。

## 硬件事实与停止点

PASS：本轮自动门禁；此前0.4.1独立复核；用户已确认Android A大量功能、B普通移动/碰墙/move→dash、Canvas双指及单独toolbar。UNAVAILABLE：竖屏因设备操作时防转屏保护。BLOCKED/PENDING：toolbar第二触点真机blocker尚待0.4.2复测，移动中control/dash受控/B prediction→control正式结论不接受旧PASS；新候选独立复核、第二档约4GB、代表性20分钟冷热态/电量/温度/降频、M3/Android整体均未通过。DEFERRED：physical端到端与M7/M10原未来硬门禁。NOT_APPLICABLE：C=60Hz（未触发）。

A默认/Bexperimental/30Hzprovisional，不推送main、不部署Pages、不宣布整体或Android PASS，不接受最终Tick率、不进入M4。独立复核通过后优先复测blocker，再恢复其余正式Android验收；不抹掉此前合法设备证据。交付ZIP/patch/manifest/hash的精确round-trip与完整性独立验证；应用补丁不代替源码复核。

## 交付完整性

PASS：manifest 292/292文件SHA256一致；ZIP共293项（含FILE_MANIFEST.json自身），missing/hash mismatch/extra均0。完整git binary patch包含dist与manifest，以c95a6d76f34a9f8621586a9bd84160f71061170d为唯一base；干净工作树apply --check、正向完整Git tree及逐文件字节相同、反向恢复精确基线且git status为空、再次正向重建全部相同均通过。基线历史M1 ZIP保持原Git tree字节，按原打包规则不重复嵌套旧ZIP。四个导出文件SHA256列于SHA256SUMS_M3_v0.4.2.txt；所有交付件均为本地候选，未提交远端。
