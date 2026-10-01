# MOBA Core Engine · M1 / 0.2.0

Android 横屏优先的 Phaser + TypeScript + Vite 长期工程骨架。规则基线为 0.1.1，M0 已结束；本次停在 M1，Android 真机出口尚待完成，未进入 M2。没有英雄、伤害、技能、装备、兵线、塔、野怪、Bot、正式地图或正式美术。

## Android / Termux 启动

请把压缩包解压到 Termux 私有 home 下的项目目录，不在共享下载目录直接安装 node_modules。当前 Node 25 可按此操作；本次 Linux 实测 Node 24.19.0。

```bash
termux-setup-storage
mkdir -p ~/projects/moba-m1-0.2.0
unzip ~/storage/downloads/MOBA_Core_Engine_M1_v0.2.0.zip -d ~/projects/moba-m1-0.2.0
cd ~/projects/moba-m1-0.2.0/moba-core
npm ci
npm run build
npm run preview -- --port 4173
```

在 Android Chrome 打开 http://127.0.0.1:4173/ ，转为横屏；端口不会与已有 8000 服务冲突。安装或启动错误保留完整日志。Vite 必须由服务运行，不用 file:// 打开 HTML。npm ci 使用现有唯一 lockfile，不自行升依赖。

左半屏按住拖动产生最小方向样本，右半屏可同时多指采样。绿色框是权威坐标，白/蓝实心块是插值/代理坐标。空外壳按钮无实体；响应探针按钮恢复几何 fixture。暂停、单步、恢复、重建 Session、A/B、JSON 导出均可直接触屏操作。切后台/竖屏/失焦/context loss 会暂停与清理输入；条件解除后点击恢复。fault 只允许重建，不伪造存档恢复。

## 开发门禁

```bash
npm ci
npx playwright install chromium
npm run check
```

完整 check 串行执行 typecheck、lint、check:deps、validate:content、test:unit、test:sim、build、test:browser，失败退出非零；报告写 reports/check.json。Playwright Chromium 自动化适用于本次 Linux 执行环境，Termux 不需要尝试安装 Linux Chromium；Android 由真实 Chrome 手动验收。Termux 可独立执行前七项命令。

validate:content 输出 NOT_APPLICABLE_M1，只验证正式内容目录为空。正式 Schema/引用/公式 DAG/容量/权限验证是 M2+；当前没有这些实现，不能将入口 exit 0 解读为正式内容通过。

桌面软件测量：`npm run probe:software` 先 build 再以固定 dist 采集 A/B 各三轮、每轮 100 次手势，输出 reports/software-probe。没有外传。`node tools/run-software-probe.mjs --smoke` 仅检查进程清理，输出独立 smoke 目录。`npm run package` 打包完整源码、规范、锁文件、测试、报告和 dist，排除 node_modules；FILE_MANIFEST.json 记录 SHA256。

## 文档

- [M1 实现矩阵与边界](docs/M1_IMPLEMENTATION.md)
- [验收缺口与 Android 具体步骤](docs/M1_ACCEPTANCE.md)
- [实际测试报告](docs/M1_TEST_REPORT.md)
- [依赖和兼容记录](docs/DEPENDENCIES.md)
- [架构](docs/ARCHITECTURE.md) / [流水线](docs/COMBAT_PIPELINE.md) / [编码规则](docs/CODING_RULES.md) / [里程碑](docs/MILESTONES.md) / [预算](docs/PERFORMANCE_BUDGET.md)
- [决策](DESIGN_DECISIONS.md) / [变更](CHANGELOG.md) / [资源许可](ASSET_LICENSES.md)

30 Hz 为当前未定案基线。桌面数据不代表 Android 手感、电量、热量或最低机型已经通过。M1 待补真机结果，M3 复测正式移动/技能/受控场景并完成最终 Tick 决策；本次不进入后续阶段。
