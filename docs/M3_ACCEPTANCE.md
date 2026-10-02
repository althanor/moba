# M3 0.4.2 验收状态与 Android blocker 复测执行单

基线：althanor/moba main c95a6d76f34a9f8621586a9bd84160f71061170d /0.4.1 /M3。用户确认 0.4.1 软件出口此前已通过独立源码复核并推送；Android A/B 验收已开始，现因新 toolbar multitouch blocker 暂停。0.4.2 是本地软件修复候选，等待独立源码复核；本轮不推送 main、不部署 Pages、不进入 M4。先复核，再优先复测 blocker，不重复抹去已合法通过的真机事实。

## 当前证据与出口

| 项目 | 状态 | 证据与范围 |
|---|---|---|
| M3 0.4.1 软件出口 | PASS（此前独立复核） | 用户确认，远端 main c95a6d76；不自动授予新候选 PASS |
| 0.4.1 Android A 模式大量功能路径 | PASS（用户真机事实） | 已测试路径保留；未提供逐路径量化统计，不扩大为整组/整个 Android PASS |
| 0.4.1 Android B 普通移动、碰墙、move→dash | PASS（用户真机事实） | 不外推到 prediction→control 或最终手感 |
| Canvas 内部双指摇杆+技能 | PASS（用户真机事实） | 证明设备多点触控可用，不证明 DOM toolbar 第二指可用 |
| 单独 control、单独 pause | PASS（用户真机事实） | 不代表持续 Canvas contact 时可用 |
| 竖屏/旋转 M3 真机情景 | UNAVAILABLE | 设备“操作时防转屏保护”使该情景不可执行，绝非 PASS；原软件生命周期回归保留 |
| Canvas held joystick + toolbar control/pause | BLOCKED（已真机确认） | A/B均稳定无响应；0.4.2 软件修复不自动撤销硬件 blocker |
| 移动中 control、dash 中受控、B prediction→control 正式真机结论 | PENDING / 不接受旧结论 | 因 blocker 未能有效测试；此前如有通过表述撤回，优先复测 |
| 0.4.2 软件自动门禁 | 见 M3_TEST_REPORT.md / reports/check.json | 必须本轮完整重跑，不复制旧报告 |
| 0.4.2 软件修复候选 | 等待独立源码复核 | 自动 PASS 与候选独立复核分开 |
| 当前 A/B/C | A 默认；B experimental；C NOT_APPLICABLE | Simulation 30 Hz provisional，无本轮自动触发 C |
| 第二档非旗舰约4GB | BLOCKED / 等待设备 | M3 真机决策硬门禁；ADR019 空壳理由不继续延长 |
| A/B各约20分钟代表性冷热态/电量/温度/降频 | BLOCKED / 等待真机 | 不接受最终率/最低设备/Android 性能/最终手感 |
| physical touch-to-photon | DEFERRED / 人工测量；无工具则 UNAVAILABLE | 软件重采/渲染提交时间不能冒充物理端到端 |
| M7低档45分钟完整对局 / M10兼容与发行 | DEFERRED 到原硬门禁 | 保留全部要求 |
| M3整体 / Android整体 / M4开始 | BLOCKED | 软件候选复核、blocker真机复测及代表性硬件证据尚未满足 |

事实来源是用户本轮 Android 报告；未在本环境操作 Android，不伪造原始样本、Actions run、温度或电耗。此前合法 A/B 功能证据属于 0.4.1，保留版本归属；当前自动化仅为生产构建桌面 Chromium/CDP 软件证据。

## 复核通过后优先执行 blocker 复测

核对未来获授权发布的 0.4.2 build-info、commit/run/attempt、version/contentHash/certificateId；当前本地候选没有部署，不能使用 0.4.1 Pages 页面假验 0.4.2。记录设备/OS/浏览器/刷新/FPS/亮度/充电/电量/可获取温度，不要求 Termux。

1. A：左手按住摇杆并持续移动，右手按 control；第一触点不松开、不重按。按钮 counter+1；只有一次敌方 bolt；命中前仍移动，命中后 canMove=false 停止；CC结束后保持同触点自然恢复。多次反复检查，无 duplicate。
2. B：同样流程，检查普通 prediction→control 停预测→控制结束；记录 visual/correction 和实际手感，不先接受最终B策略。
3. A/B：移动+技能瞄准两指保持，第三指 control，技能pointer/preview不消失、不自行释放；控制结束后松技能仍按正常策略提交。
4. A/B：持续摇杆，第二指 pause，必须暂停并清零Canvas pointers；resume后旧手指仍 held 也不能残留intent，只有新begin才能重新移动。
5. 单指toolbar：control、recreate、modeA/modeB各一次；export一次下载一个JSON，并仍清held joystick。确认鼠标/键盘可用时的fallback未改变。
6. 完成上述后再恢复移动中/受控dash的正式验收与A/B记录；此前A及B已通过路径不要求全部重做，若发现新回归才扩展。

每按钮 data-activation-count/source 可在浏览器DOM调试观察，本阶段纯debug；不进入authority hash。Android最终结果须用户提交实际观察或导出，不能由CDP自动化代填。

## 保留的完整玩法与性能门禁

基础摇杆/急转/松开、墙体/单位碰撞、dash、投射物/Area/治疗盾、技能按下/拖拽/释放/取消、目标锁、control开始/结束/动作中断、move+skill多指、background/blur/lost pointer/pause/resume/recreate均继续按M3范围验收。原131+32软件回归保留；竖屏真机不可执行仅记UNAVAILABLE。

正式A/B仍需三轮交替、分阶段input/UI/visual/accept/release/authority、CPU/Tick/frame/CPU-sec、prediction error与玩家说明。没有原始数据的指标保持缺口。第二档约4GB及A/B各20分钟代表性冷热态需配对条件，记录0/5/10/15/20分钟电量、可取温度/降频/帧时与CPU；缺设备BLOCKED，接口不可用UNAVAILABLE，不造mWh。M7/M10原门禁未豁免。

停止点：“M3 0.4.2 toolbar multitouch 软件修复候选，等待独立源码复核。”独立复核和 Android blocker 复测前不宣布M3整体PASS、Android PASS、最终Tick率或进入M4。
