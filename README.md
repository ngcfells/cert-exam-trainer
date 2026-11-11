# Content hashes

This branch holds the official SHA-512/256 hashes of the content that Cert Exam Trainer ships: every stock
question, every lesson and each exam's details. `content-hashes.json` is written by `npm run deploy` on the main
branch, after the owner confirms the list of changed items. Nothing here is edited by hand.

The app's "Check content" button (Settings) compares its own content with this file. `current` is the newest
release, with one hash per item; `history` lists earlier releases, newest first.

Only the repository owner may change this branch.
