# Vasool Babu Birthday
- `site/` = production package (V20e, embedded character models). `src/` = build inputs (python3 src/build.py needs three.js in lib/ - see QA notes).
- Branches: `staging` -> auto branch deploy (staging--revanthreddybirthday.netlify.app). `main` = production: keep Netlify "Auto publish" OFF (Deploys > Stop auto publishing) so each production deploy is built but only goes live when the owner clicks "Publish deploy".
- Flow: push verified update to `staging` -> verify staging URL (?diag=1 shows 5x rigged-human src=embedded-gzip) -> owner approves -> merge to `main` -> owner publishes deploy.
