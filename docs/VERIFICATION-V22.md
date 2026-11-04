# V22 verification
## Locally verified (headless Chrome, software WebGL, local server)
- Landing 1920x1080, 1440x900, 390x844, 844x390: video plays/loops (desktop WELCOME.mp4, phones welcome-720.mp4), not restarted by submit, no horizontal scroll, no console errors; frames at 0/3/6/9 s checked.
- Validation (empty, bad phone), personalised reveal, Rs 25,000.
- Enter -> game.html?fromInvite=1: old shell (hero, header, #enter, #enterBtn, #startBtn) never visible; stage full-viewport on black; intro plays; auto-start after intro/skip.
- Game (test build of the same src/game.js, ?fromInvite=1, desktop and 390x844): entry fee Rs 2,500, then gate balances 22,500 / 16,500 / 11,500 / 7,000 / 4,000 -> 0; summit + receipt; restart resets to Rs 25,000. Mobile joystick moves the player.
- Audio: context suspended until first tap in invite mode ("Tap anywhere for sound" hint), then running; BGM ok.
- Without ?fromInvite=1, game.html behaves exactly as V20f (old shell present) - direct visits to /game.html still show it.
## NOT verified on a real device
Real iPhone/Android: autoplay, sound unlock, fullscreen, keyboard, joystick feel, performance, battery; real Netlify deploy.
