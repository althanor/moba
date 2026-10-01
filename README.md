# MOBA Core Engine · M1 / 0.2.1

Android横屏优先的Phaser + TypeScript + Vite工程骨架。规范0.1.2保留M0架构不变量，按真机实测修订验收策略。M1可以正式结束，M2就绪但未实施。当前只有空外壳与几何响应探针；没有英雄、伤害、技能、装备、兵线、塔、野怪、Bot、正式地图或美术。

## Android：GitHub Pages 优先

正式真机入口：[https://althanor.github.io/moba/](https://althanor.github.io/moba/)，源码仓库：[althanor/moba](https://github.com/althanor/moba)。GitHub Actions以唯一lockfile安装并运行完整M1门禁，构建`/moba/`产物后部署Pages。

每次测试必须可追溯到完整commit、成功Actions run/attempt与Pages artifact。0.2.1构建提供 [build-info.json](https://althanor.github.io/moba/build-info.json)，JSON测量导出携带同一build信息；本轮收口版本合入部署前页面仍是旧修正版，不能冒称已更新。按 [Android验收记录和具体流程](docs/M1_ACCEPTANCE.md) 核对版本，固定同一构建比较，防止缓存/发布变化污染数据。

用户已经完成高档参考Android Edge153的基础生命周期、多指、正式60 FPS三轮A/B和S0。已通过项目不用重做。云端浏览器不能替代Android真机；Pages路径不会降低触控、生命周期和性能要求。

左半屏拖动为几何响应探针，右半屏支持独立多指。绿色框为权威坐标，实心块为表现坐标。空外壳无实体；暂停、单步、恢复、重建、A/B与导出可触屏操作。后台/竖屏/失焦/context loss暂停清理，解除后显式恢复；fault只可重建。

A普通插值为默认；B即时反馈/VisualProxy为实验性presentation-only路径，≤1 Tick，不改World/hash。当前Simulation仍30 Hz provisional baseline，M3以真实技能/墙体/CC/取消窗口重评；当前不触发C，不直接改60 Hz。Phaser保持`fps: { target: 60, limit: 0, smoothStep: false }`，避免额外limiter把60 Hz设备降至约30 FPS；target不是实际刷新保证，高刷新设备另记实际Rendering。

## 本地 preview fallback

已有源码可在可信本地开发机，或Android Termux私有项目目录运行：

```bash
npm ci
npm run build
npm run preview -- --port 4173
```

同机浏览器打开http://127.0.0.1:4173/；其他设备不能用该loopback访问远端机器。记录local/commit/dirty与构建产物，不能冒充Pages/Actions。不用file://。Android无需为了本次已完成验收再安装Termux或Playwright。

## 开发门禁

```bash
npm ci
npx playwright install chromium
npm run check
```

check串行运行typecheck、lint、check:deps、check:docs、validate:content、test:unit、test:sim、build、test:browser，失败退出非零，报告在reports/check.json。浏览器门禁为Linux/支持环境的Chromium自动化，缺浏览器真实失败，不跳过伪装成功。check:docs阻止根目录/docs规范副本漂移。

validate:content为NOT_APPLICABLE_M1，只检查正式内容为空；正式Schema/引用/属性DAG/容量/权限编译仍待M2+。固定生产dist的软件测量可运行`npm run probe:software`，只作软件诊断，不替代真机或正式A/B定案。原约30 FPS数据保留诊断用途。

`npm run package`生成完整源码、锁文件、规范、测试、报告和dist的0.2.1压缩包及SHA256 manifest，排除node_modules。依赖没有升级，精确版本见 [DEPENDENCIES.md](docs/DEPENDENCIES.md)。

## 文档与阶段出口

- [实现矩阵](docs/M1_IMPLEMENTATION.md)、[验收与正式延期](docs/M1_ACCEPTANCE.md)、[软件测试报告](docs/M1_TEST_REPORT.md)
- [架构](docs/ARCHITECTURE.md)、[流水线](docs/COMBAT_PIPELINE.md)、[编码规则](docs/CODING_RULES.md)、[里程碑](docs/MILESTONES.md)、[性能预算](docs/PERFORMANCE_BUDGET.md)
- [ADR003/019/020](DESIGN_DECISIONS.md)、[变更](CHANGELOG.md)、[资源许可](ASSET_LICENSES.md)

20分钟冷热态/电量/温度/降频及第二档约4 GB Android是正式DEFERRED / non-blocking performance validation，非PASS。M3复审、首个代表性玩法性能基线补测；M7低档45分钟完整对局和M10最低设备/发布兼容矩阵要求保留。M1无真正出口阻塞，不代表低档支持、热稳定、完整玩法或永久30 Hz已通过。本轮只收口M1。
