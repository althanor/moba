<!-- current-state:start -->
# 注册内容与容量 profile 说明

<!-- current-state:json {"schema":"moba-document-current-state-v1","version":"0.4.3","phase":"M3","baseCommit":"c7ed67a9582f211335d4ed55414595969d696ebf","candidate":"输入误锁 documentation-respun repair candidate，等待独立窄复核","productReview":"PASS_SOURCE_REVIEW","documentationReview":"PENDING_NARROW_REVIEW","softwareExitFinal":"NOT_DECLARED","toolbarBlocker":"CLOSED_ON_ANDROID_DEVICE","currentAndroidBlocker":"skill-control interstitial gap → unintended authoritative targetLock","androidGapRetest":"NOT_EXECUTED","overall":"BLOCKED","androidOverall":"BLOCKED","formalAB":"NOT_COMPLETED","thermalBattery20min":"NOT_COMPLETED","secondTier4GB":"NOT_COMPLETED","portrait":"UNAVAILABLE","tickRate":30,"tickRateStatus":"provisional","modeA":"default","modeB":"experimental","modeC":"not-triggered","pushed":false,"deployed":false,"androidAcceptanceResumed":false,"nextPhaseStarted":false,"contentHash":"f166a531","certificate":"6f60c23c","m2Certificate":"74b0fd50","jointCertificate":"6d8796a9","toolbarFixVersion":"0.4.2","nextPhase":"M4"} -->

当前：M3 0.4.3 输入误锁 documentation-respun repair candidate，等待独立窄复核。

基线：`c7ed67a9582f211335d4ed55414595969d696ebf`（althanor/moba main）；version=0.4.3，phase=M3；contentHash=f166a531，certificate=6f60c23c，M2=74b0fd50，joint=6d8796a9。

产品源码独立审核=PASS_SOURCE_REVIEW；本轮文档窄复核=PENDING_NARROW_REVIEW；software-exit final=NOT_DECLARED。

0.4.2 toolbar blocker=CLOSED_ON_ANDROID_DEVICE；后续发现 skill-control interstitial gap → unintended authoritative targetLock；Android gap blocker retest=NOT_EXECUTED。M3 overall=BLOCKED；Android overall=BLOCKED。

formal A/B=NOT_COMPLETED；20min thermal/battery=NOT_COMPLETED；second-tier ~4GB=NOT_COMPLETED；portrait=UNAVAILABLE。30Hz provisional；A=default / B=experimental / C=not-triggered。

push=false；deploy=false；继续 Android 验收=false；进入下一阶段=false（本候选不得进入 M4）。状态源：docs/current-status.json；历史记录不充当当前状态。
<!-- current-state:end -->

M2 m2-fixture.json/m2-profile.json与M3 m3-battle.json/m3-profile.json是四份显式注册JSON；本轮documentation-only不修改任何一份。M2是headless逻辑fixture；M3是基础Action/Projectile/Area调试战斗场模板，不能当作完整原创英雄或M4地图/信息系统。validate:content实际编译schema/reference/units/attribute DAG/fuel/capacity/profile，未知JSON失败；logical maximum与代表性玩法性能分列。当前proof绑定见顶部声明，Information/Disclosure仍属M4，不将public-debug-arena视作正式隐藏信息策略。
