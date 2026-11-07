# MarketGenius AI v2.2.2 — Auto Product Images

Full Node.js source for hosting on Tenten cPanel. This patch addresses missing product pictures in campaign cards by trying a dedicated Google Image Search grounding tool when the Gemini key is entitled, optional Serper image search, publisher page meta/JSON-LD images, and signed same-origin image fallback when hotlinking fails. It does **not** guarantee an image if all upstream sources are inaccessible.

**Install:** Extract in your existing `marketgenius-ai` Node app directory and restart the Node app. Do not overwrite your cPanel environment variables. No npm dependencies. Full instructions in `HUONG_DAN_CAP_NHAT_v2.2.2.md`.

Server-side settings: `GUEST_GEMINI_API_KEY`, `GUEST_GEMINI_MODEL`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`; optional `MEDIA_GEMINI_IMAGE_SEARCH`, `MEDIA_GEMINI_IMAGE_MODEL`, `SERPER_API_KEY`, `IMAGE_PROXY_SECRET`.

The same product research resources are attached to five ideas and reused in Shortlist/History/PDF. Actual user data and source licenses are still distinct. Never trust or redistribute images commercially without checking rights.
