<!-- current-state:start -->
# M3 软件验证报告

<!-- current-state:json {"schema":"moba-document-current-state-v1","version":"0.4.3","phase":"M3","baseCommit":"c7ed67a9582f211335d4ed55414595969d696ebf","candidate":"输入误锁 documentation-respun repair candidate，等待独立窄复核","productReview":"PASS_SOURCE_REVIEW","documentationReview":"PENDING_NARROW_REVIEW","softwareExitFinal":"NOT_DECLARED","toolbarBlocker":"CLOSED_ON_ANDROID_DEVICE","currentAndroidBlocker":"skill-control interstitial gap → unintended authoritative targetLock","androidGapRetest":"NOT_EXECUTED","overall":"BLOCKED","androidOverall":"BLOCKED","formalAB":"NOT_COMPLETED","thermalBattery20min":"NOT_COMPLETED","secondTier4GB":"NOT_COMPLETED","portrait":"UNAVAILABLE","tickRate":30,"tickRateStatus":"provisional","modeA":"default","modeB":"experimental","modeC":"not-triggered","pushed":false,"deployed":false,"androidAcceptanceResumed":false,"nextPhaseStarted":false,"contentHash":"f166a531","certificate":"6f60c23c","m2Certificate":"74b0fd50","jointCertificate":"6d8796a9","toolbarFixVersion":"0.4.2","nextPhase":"M4"} -->

当前：M3 0.4.3 输入误锁 documentation-respun repair candidate，等待独立窄复核。

基线：`c7ed67a9582f211335d4ed55414595969d696ebf`（althanor/moba main）；version=0.4.3，phase=M3；contentHash=f166a531，certificate=6f60c23c，M2=74b0fd50，joint=6d8796a9。

产品源码独立审核=PASS_SOURCE_REVIEW；本轮文档窄复核=PENDING_NARROW_REVIEW；software-exit final=NOT_DECLARED。

0.4.2 toolbar blocker=CLOSED_ON_ANDROID_DEVICE；后续发现 skill-control interstitial gap → unintended authoritative targetLock；Android gap blocker retest=NOT_EXECUTED。M3 overall=BLOCKED；Android overall=BLOCKED。

formal A/B=NOT_COMPLETED；20min thermal/battery=NOT_COMPLETED；second-tier ~4GB=NOT_COMPLETED；portrait=UNAVAILABLE。30Hz provisional；A=default / B=experimental / C=not-triggered。

push=false；deploy=false；继续 Android 验收=false；进入下一阶段=false（本候选不得进入 M4）。状态源：docs/current-status.json；历史记录不充当当前状态。
<!-- current-state:end -->

本轮结果：**M3 0.4.3 documentation-respun repair candidate，等待独立窄复核。** 产品修复已由用户独立源码审核PASS；本轮只修文档/文档门禁与其生成物。最终全量npm run check exit0，213 tests=原200+新增13，21browser，skipped/flaky/retry均0。这里的自动门禁PASS不是software-exit final；Android/M3整体仍BLOCKED。不push/deploy/继续Android/进入M4，不升0.4.4。

## Documentation consistency respin

### 独立审核发现与额外审计

独立审核发现ARCHITECTURE/CODING_RULES/COMBAT_PIPELINE/DESIGN_DECISIONS/PERFORMANCE_BUDGET顶部（及存在的docs镜像）仍将M3 0.4.2 toolbar repair candidate、Android因toolbar blocker暂停当作当前。四组规范尾部也写“0.4.2当前实施”。M3_DELIVERY仍是0.4.2且base为c95a6d76/0.4.1。本轮扫描第一份候选全部39份Markdown，不只点名文件：修正23份现行声明（14个注册root/path和9个实际镜像），另外16份M1/M2/依赖/许可记录加明确历史边界；更新README/MILESTONES/M3阶段报告的当前独立审核措辞，content/README补齐实际注册M2/M3范围。规范设计、历史证据与产品语义未改。

| 每个修正文件 | 处理 |
|---|---|
| `ARCHITECTURE.md` | 现行状态统一 |
| `ASSET_LICENSES.md` | 显式 historical/superseded，保留原证据 |
| `CHANGELOG.md` | 现行状态统一 |
| `CODING_RULES.md` | 现行状态统一 |
| `COMBAT_PIPELINE.md` | 现行状态统一 |
| `DESIGN_DECISIONS.md` | 现行状态统一 |
| `M1_ACCEPTANCE.md` | 显式 historical/superseded，保留原证据 |
| `M1_TEST_REPORT.md` | 显式 historical/superseded，保留原证据 |
| `M2_ACCEPTANCE.md` | 显式 historical/superseded，保留原证据 |
| `M2_IMPLEMENTATION.md` | 显式 historical/superseded，保留原证据 |
| `M2_TEST_REPORT.md` | 显式 historical/superseded，保留原证据 |
| `M2_WORK_ACCOUNTING.md` | 显式 historical/superseded，保留原证据 |
| `M3_ACCEPTANCE.md` | 现行状态统一 |
| `M3_DELIVERY.md` | 现行状态统一 |
| `M3_IMPLEMENTATION.md` | 现行状态统一 |
| `M3_TEST_REPORT.md` | 现行状态统一 |
| `M3_WORK_ACCOUNTING.md` | 现行状态统一 |
| `MILESTONES.md` | 现行状态统一 |
| `PERFORMANCE_BUDGET.md` | 现行状态统一 |
| `README.md` | 现行状态统一 |
| `content/README.md` | 现行状态统一 |
| `docs/ARCHITECTURE.md` | 现行状态统一 |
| `docs/CODING_RULES.md` | 现行状态统一 |
| `docs/COMBAT_PIPELINE.md` | 现行状态统一 |
| `docs/DEPENDENCIES.md` | 显式 historical/superseded，保留原证据 |
| `docs/M1_ACCEPTANCE.md` | 显式 historical/superseded，保留原证据 |
| `docs/M1_IMPLEMENTATION.md` | 显式 historical/superseded，保留原证据 |
| `docs/M1_TEST_REPORT.md` | 显式 historical/superseded，保留原证据 |
| `docs/M2_ACCEPTANCE.md` | 显式 historical/superseded，保留原证据 |
| `docs/M2_DELIVERY.md` | 显式 historical/superseded，保留原证据 |
| `docs/M2_IMPLEMENTATION.md` | 显式 historical/superseded，保留原证据 |
| `docs/M2_TEST_REPORT.md` | 显式 historical/superseded，保留原证据 |
| `docs/M2_WORK_ACCOUNTING.md` | 显式 historical/superseded，保留原证据 |
| `docs/M3_ACCEPTANCE.md` | 现行状态统一 |
| `docs/M3_IMPLEMENTATION.md` | 现行状态统一 |
| `docs/M3_TEST_REPORT.md` | 现行状态统一 |
| `docs/M3_WORK_ACCOUNTING.md` | 现行状态统一 |
| `docs/MILESTONES.md` | 现行状态统一 |
| `docs/PERFORMANCE_BUDGET.md` | 现行状态统一 |

新增docs/current-status.json为文档集中状态源；只有documentation工具/tests读取它，不进入content catalog、Simulation、authority hash或certificate。原规范版本0.1.4与engine0.4.3分开记录；canonical当前声明不能被旧日期/历史章节覆盖。

### M3_DELIVERY 处理

选**方案A**：M3_DELIVERY.md保留为真正现行delivery source。顶部结构化声明绑定唯一base c7ed67a9582f211335d4ed55414595969d696ebf、version0.4.3、phaseM3、contentHash f166a531、certificate6f60c23c（M2 74b0fd50/joint6d8796a9）。正文记录第一份已审产品候选200tests/21browser，以及本轮213tests/21browser、gap修复范围、documentation-only冻结、五个同名artifact与仍需文档窄复核/Android gap retest。没有把旧c95a6d76/0.4.2文件留作现行delivery。

### 旧门禁为什么漏过，新门禁如何工作

原check:docs只验证15对root/docs镜像（允许四种根文档相对链接规范化），只对MILESTONES两份调用milestone semantic validator，所以“两份一起写错旧状态”仍PASS。原milestone helper和6项tests逐字保留，没有删除或弱化。

新tools/current-state.mjs及d.mts集中登记14个现行文档及所有实际存在的docs镜像。docs/current-status.json的version/phase必须匹配package；每份必须在文件起始有唯一current-state:start/end声明区，由renderCurrentStateHeader生成同源JSON marker与可读状态，逐字验证canonical头部，覆盖current version、base、blocker、审核、设备/热态/portrait、30Hz/A/B/C与生命周期。故正确JSON配错误可读段、两份共同stale、漏/重复/篡改声明也拒绝；M3_DELIVERY五个artifact文件名额外按phase/version/base前8位推导核对。

historical/superseded:start/end只承载历史record，允许旧0.4.2/0.4.1、旧toolbar blocker及旧候选结论；嵌套/未闭合/孤立结束拒绝。当前声明只能在canonical区；正文的项目“当前版本/阶段/base/blocker”声明语法不能散落或重复，未注册current marker也拒绝。没有全文件禁止0.4.2，也不是几十条hardcoded全文句子grep；状态来自可维护的结构化源，版本从package绑定，模板与登记集合集中维护。历史架构accepted约束与未来硬门禁继续有效，历史阶段进度不当作当前。

### 新增13项validator tests与真实CLI负例

新增tests/unit/current-state.test.ts，全部通过：

1. 实际完整当前文档集与package/source相容。
2. 每个注册root及实际mirror的当前version退回0.4.2拒绝。
3. 当前Android blocker改回toolbar pending拒绝。
4. 历史0.4.2/旧toolbar/归档声明正常通过。
5. root/docs完全相同但共同stale仍拒绝。
6. M3_DELIVERY使用旧c95a6d76完整base拒绝。
7. 中央source与package version/phase不符拒绝。
8. 可读声明与正确JSON矛盾拒绝。
9. 缺失/重复/截断声明、缺当前文档拒绝。
10. 未注册声明及正文重复current声明拒绝。
11. 不完整/嵌套history不能隐藏旧声明。
12. pending窄复核不能升software-final，硬件未齐不能升overall/进入下阶段。
13. 正确header之后，artifact ZIP旧version或patch旧base缩写仍拒绝。

另外在隔离文件夹实际运行check-docs命令六组：当前集exit0、当前旧version exit1、toolbar pending exit1、历史0.4.2 exit0、两份相同stale exit1、旧delivery base exit1；见reports/m3-docs-respin-negative-cli.json。原产品/输入/multitouch/authority/容量200项逐字保留，没有改browser fixture来换绿。

### 产品源码byte-diff证明

第一份0.4.3 ZIP SHA256=`310066242734ada6ec77a49686404a9106dfce66887f3bf2c28b9d009171aeb6`，Git tree=`66363317c67c6fc34b2fda3ab3378cc602d02b69`，基线仍c7ed67a。与该ZIP manifest逐项比较，**119个src文件、47个既有test/fixture文件**，加content JSON、package/lock、配置与其他tools，共201个受保护文件SHA256完全相同；产品diff=0，原200tests保留。Controller、touch-layout、Simulation、Action/Movement/Projectile/Area、toolbar/BattleScene、capacity算法与engine绑定均无字节变化。唯一原工具修改check-docs.mjs；新增current-state.mjs/d.mts与validator test。报告/manifest/dist等生成物另列，不误记为authority修改。机器证据reports/m3-docs-respin-scope.json含全部201项摘要及39份文档分类；最终文档SHA以FILE_MANIFEST为准，避免报告自引用。

## 当轮完整门禁

| Gate command | exit code | tests | skipped | flaky | retry | status |
|---|---:|---:|---:|---:|---:|---|
| `npm run typecheck` | 0 | 0 | 0 | 0 | 0 | PASS |
| `npm run lint` | 0 | 0 | 0 | 0 | 0 | PASS |
| `npm run check:deps` | 0 | 0 | 0 | 0 | 0 | PASS |
| `npm run check:docs` | 0 | 0 | 0 | 0 | 0 | PASS |
| `npm run validate:content` | 0 | 0 | 0 | 0 | 0 | PASS |
| `npm run test:unit` | 0 | 80 | 0 | 0 | 0 | PASS |
| `npm run test:content` | 0 | 12 | 0 | 0 | 0 | PASS |
| `npm run test:sim` | 0 | 77 | 0 | 0 | 0 | PASS |
| `npm run test:capacity` | 0 | 23 | 0 | 0 | 0 | PASS |
| `npm run build` | 0 | 0 | 0 | 0 | 0 | PASS |
| `npm run test:browser` | 0 | 21 | 0 | 0 | 0 | PASS |
| `npm run check`（完整wrapper） | 0 | 213（总数） | 0 | 0 | 0 | PASS |

80 unit/architecture +12 content +77 simulation/replay/property +23 capacity/performance +21 browser=213。原200保留＋新增13文档测试，browser gameplay tests仍21且逐字未改。正式wrapper实际逐条执行上述11个npm命令，每项退出码独立记录；不采用上一份0.4.3报告代替。最新报告reports/check.json、m3-docs-respin-gates.json、browser.json，完整日志m3-docs-respin-check.log。报告收口后再次check:docs及diff--check。

初次当轮运行前10gate通过，browser因本环境缺锁定Chromium executable而在launch阶段失败，玩法未执行；初次check.json/log保存在reports/m3-docs-respin-initial-check.json/.log。安装Playwright build1194并验证Chromium141.0.7390.37可启动后，**重新完整运行npm run check**，最终11gate全部exit0，Playwright每结果retry0、expected21/unexpected0/flaky0/skipped0。这是环境准备失败后的独立完整复跑，不是flaky retry或skip，也没有动任何旧test断言。

## content / certificate / authority unchanged

engine仍0.4.3/M3；contentHash f166a531、M3certificate6f60c23c、M2certificate74b0fd50、joint6d8796a9。通过当轮正式validate:content及joint fixture compile重新验证，**m2-content、m3-content和整个m3-capacity-joint报告与第一份候选逐字相同**。没有新engine/version/content导致的certificate差异，不手改ID。fixed profile m3-debug-logical-v1、454 units/128projectiles/64Area、grid≤256、actions/obstacles≤16、fanout≤454全保留；所有actual≤certificate≤fault≤configured scope照常回归。

M3 joint release/expiry/startup/root/scanConservation/FactDelivery全报告不变，release Operations94634/Facts94896/scans28184273/lookups3428948/structure12001232、roots1100保持。454动作完成、128×326projectile sweep、64×128Area、2608CC到期与Hook/Replacement集成等原用例全部保留。

M2 extreme **4,574,049 Operations /9,135,386 Facts /163,705,610 scans /809,164,729 structure**，完整actual（含root work）、FactDelivery、certificate/profile、独立实体结果与第一份相同；20root/454×454/no truncation回归保持。最新桌面单Tick约79.552s，仅性能诊断，不是Android实时PASS。

固定代表性命令流两profile各三轮、60warmup+300measurementTicks；全量replay/property/同率低renderFPS authority回归通过。各run hash/maxWork/maxRoots/projectile/Area/伤害数与第一份一致：

| representative profile | p50 ms/Tick | p95 ms/Tick | CPU ms/sec | fixed-stream hash |
|---|---:|---:|---:|---|
| debug-battle-4 | 1.007–1.163 | 1.384–2.541 | 31.286–38.158 | `5716d35d`（不变） |
| representative-64-eight-active | 5.650–6.084 | 6.847–7.659 | 172.392–184.218 | `1130166b`（不变） |

CPU来自本次fresh桌面软件测量，波动不表示authority变化或Android性能通过；报告列第一份与本轮各run成本。实时CDP输入的targetTick受软件调度影响，两个现场session并非同一命令/Tick流，不拿其最终hash相互比较；固定脚本/replay的hash才进行相同流比较。全部证明reports/m3-docs-respin-authority.json。所有保护检查相等；若certificate/固定流hash/work有差异，本轮流程会assert停止，未跳过调查。

## 尚未完成的硬门禁

产品source review PASS是用户提供的独立结论：finite envelope、ignored lifecycle、battlefield lock、六按钮优先、1503×536 A/B CDP设计、mend盾/60Tick/pause、charge、authority及第一份交付一致性已确认。此次只剩documentation narrow review PENDING；Android gap retest NOT_EXECUTED。旧0.4.2 toolbar blocker已真机关闭，A/B held joystick→CC stop/resume、dash中断、basic范围、mend Heal100+Shield100约2s合法事实保留。

M3 overall/Android overall仍BLOCKED；formal A/B三轮交替×每情景≥20未完成；A/B各20min thermal/battery/温度/降频与second-tier约4GB未完成；portrait anti-rotation UNAVAILABLE。physical端到端DEFERRED/缺工具UNAVAILABLE；M7/M10原硬门禁保留。30Hz provisional，A default/B experimental/C not-triggered，不接受最终Tick率、最低设备、Android性能或最终手感。停止点：“M3 0.4.3 documentation-respun repair candidate，等待独立窄复核。”

## 重新交付一致性

<!-- respin-delivery:start -->
五个同名artifact已全部重新生成。精确patch base为`c7ed67a9582f211335d4ed55414595969d696ebf`，不是上一轮c95a6d76；git apply --check、forward完整tree、reverse恢复clean精确base、reapply同一完整tree与逐文件字节均PASS，包含dist和FILE_MANIFEST。外部manifest与包内self-manifest逐字相同；manifest覆盖313个文件，ZIP含314项（额外一项为FILE_MANIFEST本身），missing/hash mismatch/extra均0；SHA256SUMS验证其余四件artifact全部PASS。最终tree与SHA256由交付验证记录和外部checksum记录，不在本报告自写自身摘要。

原第一份候选的dist文件逐字相同，产品/content/certificate/固定流hash/work差异均0。重新生成的实时browser和performance报告允许计时差异；既有test与assertions没有变化。初次环境失败log仅清理行尾空白以通过diff --check，失败内容、exit code及机器报告完整保留。

本轮精确修改范围：上方逐项列出的39份文档；新增docs/current-status.json；修改tools/check-docs.mjs，新增tools/current-state.mjs与tools/current-state.d.mts；新增tests/unit/current-state.test.ts。生成物：FILE_MANIFEST.json、reports/browser.json、reports/check.json、reports/m2-capacity-peak.json、reports/m2-main-capacity-peak.json、reports/m3-043-gap-A.json、reports/m3-043-gap-B.json、reports/m3-043-mend.json、reports/m3-debug-battle.png、reports/m3-gameplay-ab.json、reports/m3-gameplay-performance.json，以及新增reports/m3-docs-respin-authority.json、m3-docs-respin-check.log、m3-docs-respin-gates.json、m3-docs-respin-initial-check.json、m3-docs-respin-initial-check.log、m3-docs-respin-negative-cli.json、m3-docs-respin-scope.json。共62个路径相对第一份0.4.3 candidate发生变化；其他文件无变化。

全部重新交付检查PASS仅指软件自动门禁及artifact一致性。停止点仍为：**M3 0.4.3 documentation-respun repair candidate，等待独立窄复核。** 不宣布M3 software-exit final；不push/deploy/继续Android/进入M4。
<!-- respin-delivery:end -->
