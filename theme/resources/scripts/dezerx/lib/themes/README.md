# Vendored Monaco themes

`night-owl.json` and `github-light.json` are copied verbatim from
[monaco-themes](https://github.com/brijeshb42/monaco-themes) (MIT, © Brijesh Bittu),
which ships them under `themes/` but does not list that directory in its `exports`
field — webpack 5 honours `exports` and refuses the import, so the two files the
panel actually uses live here instead of pulling the package in at runtime.

They are already in Monaco's `IStandaloneThemeData` shape and are consumed by
`@/dezerx/lib/monaco`, which restates the chrome colours so the editor sits flush
against the panel surface. Token colouring is otherwise untouched.

To refresh them, copy the originals again rather than editing in place.
