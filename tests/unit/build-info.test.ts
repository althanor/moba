import { describe, expect, it } from 'vitest';
import { createBuildInfo } from '../../tools/build-info.mjs';
describe('measurement build provenance', () => {
  it('links an Actions artifact to its full commit and exact run attempt', () => {
    const build = createBuildInfo({ GITHUB_ACTIONS: 'true', GITHUB_SHA: 'd4124a6402809363d3e866c50d6c110c90ff241c',
      GITHUB_REPOSITORY: 'althanor/moba', GITHUB_RUN_ID: '36868684893', GITHUB_RUN_ATTEMPT: '1' }, 'd4124a6402809363d3e866c50d6c110c90ff241c', true, '0.2.1');
    expect(build.commit).toBe('d4124a6402809363d3e866c50d6c110c90ff241c');
    expect(build.actionsRunUrl).toBe('https://github.com/althanor/moba/actions/runs/36868684893/attempts/1');
    expect(build.source).toBe('github-actions');
    expect(build.workingTreeDirty).toBe(true); // Generated reports can dirty an Actions checkout too.
  });
  it('fails a Pages build with incomplete or invalid provenance', () => {
    for (const env of [{ GITHUB_ACTIONS: 'true' }, { GITHUB_ACTIONS: 'true', GITHUB_SHA: 'main', GITHUB_REPOSITORY: 'althanor/moba', GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1' },
      { GITHUB_ACTIONS: 'true', GITHUB_SHA: 'd4124a6402809363d3e866c50d6c110c90ff241c', GITHUB_REPOSITORY: 'althanor/moba', GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1' }]) {
      expect(() => createBuildInfo(env, null, false, '0.2.1')).toThrow('Pages build requires');
    }
  });
  it('marks local or archive evidence without inventing Actions or a clean commit', () => {
    expect(createBuildInfo({}, null, true, '0.2.1')).toMatchObject({ source: 'local', commit: null, workingTreeDirty: true, actionsRunUrl: null });
  });
});
