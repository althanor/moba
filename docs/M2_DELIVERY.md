# M2 0.3.1 交付说明

基线：althanor/moba main 163df7ee30c92d9c0f7ab6b6374ebe08475d9a4a /0.2.1。完整源码包 MOBA_Core_Engine_M2_v0.3.1.zip；patch MOBA_M2_v0.3.1.patch。两者包含相同最终实现/文档/测试/报告/dist；压缩包额外带完整未改文件。FILE_MANIFEST.json 为包内逐文件SHA256，manifest自身排除以避免自引用。

## 使用完整源码

解压后进入 moba-core；npm ci，npx playwright install chromium，npm run check。完整容量测试在桌面同步执行百万级工作，full trace已观察GiB级heap，需要足够测试机内存；这是成本问题，不减少合法工作。本地页面仍是M1空壳/响应探针；M2使用headless fixtures。

## 使用 patch

在干净的基线checkout上操作：

```bash
git switch -c work/m2-kernel 163df7ee30c92d9c0f7ab6b6374ebe08475d9a4a
git apply --check MOBA_M2_v0.3.1.patch
git apply MOBA_M2_v0.3.1.patch
npm ci
npx playwright install chromium
npm run check
```

patch文件放在仓库外或调整路径；存在其他本地改动时先保存自己的改动。提交合入main后由既有Actions运行M1回归+M2校验并构建/moba/部署；本次交付没有推送或冒称新部署。dist/build-info为本地dirty来源，合入Actions后重建真实commit/run/attempt追溯，不复用旧CI身份。

## 修订候选状态

PASS：本轮M2软件修订，11门禁/98项自动测试，真实内容编译、联合证书/profile、454目标最大Effect×20合法根和维护/到期重合，4,574,049 Operation/9,135,386 Fact完整结算消费，全部454实体Health独立核对。

DEFERRED：Android/第二档约4GB/20分钟冷热态/电量/降频，ADR019重执行门禁保留；实时性能目标未通过，仅成本记录。NOT_APPLICABLE：M3及以后正式功能，本轮未进入。BLOCKED：最终M2收口等待独立复核，当前没有已知软件门禁失败；不宣称性能profile已达标。

详细模块、证书/actual/limit/profile、单次成本、缺口和测试路径见M2_IMPLEMENTATION/M2_ACCEPTANCE/M2_TEST_REPORT与reports/*.json。Simulation30Hz provisional、A默认/B实验/C未触发保持。

新增扫描证明与反例见 M2_WORK_ACCOUNTING /ADR023。patch仍以main 0.2.1为基线，是完整M2交付；不直接叠加到0.3.0已改工作树。0.3.0原交付文件保持用于对照。交付未push远端main。
