export function inspect(root: string): { errors: string[]; files: number; edges: number };
export function checkPinned(root: string): string[];
export function cycles(graph: Map<string, string[]>): string[][];
