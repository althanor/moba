# M3 0.4.1 第一轮实现

基线：`althanor/moba` main `c57fa8caadb2afc2eb98d85246e156d76e942949`，M2 0.3.1。开始前按远端树逐 blob SHA 核对源码，重新读取架构、流水线、编码、阶段、性能、决策、变更、README、M2 三份报告及 M1/M2 验收；全部 23 个既有 ADR 位于 DESIGN_DECISIONS.md。M2 独立复核、推送及 Actions/Pages 通过状态来自用户确认。本轮是本地 M3 软件候选，不代表 M3 远端部署或 Android 验收。

## 已实现纵切面

| 纵切面 | 所有者与验收入口 |
|---|---|
| Action 生命周期 | ActionStore；普攻/技能、windup/cast/active/recovery、start/release/end 冷却、charge/recharge、目标/范围重验 |
| 资源事务 | ResourceStore；compiler-owned actionCost Effect/Operation；预留、提交、释放、部分退款；最大资源 clamp/死亡/CC 中断 |
| 移动/位移 | MovementStore；普通 intent、stop、dash、forced、direct sweep、teleport destination/discontinuity；稳定顺序与优先级 |
| 障碍/碰撞 | 最小矩形 arena、至多 16 障碍、圆形单位；连续 circle/rectangle TOI；stop response，无滑墙/导航/M4 地图 |
| 空间查询 | 有界 uniform grid；radius/point/cone/segment/sweep；稳定 nearest 与 TOI/ref 排序；完整 moving-target swept AABB |
| Projectile | Simulation-owned pool；source/owner、速度/方向、半开 lifetime、相对运动 sweep、过滤、single/multi、一次命中集合、on-hit Effect |
| Area | enter/pulse/exit/expiry、interval、成员过滤；P0 释放到期槽位；P7 死亡退出 Effect 排到下一 Tick |
| 数据模板 | basic、bolt、field、mend、dash、push，完全由通用 Action/Effect 组合，无 hero-specific engine switch |
| 调试战斗场 | 一个玩家、三个测试目标、一个障碍；HP/MP/reservation/shield/status/phase/charge/CD、target lock、范围、projectile、reset |
| 触屏 | 独立 pointer role、摇杆/技能拖拽/瞄准/释放/取消/多指、lost pointer/失焦/竖屏清理；仅提交 Command |
| A/B 与诊断 | A previous/current 默认；B 本地表现代理最多一 Tick；真实玩法三轮交替软件测量；C 未触发 |

## 时间、资源和目标契约

所有 combat duration 通过 Ruleset tickRate 编译为整数 Tick。Action 在 P2 开始，releaseTick=start+windup+cast，activeEnd=release+active，end=activeEnd+recovery；零时长阶段可在同一 P2 通过，仍只释放一次。

- cost.policy=release：开始生成 reserve Operation，可用资源=current-reserved；release 生成 commit Operation，一次性扣除并删除 reservation。
- cost.policy=start：开始 spend；未释放取消按 refundFraction 生成 refund；release policy 的未释放取消全量解除预留，不增加 current。
- 释放前手动取消由 cancelBeforeRelease 决定；释放后由 cancelRecovery 决定。已提交 cost 和 charge 不因 recovery 取消退款。quota/impact validation 失败也不撤销已经释放的消耗，保留 OperationRejected/ActionImpactRejected Fact。
- cooldownStart 明确为 start/release/end；取消使用 max(已有 readyTick, cancelTick+cancelCooldown)。charge 在 release 消耗，P0 逐 charge 恢复；充能和 cooldown 两个条件都必须满足。
- 每 actor 每 Tick 最多一次通过目标/冷却/充能前置验证的开始尝试；包括随后资源不足的尝试。后续同 Tick 尝试 busy，避免未证明的重复 debit root。
- unit target 锁 EntityRef/generation，point/direction 锁 command aim；release 前每 Tick 重验 alive、relation、targetable、range；instant 在 P4 再验实际位置。锁定不赋予 M4 隐藏信息访问权。
- 新动作遵守 canCast/canBasicAttack；interruptOnControl=true 的既有动作立即中断。false 的已开始 cast 可以继续，后续新请求仍受控制。死亡始终中断；强制位移和普通移动/dash 的能力权限不同。
- 一个造成 CC/资源 clamp 的原 M2 leaf 最多中断目标的一次 active action。inline refund/release 继承原 root、producer、parent op/depth/chain，计入原 root 证书；不建立绕过 proof 的第二战斗入口。
- Pause 不推进 combat Tick，不扣/补 wall-clock 时间；恢复继续原 release/expiry Tick。输入清理作为中性 intent 在下一权威 Tick 生效。

## 移动、查询与碰撞契约

movement intent、P0 输入中性清理与每次 P3 movement step 都先生成 compiler-owned Effect/Operation，再由 MovementStore 提交位置并生成 Fact。

P3 按 forced、dash、ordinary 优先级及稳定 EntityRef 顺序解算；每单位每 Tick 只解算一次。前面单位已提交的位置供后面单位判阻；这是一条确定性规则，不是连续多体物理求解器。ordinary 使用 speed/rate；travel 使用 destination/speed，不被普通 intent 覆写。强制 travel 不要求 canMove，但要求 canDisplace/alive；dash 受 canMove 控制。对障碍/单位 stop TOI 截止，墙与单位响应分别声明；arena 边界始终 clamp。

Direct displacement 使用同一 sweep/collision response，teleport 不扫中间路径，检查目的地 wall/unit blockers，标 discontinuity 并重置 previous。无正式 teleport 技能内容。开始于 P5 的 travel 下一 P3 才推进；P5 direct/teleport 同步更新空间索引，供后续 root/query 使用。

Uniform grid 选择基于 454 单位 envelope 与 Android 最小设计：最多 256 cells，每单位在完整 previous→current swept AABB 的每个 cell 占一条引用，最多 256×454 引用。局部 query 扫有限 cell/bucket，去重后最多 454 candidates；无按“平均附近人数”缩减证明。radius 以单位圆扩张边界，cone 采用中心方向夹角并扩张径向边界；segment 为静态圆 sweep。radius/cone 按 distance/ref 排序，sweep 按 TOI/ref 排序。碰撞候选不由 presentation geometry 产生。

Projectile 采用相对运动 circle TOI，覆盖 projectile 与 target 同 Tick 高速交叉；wall/arena 与 target 比较 TOI，墙在相同 TOI 时优先。multi 每目标 generation 生命周期只命中一次，本阶段 Entity 不重用/despawn；single 首次命中后立即结束。P0 expiry 不额外命中并先释放池槽。Projectile 属性策略明确为 impactAttributesContinueAfterDeath，未暗示 launch 属性快照或自动 homing。

Area 生命周期 [start,end)，pulse 仅在合法 Tick/interval；P0 expiry 发 exit/expiry 根并释放槽，P4 enter/exit/pulse，P7 死亡退出 next-Tick 根。Area 没有 presentation overlap 输入。hit/pulse/exit batch Effect 必须显式 primary fanout；compiler 拒绝异步递归 spawner 与 Hook spawner。

## 软件/硬件边界

Ordinary Observation 的 BattleView 是批准的 public-debug-arena-v1：全部调试单位公开，无 fog/隐藏单位；controllers/presentation 仍不能导入 CombatBoundary/Fact/World。M4 必须换成正式 DisclosurePolicy，此候选不声称具备 M4 信息权限或正式地图。

Phaser 只绘制 authoritative snapshots；B 只预测本地普通移动、最多 1 Tick，control/death/action/discontinuity 不预测；projectile 始终 snapshot interpolation，无预测 projectile correction 指标。B 的位置/错误不进入 hash。软件导出分列 input/UI、visual、acceptance、release、首次 authority movement、Tick CPU、frame CPU、CPU/sec、prediction error 与公共 gameplay 事件。physical touch-to-photon、玩家手感、温度和电量仍需人工记录。

0.4.0 独立复核发现三项阻塞，最终软件出口声明撤回。当前 0.4.1 修复候选已经通过全部 11 自动门禁和 163 tests，仍等待再次独立复核；正式 Android A/B 尚不开始。软件门禁结果见 M3_TEST_REPORT.md，证明见 M3_WORK_ACCOUNTING.md，真机硬门禁见 M3_ACCEPTANCE.md。停在 M3，不进入 M4。

## 0.4.1 输入坐标与 penetration recovery 修订

CSS 点与向量使用不同契约：点独立缩放 X/Y 后加 arena.min；向量只乘 worldPerCssX=arenaWidth/widthCss、worldPerCssY=arenaHeight/heightCss，再归一化。Joystick magnitude=min(1,screenDragLength/48)，单独保留屏幕拖距力度；方向用转换后的 world unit vector。技能 deadzone/cancel/按钮 hit test 仍使用 CSS，direction/point drag 的 world direction 经过同一转换；投影 preview 随当前授权 actor snapshot 重定位，松手重新从当前 snapshot 构造 Command，preview 不决定命中。目标 tap 的点映射保留。

Movement 有独立 movementCircleTOI/movementRectTOI，不修改 projectile 的 circleTOI/rectTOI。已重叠圆：候选位移非零且 (from-center)·delta≥0 时允许，该条件保证整条线段 squared separation 不减并增加；同心从任意非零方向都可脱离，圆切向二阶分离亦允许。向更深处移动阻止，即便端点已穿到另一边。未重叠和 touching 状态继续用原 sweep：接触向外/切向不新增碰撞，向内阻止。

已穿入 rectangle 的单位用 signed separation：内部是到最近边的负距离，外部是到 rectangle 最近点的欧氏距离。内部同时考虑所有并列最近边；外部使用最近点法向。初始分离导数不负且候选端点 separation 严格增加，才开放这一个已重叠 blocker；向更深处阻止。穿入平边的纯切向短步若没有分离进展则阻止，可用最近边向外方向离开；恰好 touching 的切向仍可行。其他 wall/unit blockers 仍可截短候选线段，没有自动位置修正、额外 depenetration Tick 或绕过 Operation 写坐标。

wall:ignore / units:ignore 明确忽略对应的 path + endpoint collision，允许 penetration endpoint；后续 stop 移动按上述恢复规则。teleport 的 stop 策略仍检查目的地，ignore 则允许重叠目的地。Arena 永远不 ignore：spawn 必须在 radius margin 内，所有位移端点 clamp 到该范围，因此合法路径不会产生 arena penetration；边界向外 clamp、向内/切向移动可行。解算顺序 forced/dash/ordinary 与 EntityRef 稳定顺序不变，仍以最新已提交单位位置判阻。

新增 helper 均是固定数量标量算术，不新增动态集合、candidate query、元素遍历、lookup 或结构快照。每个原 candidate/obstacle 仍恰好读取一次；本次重新生成 engine=0.4.1/compiler=m3-bounded-v2 的证书并验证全部 scope，work 上界/profile 数值保持，不能复用旧版本证书 ID。Projectile 起点重叠依旧 t=0 命中，命中/结束/expiry 不重复。

本次只修复本地 M3 软件候选。自动门禁通过不等于最终软件出口已被再次独立复核；复核前不推送 main、不部署 Pages、不开始正式 Android A/B、不进入 M4。A 默认、B experimental、30 Hz provisional；此次坐标/碰撞 bug 不自动触发 C。
