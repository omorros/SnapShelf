# SnapShelf mobile app

The SnapShelf app: React Native 0.81 with Expo SDK 54, Expo Router and TypeScript.

## Run it

Start the [API](../api/) first, then:

```bash
cd mobile
npm install --legacy-peer-deps
cp .env.example .env      # EXPO_PUBLIC_API_URL, defaults to http://localhost:8000
npx expo start
```

Press `i` for the iOS Simulator or `a` for an Android emulator. On a physical phone, set
`EXPO_PUBLIC_API_URL` to your computer's LAN IP (for example `http://192.168.1.20:8000`) so the
phone can reach the API.

Type-check with `npx tsc --noEmit`.

## Screens

| Screen | What you can do |
|---|---|
| Login, Register | Create an account or sign in; the token is kept in SecureStore |
| Inventory | Everything you have, sorted by expiry, with expired and expiring-soon counts, search, category and status filters, and pull to refresh. Tap an item to edit it, mark part of it as used (25, 50, 75% or all) or delete it. Swipe right to edit, left to delete |
| Add food | Scan a photo (camera or gallery), scan a barcode, or add by hand. Photos are resized to 1024 px before upload |
| Review items | Each item the AI found, with a predicted expiry: confirm, edit or skip one by one, or add all |
| Recipes | Smart mode builds recipes around what expires soonest; Pick Items mode uses ingredients you choose. Set time and servings |
| Saved recipes | Recipes you bookmarked |
| Settings | Account details and log out |

## Design

A warm, food-friendly palette in `theme/index.ts`: sage `#7C9A82`, terracotta `#D4846B` and
cream `#FAF8F5`, with Georgia for titles. Expiry status uses four colours (expired, expiring soon,
approaching, fresh), and each food category has its own colour and icon.

## Layout

```
mobile/
├── app/
│   ├── (auth)/          login, register
│   ├── (tabs)/          inventory, recipes, settings
│   ├── add-item.tsx     photo, barcode and manual entry, then review
│   └── saved-recipes.tsx
├── components/
│   ├── add-item/        detected list, edit modal, manual form, barcode scanner
│   ├── inventory/       header with status counts, filters, swipeable item card
│   └── ui/              buttons, cards, inputs, bottom sheet
├── services/            API client and auth context
├── theme/               colours, typography, spacing
├── types/
└── utils/               merging duplicate items, unit conversion
```
