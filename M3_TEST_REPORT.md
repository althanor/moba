# M3 0.4.1 软件修复验证报告

状态：**全部 11 自动软件门禁 PASS，163 tests，无 skipped/flaky；最终软件出口 BLOCKED / 等待再次独立源码复核。** 本轮撤回 0.4.0 的最终软件出口声明。M3 整体未通过；正式 Android A/B 冻结，不推送 main、不部署 M3 Pages、不进入 M4。保持 30 Hz provisional、A 默认、B experimental、C 未触发。

基线：`althanor/moba` main `c57fa8caadb2afc2eb98d85246e156d76e942949` / M2 0.3.1，已由用户确认独立复核、远端 main/Actions/Pages PASS。0.4.1 是本地修复工作树候选，build-info 明确 source=local/workingTreeDirty=true，不冒充推送提交或 Actions 构建。依赖精确版本未升级。

## 三项阻塞修复

1. CSS → world：点独立缩放加 arena.min，向量独立缩放不加平移；先乘 arenaWidth/widthCss、arenaHeight/heightCss，再取 world unit direction。摇杆 analog magnitude 仍由屏幕拖距/48 决定，最大速度不因拖向 X/Y/斜向而变化。技能 drag 用同一 world direction，CSS deadzone/cancel/按钮规则保持。投影 preview 随当前授权源位置重定位，松手重新计算 Command；preview 不决定 authority hit。
2. Movement penetration recovery：Movement 独立 circle/rectangle helpers；圆已经重叠时允许 squared separation 单调增加的非零步，重心相同也能脱离；向更深处阻止，即使候选终点已穿到另一边。Rectangle 用 signed separation，内部考虑全部并列最近边，外部用最近点法向；初始导数不负且候选端点有严格进展才开放原重叠 blocker，其他 blockers 仍可截短。ignore 明确包含对应 path + endpoint collision；后续普通 stop 移动使用恢复规则。Arena 始终 clamp，ignore 不授予越界端点。没有额外 depenetration Tick/坐标写入，全部位置仍通过既有 Operation/Fact。Projectile 原 circleTOI/rectTOI 未改，起点重叠依旧 t=0 命中。
3. 当前阶段文档：root/docs MILESTONES 唯一声明 M2 0.3.1 已收口、M3 已获授权且当前为修复候选、整体未通过、不进入 M4。删除当前正文旧阶段矛盾。check:docs 不仅比对副本，还拒绝未标为 historical/superseded 的“未实施 M3 / 只实施 M2 / M2 可以开始 / 不进入 M3”；拒绝坏历史标记及缺失/重复/错阶段声明。Vite build、check 和 docs 共用 package.json.mobaPhase。

具体契约回写 ADR 024、COMBAT_PIPELINE.md、M3_IMPLEMENTATION.md。

## 测试保留和新增

原 131 项没有删除或弱化：与交付的 0.4.0 源码相比，31 个原测试文件全部保留，每个原 test/it/describe/afterEach 调用的 AST（包括断言）均保持。机器记录见 reports/m3-041-test-retention.json。全部原执行项在本轮完整 check 重跑。

| 新增回归 | 数量 | 关键覆盖 |
|---|---:|---|
| aspect-ratio input transform | 9 | 960×480、960×540、1503×536；H/V/45°；screen analog magnitude；真实 Simulation 移动投影共线；direction/point preview/release；target tap；多指 move/aim 与移动中 preview 重定位 |
| movement penetration recovery | 15 | 圆/矩形深穿入与内部最近面并列；独立 signed-distance 沿程 oracle；同心/偏心 spawn；双方从 overlap 向外；direct/teleport/dash/forced 的 units:ignore 和 wall:ignore endpoint 恢复；新进入仍碰撞；arena 边界；projectile t=0 一次命中；15/30/60/120 FPS 逐 Tick replay/hash |
| current-phase document semantic | 6 | 当前源 phase、两份文档、四种矛盾措辞、显式历史允许、错误历史/重复/错阶段拒绝 |
| ultrawide browser A/B | 2 | 1503×536 的 A/B 两种模式；真实 CDP 双指；authority movement 和实际 Graphics aim line 与 CSS finger vector 共线；释放、取消清理、无 fault |

## 全部自动软件门禁

| 门禁 | 状态 | tests / 结果 | 本次耗时 |
|---|---|---:|---:|
| `npm run typecheck` | PASS | exit 0 | 4.01 s |
| `npm run lint` | PASS | exit 0 | 1.95 s |
| `npm run check:deps` | PASS | exit 0 | 0.57 s |
| `npm run check:docs` | PASS | exit 0 | 0.17 s |
| `npm run validate:content` | PASS | exit 0 | 0.95 s |
| `npm run test:unit` | PASS | 42 | 2.46 s |
| `npm run test:content` | PASS | 12 | 1.60 s |
| `npm run test:sim` | PASS | 75 | 3.53 s |
| `npm run test:capacity` | PASS | 23 | 106.38 s |
| `npm run build` | PASS | exit 0 | 8.68 s |
| `npm run test:browser` | PASS | 11 | 52.34 s |

42 unit + 12 content + 75 simulation/replay/property + 23 capacity/performance + 11 browser = 163。浏览器使用生产 build；11 通过、0 skipped/unexpected/flaky。原三轮交替 gameplay A/B 软件测量完整保留，新 ultrawide 回归另列；6 个测量 Session 均 running，无自动恢复或跳过失败。软件时戳与真实手感/physical touch-to-photon 分开。

## 重新绑定的容量证明

engine `0.4.1` / compiler `m3-bounded-v2`；内容 hash `f166a531`；精确模板 certificate `b1434902`；profile `m3-debug-logical-v1`。454 单位、128 projectile、64 Area、grid≤256、actions/obstacles≤16、query fanout≤454、certificate roots=5654、fault/profile roots=8192 保持。

修复只增加每个既有 blocker 的固定标量几何计算，controller/presentation 变换不进入 authority work；没有新增动态集合/遍历/query/lookup/结构快照，因此 tick/startup/command 全部数值上界与 configured profile 保持。仍完整重新编译，旧版本证书不再接受；root、startup、command、Tick 均验证 actual≤certificate≤fault≤configured profile，并核对 scan conservation。完整表见 M3_WORK_ACCOUNTING.md / reports/m3-content.json。

联合 fixture certificate `6f511e6b` / contentHash `737006bb`：454 action completion、128 projectile×326 targets、64 Area×128 targets、2608 CC expiry 与 pulse 重合，另有 projectile/Area 与 M2 Hook/Replacement 同 root cancel/refund。release Tick 实际 94,634 Operations、94,896 Facts、28,184,273 scans、12,001,232 structure，1100 roots；全部 Fact produced=consumed，无结算截断。command 600 次 history/eviction 独立 scope 保持。

## M2 极限回归与正常玩法分开

M2 保持 **4,574,049 Operations、9,135,386 Facts、163,705,610 scans、809,164,729 structure**。454×454、20-root、4096 indexed cardinality、producer mismatch、scan conservation、lossless Fact consumption 保持；单位 envelope 和全部 Hook/Operation/Fact 没有削减。本次精确 Ruleset 桌面诊断约 88.365 秒/Tick；仍是极端容量正确性性能债，不是正常 gameplay workload。

正常 gameplay 30 Hz，每种 workload 3 轮、60 Tick warmup + 300 measured；hash 一致，单位 ms。

| Profile | Tick p50 | Tick p95 | Simulation CPU ms/模拟秒 | final hash |
|---|---:|---:|---:|---|
| debug-battle-4 | 1.14–1.23 | 1.75–2.22 | 37.14–40.69 | 5716d35d |
| representative-64-eight-active | 5.96–6.07 | 9.60–10.69 | 188.38–197.94 | 1130166b |

桌面软件诊断不代表 Android 性能 PASS；logical maximum 与 representative workload 不合并结论。浏览器 CPU/frame/latency/correction 原始记录在 reports/m3-gameplay-ab.json，环境/版本/证书均为当前候选。B 保持实验性；本轮 bug 不触发 C。

## 停止点与交付

- PASS：三项修复的自动回归、全部 11 自动软件门禁、M1/M2 原回归、M3 joint capacity、低 rendering FPS authority/replay/hash、多指与 ultrawide 软件 A/B。
- BLOCKED：最终 M3 软件出口（等待用户再次独立复核）；M3 整体、正式 Android A/B、main/Pages/M4（复核前禁止）；第二档设备与代表性热态/电量/温度/降频、最终率/最低设备/Android 性能/最终手感仍未验收。
- DEFERRED：physical touch-to-photon 人工测量与原 M7/M10 未来硬门禁，未豁免。
- NOT_APPLICABLE：C=60 Hz authority 对照（本轮未触发）。

新完整 ZIP、针对 c57fa8c 的源码 patch、FILE_MANIFEST 和 SHA256SUMS_M3_v0.4.1.txt 独立提供；manifest/hash 校验与 patch 应用/逆向重建另行验证。交付校验通过不代替独立源码复核。
