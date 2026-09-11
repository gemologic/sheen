# Changesets

Every pull request carries one reviewed Changeset. Run `pnpm changeset`, select the affected public packages, choose the SemVer impact, and write consumer-facing release notes. Use `pnpm changeset --empty` when a pull request changes only tests, internal tooling, or documentation and has no package release impact.

All public Sheen packages intentionally share one fixed version line. Package splitting protects dependency and bundle boundaries; it does not ask consumers to reason about ten unrelated release numbers.

Merging ordinary work updates an automated version pull request. That workflow does not publish, create tags, or create GitHub releases. The separate manual publication workflow rebuilds and tests, hands exact hashed tarballs across a protected GitHub environment, and supports only the one-time token bootstrap or ongoing npm OIDC staging described in `docs/releases.md`.
