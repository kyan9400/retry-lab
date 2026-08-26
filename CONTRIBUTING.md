# Contributing

1. Fork the repository and create a focused branch.
2. Run `corepack enable` and `pnpm install`.
3. Keep simulation rules pure and seeded.
4. Run `pnpm lint`, `pnpm test`, and `pnpm build`.
5. Open a pull request explaining the model change and its verification.

Behavior changes should include tests and an update to the simulation assumptions in the README. Avoid adding chart libraries for visualizations that can remain small, accessible SVG components.
