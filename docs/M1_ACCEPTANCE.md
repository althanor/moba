# M1 验收状态与 Android 操作

2026-10-01；工程 0.2.1 / 规范 0.1.2（M0 架构不变量保留）。**M1 按正式修订标准可以结束；M2 就绪，未实施。** 真机结果由用户实际执行并提交；本环境只核对仓库、部署链并运行软件门禁，未冒充控制 Android 硬件。

## 验收矩阵与出口

| 项目 | 证据 / 范围 | 状态 |
| --- | --- | --- |
| 工程、目录、精确依赖、导入 DAG | npm ci 与全门禁；唯一 lockfile | PASS |
| foundation/contracts、Session、FixedTick、EntityRef、空通路 | unit/sim/replay | PASS |
| 同率 30/60/120 渲染 FPS 逐 Tick 一致 | 15/30/60 Hz 各自同命令 hash；跨率不要求相等 | PASS |
| VisualProxy / presentation 权威隔离 | 私有 World、冻结复制 DTO、B 开关 hash 一致、一步窗口 | PASS |
| pointer cancel / 失焦清理 | unit + CDP 多指/取消/blur | PASS 软件 |
| 高档 Android 基础生命周期 | 用户确认横屏、多指独立、pause/step/resume、后台/锁屏/竖屏无 catch-up、显式恢复、Session recreate、Canvas/renderer 生命周期 | PASS 真机，无需重测 |
| Phaser 30 FPS 配置问题 | limit:60→0；修复立即恢复约 60 FPS；实际 Game 参数回归测试 | PASS 修复验证 |
| 高档 Android 正式 A/B 三轮 | 修正版真实约 60 FPS；下方逐轮数字；A 默认、B 实验、C 暂不触发 | PASS M1 初步决策 |
| Android S0 empty 零实体 ≥3 分钟 | 197.97 s、5938 Tick、无输入；下方帧时/CPU | PASS 真机基线 |
| A/B 各约20分钟持续负载、冷热态/电量/温度/降频 | 用户决定本阶段不做，空壳代表性有限；ADR 019 | DEFERRED / non-blocking performance validation |
| 第二档非旗舰约4 GB Android | 当前只有高档参考；最低 SoC/OS/Chromium 未定；ADR 019 | DEFERRED / non-blocking performance validation |
| 正式技能/墙体/CC/取消窗口与代表性负载，最终 Tick 率 | M3 复审；当前30 Hz provisional baseline | DEFERRED 到原定 M3，非 M1 项 |
| 物理 touch-to-photon | POST_RENDER 不含触屏硬件、GPU 合成/发光；可选外部测量 | NOT_MEASURED，非阻塞测量缺口 |
| 真机主动 WebGL context loss | 未提供单独人工触发证据；桌面 loss/restore 自动化已 PASS | UNAVAILABLE/未报告，按能力条件执行，非阻塞；不冒称真机 PASS |
| 正式内容/容量编译 | guard 只确认正式内容为空 | NOT_APPLICABLE_M1，M2+ 待实现 |

真正阻塞 M1 出口的问题：当前无。软件门禁和本阶段必需真机基础证据已具备；长期性能/兼容性项目以明确延期保留。不能据此宣传低档设备、热稳定、电耗优势、完整玩法、最终 Tick 率或正式发行已验收。下一步仅是 M2 可开始状态，本轮没有 M2 实现。

## 构建、环境与证据来源

正式真机入口：[GitHub Pages](https://althanor.github.io/moba/)，仓库 [althanor/moba](https://github.com/althanor/moba)。修复 [commit d4124a6402809363d3e866c50d6c110c90ff241c](https://github.com/althanor/moba/commit/d4124a6402809363d3e866c50d6c110c90ff241c) 于 2026-10-01 21:26（Asia/Shanghai）提交；[Actions run 36868684893 / attempt 1](https://github.com/althanor/moba/actions/runs/36868684893/attempts/1) 的门禁、构建、Pages artifact 和部署成功已核实。

用户声明所有正式测试均使用该限帧修正版；本次提供的是结果汇总，旧测量格式没有 commit 字段，本轮未独立读取/核验逐轮原始 JSON。结果汇总落在 reports/android-m1-user-summary.json，不伪造原始事件、sample count、未给出的分位数、设备型号/OS/温度/亮度/电量。旧格式运行与修复部署的关联依据用户声明加成功部署链，后续以导出 build 字段直接追溯。

共同条件：同一高档参考 Android，Edge 153/Chromium，系统刷新率60 Hz；Simulation30 Hz、实际 Rendering约60 FPS、相同低像素配置、probe speed180 world units/s；A=previous/current interpolation，B=VisualProxy≤1 Tick。高档设备证据不代替约4 GB非旗舰最低能力验证。

## Phaser 30 FPS 诊断与修复

原配置 fps={target:60,limit:60,smoothStep:false} 产生长期约30 FPS、frame p50/p95约31–34 ms。改为 fps={target:60,limit:0,smoothStep:false} 后立即稳定约60 FPS。根因与源码机制/推断边界见 ADR 020；这是 presentation 的额外 limiter，不是 Simulation rate 问题。

修复前 Android A/B 和 reports/software-probe 中原有约33 ms帧间隔桌面数据只保留诊断/测量工具证据，**不得用于正式 A/B 定案**。不删除历史原始数据，不把 rendering target=60 写成实际达到了60。回归测试检查 createPresentation 实际传入 Phaser.Game 的完整 fps 配置；重新引入 limit:60 应失败。

## 正式 60 FPS A/B

| Pair | A Visual p95 ms | B Visual p95 ms | A UI p95 ms | B UI p95 ms | A capture→accept p95 ms | B capture→accept p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 4.4 | 6.0 | 12.7 | 14.0 | 24.5 | 26.7 |
| 2 | 5.5 | 5.3 | 13.2 | 13.6 | 27.1 | 26.9 |
| 3 | 5.2 | 5.8 | 13.4 | 14.4 | 28.7 | 28.3 |
| 三轮 run-level p95 中位数 | 5.2 | 5.8 | 13.2 | 14.0 | 27.1 | 26.9 |

用户另报三轮 Frame CPU p95 汇总约 A4.9 / B5.9 ms。B 三轮 correctionFraction=1，correction p95≈6 world units、max≈6；180/30=6 world units/Tick。

Visual/UI 为采集至首次软件渲染提交，不是物理发光；capture→accept 是权威接受边界，不能替代首次权威位置提交指标。UI与Visual均低于基础暂定50/80 ms阈值；当前未提供 authority movement p95、逐阶段 count、p50/p99或完整原始事件，不能标这些指标PASS。它们作为测量边界保留，M3 真实移动/技能阶段细化并按既有方法补报。未以汇总数字证明端到端手感或最终模拟率。

结论：B 未证明稳定、可重复且有工程意义的收益，持续引入预测/纠正复杂度，A继续默认；B保留实验性 presentation-only 路径，不写权威状态/hash；M3真实技能、墙体、CC、取消窗口及负载再评估。当前没有证据触发C，保持30 Hz当前基线，未永久定案，不直接改60 Hz。详见 ADR003。

## S0 空外壳

| 指标 | 用户真机实测 |
| --- | --- |
| mode / Simulation / Rendering | empty /30 Hz /约60 FPS |
| duration / totalTicks /输入 | ≈197.97 s /5938 /无输入样本 |
| Frame p50 /p95 /p99 /max | 16.7 /17.1 /17.4 /20.9 ms |
| Frame CPU p50 /p95 | 0.2 /0.4 ms |
| Tick CPU p95 | 0.1 ms |
| Simulation CPU | ≈0.779 ms/s |

超过三分钟、零实体/零输入，S0时钟/框架帧时与CPU基线PASS。该无输入运行不验输入延迟，输入与生命周期另有证据。Frame CPU含模拟/表现/Debug提交区间，非全浏览器CPU/GPU；无系统内存数据，未冒称内存预算通过。

## 正式延期与未来门禁

1. A/B各约20分钟持续负载、冷热态温度/降频、电量百分比消耗对比：DEFERRED，原因是M1空壳代表性有限与执行成本。M3开始复审，首个代表性玩法性能基线执行；与真实技能/碰撞/地图及当时可用控制负载一起测。无温度/功耗接口写unavailable，电池百分比只粗估，不生成mWh。
2. 非旗舰约4 GB第二档Android：DEFERRED，设备获取不阻塞M1架构出口。M3开始补测，首个代表性性能基线执行相同生命周期、触控、响应、CPU/帧时/资源检查；M7低档完整5v5/45分钟热态和M10发布前最低设备兼容矩阵仍是硬门禁。RAM仅候选标签，SoC/GPU/OS/Chromium/WebGL必须记录。
3. B真实技能/墙体/CC/取消窗口复评、最终Tick率、首次权威位移细化属于原定M3；不计为M1未实现系统。不足证据时保持provisional，不开展大量正式英雄/内容。

## 后续 Android 操作：Pages 优先

已PASS的基础生命周期不用重做。本流程用于后续构建/代表性负载复测，部署方式不会降低要求。

1. 在仓库Actions选择对应完整commit的成功run/attempt，确认npm ci/check、/moba/构建、artifact上传和deploy均成功。打开Pages并核对 [build-info.json](https://althanor.github.io/moba/build-info.json) 的commit/run/attempt；0.2.1合入并部署前旧页面没有此文件，不把它冒称为新构建。
2. 同一测试窗口固定构建，必要时刷新并核对JSON导出的build与目标run一致，避免缓存/发布更新混入三轮。记录device/SoC/GPU、Android/Edge版本、刷新率、backbuffer/DPR、亮度、充电和可用温度/电量。每轮JSON和环境记录保存同一commit+run/attempt。
3. 功能清单保持：横屏/竖屏暂停，独立多指/cancel/系统覆盖清理；pause/step/resume，后台/锁屏无catch-up且显式恢复；Session重建20次、新ID/Tick从0、一个Canvas、renderer由应用持有；能力允许时context loss恢复仍需明确恢复。不同能力未测单列，不伪造PASS。
4. A/B三轮轮换A→B、B→A、A→B；相同speed/rate/画质/刷新和负载，预热2分钟。每组每轮每输入阶段至少100个实际有效样本，分别报captured/实际UI/visual/accept/authority movement count、p50/p95/p99/max、纠正频率/误差。按帧/Tick合并后不把captured等同有效位移数；零方向begin/end不算移动。C只有ADR003条件触发时另开Session记录配置。
5. 代表性热态比较A/B各约20分钟，同亮度/充电/环境、冷/热段分别采输入与帧/CPU。有界缓冲2000样本须分段导出，累计CPU另记。S0仍可empty前台≥3分钟；完整45分钟对局保持M7/M10门禁。
6. 无法使用Pages时，在Android本机私有目录或可信本地开发机执行npm ci→npm run build→npm run preview -- --port 4173，打开对应HTTP服务；loopback仅在运行服务的本机可访问。记录commit/local/dirty与产物，不能把fallback冒充Actions。不要用file://，不因缺Termux而重做已完成验收。

云端/桌面浏览器仅用于软件回归，不能替代Android真实触控、GPU、系统生命周期、热态或电量验收。
