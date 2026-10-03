<!-- current-state:start -->
# MOBA Core Engine

<!-- current-state:json {"schema":"moba-document-current-state-v1","version":"0.4.3","phase":"M3","baseCommit":"c7ed67a9582f211335d4ed55414595969d696ebf","candidate":"输入误锁 documentation-respun repair candidate，等待独立窄复核","productReview":"PASS_SOURCE_REVIEW","documentationReview":"PENDING_NARROW_REVIEW","softwareExitFinal":"NOT_DECLARED","toolbarBlocker":"CLOSED_ON_ANDROID_DEVICE","currentAndroidBlocker":"skill-control interstitial gap → unintended authoritative targetLock","androidGapRetest":"NOT_EXECUTED","overall":"BLOCKED","androidOverall":"BLOCKED","formalAB":"NOT_COMPLETED","thermalBattery20min":"NOT_COMPLETED","secondTier4GB":"NOT_COMPLETED","portrait":"UNAVAILABLE","tickRate":30,"tickRateStatus":"provisional","modeA":"default","modeB":"experimental","modeC":"not-triggered","pushed":false,"deployed":false,"androidAcceptanceResumed":false,"nextPhaseStarted":false,"contentHash":"f166a531","certificate":"6f60c23c","m2Certificate":"74b0fd50","jointCertificate":"6d8796a9","toolbarFixVersion":"0.4.2","nextPhase":"M4"} -->

当前：M3 0.4.3 输入误锁 documentation-respun repair candidate，等待独立窄复核。

基线：`c7ed67a9582f211335d4ed55414595969d696ebf`（althanor/moba main）；version=0.4.3，phase=M3；contentHash=f166a531，certificate=6f60c23c，M2=74b0fd50，joint=6d8796a9。

产品源码独立审核=PASS_SOURCE_REVIEW；本轮文档窄复核=PENDING_NARROW_REVIEW；software-exit final=NOT_DECLARED。

0.4.2 toolbar blocker=CLOSED_ON_ANDROID_DEVICE；后续发现 skill-control interstitial gap → unintended authoritative targetLock；Android gap blocker retest=NOT_EXECUTED。M3 overall=BLOCKED；Android overall=BLOCKED。

formal A/B=NOT_COMPLETED；20min thermal/battery=NOT_COMPLETED；second-tier ~4GB=NOT_COMPLETED；portrait=UNAVAILABLE。30Hz provisional；A=default / B=experimental / C=not-triggered。

push=false；deploy=false；继续 Android 验收=false；进入下一阶段=false（本候选不得进入 M4）。状态源：docs/current-status.json；历史记录不充当当前状态。
<!-- current-state:end -->

Android 横屏优先的 Phaser + TypeScript + Vite 工程，规范 0.1.4。M0/M1 已结束；用户确认 M2 0.3.1 已完成独立源码复核、推送 `althanor/moba` main `c57fa8caadb2afc2eb98d85246e156d76e942949`，对应 Actions/Pages 全绿。M3已获授权；本轮只做0.4.3 documentation-only respin，产品冻结，真机出口单独等待，不进入M4。

第一份0.4.3产品修复已独立源码审核PASS，200 tests/21 browser；当前只修文档与文档门禁。基线、候选版本、Android blocker与未完成硬门禁见顶部声明；不推送/部署。

默认入口是极简可操作调试战斗场：一个玩家、测试单位和最低障碍。通用 basic/bolt/field/mend/dash/push 数据验证攻击、投射物/控制、Area、治疗/盾、移动和强制位移；摇杆、技能按下/拖拽瞄准/释放/取消、目标锁定、多指组合、控制挑战、暂停/恢复/重建均走 Command/Simulation。Phaser 只画 authoritative snapshots。原 M1 外壳/响应探针保留于 `?probe`。

## 架构与容量

继续使用冻结 CompiledCatalog、属性 DAG/公式、Resource/Status/Shield/防死、Operation/Hook/Replacement/Fact/伤害 breakdown、CapacityCertificate 和 startup/command/Tick 工作证明。M3 movement intent/step、cost、displace、spawn 等都进入原 executeRoot/dispatch；没有第二战斗系统、Phaser authority collision 或 hero-specific engine 分支。

`content/m2-fixture.json`/`m2-profile.json` 原内容不变。M3 新注册 `m3-battle.json`/`m3-profile.json`，全部 producer、space candidate、grid membership、pool/lifecycle、hash/结构重新证明。所有合法 M2 454×454/20-root 完整结算保留。logical maximum capacity 与 representative gameplay performance 分开报告；大容量上界不是实时性能承诺。

## 开发与软件门禁

```bash
npm ci
npx playwright install chromium
npm run check
npm run dev
```

check 串行执行 typecheck、lint、check:deps、check:docs、validate:content、test:unit、test:content、test:sim、test:capacity、build、test:browser，失败退出非零，报告在 `reports/check.json`。M1/M2 原有测试完整保留。浏览器使用 `/moba/` 的生产构建，缺真实测试浏览器会失败。百万级容量峰值用例需要较长时间和足够内存。

validate:content 验证所有显式注册内容/profile，未知 JSON 直接失败；check:deps 验证模块/feature 白名单、SCC、纯内核边界、public entry 和 raw combat/debug DTO 隔离；check:docs验证15对镜像、现行文档结构化声明与package/version/phase/blocker/base一致及历史区边界，继续保留milestone semantic gate；build/check/docs 共用 package.json.mobaPhase。依赖未升级，精确版本与唯一锁文件保持。

`npm run package` 生成完整源码、锁文件、规范、测试、报告、dist 和 SHA256 manifest 的 M3 压缩包，排除 node_modules/.git。先执行完整 check。local/dirty 构建元数据会明确标记，不能冒充远端 Actions 的干净提交。

## Android 与测量

Simulation 保持 30 Hz provisional；A previous/current 默认；B 是 ≤1 Tick 的实验性本地表现代理；C 暂未触发。Phaser 继续 `fps={target:60,limit:0,smoothStep:false}`。M3 导出分阶段 input/UI/visual/acceptance/release/authority movement、CPU/Tick、frame CPU、CPU/sec、预测纠正与公共 gameplay 事件。

本轮软件 Chromium 自动化不能替代 Android。高档 gameplay A/B 已有部分用户真机 PASS，toolbar旧blocker已关闭，新skill-gap误锁blocker复测pending；formal A/B三轮×各情景≥20未完成，portrait因anti-rotation为UNAVAILABLE；第二档非旗舰约 4 GB、A/B 各约 20 分钟代表性冷热态/电量/温度/降频仍 BLOCKED/等待真机，当前硬门禁为 M3 真机决策出口；ADR 019 的空壳理由不再延长。没有这些证据，不能宣称最终 Tick rate、最低设备、Android 性能或最终手感通过。M7 45 分钟低档完整对局、M10 发布矩阵原硬门禁保留。

源码：[althanor/moba](https://github.com/althanor/moba)。已有 [GitHub Pages](https://althanor.github.io/moba/) 仍须核对实际 build-info；0.4.2 已在 main，本地0.4.3 documentation-respun候选未推送/部署；0.4.2 页面不能用于本轮修复验收。人工执行单见 M3_ACCEPTANCE.md。

本地可用 `npm run build` 后 `npm run preview -- --port 4173`，同机浏览器访问 `http://127.0.0.1:4173/`；其他设备需要实际可达的托管地址，不能用远端机器 loopback 或 file://。

## 文档

- [M3 实现](docs/M3_IMPLEMENTATION.md)、[工作证明](docs/M3_WORK_ACCOUNTING.md)、[软件报告](docs/M3_TEST_REPORT.md)、[真机验收](docs/M3_ACCEPTANCE.md)
- [M2 实现](docs/M2_IMPLEMENTATION.md)、[M2 验收](docs/M2_ACCEPTANCE.md)、[M2 回归报告](docs/M2_TEST_REPORT.md)
- [架构](docs/ARCHITECTURE.md)、[流水线](docs/COMBAT_PIPELINE.md)、[编码](docs/CODING_RULES.md)、[里程碑](docs/MILESTONES.md)、[性能](docs/PERFORMANCE_BUDGET.md)
- [全部 ADR（含 024）](DESIGN_DECISIONS.md)、[变更](CHANGELOG.md)、[资源许可](ASSET_LICENSES.md)

M1/M2 报告保留其历史候选状态，并补充用户确认的后续收口说明；当前阶段以 M3 报告与验收状态为准。
