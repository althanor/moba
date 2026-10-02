// Build provenance is debug metadata; it never enters Simulation or its hash.
export function createBuildInfo(env, localCommit, workingTreeDirty, version, phase = 'M1') {
  if (!['M1', 'M2', 'M3'].includes(phase)) throw new Error('invalid build phase');
  const actions = env.GITHUB_ACTIONS === 'true';
  const commit = actions ? env.GITHUB_SHA : localCommit;
  const validCommit = typeof commit === 'string' && /^[a-f0-9]{40}$/.test(commit);
  if (actions && (!validCommit || localCommit !== commit || env.GITHUB_REPOSITORY !== 'althanor/moba' ||
    !/^\d+$/.test(env.GITHUB_RUN_ID ?? '') || !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT ?? ''))) {
    throw new Error('Pages build requires repository, matching checkout commit, Actions run ID and attempt');
  }
  return Object.freeze({ version, phase, source: actions ? 'github-actions' : 'local',
    commit: validCommit ? commit : null, workingTreeDirty,
    repository: 'althanor/moba', runId: actions ? env.GITHUB_RUN_ID : null,
    runAttempt: actions ? env.GITHUB_RUN_ATTEMPT : null,
    actionsRunUrl: actions ? `https://github.com/althanor/moba/actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT}` : null });
}
