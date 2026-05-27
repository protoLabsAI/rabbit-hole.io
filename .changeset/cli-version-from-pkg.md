---
"@protolabsai/rabbit-hole-cli": patch
---

fix(cli): report the real version in `rh --version`. It was a hardcoded `0.1.0` string that drifted behind package.json on every release (published 0.1.1 still printed 0.1.0); now read from package.json so it always matches the published package.
