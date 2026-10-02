# MOBA Core Engine · M2 / 0.3.1

Android 横屏优先的 Phaser + TypeScript + Vite 工程。规范 0.1.3；M0/M1 已结束，M2 建立可 headless 验证的属性、状态与战斗内核。0.3.0 最终收口已因 scan accounting 缺口撤回，0.3.1 为独立复核候选。阶段出口以 [M2 验收记录](docs/M2_ACCEPTANCE.md) 为准。当前页面仍是 M1 空外壳/几何响应探针，M2 无正式可玩画面。

## M2 内核

严格 JSON 内容编译生成冻结的 CompiledCatalog，检查类型、引用、量纲、属性 DAG、数值范围、有限 Hook fuel 和联合 Ruleset CapacityCertificate。profile 不覆盖证书、Tick/内容绑定不一致或动态路径无法证明时，开局前拒绝。

属性按明确依赖和稳定顺序计算；资源、状态、护盾、防死、伤害/治疗通过 Operation 管线提交。Hook 是受控数据，Replacement/派生保留 root、parent、producer 和来源链。Fact 队列完整消费；damage breakdown 可逐阶段诊断。普通 Observation/RenderDelta 不含 raw World；调试端口由 headless application 明确持有。

content/m2-fixture.json 与 content/m2-profile.json 是合法小型测试 Ruleset/profile，不是正式英雄。容量样例包括 129/454 目标、多 Operation、Replacement、完整二次扇出、20 个合法根、维护/到期/周期/资源同时重合和故意失控循环。详细数值、成本、未覆盖机制见 [测试报告](docs/M2_TEST_REPORT.md)；容量通过不等于性能通过。

没有进入 M3：无正式英雄、技能动作、移动/碰撞、投射物、空间索引、地图、Bot、经济/装备或正式 UI/VFX。

## 开发与门禁

```bash
npm ci
npx playwright install chromium
npm run check
```

check 串行执行 typecheck、lint、check:deps、check:docs、validate:content、test:unit、test:content、test:sim、test:capacity、build、test:browser，失败退出非零，结果在 reports/check.json。M1 原有测试保留；浏览器门禁使用 /moba/ 生产构建，缺浏览器真实失败。容量峰值用例会同步执行百万级结算，需要较长时间和足够的测试机内存。

validate:content 是实际 schema/引用/DAG/容量/profile 门禁，已取消 NOT_APPLICABLE_M1。未登记的内容 JSON 直接失败。check:deps 验证模块/feature 导入 DAG、纯内核边界和 raw combat/debug DTO 权限；check:docs 验证规范/验收副本一致。依赖没有升级，精确版本见 [DEPENDENCIES.md](docs/DEPENDENCIES.md)。

npm run package 生成完整源码、唯一锁文件、规范、测试、报告和 dist 的 0.3.1 压缩包及 SHA256 manifest，排除 node_modules。首次执行前运行完整 check。

## Android 与 Pages

正式真机入口：[GitHub Pages](https://althanor.github.io/moba/)，源码：[althanor/moba](https://github.com/althanor/moba)。开始 M2 前核实 main 163df7ee30c92d9c0f7ab6b6374ebe08475d9a4a / 0.2.1：Actions run 36938625773 attempt 1 的门禁、构建、artifact、deploy 均成功，Pages HTTP 200。M2 交付包是该基线上的本地改动，不冒称已部署。

每次真机测试核对 [build-info.json](https://althanor.github.io/moba/build-info.json)、完整 commit、Actions run/attempt 与 artifact；测量导出携带相同构建信息。本地/dirty/unknown 明确标记。M2 构建 phase=M2，保留 M1 probe 的测量用途和命名。

A 普通插值默认；B 为 ≤1 Tick 的实验性 presentation-only VisualProxy；C 暂不触发。Simulation 30 Hz provisional baseline 保持，Phaser 保持 fps={target:60,limit:0,smoothStep:false}。M2 没有重新设计这些路径。左屏几何响应点、右屏独立多指、暂停/单步/恢复/重建/导出及生命周期行为继续使用 M1 实现。

本地 fallback：npm run build 后 npm run preview -- --port 4173，同机浏览器访问 http://127.0.0.1:4173/。不能用 loopback 从其他设备访问远端机器，不用 file://；Android 无需为已完成的 M1 验收重装工具。

高档 Android 已通过的 M1 项见 [M1_ACCEPTANCE](docs/M1_ACCEPTANCE.md)。第二档约 4 GB Android、20 分钟冷热态/电量/温度/降频仍为 DEFERRED；M3 复审和首个代表性负载补测，M7/M10 原性能/发行门禁保留。M2 桌面成本不代表真机性能通过。

## 文档

- [M2 实现契约](docs/M2_IMPLEMENTATION.md)、[M2 验收](docs/M2_ACCEPTANCE.md)、[M2 测试报告](docs/M2_TEST_REPORT.md)
- [架构](docs/ARCHITECTURE.md)、[流水线](docs/COMBAT_PIPELINE.md)、[编码规则](docs/CODING_RULES.md)、[里程碑](docs/MILESTONES.md)、[性能预算](docs/PERFORMANCE_BUDGET.md)
- [ADR 015/019/020/021/022/023](DESIGN_DECISIONS.md)、[变更](CHANGELOG.md)、[资源许可](ASSET_LICENSES.md)
