# Font sources

## Inter

`InterVariable.woff2` is the unmodified upright variable font from [rsms/inter v4.1](https://github.com/rsms/inter/releases/tag/v4.1), commit `e3a3d4c57d5ecc01453a575621882a384c1995a3`, path `docs/font-files/InterVariable.woff2`. It supports weights 100–900 and optical sizes 14–32, including Studio's 510/590 roles. The 352,240-byte full font preserves upstream language coverage. It is loaded locally only when used; no font service is required.

SHA-256: `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3`.

The unmodified SIL Open Font License 1.1 is retained as `Inter-LICENSE.txt`, SHA-256 `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a`.

## IBM Plex

These unmodified WOFF2 files come from IBM's official `IBM/plex` repository at commit `bf260093582f04622aacc1e9f9ca604d7ccd0c42`:

- `packages/plex-sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2`
- `packages/plex-sans/fonts/complete/woff2/IBMPlexSans-SemiBold.woff2`
- `packages/plex-mono/fonts/complete/woff2/IBMPlexMono-Regular.woff2`

The selected static faces cover Sheen's 400 and 600 token weights without shipping the larger variable-font payload. Their SHA-256 digests are:

```text
ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a  IBMPlexSans-Regular.woff2
f78048030eab62e860efa39a0df79e2e5581bf122eb95b9bc42c0b8a4988d205  IBMPlexSans-SemiBold.woff2
ba204497f16b6d334cee9d1e963a831b73e3a56e1d6300a8489d18df7214b350  IBMPlexMono-Regular.woff2
```

IBM Plex is distributed under the SIL Open Font License 1.1. The upstream license is included as `LICENSE.txt`.
