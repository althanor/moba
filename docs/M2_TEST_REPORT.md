# M2 0.3.1 修订软件测试报告

2026-10-02；基线 althanor/moba main `163df7ee30c92d9c0f7ab6b6374ebe08475d9a4a` /0.2.1。交付状态：**修订候选，软件 PASS；最终 M2 收口等待独立复核**。没有进入 M3，没有推送远端 main。0.3.0 的完整非 Operation 证明和最终收口已撤回。

最终 `npm run check` exit 0：11/11 软件门禁 PASS，98 项自动测试通过（27+9+39+19+4），M1 原 44 项保留。浏览器 4 项全部通过，0 skipped/0 flaky/0 unexpected。

## 本轮修复与反例

4091 个额外未引用 constant formula 将 formulas 增至4096，旧 Array.find(ten) 可访问约4094个定义，却没有改变旧证书。修订使用 Session 私有 definition/certificate、Entity、attribute trace 索引；contentHash定义和权威数组顺序不变。Entity解析按index直接访问，验证Session/generation/pending/dispose；未引入M3 spawn/despawn。

所有保留集合的副本/筛选/聚合/排序/查询/维护逐遍计 scans，短路计实际访问。lookups、结构冻结/序列化/hash/归档、startup/command分别有有限证明/profile。完整单位、固定工作次数、参数公式和记录形状见 M2_WORK_ACCOUNTING.md /ADR023 /COMBAT_PIPELINE6.5。guard在begin绑定producer.provenEffects，mismatch没有登记root或执行Operation，并有root/producer诊断。

另修复相关的不可变诊断：不合格Hook的Fact复制participant数组，防止冻结借用数组后阻断后续仍合法的Hook；复制成本包含H和stage/participant长度的联合项。没有改Hook/fuel/Replacement/结算规则，没有改变原浮点乘法顺序。

## 新增自动化证据

- tests/capacity/indexed-work.test.ts：formulas/effects/modifiers各4096，原executable root/Tick证书不变；startup证明增加。同样454实体runtime.step禁止Array.find，全部runtime Work相同、资源独立核对。
- 454个叶目标直接解析：禁止Array.find，root lookups=2+454×4，454个HP全部正确。
- 手算conservation：单目标damage Tick scans=33/root=12；状态、脏属性、Hook（含不匹配候选）、诊断祖先、盾类型和同时到期有逐Tick固定账本，类别总和=actual.scans。
- 4096个Tag、4096个盾类型、127节点重复属性公式：真实访问增长被actual/certificate覆盖，不隐藏在定义查询中。
- tests/simulation/combat-fault.whitebox.test.ts：合法producer与合法但不属于其envelope的effect，在root登记前fault；operations=0、rootCount=0、各producer roots=0、资源未改。有generation/session/pending/dispose直接解析负例。
- tests/simulation/combat.test.ts：混合Hook trigger fuel的不可变Fact、浅冻结catalog的完整深冻结。

原tests/capacity、performance、unit、content、simulation/replay/property、architecture/dependency和M1 browser均保留。

## 全部11软件门禁

| 命令 | 状态 | 测试数 | 耗时ms |
| --- | --- | ---: | ---: |
| npm run typecheck | PASS | — | 2708.778 |
| npm run lint | PASS | — | 1503.640 |
| npm run check:deps | PASS | — | 475.408 |
| npm run check:docs | PASS | — | 186.557 |
| npm run validate:content | PASS | — | 897.160 |
| npm run test:unit | PASS | 27 | 2019.279 |
| npm run test:content | PASS | 9 | 884.267 |
| npm run test:sim | PASS | 39 | 1995.136 |
| npm run test:capacity | PASS | 19 | 96974.215 |
| npm run build | PASS | — | 7688.845 |
| npm run test:browser | PASS | 4 | 11601.602 |

原始证据 reports/check.json、reports/browser.json、reports/m2-final-check.log。首次完整check前10项通过，browser因缺少Playwright Chromium二进制exit1；补齐锁定版本依赖、单独复跑4项成功后，以上完整11项重新执行全部通过。保留 reports/m2-repair-first-check.json /first-browser.json /first-check.log；没有删测试或忽略失败。旧开发诊断日志注明为非最终交付树数据。build的Phaser大chunk提示保留，非性能PASS。

## 当前profile、证书与主峰值

Ruleset `headless-m2`，profile `m2-headless-v2`，engine0.3.1/compiler `m2-indexed-v2`，Tick30Hz，contentHash `4302def2`（与0.3.0一致），certificate `0fd8aab0`。profile覆盖全部root/Tick/startup/command故障ceilings。roundUpPow2只用于已证明上界，不是新拍脑袋Operation常数。

| Work | actual | certificate | fault limit | configured |
| --- | ---: | ---: | ---: | ---: |
| operations | 4,574,049 | 14,060,834 | 16,777,216 | 16,777,216 |
| hooks | 224,275 | 4,975,840 | 8,388,608 | 8,388,608 |
| queries | 9,553 | 19,996 | 32,768 | 32,768 |
| ast | 4,589,051 | 14,084,916 | 16,777,216 | 16,777,216 |
| formula | 4,571,780 | 267,063,684 | 268,435,456 | 268,435,456 |
| scans | 163,705,610 | 20,552,059,860 | 34,359,738,368 | 34,359,738,368 |
| facts | 9,135,386 | 182,730,914 | 268,435,456 | 268,435,456 |
| lookups | 35,478,464 | 2,160,545,674 | 4,294,967,296 | 4,294,967,296 |
| structure | 809,164,729 | 247,688,055,512 | 274,877,906,944 | 274,877,906,944 |

roots actual=474 /certificate3652 /limit4096 /configured4096；全目标454 /query envelope512；Hook depth2；Fact pending peak1。multi_all F=454/B=3/R=1/D=1362/S=0，Croot=620164/Lroot=1048576，保留完整二次扇出。producer fixture20/expiry1816/periodic1816的最大root证明与actual20/453/1均记录在JSON，begin直接校验provenEffects。

### 维护（Tick减全部roots）

| Work | actual maintenance | certificate maintenance |
| --- | ---: | ---: |
| operations | 3,631 | 4,994 |
| hooks | 0 | 0 |
| queries | 0 | 0 |
| ast | 0 | 0 |
| formula | 1,362 | 2,724 |
| scans | 54,227 | 147,857,956 |
| facts | 3,631 | 4,994 |
| lookups | 15,044 | 43,170 |
| structure | 2,700,944 | 5,758,937,432 |

维护Operation envelope4994（Modifier1816、盾1816、资源908、死亡454），还有P0/P1/P6/P9组件/历史/排序/结构工作；不是只证明一个已测Tick的维护值。

### startup（454实体）

| Work | actual | certificate | limit | configured |
| --- | ---: | ---: | ---: | ---: |
| operations | 0 | 0 | 1 | 1 |
| hooks | 0 | 0 | 1 | 1 |
| queries | 0 | 0 | 1 | 1 |
| ast | 0 | 0 | 1 | 1 |
| formula | 1,362 | 1,362 | 2,048 | 2,048 |
| scans | 118,043 | 311,674 | 524,288 | 524,288 |
| facts | 0 | 0 | 1 | 1 |
| lookups | 9,534 | 17,706 | 32,768 | 32,768 |
| structure | 1,235,488 | 219,703,790 | 268,435,456 | 268,435,456 |

实际初始边界标明scope=startup。startup包含逐root/profile维度验证和索引构建，未把初始化线性工作藏起来；增加无关定义仅扩大这一证明，低profile开局前拒绝。原始 reports/m2-startup-work.json。

### 每次command入口

| Work | certificate | limit | configured |
| --- | ---: | ---: | ---: |
| operations | 0 | 1 | 1 |
| hooks | 0 | 1 | 1 |
| queries | 0 | 1 | 1 |
| ast | 0 | 1 | 1 |
| formula | 0 | 1 | 1 |
| scans | 288,287 | 524,288 | 524,288 |
| facts | 0 | 1 | 1 |
| lookups | 514 | 1,024 | 1,024 |
| structure | 5,349,888 | 8,388,608 | 8,388,608 |

目标parser上界512、pending512、历史临时513和future90Ticks来自共享M2_COMMAND_LIMITS；随后普通拒绝的合法schema输入也在该有限入口内。实际每次调用使用独立guard；无法覆盖startup/command的profile不能创建World。

### 主Tick scans类别账本

| 类别 | 实际读取 |
| --- | ---: |
| maintenance | 2,270 |
| status | 68,771,748 |
| fact | 9,135,386 |
| shield | 13,620 |
| attribute | 10,896 |
| resource | 2,724 |
| scheduler | 563 |
| ordering | 4,568,690 |
| hook | 18,478,705 |
| query | 8,692,284 |
| diagnostic | 54,028,724 |

类别和=163,705,610。0.3.0的27,194,223漏计，不能与新值当作相同单位的性能比较；新证明对真实保留遍历闭合，非重命名掩盖遗漏。

## 原压力场景完整结算

交付原m2-fixture.json没有减少units、duration、Effect、Hook或producer。正式createCombatRuntime/executeRoot/dispatch路径：454units、454×454、20合法fixture roots，907状态/1816盾到期、453End/1Pulse和908资源更新同时重合。

Operation独立预期 `20×454×(454+4)+453×(1+454×2)+1+907+1816+908=4,574,049`。DamageResolved=4,122,320；OperationReplaced=214,742；HealResolved=224,275；ResourceResolved=9,081。Fact produced=consumed=9,135,386、queuePeak1，summary仅限制可选raw archive为2000，完整消费/统计保留。全部454个Health独立标量oracle校验，最终991403～991405。没有截目标、少Operation、删Hook/Replacement。

另一个独立完整two-root envelope仍保留454主/二次目标：829,457Operation /1,655,282Fact，全量归档完整保留。它没有替代主20-root场景。full/summary同命令状态/hash相同。故意破坏AST的真实自重入循环仍由根/ASTguard停止、定位root/producer/phase，Session保留上一完成边界并fault暂停，不能恢复fault继续半Tick。

## 旧/新成本与边界

| 单次桌面诊断 | step ms | 前heapUsed bytes | 后heapUsed bytes |
| --- | ---: | ---: | ---: |
| 0.3.0 主压力 /summary | 63539.381 | 1,639,720,856 | 91,208,104 |
| 0.3.1 主压力 /summary | 80435.696 | 1,486,064,744 | 119,410,896 |
| 0.3.0 full 联合 | 15296.163 | 33,424,288 | 1,592,916,184 |
| 0.3.1 full 联合 | 13941.209 | 26,098,088 | 1,523,881,272 |

主新成本80.436s vs旧63.539s，计账更完整且仍明显超实时预算；不以索引化宣称性能改善。单次结果非三轮统计，heap前/后非瞬时峰值，主用例前包含前一full用例待GC对象，不用于模式性能优劣结论。0.3.0成本来自保留的原交付记录 reports/m2-0.3.0-baseline.json；修订开发首次127.6s不是最终交付树，原开发日志保留但不混充最终数据。

PASS：本轮M2软件修订门禁/证书/全部完整结算。BLOCKED：最终M2收口仍等待本轮独立复核；当前没有已知软件门禁失败。DEFERRED：Android M2性能、第二档约4GB、20分钟冷热态/电量/降频，ADR019的M3复审/M7/M10后续门禁保留。NOT_APPLICABLE：M3及以后正式动作/移动/碰撞/投射物/空间/地图/Bot/经济/装备/UI/VFX，当前均未进入。

未覆盖机制继续明确：ExtraHealthLayer、一般ResourceRoute、reservations/refunds、完整驱散、复活/奖励、Information/Disclosure和M5完整Checkpoint；schema拒绝不支持字段。30Hz provisional、A默认/B实验/C未触发保持。远端基线成功Actions仅证明实施前0.2.1，不是本地0.3.1的远端CI/deploy证据。
