# MOBA 战斗结算流水线

版本：0.1.4。日期：2026-10-03。当前：M3 0.4.2 toolbar multitouch 软件修复候选，等待独立源码复核；0.4.1 软件出口已由用户确认独立复核通过并推送 main c95a6d76f34a9f8621586a9bd84160f71061170d；Android A/B 因真机 toolbar multitouch blocker 暂停；M3 整体未通过，不进入 M4。

此文是 Tick 阶段、战斗顺序与因果关系的唯一规范来源。所有英雄、兵、野怪、塔、装备、Modifier 和 Debug 操作使用同一结算入口。表现动画、Phaser 碰撞回调、UI 和 Bot 不能决定命中或生命变化。正式数值在 Ruleset 中确定；下列默认公式和边界行为作为实现基线，变更须更新决策、文档和测试。

关联：[总架构](ARCHITECTURE.md)、[编码与测试规则](CODING_RULES.md)、[设计决策](../DESIGN_DECISIONS.md)。

## 1 时间与全局顺序

当前实现基线为模拟 30 Hz，M1 基础探针已测，最终 Tick 率仍须 M3 真实技能/受控情景决定。tickIndex 是整数，Tick n 表示从该 Tick 边界推进一次固定 step。所有持续状态使用半开区间 [startTick, endTick)：endTick = n 的状态在 Tick n 的 P0 先到期，再处理 n 的命令。冷却到期 n 意味着 n 可以施法。周期跳伤只在 nextPulseTick < endTick 时发生，默认没有到期边界的额外一跳；有末跳的技能须显式定义 end Effect。

持续时间以 ceil(ms × tickRate / 1000) 转为 Tick，避免提前结束；瞬发显式标记为 0。攻击前摇/后摇也转换为 Tick，离散误差要测试并显示在调试器中。攻速周期若出现非整数 Tick，使用固定精度累计余数保持长期平均频率，不能每次 ceil 后令攻速系统性偏低；最低攻击间隔至少 1 Tick，正式攻速上限另由 Ruleset 决定。

### 1.1 Tick 阶段表

| 阶段 | 责任与顺序 | 主要屏障和结果 |
| --- | --- | --- |
| P0 时间和到期 | 处理到期 Modifier/护盾/控制、空间/信息授权、冷却/充能成熟、复活到期、资源再生；收集周期与计划任务 | 先注销到期来源和 Hook，再处理到期 End Effect 意图；刷新脏属性；复活和再生提交后可行动，过期授权不能供 P1/P2 选目标 |
| P1 命令入口 | 取 targetTick = n 的命令、去重、权限校验、统一排序、基本合法性检查 | 获得动作请求与商店交易请求；明显无效请求不消耗资源 |
| P2 动作 | 应用合法商店/升级交易并刷新属性；处理取消和动作请求；推进普攻/技能阶段 | 资源预留/扣除；释放产生根 Effect；投射物创建在 P2 末提交，才可进入 P4 |
| P3 移动 | 先既有强制位移，再冲刺，再普通移动；进行静态碰撞与路径推进 | 只写权威位置；刷新动态空间索引；普通移动不能覆盖击退 |
| P4 空间和命中 | 更新位置相关视野；投射物扫掠检测；范围和区域进入/离开；即时释放目标重验 | 收集 HitIntent 和区域 Effect，不直接扣血；按碰撞 TOI/目标句柄稳定排序 |
| P5 Effect 事务 | 根请求稳定排序；逐个执行受限 Hook、操作、资源/生命变化与派生 Effect | 每个叶子 Operation 原子提交；致死后立即禁止新动作；位置/视野/属性脏项在事务屏障刷新 |
| P6 死亡和奖励 | 收集全部最终死亡，依序确认 DeathRecord；处理击杀助攻、经验金币、装备/升级变化、塔仇恨与胜负 | 奖励 exactly-once；死亡后 Effect 延至下 Tick；先收集基地死亡集合再裁定胜负 |
| P7 收尾可见性 | 处理死亡造成的区域退出/视野失效；刷新属性/控制、队伍可见性并复核本 Tick 授权变化 | 区域退出战斗 Effect 排入下 Tick P5，不回到已过阶段；授权到期已在 P0 执行 |
| P8 结构提交 | 提交剩余创建/销毁、清理句柄与索引；注册本 Tick 后期出生对象 | 新建视野来源立即局部刷新，但最早下 Tick 行动/碰撞；不能改已结算的根顺序 |
| P9 对外快照 | 耗尽规定的权威事实消费者，Information 根据披露策略构建过滤投影/感知事件、状态 hash 和可存档边界 | 输出 Observation/RenderDelta/PerceptionEvent；调试验证不变量；Tick n 完成 |

P0 中的复活和生命周期操作、P2 中的资源/交易操作也经过类型化 Operation 处理器，允许的阶段写入有白名单。P5 不是唯一能写世界的地方，而是战斗 Effect 的统一结算阶段。各 feature 注册阶段处理器，runtime 调用；不使用无序的 systems.forEach 更新。

来源在 P2 释放动作后，敌方 P5 才造成控制，不能撤回已经释放的投射物；仍处于前摇/引导的动作收到控制时立即按中断策略取消。P5 中新增位移立即改逻辑位置并重建局部索引，影响后续 Effect 的位置查询，不重做已经完成的本 Tick P3 普通移动。

### 1.2 同 Tick 顺序

命令排序键为 (targetTick, seatOrder, sequence)。seatOrder 在开局用固定种子选择基准轮转，随后按 tickIndex 循环偏移十个席位；对所有控制器一视同仁并可重放。单个 actor 每 Tick 允许的动作类别、队列与取消冲突由 Actions 的规则表决定，不能同时消费两个互斥施法请求。

本地新输入默认排到尚未开始的下一 Tick。晚于目标 Tick 才到达的命令返回 staleTick，不追溯执行；未来命令只在目标 Tick 处理，初始允许向前最多 90 Tick，入口总队列 ≤512、每席每 Tick ≤32 个请求。按住摇杆只保留同 Tick 最新移动意图，Attack/Cast 不凭此合并掉独立动作。重复 controllerId+sequence 返回原 CommandResult；同键不同 payload 为非法请求。队列/权限/Schema 校验失败必须有结果，不能无声丢输入。未来联网的延迟输入策略另行设计。

根 Effect 排序键为 (scheduledTick, rootPriority, rotatingSourceOrder, sourceRef, sourceSequence, rootId)。默认 rootPriority 相同；允许不同优先级只用于 Ruleset 明确列出的能力并经内容校验。P0、P2、P4 收集顺序不隐含优先权。无席位来源用来源实体对应的稳定顺序，碰撞多目标排序用 TOI 再 EntityRef。

Sequence 的子 Effect 严格按定义顺序完成，包含该子 Effect 的派生链，再执行下一个子 Effect。不同根按稳定顺序串行。默认没有“整个 Tick 先算所有伤害再一起死亡”：先提交的致死伤害会让后续指向死者的普通治疗失败。已经释放、允许死后继续的攻击仍可命中其他活目标，因此可发生互换击杀。

双方基地在同 Tick 都最终死亡时，P6 根据同一死亡集合记平局；不能因为遍历顺序先宣布一方胜利。特殊比赛规则将来可替换此策略。

## 2 四种消息

| 类型 | 谁创建 | 是否改变状态 | 是否允许修改/取消 |
| --- | --- | --- | --- |
| Command | PlayerController、Bot、Replay、Debug | 提出动作，验证后才可执行 | 验证器拒绝；不是已发生事实 |
| Operation | Action/Effect/规则处理器 | 指定受控状态变更 | 提交前由对应 Hook 修改；提交后不可取消 |
| Hook Invocation | 事务执行器 | 本身不写状态 | 返回 Patch、Cancel、Replacement 或后续 Operation |
| DomainFact | Operation 提交器 | 记录已发生结果 | 不可修改、不可取消；输出副本只读 |

CommandResult、DamageResolved、HealResolved、ShieldBroken、ModifierApplied、ActionInterrupted、EntityDied、RewardGranted 等均是事实。渲染播放失败不能让 DamageResolved 回滚。原始事实带真实来源和完整数值，仅权威消费者/内部调试使用；Information 使用空间视野证据和 DisclosurePolicy 生成按席位过滤的 PerceptionEvent，详见 ARCHITECTURE 第 9 节。空间不可见不等于禁止一切播报；允许哪些字段由权威信息策略决定，不能把原始事实交给 UI 再自行删字段。

## 3 攻击与技能流程

### 3.1 请求到释放

1. 确认 match 正在 Running、controller 拥有 actor、句柄 generation 有效、actor 活着，且该动作没有被对应控制 Tag 禁止。
2. 检查技能是否拥有/可用/等级有效、充能/冷却成熟、目标类型和队伍关系、视野、距离、可行走/阻挡规则、有限坐标与资源可用量。
3. 合法后建立 CastInstance/AttackInstance。消耗策略为 spendOnStart 或 reserveThenSpendOnRelease；预留不可供第二技能重复使用。定义 cooldownStart 为 onStart/onRelease/onEnd，cancelCooldown/refundPolicy 同时必填，不靠各英雄默认猜测。
4. 推进 windup/channel。追踪技能按定义检查距离/视野；固定地点技能保存地点。中断执行统一取消策略，释放预留并生成事实。
5. 释放时重验需要保持的条件；提交资源、充能及冷却，生成 Effect 根、区域或投射物请求；进入 recovery。失败原因与退还政策显式记录。

普攻使用同样的前摇、释放和后摇框架，能否移动取消后摇与重置攻击由通用 Action Operation 表达。近战命中并非“动画挥完必定命中”；释放后根据目标策略与 P4 几何重验。Skill shot 可对地面施放，不要求该处敌人已可见，但伤害/目标反馈必须按信息规则过滤。

### 3.2 命中与快照

HitIntent 保存 actionId、impactId、目标、碰撞位置/方向、Effect ID、来源归因和快照参数，不包含 UI 计算的最终伤害。

sourceSnapshotPolicy 按字段声明 launch 或 impact。默认普攻的基础输出、暴击判定在释放时锁定；目标抗性、护盾、减伤、无敌和伤害路由在命中时读取。持续区域技能每跳重新读取声明为 dynamic 的来源属性。来源实体销毁后需要的字段必须已有快照，不能从失效句柄读取；归因始终用释放时合法 creditOwner。

高速投射物每 Tick 做 swept segment/circle 或匹配形状的连续检测，不能只检测终点。穿透保存已命中集合；同一次 impactId 的多个伤害分量可以分别结算，但普攻 on-hit 使用明确 triggerGroupKey，不能因为物理+魔法两包伤害自动重复触发两次。追踪目标失去视野、死亡、不可选中、传送后的失效策略均写在 projectile/target policy。

## 4 伤害事务

每次 Damage Operation 生成一个可审计的 breakdown。阶段不能由 Hook 任意改序。

| 顺序 | 计算或检查 | 语义 |
| --- | --- | --- |
| D0 合法性 | 目标存在、可受伤、关系/命中有效、source policy 有效 | 重复 opId 不结算；非法则输出拒绝结果 |
| D1 原始伤害 | FormulaRegistry、快照、基础/加成、暴击、伤害分量 | rawDamage；每种伤害类型独立记录 |
| D2 输出修正 | 来源增伤/减伤、指定目标类别倍率、施法能力倍率 | modifiedOutgoing；加法桶/乘法桶有固定规则 |
| D3 目标上限 | 明确的 preMitigation cap，例如特定技能对史诗目标上限 | cap 作用阶段与分量必须在定义指定 |
| D4 命中防护 | 格挡/招架、法术护盾、类型免疫、无敌、取消/替换 Hook | 完全取消不产生普通吸血与受伤触发；命中事实仍可存在 |
| D5 抗性 | 削减、穿透后有效抗性；类型对应抗性倍率 | true 类型跳过抗性；不自动跳过所有防护 |
| D6 承伤修正 | 接收增伤/减伤、伤害下限/上限等显式规则 | postMitigation cap 可在此执行，默认不得重复 D3 |
| D7 路由与护盾 | 合法 ResourceRoute/生命层路由、标准护盾顺序 | 记录资源消耗和盾吸收；路由读取 D6 数额 |
| D8 生命及致死保护 | 将剩余量分配到生命层，先检查可用的 DeathSave/最低生命规则 | 一次原子提交资源、盾、HP 与防死消耗 |
| D9 结果与派生 | 归因账本、实际量、护盾破裂、伤害事实、吸血/反伤等 | 致死目标立即标记 PendingDeath；后续死者治疗默认失败 |

Patch 只能修改该阶段公开字段。替换伤害类型必须在 D4 或以前完成；D7 不再把伤害改回未减伤值。没有统一“真实伤害无视一切”的隐式设定：Ruleset 为 true 类型列出能作用的防护 Tag、路由和护盾；MVP 默认 true 跳过抗性与常规百分比伤害修正，仍受无敌、匹配护盾、合法资源路由和明确的特殊规则影响。

### 4.1 暂定数值公式

物理用 armor，魔法用 magicResistance。抗性 R >= 0 时倍率为 100/(100+R)；R < 0 时倍率为 2-100/(100-R)。有限性校验在计算前后执行。此为项目默认公式，不宣称复刻某游戏当前版本。

抗性处理顺序：基础及属性结果 → 固定削减 → 百分比削减 → 百分比穿透 → 固定穿透。削减可造成负抗性；穿透只处理正抗性并最低降到 0，已为负的值不被穿透进一步放大。多个百分比穿透采用 1-∏(1-p)，每项 p 必须在允许区间；不直接把百分比相加。装备和技能的“削减/穿透”不得混为同一 Tag。

急速对冷却的默认公式为 baseCooldown/(1+haste/100)，最低冷却、急速允许范围与英雄特殊转换由 FormulaRegistry/Ruleset 限制。时间先算连续值，再按 Tick 转换。伤害、生命、资源使用有限 number，内部保留小数；UI 四舍五入不回写战斗。金币与经验默认整数，分配余数按稳定席位序处理。

定点数不是本阶段承诺。相同构建、内容、种子和命令流须可重放；跨 JS 引擎逐 bit 确定性在联网阶段另验证。

### 4.2 护盾和其他池

每个 ShieldInstance 包含 id、source、remaining、priority、适用伤害 Tag、endTick、stackKey 和效果触发政策。吸收按 priority 降序、endTick 升序、instanceId 升序；不根据 Map/订阅器插入偶然顺序。万能盾和类型盾都进入同一排序，是否优先类型盾由 priority 明确配置。耗尽只发布一次 ShieldBroken，过期和驱散是不同事实。

常规临时生命使用 ExtraHealthLayer，不冒充 Shield；它是否计入最大生命、治疗可达性、生命百分比和伤害归因在 layer policy 声明。自定义防御资源使用 ResourceRoute，包含适用类型、优先级、阶段、转化效率、每击/每 Tick 限制、耗尽余量处理，编译时拒绝互相循环的路由。默认路由先于标准护盾，特定规则须声明固定阶段，不能临时插入任意结算点。

ShieldCounter 等规则按符合 Tag 的盾量在 D7 执行，不能据名称对某英雄的额外生命层打折。正式生命层/资源路由表达能力在 M2 设计实现时单独验收。

### 4.3 实际伤害指标

| 字段 | 定义 | 典型用途 |
| --- | --- | --- |
| rawDamage | D1 得到的理论输入量 | 公式调试、理论伤害比例机制 |
| resolvedDamage | D6 后待路由的伤害 | 减伤分析 |
| resourceSpent | 防御资源实际消耗；另记录 preventedByResource | 自定义防御池触发；不能当成同量 HP 伤害 |
| shieldAbsorbed | 护盾实际损失 | 盾吸收统计 |
| extraHealthDamage | 额外生命层实际损失 | 临时生命统计 |
| hpDamage | 标准生命实际损失，不包含过量伤害 | 默认吸血、受伤计量 |
| overkill | 扣除剩余可损生命后的多余量 | 调试；默认不计吸血和奖励贡献 |

每个计量机制指定 metricId，禁止使用一个模糊的 actualDamage 字段兼指盾、资源和 HP。受伤转治疗/护盾的技能明确选择 hpDamage 或规则定义的组合指标。所有 HP/池上限及分量守恒由性质测试验证。

## 5 治疗 护盾 资源与控制

### 5.1 治疗和吸血

治疗顺序：有效目标/活体条件 → 原始量 → 来源治疗倍率 → 目标治疗倍率/重伤 → 可治疗生命层分配 → 上限截断 → 实际治疗和 overheal 事实 → 受限 PostHeal 派生。默认不治疗 PendingDeath/Dead，不允许负治疗变成伤害，过量治疗不会自动转盾，只有显式 Effect 才能转换。

吸血/全能吸血读取已提交的 DamageResolved 指标；默认按 hpDamage，盾吸收、资源耗损、overkill 不计，范围/持续等系数须声明。吸血是后续 Heal Operation，施放者若已最终死亡则失败；反伤和自伤默认带 noLifesteal/noReflect 标签，防止自我循环。可以覆盖默认政策，但必须提供 TriggerPolicy 和测试。

护盾授予顺序：有效目标 → 基础量 → 盾量修正 → stack/replace/refresh 合并策略 → 上限 → 创建实例和事实。重伤默认影响治疗，不影响护盾；特殊机制须独立 Tag。资源变化按 [0,max] Clamp；resource reservation 只能由对应 Action/Operation 消耗或释放。

资源再生在 P0 按固定 step 和小数余量提交，生成的额外战斗触发只收集到 P5；持续治疗/跳伤属于周期 Effect，在 P5 结算。资源上限或当前值下降导致 reserved > current 时，按稳定 Action 顺序取消足够预留并执行退款政策，不直接截断预留让动作继续双花。周期首跳必须显式选择 activation 或 interval，不能靠注册先后决定。

### 5.2 控制与驱散

控制不是若干 bool 的随意组合。来源独立保存，能力由汇总 Tag 查询：CanMove、CanBasicAttack、CanCast、CanDisplace、Targetable 等。一个眩晕到期不能移除另一个眩晕，也不能让沉默顺带解除缴械。

控制应用顺序：目标合法 → control category/tag 免疫 → 时长公式及韧性/抗性适用范围 → 最低时间和 Tick 转换 → 合并/刷新 → 必要的 ActionInterrupted。免疫强制位移与免疫眩晕分别表达；击退/击飞是否受韧性影响写在控制定义，不作为英雄特例。

Dispel 指定友/敌、可驱散类别、最大数量、排序和不驱散 Tag；净化处理匹配的控制实例，不删除所有 Debuff。同根内先净化后上控和先上控后净化结果不同，严格服从 Sequence。净化带后续免疫窗口时，该窗口从当前 Tick 生效。

### 5.3 属性变化的即时性

加/移除 Modifier 或装备后，在事务屏障更新 dirty version。下一个 Operation 查询属性前刷新，不能等下一帧才生效。最大生命变化默认保留当前绝对生命并 Clamp 到新上限；需要按百分比保留的形态切换显式指定 preservePercent。上限下降不是 Damage，不触发吸血或击杀；若某机制允许上限为 0，其 Life 政策必须显式定义并通过校验。

## 6 Hook 派生与循环保护

### 6.1 执行方式

每个叶子 Operation 的 Pre Hook 按 (stage, priority, definitionId, instanceId) 执行，对公共事务 Context 返回补丁；非法字段修改直接失败。提交一次状态变更后生成事实，再收集 Post Hook 的派生 Operation。派生顺序相同，使用显式工作栈深度优先执行，不用递归 JS 回调。

Hook 允许返回 Cancel(reason) 或一个 Replacement。Replacement 消耗一次 replacement budget，保留原 root/parent 因果和触发链；同一 operation + hookId 不得反复替换。Pre Hook 不能读取尚未提交的别的根结果，Post Hook 不能撤销原事实。消耗法术护盾或防死次数属于同一叶子事务的提交内容，不能由旁路监听器晚一帧扣除。

### 6.2 容量不变量与编译证明

撤销独立设置的固定单根 128、单 Tick 4096 Operation 和单 Tick 1024 根上限；它们不能保证合法目标扇出与并发兼容。新规则由内容和 Ruleset 的联合 CapacityCertificate 推导，而不是换成另一个统一常数。证书绑定 engineVersion、contentHash、Ruleset、地图/实体容量、合法装备/Modifier 组合、Tick 率及编译器版本；任一变化都重新编译。

Operation 是一次分发/结算尝试。取消或无效尝试也计数；原操作被替换时，原尝试与每次 Replacement 都计数；根的全部派生继承同一 rootId。叶子原子提交内部的固定字段写入不重复算 Operation，但其计算成本计入性能测量。Hook 调用次数、查询次数、解释器节点访问和事实/披露输出另有有限工作量证书，不能用“没有产生 Operation”绕过循环 guard。

容量符号如下，均为向上取整的非负整数上界：

| 符号 | 含义与估算依据 |
| --- | --- |
| Qmax | 单次单位范围查询的完整结果容量，当前为 512；不得截断匹配集合 |
| Umax | Ruleset 可同时被影响的单位总上界，当前候选为 454 |
| F_e | 根 e 的最大合法主目标扇出；由目标筛选、显式玩法 target cap 和地图容量推导，必须 ≤Qmax |
| B_e | 每主目标基础 Operation 总数，含各分量、Sequence、条件最坏分支和显式重复 |
| R_e | 每主目标全部 Replacement 的额外尝试上界 |
| D_e | 每主目标所有 Hook/派生子树的 Operation 上界，包含二次范围查询扇出及其递归开销 |
| S_e | 根的共享/非主目标工作，包括对自身、创建、结束等 Operation；其 Hook 也计入 |
| Croot(e) | 根 e 的证书上界：S_e + F_e × (B_e + R_e + D_e) |
| N_k | 根类别 k 在一个 Tick 能合法产生的最大实例数，包括最坏同时到期和跨 Tick 延续 |
| Mmax | P0～P8 不属于战斗根的维护 Operation 上界，如到期、预留、交易、复活、奖励和结构提交 |
| Ctick | 整 Tick Operation 上界：Mmax + Σ_k [N_k × max(Croot(e), e 属于 k)] |
| CrootCount | 同 Tick 根数量上界：Σ_k N_k；不能与 Operation 总量混为一谈 |

若内容需要乘法写法，可令 E_e = ceil((B_e+R_e+D_e)/max(1,B_e))，则 S_e + F_e×B_e×E_e 是更保守的上界，B_e=0 的根单独处理。E_e 来自触发树证明，不能凭经验设置“Hook 大约两倍”。有多个不同扇出段时按段求和，不能只取最大查询扇出；跨目标链式传播必须计入 D_e 或共享段，不冒充一个额外 Operation。

编译器按 Effect AST 估算：Sequence 求和，互斥 Conditional 取最大分支，可并存条件求和；Repeat 使用声明次数；范围节点乘完整目标上界；Modifier/装备 Hook 组合按可合法同时存在的最大实例数分析。只能在证明互斥/去重成立时减小上界。概率分支按可发生的最坏情况计算，不用平均概率降低容量。

Replacement 和派生树按触发 DAG 或有限 fuel 展开。可循环能力必须有明确次数、深度、消耗或 per-impact/per-root 触发约束，并计算其最大展开量；普通派生深度默认最多 8，合法能力需要更深时编译其声明上界并在 profile 中明确支持，不能合法生成后在第九层突然 fault。带概率 Hook 的 RNG 仍来自模拟子流。

N_k 必须覆盖所有根生产者：施法/普攻和充能释放、兵/野怪/塔、投射物碰撞、区域周期与进入/离开、Modifier 首跳/末跳/到期、上一 Tick OnDeath、连锁创建和计划任务。持续实例容量×最高脉冲频率、冷却/攻速/加速/重置/召唤上界、最坏相位重合共同给出上界。派生 Operation 不能通过换 rootId 逃离根预算；确需在未来 Tick 建新根的调度节点要同时证明每 Tick 生产率与最大待执行数量。Mmax 包括同 Tick 所有 Modifier 到期、死亡奖励和预留取消等最坏工作，不能只证明 P5。

静态不能判断实际数量时，必须声明可证明的有限 envelope，例如有限实体池、合法 Modifier 实例数、剩余次数和受控调度生产率；运行时检查实际值未超 envelope。无法给出有限 envelope 的能力不是可发布 Ruleset 内容，编译报告其未证明路径，禁止开局。新内容的工作量超出当前支持 profile 时在编译/开局前解决容量、算法和性能问题，不能在对局中剪目标、推迟结算或删机制。

### 6.3 故障上限与运行时 guard

定义 roundUpPow2(x) 为覆盖 max(1,x) 的最小二次幂。容量不变量是：每次查询合法目标数 ≤F_e≤Qmax；每根实际 Operation ≤Croot(e)≤Lroot(e)；每 Tick 实际 Operation ≤Ctick≤Ltick；根数实际值 ≤CrootCount≤LrootCount。其中 Lroot(e)=roundUpPow2(Croot(e))、Ltick=roundUpPow2(Ctick)、LrootCount=roundUpPow2(CrootCount)，是初始故障限额推导策略，不是一次性分配相同大小的数组。

编译报告输出每根与每生产者上界、深度、工作量证书、全 Tick 上界及上述 L 值。EngineCapacityProfile 给出当前实现能支持的 Operation/队列/工作量容量；必须覆盖这些 L 值才能开局。M2 逻辑测试 profile 取编译推导的 L 值，具体值见 M2_TEST_REPORT.md；正式性能 profile 仍待 M3/M7 内容与测量确定。逻辑容量证明与 CPU/内存达标是两道门，证明有限不等于移动端能在预算内完成。

运行时先校验分支/扇出/Replacement/Hook fuel envelope，再在每次尝试前计数，并校验 producer、root、tick 和工作量证书。完整目标查询可用分块缓冲和迭代工作栈，但不重置 root 计数、不把一个合法大范围根拆成新根绕限制，也不跨 Tick 延后其中目标的伤害。根预留最多按 Croot(e) 计算，不能把 Lroot(e) 当每个并发根的必耗量；证书允许的并发组合必须可接纳，不足表示编译/profile 契约错误。

| guard | 正常内容的保证 | 违规处理 |
| --- | --- | --- |
| 范围扇出/目标容量 | 全部合法目标都被枚举，查询不截断 | 超过声明 envelope 是未证明内容/实现错误，fault |
| Replacement/派生深度/fuel | 证书已包含每条合法触发链 | 非法循环或超次数在继续展开前停止 |
| root/tick/producer 计数 | 合法 Ruleset 的全部可达工作 ≤证书≤故障限额 | 超证书即诊断违约，达到 L 为最终防线；均不丢部分伤害后继续 |
| 重复触发键 | rootId+hookInstance+triggerGroupKey+targetRef，按声明 once 或有限次数 | 拦截本来不合法的重复；不能阻止定义允许的多目标触发 |
| 非 Operation 工作 | Hook、查询、AST、事实与信息扇出都有证书 | 空转/输出失控也会停止，不等待 Operation 溢出 |

叶子 Operation 仍是原子事务，整个根或 Tick 默认不自动回滚。guard 违约/异常时冻结诊断，已提交操作不反向撤销，半 Tick 状态不能保存；只能加载最近完整兼容 Checkpoint。经证明的合法工作不因这些计数限额 fault；设备耗时超预算仍按 overload 暂停，这与内容计数违约不同。M2 有实际内容编译与测试 Ruleset 证书，见 M2_ACCEPTANCE.md 和 M2_IMPLEMENTATION.md；没有声称正式 5v5 Ruleset 或设备性能已认证。

### 6.4 容量算例

以下是人工算例，不是最终 Ruleset 上限或实测。假设一个根能影响 F_e=454 个单位，每目标 B_e=3 个基础操作、R_e=1 个替换尝试、D_e=4 个完整派生操作，共享 S_e=2：Croot=2+454×(3+1+4)=3634，Lroot=4096。即使无任何 Hook，454 个 Damage 也已超过旧单根限额。

再假设该算例 profile 最多两个此类根同 Tick 出现，全部其他根和维护工作联合上界为 1200：Ctick=2×3634+1200=8468，Ltick=16384。这里的“两个”和“1200”仅是算例前提，不能拿它限制正常十席施法；真实 Ruleset 要重新证明所有合法并发。guard 的数值因此来自组合工作量，而非把旧 128 随意改大。

### 6.5 M2 0.3.1 工作计账修订

ADR 023 的最小反例撤回 0.3.0 的完整非 Operation 证明。运行时必须使用私有 definition/Entity/attribute-trace 索引；所有剩余权威集合元素访问逐遍计 scans，固定索引访问计 lookups，结构复制/冻结/序列化/hash 有独立 structure 界。startup 与 command 入口各有单独证书/profile 门禁。规则顺序仍来自原稳定数组，不来自索引迭代。producer 与 provenEffects 在最终 guard 绑定。

精确工作单位、遍历清单、有限结构/固定工作证明和成本推导见 [M2 工作计账](M2_WORK_ACCOUNTING.md)；编译器版本 m2-indexed-v2，profile m2-headless-v2。实际类别总和必须等于 scans；不能只计成功匹配项。

## 7 死亡 归因 奖励与复活

致死保护在 D8 内先执行：一次性保命、最低生命、ReviveOnLethal 等策略有明确优先级。未防止致死则 D9 将 Life 标记 PendingDeath，生命为 0，立刻取消尚未释放的动作、阻止新操作目标选择，P6 最终确认。默认普通治疗不能“在 P6 前捞起”PendingDeath；若需要此行为必须作为特定防死策略实现。

DamageLedger 记录 target、施放时 creditOwner、有效贡献指标、tick、impactId。召唤物/装备/持续伤害通过 creditOwner 归因；来源已死也不丢归因。击杀默认归最终致死的敌方合法英雄所有者；无合法敌方归因时再按 Ruleset 的环境击杀策略处理。助攻窗口暂定 10 秒，按 session tickRate 转换，30 Hz 基线为 300 Tick；伤害/明确支援贡献类型、分享范围和分配公式均在 Ruleset 中配置。

deathId = matchId + targetRef + deathSequence，RewardGrant 使用 deathId + beneficiary + rewardType 幂等键。死亡事实重复投递不能双倍金币或经验。P6 先确定全部死亡，再发奖励和升级，升级不能追溯改变本 Tick P5 已经造成的伤害。野怪、兵、塔、基地使用同一归因流程，奖励类型由模板/Ruleset 决定。

OnDeath 战斗 Effect 在 P6 收集、排入下一 Tick P5，来源允许 policy 标记为死亡后执行；不能重入本 Tick P5。死亡位置保存，区域离开可在 P7 产生下一 Tick Effect。塔仇恨根据本 Tick 事实在 P6 更新，下 Tick P2 采用新目标。自动复活到期在 P0 处理；复活保留实体句柄，重置政策分别声明资源、状态、冷却、生命和位置，不能顺手重置整个 Progression。

比赛结束在 P6 胜负集合确定后发生：本 Tick 后续阶段仍完成清理与最终投影，不开始下一 Tick 战斗，也不运行结束后产生的普通 OnDeath 连锁。结算界面只读取一次 MatchResult。

## 8 位移 视野和目标边界

位移 Operation 明确 mode（dash/blink/knockback/pull）、目标位置/方向、速度或时长、墙体策略、单位碰撞策略、中断等级和能否穿越区域。普通移动、冲刺、强制位移都有可预测优先级，传送不能用 tween 结束回调写 Transform。

P4 视野用于本 Tick 即时命中校验；P5 内位移、显形、死亡或生成视野来源后，相关 dirty 区域在下一 Operation 查询之前局部更新。对多个 Effect 的 Sequence，先显形再选择敌人可生效；先选择不可见目标后显形不能追认原选择。死亡目标最晚在致死事务屏障失去其贡献视野，P7/P8 做全局收尾校验。

投射物丢失目标时可以 cancel、沿原方向飞行或保留已锁定跟踪，必须按定义执行。Targetable 和 Visible 分开；不可选中不必表示无视所有已经存在的区域伤害。命中伤害可在迷雾里发生，但披露范围由 DisclosurePolicy 决定。听见技能或收到方向提示不自动赋予目标可选性；需要空间显形的技能通过 RevealPolicy 产生独立受限授权，由 Visibility 在事务屏障处理，不能由音频/小地图反推并写入 World。

## 9 商店和成长事务

ShopCommand 包含 transaction sequence 和 itemId，模拟验证金币、六格候选槽位/最终 Ruleset 槽数、配方、唯一组、商店区域、活体/战斗限制和内容 hash。购买/出售/合成是原子事务：槽位和金币一起改变，失败不能半扣钱。相同命令重复不得重复购买。装备属性贡献及被动 Hook 在 P2 的动作开始前刷新；新技能充能/冷却的合并策略由物品定义指定。

商店 UI 只展示最新可见的己方数据和交易状态，不乐观覆盖权威金币。经验升级发生于 P6，技能加点请求在后续 P2 校验。击杀助攻、死亡和复活 UI 从事实/投影读取，不能从血条消失推测。

## 10 必要的测试场景

| 场景 | 必须证明的结果 |
| --- | --- |
| Buff 在 Tick n 到期，n 施法 | 到期贡献已移除，冷却成熟已生效 |
| 周期效果恰好到期 | 不多结算边界一跳；显式 end Effect 正常调度 |
| 两个同 Tick 致死根 | 顺序稳定，死者不能被普通治疗恢复；已释放攻击可互换击杀 |
| 两个基地同 Tick 死亡 | 一次平局结果，无先遍历先胜利 |
| 类型盾/万能盾/资源路由混合 | 固定吸收顺序和量守恒，盾破裂各一次 |
| 防死与净化的不同顺序 | 保护消耗一次，Sequence 前后关系影响结果 |
| 高速穿透投射物 | 不穿过窄目标，同 impact 不重复 on-hit |
| 击退后紧接范围技能 | 使用新位置；不沿旧索引命中 |
| 真伤与特殊生命层 | 跳过抗性，仍遵从明确防护和层 policy |
| 属性转换相互引用 | 内容加载失败并报告完整循环路径 |
| 反伤触发反伤 | 默认 guard 拦截，不陷入无限递归 |
| 源实体死亡/销毁 | 快照和归因仍有效；失效句柄不读取组件 |
| 击杀奖励重复投递 | deathId 幂等，无重复金币/经验 |
| 购买请求重放/失败 | 物品与金币原子变化，不重复交易 |
| 失去视野及有限披露 | 默认停止当前敌人状态流；合法事件按字段权限输出，Bot/UI/音频/小地图不越权 |
| 454 目标及多个大范围根 | 全部目标按原顺序结算，计数≤各证书；不被旧单根/单 Tick 常数截断或 fault |
| Replacement/Hook/到期/死亡同时峰值 | 计入完整根与维护/生产者上界；非法循环被 guard 定位，合法上界不过限 |
| 保存时有投射物/预留/引导 | 恢复后逐 Tick hash 与未中断运行相同 |
| 30/60/120 FPS 输入重放 | 相同已接受命令和模拟 Tick 数下权威结果一致 |
| 后台恢复/超时/overflow | 不补后台战斗、不跳 Tick，fault 不存半 Tick |

每次新增 Effect、Hook 或改公式都要增加至少一个正常用例和对应边界/交互回归。此清单中的正式战斗/持久化用例仍是后续测试设计；M1 同率帧率、实体、生命周期与预测隔离用例已执行，详见 M1_TEST_REPORT.md。

## 11 M2 已实现的有限内核

M2 的精确内容语义、profile 和缺口见 [M2_IMPLEMENTATION.md](M2_IMPLEMENTATION.md)、[M2_ACCEPTANCE.md](M2_ACCEPTANCE.md)。测试目标选择器 primary/all/source 不提供空间查询。Pre 在 D4 执行，Post 只在叶 Operation 提交后派生工作栈子树，普通拒绝无 Post；有限触发环明确受每根/目标 fuel、替换链 once 与 maxHookDepth 约束，耗尽发布诊断。Effect 描述不执行 JS。

同 opId 同内容重复只计尝试，不再提交；同 ID 不同内容是故障。状态变动失效属性缓存，下一 Operation 前完成刷新。Override 处于乘法后、转换前，优先级降序/definitionId/instanceId 稳定选择；转换读 pre 时读 override 后值，读 final 时遵从 DAG。最大资源下降保留绝对量并 Clamp，不算伤害；breakdown 与 ResourceClamped 分开记录。

FactQueue 同步非重入交接给 M2 内部诊断消费者，每条 Fact produced=consumed，最大待交接数证明为 1；总 Fact 工作仍受根/Tick 证书限制。full 模式保留全部逐条记录；summary 模式保留全部种类计数及最近 2000 条调试记录，明确标注 produced/consumed/retained。这是诊断归档模式，不减少任何结算、Hook、Replacement 或目标，两个模式的 World/hash 必须相同。Information/Disclosure 消费者在 M4 注册，届时重审输出工作量。

## M3 0.4.2 当前实施与边界

通用 Action/资源 reservation、Movement intent/step Operation、有限 grid queries、relative swept Projectile、Area 与 public debug arena/触屏适配已实现，全部使用既有 executeRoot/Operation/Hook/Fact/CapacityCertificate。实现与明确阶段规则见 [M3_IMPLEMENTATION.md](M3_IMPLEMENTATION.md)，新 producer/计账上界见 [M3_WORK_ACCOUNTING.md](M3_WORK_ACCOUNTING.md)，软件门禁见 [M3_TEST_REPORT.md](M3_TEST_REPORT.md)，Android/ADR 019 当前硬门禁见 [M3_ACCEPTANCE.md](M3_ACCEPTANCE.md)。正式决策见 ADR 024。

logical maximum capacity 与 representative gameplay performance 分开。30 Hz provisional、A 默认、B experimental、C 未触发；缺第二档/热态证据不接受最终率、最低设备、Android 性能或最终手感。M3 软件候选不代表 M3 整体通过，不进入 M4。

## 0.4.1 输入坐标与 penetration recovery 修订

CSS 点与向量使用不同契约：点独立缩放 X/Y 后加 arena.min；向量只乘 worldPerCssX=arenaWidth/widthCss、worldPerCssY=arenaHeight/heightCss，再归一化。Joystick magnitude=min(1,screenDragLength/48)，单独保留屏幕拖距力度；方向用转换后的 world unit vector。技能 deadzone/cancel/按钮 hit test 仍使用 CSS，direction/point drag 的 world direction 经过同一转换；投影 preview 随当前授权 actor snapshot 重定位，松手重新从当前 snapshot 构造 Command，preview 不决定命中。目标 tap 的点映射保留。

Movement 有独立 movementCircleTOI/movementRectTOI，不修改 projectile 的 circleTOI/rectTOI。已重叠圆：候选位移非零且 (from-center)·delta≥0 时允许，该条件保证整条线段 squared separation 不减并增加；同心从任意非零方向都可脱离，圆切向二阶分离亦允许。向更深处移动阻止，即便端点已穿到另一边。未重叠和 touching 状态继续用原 sweep：接触向外/切向不新增碰撞，向内阻止。

已穿入 rectangle 的单位用 signed separation：内部是到最近边的负距离，外部是到 rectangle 最近点的欧氏距离。内部同时考虑所有并列最近边；外部使用最近点法向。初始分离导数不负且候选端点 separation 严格增加，才开放这一个已重叠 blocker；向更深处阻止。穿入平边的纯切向短步若没有分离进展则阻止，可用最近边向外方向离开；恰好 touching 的切向仍可行。其他 wall/unit blockers 仍可截短候选线段，没有自动位置修正、额外 depenetration Tick 或绕过 Operation 写坐标。

wall:ignore / units:ignore 明确忽略对应的 path + endpoint collision，允许 penetration endpoint；后续 stop 移动按上述恢复规则。teleport 的 stop 策略仍检查目的地，ignore 则允许重叠目的地。Arena 永远不 ignore：spawn 必须在 radius margin 内，所有位移端点 clamp 到该范围，因此合法路径不会产生 arena penetration；边界向外 clamp、向内/切向移动可行。解算顺序 forced/dash/ordinary 与 EntityRef 稳定顺序不变，仍以最新已提交单位位置判阻。

新增 helper 均是固定数量标量算术，不新增动态集合、candidate query、元素遍历、lookup 或结构快照。每个原 candidate/obstacle 仍恰好读取一次；本次重新生成 engine=0.4.1/compiler=m3-bounded-v2 的证书并验证全部 scope，work 上界/profile 数值保持，不能复用旧版本证书 ID。Projectile 起点重叠依旧 t=0 命中，命中/结束/expiry 不重复。

历史 0.4.1 坐标/碰撞修订已通过独立复核；本轮 0.4.2 仅修复 toolbar/debug input，等待新独立复核和 Android blocker 复测，不推送 main、不部署 Pages、不进入 M4。A 默认、B experimental、30 Hz provisional，C 未触发。
