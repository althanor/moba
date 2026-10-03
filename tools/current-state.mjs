/** Documentation metadata only. No product module imports this helper/source. */
export const CURRENT_STATE_DOCUMENTS = Object.freeze({
  'ARCHITECTURE.md': 'Android HTML5 MOBA 技术架构',
  'CODING_RULES.md': 'MOBA 工程编码与验证规范',
  'COMBAT_PIPELINE.md': 'MOBA 战斗结算流水线',
  'DESIGN_DECISIONS.md': 'MOBA 设计决策记录',
  'PERFORMANCE_BUDGET.md': 'Android MOBA 性能预算与测量方案',
  'README.md': 'MOBA Core Engine',
  'MILESTONES.md': 'MOBA 开发阶段与验收标准',
  'M3_IMPLEMENTATION.md': 'M3 实施与输入修复记录',
  'M3_ACCEPTANCE.md': 'M3 验收与 Android 执行单',
  'M3_TEST_REPORT.md': 'M3 软件验证报告',
  'M3_WORK_ACCOUNTING.md': 'M3 工作计账与容量证明',
  'M3_DELIVERY.md': 'M3 候选交付',
  'CHANGELOG.md': 'MOBA 变更记录',
  'content/README.md': '注册内容与容量 profile 说明'
});
const START = '<!-- current-state:start -->';
const END = '<!-- current-state:end -->';
const RECORD_START = '<!-- historical/superseded:start -->';
const RECORD_END = '<!-- historical/superseded:end -->';
export function withoutHistoricalRecords(text) {
  let historical = false;
  const current = [];
  for (const line of text.split('\n')) {
    if (line.trim() === RECORD_START) {
      if (historical) throw new Error('Nested documentation history block');
      historical = true; continue;
    }
    if (line.trim() === RECORD_END) {
      if (!historical) throw new Error('Unmatched documentation history end');
      historical = false; continue;
    }
    if (!historical) current.push(line);
  }
  if (historical) throw new Error('Unclosed documentation history block');
  return current.join('\n');
}
export function validateCurrentStateSource(metadata, status) {
  if (status.schema !== 'moba-document-current-state-v1') throw new Error('Invalid current-state schema');
  if (status.version !== metadata.version || status.phase !== metadata.mobaPhase)
    throw new Error('Current-state source must match package version/phase');
  if (!/^\d+\.\d+\.\d+$/.test(status.toolbarFixVersion) || !/^M\d+$/.test(status.nextPhase) || !/^\d+\.\d+\.\d+$/.test(status.version) || !/^M\d+$/.test(status.phase) || !/^[0-9a-f]{40}$/.test(status.baseCommit))
    throw new Error('Invalid current version/phase/baseCommit');
  for (const key of ['productReview', 'documentationReview', 'softwareExitFinal', 'overall', 'androidOverall', 'toolbarBlocker', 'androidGapRetest', 'formalAB', 'thermalBattery20min', 'secondTier4GB', 'portrait', 'tickRateStatus', 'modeA', 'modeB', 'modeC']) {
    if (typeof status[key] !== 'string' || !status[key]) throw new Error(`Missing current state: ${key}`);
  }
  if (typeof status.currentAndroidBlocker !== 'string' || !status.currentAndroidBlocker || typeof status.candidate !== 'string' || !status.candidate || !Number.isInteger(status.tickRate) || status.tickRate < 1)
    throw new Error('Missing current candidate/blocker/tickRate');
  for (const key of ['pushed', 'deployed', 'androidAcceptanceResumed', 'nextPhaseStarted'])
    if (typeof status[key] !== 'boolean') throw new Error(`Invalid lifecycle state: ${key}`);
  for (const key of ['contentHash', 'certificate', 'm2Certificate', 'jointCertificate'])
    if (!/^[0-9a-f]{8}$/.test(status[key])) throw new Error(`Invalid proof binding: ${key}`);
  if (status.documentationReview === 'PENDING_NARROW_REVIEW' && status.softwareExitFinal !== 'NOT_DECLARED')
    throw new Error('Pending narrow review cannot declare final software exit');
  const incomplete = [status.androidGapRetest, status.formalAB, status.thermalBattery20min, status.secondTier4GB].some(v => v === 'NOT_EXECUTED' || v === 'NOT_COMPLETED');
  if (incomplete && (status.overall !== 'BLOCKED' || status.androidOverall !== 'BLOCKED' || status.nextPhaseStarted))
    throw new Error('Incomplete Android evidence requires BLOCKED overall and no next phase');
}
export function renderCurrentStateHeader(title, status) {
  return `${START}\n# ${title}\n\n<!-- current-state:json ${JSON.stringify(status)} -->\n\n当前：${status.phase} ${status.version} ${status.candidate}。\n\n基线：\`${status.baseCommit}\`（althanor/moba main）；version=${status.version}，phase=${status.phase}；contentHash=${status.contentHash}，certificate=${status.certificate}，M2=${status.m2Certificate}，joint=${status.jointCertificate}。\n\n产品源码独立审核=${status.productReview}；本轮文档窄复核=${status.documentationReview}；software-exit final=${status.softwareExitFinal}。\n\n${status.toolbarFixVersion} toolbar blocker=${status.toolbarBlocker}；后续发现 ${status.currentAndroidBlocker}；Android gap blocker retest=${status.androidGapRetest}。${status.phase} overall=${status.overall}；Android overall=${status.androidOverall}。\n\nformal A/B=${status.formalAB}；20min thermal/battery=${status.thermalBattery20min}；second-tier ~4GB=${status.secondTier4GB}；portrait=${status.portrait}。${status.tickRate}Hz ${status.tickRateStatus}；A=${status.modeA} / B=${status.modeB} / C=${status.modeC}。\n\npush=${status.pushed}；deploy=${status.deployed}；继续 Android 验收=${status.androidAcceptanceResumed}；进入下一阶段=${status.nextPhaseStarted}（本候选不得进入 ${status.nextPhase}）。状态源：docs/current-status.json；历史记录不充当当前状态。\n${END}\n`;
}
export function validateCurrentStateDocuments(files, metadata, status) {
  validateCurrentStateSource(metadata, status);
  const checked = new Set();
  for (const [path, title] of Object.entries(CURRENT_STATE_DOCUMENTS)) {
    if (!files.has(path)) throw new Error(`Missing current-state document: ${path}`);
    for (const candidate of [path, `docs/${path}`]) {
      if (!files.has(candidate)) continue;
      checked.add(candidate);
      const text = files.get(candidate), live = withoutHistoricalRecords(text);
      if ((live.match(/<!-- current-state:start -->/g) ?? []).length !== 1 || (live.match(/<!-- current-state:end -->/g) ?? []).length !== 1)
        throw new Error(`Exactly one current-state declaration required: ${candidate}`);
      const expected = renderCurrentStateHeader(title, status);
      if (!text.startsWith(expected)) throw new Error(`Current-state declaration mismatch (version/blocker/base/status): ${candidate}`);
      const body = withoutHistoricalRecords(text.slice(expected.length));
      if (path === 'M3_DELIVERY.md') {
        const names = [
          `MOBA_Core_Engine_${status.phase}_v${status.version}.zip`,
          `${status.phase}_v${status.version}_against_${status.baseCommit.slice(0, 8)}.patch`,
          `${status.phase}_TEST_REPORT_v${status.version}.md`,
          `FILE_MANIFEST_${status.phase}_v${status.version}.json`,
          `SHA256SUMS_${status.phase}_v${status.version}.txt`
        ];
        const listed = body.split('\n').filter(line => /^- \S+\.(zip|patch|md|json|txt)$/.test(line)).map(line => line.slice(2));
        if (JSON.stringify(listed) !== JSON.stringify(names)) throw new Error(`Delivery artifact version/base mismatch: ${candidate}`);
      }
      // Only declaration syntax is reserved, not all mentions of old versions.
      // All project current-state declarations belong in the canonical header.
      for (const line of body.split('\n')) {
        if (/(?:当前|Current)\s*(?:状态|版本|阶段|候选)?\s*[:：]?\s*(?:M\d+\s+)?(?:\d+\.\d+\.\d+|M\d+\b)/i.test(line) ||
          /^#{1,6}\s+.*(?:M\d+\s+\d+\.\d+\.\d+).*当前/.test(line) ||
          /(?:当前|Current)\s*(?:Android\s*)?(?:blocker|base|version|phase|candidate)\s*[:：=]/i.test(line))
          throw new Error(`Current-state declaration outside canonical header: ${candidate}: ${line}`);
      }
    }
  }
  for (const [path, text] of files) {
    if (!checked.has(path) && withoutHistoricalRecords(text).includes(START))
      throw new Error(`Unregistered current-state document: ${path}`);
  }
  return checked.size;
}
