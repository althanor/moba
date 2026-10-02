# M3 0.4.1 复核与交付说明

基线：althanor/moba main c57fa8caadb2afc2eb98d85246e156d76e942949，M2 0.3.1。M3 软件修复候选 / 等待再次独立复核；不进入 M4。本轮未推送/部署。

完整 ZIP 含源码、锁文件、规范、测试、最终软件报告、生产 dist 和 FILE_MANIFEST.json；不含 .git/node_modules。解压后 `npm ci`、`npx playwright install chromium`、`npm run check`。当前生产构建明确标记 source=local、commit=c57...、workingTreeDirty=true，表示基线上的候选工作树；不是 M3 已推送 commit 或 Actions 构建。

源代码补丁 M3_v0.4.1_against_c57fa8c.patch 对应上述精确 main。它包含源码/内容/测试/工具/文档/报告，刻意不携带生成的 dist 和 FILE_MANIFEST；先在干净基线上 `git apply --check /path/to/patch`，再 `git apply /path/to/patch`，执行安装/全部门禁/生产 build。完整 ZIP 的 FILE_MANIFEST 独立核对全部实际文件字节。

软件报告 M3_TEST_REPORT.md 给出每项门禁、M2 极限数量、正常玩法成本与三轮真实 gameplay A/B；M3_WORK_ACCOUNTING.md 给出新的 tick/startup/command 证书/profile；M3_ACCEPTANCE.md 是两档 Android 与各模式约 20 分钟热态/电量/温度/降频、真实手感执行单。

本轮正式 Android A/B 冻结。再次独立复核通过后，才按后续授权使用 M3 实际可达托管地址并核对 build-info；现有0.3.1 Pages 不可替代 M3。验收执行单保留供之后使用，本轮不要求用户安装 Termux 或执行真机测试。

停止点：“自动软件门禁通过的修复候选，等待再次独立复核”。复核前不开始正式 Android A/B。第二档约4GB与代表性热态证据当前阻塞 M3 真机决策出口；没有这些数据不接受最终 Tick rate、最低设备、Android 性能或最终手感。
