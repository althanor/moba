# M2 0.3.1 工作证明与计账

状态：修订候选。0.3.0 的完整非 Operation 证明已撤回；最终软件结果见 M2_TEST_REPORT，正式收口等待独立复核。ADR 023 记录最小反例，不改变 M0/M1 时间或 presentation 选择。

## 单位与范围

`scans` 是一次规则集合遍历中的一次元素读取。不是毫秒、CPU 指令或只计成功匹配的元素。副本、筛选、聚合、排序、query 展开每一遍分别计；短路只计实际读取的元素。规则循环通过 `visits` 或逐元素回调计账；稳定合并排序计输入复制 n 次、每次双端比较 2 次、每次尾部读取 1 次，界为 `sort(n)=n*(1+2*ceil(log2(n)))`。空集合为 0。

| 类别 | 实际计账的访问 |
| --- | --- |
| status | snapshot、定义投影、免疫/Tag 筛选、实例匹配/移除、全局状态计数、控制投影 |
| hook | 全部 Hook 候选（包括不匹配项）、Pre/Post、replacement chain、派生帧集合 |
| shield | 状态副本、damageTypes 副本/匹配、吸收、提交、副本投影、到期筛选 |
| resource | 初始化、refresh、每项再生、snapshot |
| query | Sequence 子节点、all roster 构建、目标栈展开；primary 不扫描 roster |
| attribute | contribution 收集/排序、三个属性阶段遍历、乘法因子遍历、trace index 构建 |
| diagnostic | pending ancestry、conversion AST、六个 bucket、贡献来源、stage/participant/reason 副本 |
| maintenance | P0/P6/P9 roster、结构提交、generation hash 输入；startup roster/slot 构建 |
| ordering | 规则所用稳定合并排序的元素读取 |
| scheduler | 队列筛选、命令/根消费、历史窗口、hash 输入的稳定集合 |
| fact | 每条 Fact 的同步权威消费 |

`CapacityActual.scanKinds` 是同一个计账入口的分类，不是第二套独立计数；正常 Tick 的类别总和必须等于 actual.scans。小型手算例在 tests/capacity/indexed-work.test.ts：单目标 damage Tick =33（root=12）；脏属性/Hook/祖先/护盾/到期例覆盖所有类别，并有逐 Tick 的固定预期。

`lookups` 计 definition、Entity、attribute trace 的直接解析及 guard producer/root certificate 解析。definition Map 没有公开 mutator/iterator；Entity 按 index 直接读取，并验证 Session、generation 和 EntityStore.valid。燃料/幂等/资源的私有 Map/Set 操作有固定次数：每叶 Operation 至多两个幂等 Map 操作，每个 Hook eligibility 至多一个燃料读取/写入，每资源 change 至多四个固定字段 Map 操作；它们由 Operation/Hook/资源更新数及 96 字符内容 ID/受限生成 ID 约束，不存在随 definitions 或 roster 大小增长的隐式查找。没有声称证明 JS 引擎内部每条指令的时间成本。

`structure` 独立计冻结/归档/序列化/hash 的有限结构工作：deepFreeze 计节点和子元素读取，已深冻结子树可只读一个引用；canonical 计节点、稳定 key 排序、键/数值编码；dataHash 另计输出字符访问。归档副本和 capacity 元数据的物化/冻结也有界。启动强制深冻结整个已校验 catalog，不能相信调用方只冻结了外层。Fact 逐条冻结后，P9 归档可复用深冻结子树；这不丢记录或消费者。固定记录字段、协议九字段白名单（每命令最多 81 次固定比较）、公式运算/控制能力字段等由对应 AST/formula/Operation/Fact/命令/实体次数和下面的记录形状证明约束，不作为可随 catalog 基数增长的扫描。

## 编译上界

来源：src/content/compiler/capacity.ts；运行集合实现：simulation/shared/work.ts、foundation/order.ts、对应 feature owners。所有整数运算最终必须能安全表示，无法表达的证明编译失败，不开局。

令 A=属性数量、S=每实体状态上界、Q=护盾上界、R=资源数量、C=每 Modifier 最大贡献项数、T=最大 Tag 项数、Z=盾 damageTypes 最大长度、F=最大公式 AST 节点、X=全部属性 conversion AST 节点之和。H=所有 Modifier Hook 的 instance 上界之和，保守包含互相不同时存在的组合。

一次脏属性计算的扫描界为 `4A+2S+2SC+A*SC+sort(SC)`：来源 snapshot/收集、贡献及乘法因子、属性三遍、trace 索引一遍分别存在。lookup 界为 `S+3A+X`。运行时保持原有乘法顺序和浮点语义，未用聚合乘积改变舍入。

叶界把下列工作相加：最多四次 dirty refresh、状态 snapshot/免疫/Tag/匹配/移除（移除最坏 S²）、全局状态计数 U、Hook 候选/排序/Pre/Post/chain、盾副本/匹配/排序/提交、完整诊断 DAG 和 `(H+2)` 次 stage/participant 副本。诊断副本不能借用可变数组；同叶既有不合格又有合格 Hook 的回归证明旧 Fact 不受后续 participant 追加影响。所有未匹配 Hook、护盾类型、Tag 访问都计账，不能只计最终生效项。

P0/P6/P9 维护含实体和组件全部遍历、状态/护盾 S²/Q² 到期筛选、两次潜在属性刷新、三遍资源、控制 Tag 收集和排序、完整 generation 输入。状态/护盾在到期与 snapshot 同时保留的最坏组合也包含；不是只证明峰值 fixture 的某次实际状态。P1/P9 的最多 512 个排队/取消命令、最多 513 项临时历史、稳定根/历史排序有独立加项，不计进某一个 root 隐藏。

Fact 形状上界包含外层记录、Operation 字段/三个 Ref/payload/tags/depth chain，以及 breakdown：公式 F 节点 +两实体每属性六阶段 +10 个伤害阶段，participants<=H+3S。`factStructure` 对此形状的读取/冻结/归档给保守倍数。快照形状每实体 `24+8A+4R+10S+4Q+S*(T+1)`；哈希/固定字段编码界基于内容 ID<=96、Session/Match<=96、safe integer<=16 位及最长派生路径，见 scanModel.maxStringLength。它们进入 maintenance/tick/profile 的 structure，不以“schema 最多 4096”替代证明。

startup 包含逐根/逐 Work 维度的 profile 验证、六种 definition 索引、certificate 索引/provenEffects、roster/基础值验证、EntityStore 初始 slot 查找、属性/资源/快照与绑定 hash。绑定结构使用相同 measured canonical 算法和最宽 safe-integer 证书字段计算上界，避免证书自引用。command 的 parser 目标上界固定为既有 512（包括随后普通拒绝的输入），不缩为较小 Ruleset queryCapacity；所有入口上界来自共享 M2_COMMAND_LIMITS。command 每次调用单独涵盖 schema/有限目标、排序、队列/历史及序列化；非法超长身份或超大 roster/base 在开局前拒绝。profile 必须覆盖 tick/root、startupLimit、commandLimit，均取证明值的 next power of two。

## 索引与顺序

索引不在 CompiledCatalog DTO/contentHash 中，原规范化排序数组仍决定全部权威顺序。实体/属性索引是本 Session 私有 owner；缓存既非权威也不进入 hash。内容在初始化后不能 mutate。M2 没有 spawn/despawn 规则，未来结构提交必须同步维护直接索引；当前 pending/despawn/dispose 句柄已由直接查找拒绝。

增添 4091 个未引用 constant formula，使 ten 排在第 4094 位附近，同时将 effects/modifiers 补到 4096：startup 证明增加，原 executable roots/Tick 证书和 runtime Work 保持一致。测试在两个完整 runtime 的 step 期间禁止 Array.find，并独立核对 454 个实体资源。producer.provenEffects 在 begin 重新验证；不匹配组合在任何 root/Operation 登记前拒绝并报告尝试的 root/producer。

这些是逻辑工作/容量证明，不能解释为 Android CPU、内存、热态或实时性能 PASS。完整原主压力场景必须继续结算 4,574,049 Operation /9,135,386 Fact。新增消费者、schema、工作维度、机制或合法组合必须重编译并回归；不进入 M3。
