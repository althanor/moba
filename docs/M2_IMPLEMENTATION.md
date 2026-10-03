# M2 implementation contract

历史阶段记录（historical/superseded）：下方保留原版本当时的状态、证据与结论，不作为当前阶段/交付状态；现行状态见 docs/current-status.json 与 M3 验收。架构约束及未来硬门禁继续有效。

<!-- historical/superseded:start -->
2026-10-02; incremental work against main 163df7ee30c92d9c0f7ab6b6374ebe08475d9a4a.

Latest push Actions run 36938625773 attempt 1: validation/build/upload/deploy SUCCESS; Pages HTTP 200. M1 gate passed before M2 implementation.

M2 implements a finite, headless content vocabulary. It does not implement M3 actions, movement, targeting geometry or heroes. The `all` selector enumerates the complete headless roster; it is a capacity fixture, not a spatial query. Future geometry must preserve its complete-result contract.

Effect definitions are immutable intentions/AST. Root requests supply runtime source, ordered primary targets and producer identity. Operations are individual attempted authoritative mutations, including cancelled/replaced attempts. Sequence completes each child and its derived subtree before the next child. P0 expires independent status/shield sources and regenerates resources, P5 settles roots, P6 confirms pending deaths, P9 exposes an empty ordinary Observation plus a separately owned debug result. Only completed boundaries are published; faults freeze the runtime and retain the prior complete boundary.

Hooks are data, never callbacks. Pre hooks at D4 may cancel, scale or replace; Post hooks may derive Effects only after a committed leaf; ordinary rejected attempts have no Post hook. Explicit Ruleset `maxHookDepth` is semantic finite fuel: hooks at the exhausted depth are ineligible. Replacement additionally cannot reuse the same hook instance in its replacement chain. Trigger counters are root + hook instance + target, with declared per-root fuel. Exhaustion is a declared rule outcome, recorded in diagnostics; it is not silently dropping a legal Hook. Compiled bounds conservatively assume all eligible Hook/Modifier combinations and all branches coexist. Invalid/unbounded content is rejected before opening a Session.

The certificate binds compiler/engine/content/Ruleset/Tick/envelopes. It sums every producer's simultaneous roots and P0/P6 maintenance, and independently proves interpreter, Hook, query, formula, scan and Fact work. Fault ceilings are next powers of two, and profile must cover every ceiling. No probabilistic discount or runtime truncation is permitted.

Resource and status owners commit their own components through runtime dispatch. Combat computes a pure D0–D9 plan, then atomically commits shield, resource, HP and death-save consumption. Attributes refresh before the next Operation. Raw Fact/breakdown and debug snapshots are unavailable to presentation/controllers; the application must explicitly own the headless debug port.

The M2 vocabulary includes ordinary Health/resources, shield absorption, additive/percent/multiplicative/override/conversion attribute contributions, status lifecycle/control entry points, regeneration, period/end producers and one-use lethal protection. ExtraHealthLayer, general ResourceRoute, reservations/refunds, dispel categories, resurrection, rewards and Information policy are explicitly unsupported; schemas reject unsupported fields instead of interpreting them incorrectly. They remain separate future extensions and are not formal hero implementations.

M1 A/default, B/experimental, C/untriggered and 30 Hz provisional baseline remain unchanged. Same-build floating-point replay guarantee remains ADR 007; no cross-engine bitwise guarantee is introduced.

Attribute trace caches invalidate on status version changes; cache state is neither authority nor hash input. FactQueue has one synchronous non-reentrant diagnostic consumer (occupancy <=1). Every Fact is generated and consumed exactly once. Full archives retain every record; summary archives retain all kind counts and the latest 2000 raw records. Archive choice does not change settlement/hash and is reported explicitly. This is no M4 Information or M5 persisted replay implementation.

Module ownership: contracts contain DTO/schema vocabulary/certificates; content validates and compiles; foundation owns canonical data/hash/checked work arithmetic; simulation features own their components, shared owns numeric formulas, kernel owns guards/Fact delivery, runtime coordinates feature owners; application creates Session and explicitly owns the debug port. Presentation/controllers may not import raw combat/debug contracts, including via namespace or import-type expressions.

Damage Facts retain each numeric formula AST node at Operation time, the referenced attribute and its transitive DAG ancestors (six bucket stages each), and source/target Modifier contributors. This diagnostic traversal is statically bounded and charged as non-Operation scan work. Attribute conversions evaluate in the owning entity's context; source/target labels in a conversion refer to that same owner. Effect formulas distinguish actual Operation source and target.

The current damage vocabulary applies the raw formula, explicit Pre scale/cancel/replace, effective target armor/MR, standard shields and one-use death-save. D2 outgoing, D3 cap and D6 incoming are identity stages when no supported contribution is declared. Separate attacker penetration fields, pre/post mitigation caps, lifesteal/attribution/reward policies are not runtime content features yet; the central penetration/cooldown functions have pure unit tests, without claiming equipment or Action cooldown owners. Unsupported fields are schema-rejected.


0.3.1 repair (ADR 023): the 0.3.0 scan proof was incomplete. Definition/Entity/attribute-trace indexes are private and never alter contentHash or authority ordering. All dynamic collection passes use element-read accounting; lookups and structure have separate finite certificates, including startup and command scopes. Guard begin binds producer.provenEffects before root registration. Immutable diagnostic participant copies prevent later eligible Hooks from mutating an already published Fact. Detailed model and fixed-work bounds: docs/M2_WORK_ACCOUNTING.md. Compiler m2-indexed-v2 /profile m2-headless-v2. All 11 candidate software gates were rerun and passed (98 tests); final M2 closure awaits independent review. No M3 or main push.

## 后续状态说明（2026-10-02）

用户已确认 M2 0.3.1 完成独立源码复核并正式推送 althanor/moba main c57fa8caadb2afc2eb98d85246e156d76e942949，软件出口 PASS、对应 Actions/Pages 全绿。以上候选/等待复核/不进入 M3 描述作为历史记录保留；M3 已获本轮明确授权，软件候选见 M3_TEST_REPORT.md，Android 真机门禁见 M3_ACCEPTANCE.md。原 M2 极限 fixture、索引与计账证明继续作为不可削弱的回归。
<!-- historical/superseded:end -->
