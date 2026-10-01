# 依赖与兼容记录

核实日期 2026-10-01；工程 0.2.1。npm view 指定版本核实存在性与 engines，npm install 后 npm ls --depth=0 核实实际安装；check:deps 逐项检查 manifest、lock 与 node_modules 版本相等，唯一 package-lock.json。这里锁定实际使用的已知版本，不使用 latest/^/~ 范围，也不声称是当日最新版本。

| 依赖 | 精确版本 | 责任 |
| --- | --- | --- |
| phaser | 3.90.0 | 唯一产品外部框架，仅 presentation 导入 |
| typescript | 5.9.3 | 严格类型与 AST 依赖扫描 |
| vite | 7.3.1 | 开发与生产构建 |
| vitest | 3.2.4 | unit/architecture/headless/replay 测试 |
| eslint | 9.39.1 | lint |
| @eslint/js | 9.39.1 | JS lint 规则 |
| typescript-eslint | 8.48.1 | TypeScript lint |
| @types/node | 24.10.1 | 工具与测试类型；纯 core 禁止环境类型 |
| @playwright/test | 1.56.1 | Chromium 浏览器自动化 |

Node 实测 v24.19.0；npm 实测 11.9.0。Vite 7.3.1 engines = ^20.19.0 || >=22.12.0；Phaser 3.90.0 未声明 Node engines。浏览器自动化用 Playwright Chromium 141.0.7390.37 / Linux x86_64 / SwiftShader；不是 Android GPU。TypeScript core lib=['ES2022'], types=[]，单独编译 foundation/contracts/simulation/controllers/application/session，DOM/Phaser 无法进入这个类型边界。

Vite 生产 target='chrome107'，候选 Android Chromium 107+，WebGL1，Pointer Events，CSS safe area；未添加 polyfill，不依赖 WebGL2。构建转换目标不是兼容实测结论，最低 Android/SoC/Chromium 尚未接受。按比例限制 backbuffer，16:9 为 960×540，22:9 约 1320×540，至多约 0.75 M 像素，DPR 不盲目提高。

Phaser API 经已安装 3.90.0 类型与源码核实：fps.target、fps.limit、smoothStep、Scene.update、POST_RENDER、Scale.FIT；不使用该版本不存在的 resolution 配置。权威 elapsed 来自外层 performance.now，完全忽略 Phaser 的平滑 delta/rawDelta，不启动第二个 RAF/interval 模拟驱动。测试工具的 RAF 等待仅等待绘制，不推进权威逻辑。

Phaser 打包 chunk 约 1.208 MB，gzip 约 332 KB，因此 Vite 给出 >500 KB chunk 提醒；不是编译错误，没有提高阈值隐藏提醒。本轮不为削减框架体积重写构建。source map 供 M1 调试，体积另列；正常加载不需下载 map。依赖安装曾提示 ESLint 9.39.1 不再处于支持期，已记录，未来升级需兼容回归，本轮不把锁定版本称为最新版。

工具资料：
- [Phaser 3.90.0 API](https://docs.phaser.io/api-documentation/3.90.0/class/core-timestep)
- [Phaser 3.90.0 源码](https://github.com/phaserjs/phaser/tree/v3.90.0)
- [Vite 7 生产构建](https://v7.vite.dev/guide/build)
- [Vite 7 指南](https://v7.vite.dev/guide/)
- [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html)

Android Termux 的 Node 25 符合范围，但此次仅在 Linux Node 24 实际执行。正式真机优先GitHub Pages/Actions构建；用户已完成高档Android Edge153基础检查、A/B与S0。本地npm ci/preview是fallback，非要求用户重做已PASS测试；低档最低能力仍DEFERRED。Playwright 的 Linux Chromium 自动化不要求在 Termux 安装；Termux 可运行非浏览器门禁并在真实 Chrome 手动验收。完整 npm run check 为带浏览器执行环境的开发门禁，缺 Chromium 时会真实失败，不跳过伪装成功。
