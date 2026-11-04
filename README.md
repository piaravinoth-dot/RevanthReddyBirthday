# Vasool Babu Birthday
- `site/` = production package (V20e, embedded character models). `src/` = build inputs (python3 src/build.py needs three.js in lib/ - see QA notes).
- Branches: `staging` -> auto branch deploy (staging--revanthreddybirthday.netlify.app). `main` = production: keep Netlify "Auto publish" OFF (Deploys > Stop auto publishing) so each production deploy is built but only goes live when the owner clicks "Publish deploy".
- Flow: push verified update to `staging` -> verify staging URL (?diag=1 shows 5x rigged-human src=embedded-gzip) -> owner approves -> merge to `main` -> owner publishes deploy.
- Staging deploy test: automatic branch deploy check.

## V22 (staging)
- `site/index.html` = fullscreen-video invitation landing page; `site/game.html` = the V20f game, opened from the landing page as `game.html?fromInvite=1` (invitation-entry mode: no promo shell, no second Enter/Start screen). Without the flag the page behaves as V20f.
- `python3 src/build.py` writes `src/game.html` (same bytes as `netlify-index.html`); copy it to `site/game.html`. Invitation mode is part of `src/game.js` + `src/part_head.html`, so rebuilds keep it.
- `rollback/game.v20f.original.html` is the exact approved V20f page (SHA-256 b9c6ecb0fab53f5ed1c35e713fb4e78865a5f0720d3aad012cb1b6ac4c0a5684). Verification notes: `docs/VERIFICATION-V22.md`.
- Video rights are unconfirmed: staging preview only (pages carry noindex).
