# M3 0.4.2 toolbar multitouch 修复候选交付

唯一 patch 基线：althanor/moba main c95a6d76f34a9f8621586a9bd84160f71061170d /0.4.1 /phase M3。0.4.1软件出口此前独立复核通过，Android验收因toolbar第二触点blocker暂停；本轮未推送/部署。

完整ZIP含源码、锁文件、规范、全部测试、本轮报告、生产dist与FILE_MANIFEST.json，排除.git/node_modules。版本绑定生成物重新生成；build-info source=local/commit=c95.../workingTreeDirty=true，不冒充远端Actions构建。独立完整检查：npm ci、npx playwright install chromium、npm run check。

M3_v0.4.2_against_c95a6d76.patch 包括源码/测试/文档/报告、生产dist和FILE_MANIFEST.json；以git binary patch携带全部候选字节。在精确干净c95基线上git apply --check再apply，核对整个候选文件集合及SHA256；反向恢复基线再正向重建重复核对。完整ZIPmanifest也单独核对每个文件SHA256。报告列出原163项保留、新21项、完整11门禁、M2极限及代表性正常玩法成本；proof包含基线逐文件hash与authority源码相同/容量数值相同的机器核对。重新运行build会更新构建时间等本地诊断元数据，故精确交付字节重建使用patch，源码复验可另外运行完整检查。

停止点：“M3 0.4.2 toolbar multitouch 软件修复候选，等待独立源码复核。”复核和Android blocker复测前不宣布M3整体PASS、Android PASS、最终Tick率，不进入M4。未来仅在获授权发布并核对实际0.4.2 build-info后优先复测blocker；当前0.4.1页面不能验此修复，无需用户在本轮安装Termux。此前有效Android事实保留于M3_ACCEPTANCE。
