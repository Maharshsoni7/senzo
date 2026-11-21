---
paths:
  - "apps/guest/**"
  - "apps/chef/**"
  - "packages/ui/**"
---

# Mobile rules (Expo SDK 58, React Native 0.88)

- Routes are files under `app/` (Expo Router). Route names and paths: see `docs/screens.md`. Deep links: `senzo://` and `https://<domain>/chef/<slug>`.
- Server data only through TanStack Query hooks built on `packages/api-client`; cache persisted to MMKV. Local UI state (booking draft, filters, menu choices) in Zustand. Tokens only in `expo-secure-store`.
- Prices on screen always come from `POST /quotes` or the booking — never calculate a final price in the app.
- Every data screen handles loading (skeleton), empty, error (retry + help) and offline (cached data + banner). Chef job screens (request, on my way, start, cooking, finish, no-show) must open offline from cache; queue offline actions and retry.
- Forms: react-hook-form + zod schemas from `packages/schemas`.
- Lists: FlashList. Images: expo-image with blur placeholders. Illustrations: `ChefFig`, `DishArt`, `KitchenBg` from `packages/ui` (react-native-svg).
- **No maps, no MapView, no background location.** Address entry = Places autocomplete via our API + "use my current location" (one foreground read). Chef location is read once at the start OTP.
- Razorpay React Native SDK needs a development build (not Expo Go). Treat the SDK success callback as "pending" until the API confirms.
- All strings through i18next (`en`, `gu`, `hi`); no hard-coded copy. Format money with the shared `formatINR(paise)`.
- Accessibility: touch targets ≥ 44 pt, `accessibilityLabel` on icon buttons, text contrast 4.5:1, support font scaling.
- Performance: cold start < 2 s on a ₹10,000 Android phone; avoid heavy work on mount; memoise rail items.
- Design tokens from `design/tokens.json` (via `packages/ui/theme`); match the mockup in `design/mockups/<ID>-*.dc.html` except the fixes listed in `docs/screens.md`.
- Use the Expo MCP server (if connected) to look up Expo docs and add libraries with `npx expo install` for compatible versions.
