<!-- current-state:start -->
# M3 验收与 Android 执行单

<!-- current-state:json {"schema":"moba-document-current-state-v1","version":"0.4.3","phase":"M3","baseCommit":"c7ed67a9582f211335d4ed55414595969d696ebf","candidate":"输入误锁 documentation-respun repair candidate，等待独立窄复核","productReview":"PASS_SOURCE_REVIEW","documentationReview":"PENDING_NARROW_REVIEW","softwareExitFinal":"NOT_DECLARED","toolbarBlocker":"CLOSED_ON_ANDROID_DEVICE","currentAndroidBlocker":"skill-control interstitial gap → unintended authoritative targetLock","androidGapRetest":"NOT_EXECUTED","overall":"BLOCKED","androidOverall":"BLOCKED","formalAB":"NOT_COMPLETED","thermalBattery20min":"NOT_COMPLETED","secondTier4GB":"NOT_COMPLETED","portrait":"UNAVAILABLE","tickRate":30,"tickRateStatus":"provisional","modeA":"default","modeB":"experimental","modeC":"not-triggered","pushed":false,"deployed":false,"androidAcceptanceResumed":false,"nextPhaseStarted":false,"contentHash":"f166a531","certificate":"6f60c23c","m2Certificate":"74b0fd50","jointCertificate":"6d8796a9","toolbarFixVersion":"0.4.2","nextPhase":"M4"} -->

当前：M3 0.4.3 输入误锁 documentation-respun repair candidate，等待独立窄复核。

基线：`c7ed67a9582f211335d4ed55414595969d696ebf`（althanor/moba main）；version=0.4.3，phase=M3；contentHash=f166a531，certificate=6f60c23c，M2=74b0fd50，joint=6d8796a9。

产品源码独立审核=PASS_SOURCE_REVIEW；本轮文档窄复核=PENDING_NARROW_REVIEW；software-exit final=NOT_DECLARED。

0.4.2 toolbar blocker=CLOSED_ON_ANDROID_DEVICE；后续发现 skill-control interstitial gap → unintended authoritative targetLock；Android gap blocker retest=NOT_EXECUTED。M3 overall=BLOCKED；Android overall=BLOCKED。

formal A/B=NOT_COMPLETED；20min thermal/battery=NOT_COMPLETED；second-tier ~4GB=NOT_COMPLETED；portrait=UNAVAILABLE。30Hz provisional；A=default / B=experimental / C=not-triggered。

push=false；deploy=false；继续 Android 验收=false；进入下一阶段=false（本候选不得进入 M4）。状态源：docs/current-status.json；历史记录不充当当前状态。
<!-- current-state:end -->

基线：althanor/moba main c7ed67a9582f211335d4ed55414595969d696ebf /0.4.2 /M3；184 tests、contentHash f166a531、certificate af8e1f05。0.4.2 已推送且以下真实 Android 功能证据来自用户确认。本轮停止继续正式验收，只制作本地 0.4.3 repair candidate，产品修复已独立源码审核PASS；本轮documentation-only respin等待独立窄复核，之后仍需Android blocker retest。不推送、不部署、不进入 M4。

## 当前证据与出口

| 项目 | 状态 | 证据与边界 |
|---|---|---|
| 0.4.1 软件出口 | PASS（历史独立复核） | 保留此前证据，不授予新候选独立复核 PASS |
| 0.4.1 Android A 大量功能；B 普通移动/碰墙/move→dash | PASS（历史用户真机事实） | 未外推整个 Android 或最终手感 |
| 0.4.2 toolbar second-touch blocker | CLOSED（用户真机确认） | 已关闭原 blocker，不被新问题抹掉 |
| 0.4.2 A/B held joystick + control | PASS（用户真机确认） | CC stop + 原 held intent 自动恢复均通过 |
| 0.4.2 A/B dash→CC interruption | PASS（用户真机确认） | 保留合法功能证据 |
| 0.4.2 basic out-of-range / in-range | PASS（用户真机确认） | 越界拒绝、范围内命中 |
| 0.4.2 mend Heal100 + Shield100 + ~2s expiry | PASS（用户真机确认） | 对应 60 authority Ticks；软件另补 pause/到期精确断言 |
| skill-cluster interstitial gap→unintended authoritative targetLock | BLOCKED（用户真机确认） | 静止点击间隙稳定锁敌；独立单指摇杆不自动锁。导出 lock index3/generation1、pointer453，CSS约1444.63/466.04，interaction=target，queued/accepted |
| 0.4.3 自动软件门禁 | 见 M3_TEST_REPORT.md / reports/check.json | 当轮全量软件证据，不能代替 Android |
| 0.4.3 产品修复 | PASS（用户独立源码审核） | gap/envelope/target-lock/六按钮/CDP/mend/charge/authority与交付证明已确认 |
| 0.4.3 documentation-respun repair candidate | PENDING 独立窄复核 | 本轮只修stale状态与门禁；复核后仍须Android gap复测 |
| 当前 debug bolt 人工 charge fixture | NOT_SUITABLE | cooldown=recharge=1s 先锁全技能；不能人工区分两枚消费。保留 content；真实双 charge 自动测试单列 |
| formal A/B 3 alternating rounds × each scenario≥20 | PENDING / 未完成 | 部分功能 PASS 不替代正式配对统计 |
| A/B各约20min热态/电量/温度/降频 | BLOCKED / 未完成 | M3 真机决策硬门禁 |
| 第二档非旗舰约4GB | BLOCKED / 未完成 | 不沿用 ADR019 空壳理由无限延期 |
| portrait/rotation 真机 | UNAVAILABLE | 设备操作时 anti-rotation 保护，不是 PASS |
| physical touch-to-photon | DEFERRED；无工具时 UNAVAILABLE | 软件 capture/重采不等于物理端到端 |
| A/B/C | A 默认、B experimental、C NOT_APPLICABLE | 30Hz provisional；本输入 bug 不触发60Hz |
| M7低档45min / M10发行矩阵 | DEFERRED 到原硬门禁 | 保留原要求 |
| M3整体 / Android整体 / M4开始 | BLOCKED | 0.4.2不是M3 final；新候选、blocker复测与硬件证据未齐 |

事实来自用户本轮 Android 报告。本环境没有操作真机；不伪造硬件原始样本、温度、电耗或 Actions run。生产构建 Chromium/CDP 仅为软件证据。

## 独立文档窄复核后优先复测

核对获授权部署的 0.4.3 build-info/version/commit/contentHash/certificate；当前本地候选没有部署，0.4.2页面不能冒充0.4.3。记录设备/OS/浏览器/viewport/FPS及屏幕条件。

1. 重建、静止，A/B分别点六按钮间隙和对应右下 interstitial dead zone，完整 begin/move/end/cancel：interaction=ignored，无 targetLock queued/accepted，无新黄圈/authority lock。
2. 在 envelope 外真实战场点锁敌 A，再点 gap：仍锁 A；六实际按钮及技能 drag/release/cancel 仍可用。
3. A/B 左手 held joystick，第二指 gap 后松第二指：左指保持、移动继续、无 lock/ghost pointer。再组合 joystick+skill+第三指control，保留0.4.2已确认CC停止/自动恢复与toolbar exact-once。
4. 若 blocker 关闭，才恢复正式 A/B 3交替轮×各情景≥20；保留已确认0.4.2功能证据，不无故重做全部。新回归才扩展范围。

仍须按M3范围记录joystick持续/急转/碰墙、dash、projectile、skill按下/拖拽/释放/取消、control开始/结束/中断、多指的input/UI latency、visual、authority acceptance、correction、CPU/Tick、frameCPU、CPU/sec、prediction error及玩家说明。代表性冷热态A/B各20min，在0/5/10/15/20min记录电量/可取温度/降频与帧/CPU；第二档约4GB同样保留。无低档/热态证据不接受最终率、最低设备、Android性能或最终手感。

停止点：**M3 0.4.3 documentation-respun repair candidate，等待独立窄复核。** 本轮不继续Android验收、不宣布M3完成、不进入M4。
