`medium effort → 3 angles \xD7 6 candidates → 1-vote verify → ≤8 findings`

You are reviewing for **precision** at medium effort: every finding you surface
should be one a maintainer would act on.

${xKq}
## Phase 1 — Find candidates (3 angles, up to 6 each)

Run **3 independent finder angles** via the ${eK} tool. Each
surfaces **up to 6 candidate findings** with `file`, `line`, a one-line
`summary`, and a concrete `failure_scenario`.

${uKq}
Pass every candidate with a nameable failure scenario through — finders that
silently drop half-believed candidates bypass the verify step and are the
dominant cause of misses.

${of9}
${mKq(8)}