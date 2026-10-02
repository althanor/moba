export interface BuildInfo {
  readonly version: string;
  readonly phase: 'M1' | 'M2';
  readonly source: 'github-actions' | 'local';
  readonly commit: string | null;
  readonly workingTreeDirty: boolean;
  readonly repository: 'althanor/moba';
  readonly runId: string | null;
  readonly runAttempt: string | null;
  readonly actionsRunUrl: string | null;
}
export function createBuildInfo(env: Record<string, string | undefined>, localCommit: string | null, workingTreeDirty: boolean, version: string, phase?: 'M1' | 'M2'): Readonly<BuildInfo>;
