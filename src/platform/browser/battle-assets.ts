// Registered immutable source assets. Compilation and profile validation stay in Application/Content.
import content from '../../../content/m3-battle.json';
import profile from '../../../content/m3-profile.json';
export function battleAssets(): { content: unknown; profile: unknown } { return { content, profile }; }
