<!-- current-state:start -->
# M3 候选交付

<!-- current-state:json {"schema":"moba-document-current-state-v1","version":"0.4.3","phase":"M3","baseCommit":"c7ed67a9582f211335d4ed55414595969d696ebf","candidate":"输入误锁 documentation-respun repair candidate，等待独立窄复核","productReview":"PASS_SOURCE_REVIEW","documentationReview":"PENDING_NARROW_REVIEW","softwareExitFinal":"NOT_DECLARED","toolbarBlocker":"CLOSED_ON_ANDROID_DEVICE","currentAndroidBlocker":"skill-control interstitial gap → unintended authoritative targetLock","androidGapRetest":"NOT_EXECUTED","overall":"BLOCKED","androidOverall":"BLOCKED","formalAB":"NOT_COMPLETED","thermalBattery20min":"NOT_COMPLETED","secondTier4GB":"NOT_COMPLETED","portrait":"UNAVAILABLE","tickRate":30,"tickRateStatus":"provisional","modeA":"default","modeB":"experimental","modeC":"not-triggered","pushed":false,"deployed":false,"androidAcceptanceResumed":false,"nextPhaseStarted":false,"contentHash":"f166a531","certificate":"6f60c23c","m2Certificate":"74b0fd50","jointCertificate":"6d8796a9","toolbarFixVersion":"0.4.2","nextPhase":"M4"} -->

当前：M3 0.4.3 输入误锁 documentation-respun repair candidate，等待独立窄复核。

基线：`c7ed67a9582f211335d4ed55414595969d696ebf`（althanor/moba main）；version=0.4.3，phase=M3；contentHash=f166a531，certificate=6f60c23c，M2=74b0fd50，joint=6d8796a9。

产品源码独立审核=PASS_SOURCE_REVIEW；本轮文档窄复核=PENDING_NARROW_REVIEW；software-exit final=NOT_DECLARED。

0.4.2 toolbar blocker=CLOSED_ON_ANDROID_DEVICE；后续发现 skill-control interstitial gap → unintended authoritative targetLock；Android gap blocker retest=NOT_EXECUTED。M3 overall=BLOCKED；Android overall=BLOCKED。

formal A/B=NOT_COMPLETED；20min thermal/battery=NOT_COMPLETED；second-tier ~4GB=NOT_COMPLETED；portrait=UNAVAILABLE。30Hz provisional；A=default / B=experimental / C=not-triggered。

push=false；deploy=false；继续 Android 验收=false；进入下一阶段=false（本候选不得进入 M4）。状态源：docs/current-status.json；历史记录不充当当前状态。
<!-- current-state:end -->

## 当前交付与方案选择

选择方案A：M3_DELIVERY.md是现行delivery source，更新为输入误锁documentation-respun repair candidate，而非保留无标记旧版本交付。唯一base/version/phase/content/certificate绑定见顶部结构化声明（与package及集中状态源交叉验证）。第一份产品候选200tests、21browser已获独立源码审核；本轮新增文档validator tests后总数大于200，本轮实测213tests=原200+新增13、21browser，skipped/flaky/retry均0；逐gate结果见M3_TEST_REPORT。

第一份0.4.3产品范围：有限skill-control envelope，具体按钮优先，gap整段ignored且不改lock，battlefield target tap仍正式提交；1503×536真实CDP A/B多指、mend盾/60Tick/pause与双charge测试补强。本轮只respins文档、check:docs/helper/对应tests与生成物，不再次修产品；所有src/、content JSON、package/lock、既有200tests逐字保留。

## 文件与复验

- MOBA_Core_Engine_M3_v0.4.3.zip
- M3_v0.4.3_against_c7ed67a9.patch
- M3_TEST_REPORT_v0.4.3.md
- FILE_MANIFEST_M3_v0.4.3.json
- SHA256SUMS_M3_v0.4.3.txt

重新生成并替换上一份同名候选。ZIP含源码、规范、lock、全部tests、当轮reports、dist、FILE_MANIFEST；排除.git/node_modules与历史嵌套ZIP。完整binary patch含dist/manifest，必须从精确base apply --check、forward、reverse恢复clean基线、reapply得到同一完整Git tree与逐文件字节；ZIP与self-manifest逐文件SHA匹配，外部报告/manifest等于包内副本，SHA256SUMS验证其余四件。build-info明确local/dirty/base来源，不冒充push/Actions。

本轮需实际运行npm run typecheck/lint/check:deps/check:docs/validate:content/test:unit/test:content/test:sim/test:capacity/build/test:browser与完整npm run check；旧报告不能替代本轮实测。停止点：**M3 0.4.3 documentation-respun repair candidate，等待独立窄复核。** 产品源码审核PASS不代替文档窄复核与Android gap blocker retest，不宣布software-exit final/Android PASS/M3完成，不push/deploy/继续Android/进入M4。无需本轮用户安装Termux。
