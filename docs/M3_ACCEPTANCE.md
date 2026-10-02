# M3 0.4.1 验收状态与 Android 执行单

本轮基线为用户已确认独立复核并推送的 M2 0.3.1/main c57fa8caadb2afc2eb98d85246e156d76e942949。M3 本地候选使用 engine 0.4.1，30 Hz provisional，不进入 M4。自动软件门禁与最终独立复核分开；0.4.0 的最终软件出口声明撤回。0.4.1 修复需再次独立复核，复核前禁止推送/部署和正式 Android A/B；真机结果不能由 Chromium 自动化代填。

| 项目 | 状态 | 证据/硬门禁 |
|---|---|---|
| M3 软件自动门禁 | PASS | 0.4.1 全部 11 门禁、163 tests；原 131 保留，新增32；无 skipped/flaky |
| M3 最终软件出口 | BLOCKED / 等待再次独立复核 | 0.4.0 独立复核三项阻塞修正后仍须用户复核；不提前宣称最终 PASS |
| M1/M2 软件极限结算保持 | PASS | 最终全量 454×454、20-root、4096 cardinality、scan conservation、producer mismatch 保持 |
| 浏览器真实玩法软件 A/B | PASS（仅软件） | 原三轮交替保留，ultrawide A/B 两模式通过；正式 Android A/B 禁止开始 |
| 当前 A/B/C 策略 | A 默认；B experimental；C NOT_APPLICABLE | 保持 30 Hz，未发现必须切换 authority rate 的响应/精度问题；B 无收益/纠正不单独触发 C |
| 高档 Android 真实玩法/首次权威移动/技能手感 | BLOCKED / 等待真机 | M1 空壳高档 PASS 不能替代新增 gameplay 情景；阻塞 M3 真机出口 |
| 第二档非旗舰约 4 GB Android | BLOCKED / 等待设备 | ADR 019 已在代表性阶段正式复审，不能继续沿用空壳理由；当前门禁=M3 真机决策出口 |
| A/B 各约 20 分钟代表性冷热态/电量/温度/降频 | BLOCKED / 等待真机 | 同设备/亮度/刷新/充电/环境配对；缺数据不得接受最终率、最低设备或 Android 性能 |
| physical touch-to-photon | DEFERRED / 人工测量方法 | 软件时间戳不能冒充物理端到端；如无高速录像/外部仪器，明确 unavailable |
| M7 低档 45 分钟完整对局；M10 最低设备/兼容性矩阵 | DEFERRED 到原硬门禁 | 不是本阶段完整地图/对局负载，原要求保留 |
| C=60 Hz authority 对照 | NOT_APPLICABLE | 只有有明确 30 Hz authority 不可接受证据才触发，届时新 Session/证书/profile |
| M3 整体出口/M4 开始 | BLOCKED | 软件可以单独完成；真机决策证据未满足前停在 M3 |

## 先记录环境

每台设备记录型号、SoC、内存、OS、浏览器版本、屏幕刷新率、实际渲染 FPS、版本/contentHash/certificateId/build commit、亮度、充电状态、网络模式、室温、开始电量与可获取温度。先用导出测量检查 phase=M3、tickRate=30、hash/certificateId 对应当前候选；本轮未自动推送 main/Pages，不能在旧 0.3.1 页面验 M3。

画面极简是本阶段的明确范围：左下摇杆；右下六技能；按下拖动显示 aim，松开释放，拖向右上圈取消；点单位锁定；控制挑战让测试单位通过相同 Action/Projectile 发控制攻击。暂停/恢复/单步/重建与 A/B 切换在工具栏。旧 M1 探针保留于 ?probe。

## 每台设备的 A/B 情景

先 A，后 B，再交替三轮。每轮开始重建 Session；每个情景至少重复 20 次，长时间热态另单列，不把两次操作当作稳定手感结果。

| 情景 | 必须观察/记录 |
|---|---|
| 摇杆持续移动、松开 stop | UI、首次 visual、Command acceptance、首次 authority movement、方向/停步纠正 |
| 急转向、相反方向、不同拖距 | 同样指标；是否产生抖动或方向拖滞 |
| 单位阻挡、碰墙与贴墙转向 | 无穿透；B 是否先穿入再纠正；不能只看高 FPS |
| dash 到障碍/目标、dash 中控制 | authority collision/interrupt 与 interpolation；是否出现视觉错位 |
| projectile 高速技能 | HP/status 和命中与低 rendering FPS 一致；projectile 仅 authoritative snapshot，不宣称预测修正 |
| 技能按下/拖拽瞄准/释放/取消 | 分阶段 UI/visual、accepted/rejected、release 时间；取消不花未提交资源 |
| control 开始/结束、受控中断 | 用控制挑战与 field 较长 cast；未 release reservation 解除，已 commit 不退款；新请求受控拒绝 |
| 移动+技能双指，技能先松/摇杆先松 | 相互不抢 role，取消/丢指针后不持续移动/误放技能 |
| target lock、普攻、治疗/盾、Area、push 连续组合 | resource/charge/CD/phase 可观察，连用无重复结算/漏结算 |
| 竖屏、后台、blur/lost pointer、暂停恢复、20 次 Session recreate | 不 wall-clock catch-up、不遗留指针/intent、一个 Canvas；动作期限仍按原 Tick |

每轮导出 M3 JSON，并附主观说明：哪个操作迟滞/卡顿/错位、是否稳定可复现、A/B 哪个更舒服、B 的纠正是否干扰瞄准。原始 JSON 保留 byPhase/byInteraction、gameplayEvents、CPU/Tick、frame CPU、CPU/sec 和 prediction error；aggregate visual 混合了设计 windup，不可直接当作 joystick latency。physical 与软件时间定义分开。

## 长时间与第二档硬门禁

同一代表性技能循环与移动路线，A、B 各约 20 分钟。冷态预先静置，再连续负载；至少记录开始/5/10/15/20 分钟的电量百分比、可获取温度、浏览器帧时/Tick CPU/CPU-sec、卡顿/降频迹象。电量百分比不是 mWh；无温度/功率 API 明列 unavailable，不造值。不同手机分开配对，不横向混亮度/充电/刷新/环境。

第二档约 4 GB 非旗舰必须执行相同 gameplay/lifecycle/response/CPU/持续负载。设备现实不可得时继续 BLOCKED，不把设备不可得写成 PASS 或自动推后至 M7。若要改变当前门禁策略，必须有新的明确 ADR/用户决策；本轮没有这种豁免。

停止点：自动门禁通过后称“软件修复候选、等待再次独立复核”；复核通过后才可称“软件完成、等待真机验收”。M3 整体、最终 Tick rate、最低设备、Android 性能、最终手感均不宣称通过；不进入 M4。
