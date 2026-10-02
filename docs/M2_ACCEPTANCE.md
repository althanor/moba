# M2 验收记录

日期：2026-10-02。工程：0.3.1 修订候选。规范：0.1.3。

当前状态：修订候选 — PASS：0.3.1 的 11 个软件门禁和 98 项测试全部通过；BLOCKED：最终 M2 收口等待本轮独立复核。0.3.0 的 scan accounting 缺口与最终收口已撤回。不进入 M3，不推送 main。

## 基线与启动门禁

唯一基线为远端 althanor/moba main 163df7ee30c92d9c0f7ab6b6374ebe08475d9a4a /0.2.1。实施前完整读取 ARCHITECTURE、COMBAT_PIPELINE、CODING_RULES、MILESTONES、PERFORMANCE_BUDGET、DESIGN_DECISIONS（全部 ADR）、CHANGELOG、README 和 docs/M1_ACCEPTANCE，没有采用旧聊天副本。

Actions run [36938625773](https://github.com/althanor/moba/actions/runs/36938625773) attempt 1：validation/build/upload artifact/deploy SUCCESS；Pages HTTP 200。先通过此门禁，再开始 M2。M2 改动为本地交付，尚未推送/部署；这个成功 run 不作为 M2 新代码的 CI 通过证据。

## 出口矩阵

下表实现均有自动化断言，最终结论由 reports/check.json 的全部 11 项软件门禁 PASS 支持。完整数值和测试文件见 M2_TEST_REPORT.md。

| 要求 | 实现/证据 | 当前验收状态 |
| --- | --- | --- |
| Content / CompiledCatalog | 严格 schema、引用、稳定 ID、冻结数据、实际 fixture/profile | PASS |
| 属性 DAG/公式 | 环路径、量纲、有限区间、阶段中间值、稳定计算 | PASS |
| 资源/状态/战斗 | 消耗/恢复、伤害/治疗、护盾、独立来源/到期、控制能力 | PASS |
| Operation/Hook/Replacement | 稳定 DFS、固定 Pre/Post、有限 fuel、来源链、拒绝不触发 Post | PASS |
| 防死/幂等 | 一次防死/单次死亡、重复 Command/Operation、冲突拒绝 | PASS |
| Damage breakdown/Fact | 原始值/Operation 时刻公式节点/属性祖先/Modifier 来源、抗性/吸收/HP/Clamp/原因、Fact 完整消费 | PASS |
| 联合 CapacityCertificate | root/producer/Tick/维护/非 Operation/profile 开局 | PASS |
| 129/454 目标及多 Operation | 完整目标与独立预期结果，不截断 | PASS |
| Replacement/Hook/二次扇出 | 全部 454-target 子树、depth/trigger/chain 明确语义 | PASS |
| 多合法 root +维护/到期重合 | 主 profile 全 20 fixture roots +453 expiry +1 periodic | PASS |
| 动态不可证明路径 | 未支持动态 selector/callback/无 fuel 等编译或开局拒绝 | PASS |
| 故意失控循环 | 白盒破坏 AST/证书，guard 终止、root/op/producer/phase 定位、Session 冻结 | PASS |
| 确定性与隔离/M1 回归 | 同 seed/commands、30/60/120 render、full/summary 同 hash、无 raw World 输出 | PASS |

## 状态分类与边界

- PASS：本轮 M2 软件修订、98 项测试（含原 44 项 M1 回归）和实际内容编译/profile 开局门禁。
- BLOCKED：正式 M2 收口等待独立复核。联合压力情景未满足实时性能目标，保留成本问题；该目标不是本阶段容量正确性门禁，也没有宣称性能通过。
- DEFERRED：真实 Android M2 负载性能、第二档约 4 GB 设备、20 分钟冷热态/电量/降频；ADR 019 在 M3/首个代表性负载复审补测，M7/M10 原门禁保留。当前桌面联合峰值明显超预算，只记录成本，不能宣称实时性能 PASS。
- NOT_APPLICABLE：本阶段没有正式英雄、技能动作、移动/位移、碰撞、投射物、空间索引、正式地图、Bot、经济/装备、正式 UI/VFX、完整 Information/Checkpoint。

M2 通用核未覆盖 ExtraHealthLayer、一般 ResourceRoute、reservations/refunds、完整驱散类别、复活/奖励和信息披露策略；不以英雄分支模拟缺口，schema 拒绝未支持字段。未来增加机制/producer/合法内容/Tick 率必须重新编译证书并回归。

30 Hz provisional baseline、A 默认、B 实验性 presentation-only ≤1 Tick、C 未触发保持。M2 普通输出为空的授权 DTO，调试端口只由 headless application 显式持有；没有向 Bot/UI 暴露 raw World。

## 容量与性能分别判断

main fixture 逻辑 profile 名称为 m2-headless-v2，并非 Android 性能认证。静态保守证书覆盖所有允许 Hook/Modifier 组合、分支与 producer 同时重合，不用平均值或概率折扣。actual≤certificate≤fault limit≤profile configured；根/目标/Hook 深度/状态/Fact queue 同样开局验证。

summary 只限制可选调试归档：每条 Fact 仍完整生成、消费和计数。主最大并发 produced=consumed=9,135,386，最近原始记录 2000；独立 full 联合用例保留 1,655,282 条全部 Fact。两种模式对相同命令的权威状态/hash 一致，不通过丢 Operation/Hook/Replacement/目标降低工作量。

此样例为逻辑容量压力证据，不是性能达标内容。full trace 约 GiB heap、单 Tick 秒级成本均有报告，不能自动推广到 Android。后续性能优化必须保留完整合法结算和证书不变量。

## 0.3.1 修订出口

PASS：definition/certificate/entity/trace 索引、逐遍 scans、lookups/structure/startup/command 证明、producer.provenEffects 最终绑定；4096×三类目录反例、454叶解析、手算conservation、大Tag/盾类型/公式读取、深冻结与诊断副本均通过。完整原峰值仍4,574,049 Operation /9,135,386 Fact，全部454实体独立oracle通过。详细证书/actual/limit/profile及旧/新成本见 M2_TEST_REPORT /M2_WORK_ACCOUNTING。没有已知软件门禁失败；最终收口候选等待独立复核。

## 后续状态说明（2026-10-02）

用户已确认 M2 0.3.1 完成独立源码复核并正式推送 althanor/moba main c57fa8caadb2afc2eb98d85246e156d76e942949，软件出口 PASS、对应 Actions/Pages 全绿。以上候选/等待复核/不进入 M3 描述作为历史记录保留；M3 已获本轮明确授权，软件候选见 M3_TEST_REPORT.md，Android 真机门禁见 M3_ACCEPTANCE.md。原 M2 极限 fixture、索引与计账证明继续作为不可削弱的回归。
