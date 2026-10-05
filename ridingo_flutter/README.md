# Ridingo Flutter Mobile Apps Suite

Complete Flutter rewrite of the Ridingo car owner chauffeur booking platform, mirroring the original design, aesthetics, and workflow using **Flutter Riverpod** state management and **Supabase Realtime**.

---

## 📁 Repository Structure

```
ridingo_flutter/
├── ridingo_user/                  # Ridingo Rider / Customer Flutter App
│   ├── pubspec.yaml
│   ├── lib/
│   │   ├── main.dart             # App Entry & Session Router
│   │   ├── config/
│   │   │   └── app_theme.dart    # Ridingo Yellow (#FFC70A), Dark/Light Themes
│   │   ├── models/
│   │   │   ├── user_model.dart   # Profile, Car, Settings & Preferences
│   │   │   ├── trip_model.dart   # Bookings, Advance, Status, Driver info
│   │   │   └── wallet_tx_model.dart # Digital wallet credits & debits
│   │   ├── services/
│   │   │   └── supabase_service.dart # Realtime Postgres synchronization
│   │   ├── providers/
│   │   │   ├── auth_provider.dart    # Persistent login, unique registration, OTP
│   │   │   ├── trip_provider.dart    # 30% advance booking & cancel refunds
│   │   │   ├── wallet_provider.dart  # Instant balance & top-ups
│   │   │   └── theme_provider.dart   # Light, Dark, and System theme
│   │   └── screens/
│   │       ├── main_screen.dart      # Bottom Navigation Container (4 Tabs)
│   │       ├── onboarding/           # 3-slide carousel, Login & Register modal
│   │       ├── home/                 # Bento Grid, Active Ride, Reviews slider
│   │       ├── trips/                # Trips history with filter chips
│   │       ├── wallet/               # Digital card & Add money sheet
│   │       ├── profile/              # Avatar picker, Vehicle plate, SOS, Nominee
│   │       └── booking/              # Category picker, 30% advance breakdown
│
└── ridingo_driver/                # Ridingo Driver Partner Flutter App
    ├── pubspec.yaml
    ├── lib/
    │   ├── main.dart             # Driver App Entry
    │   ├── config/
    │   │   └── app_theme.dart    # Sleek Driver Dark Theme
    │   ├── models/
    │   │   └── driver_model.dart # Driver metrics, vehicle compatibility
    │   ├── services/
    │   │   └── driver_supabase_service.dart # Live incoming trip subscriptions
    │   ├── providers/
    │   │   └── driver_provider.dart         # Online/offline toggle, Accept/Start/Complete
    │   └── screens/
    │       ├── main_driver_screen.dart      # Driver Bottom Navigation
    │       ├── home/                        # Online glow toggle, Requests feed
    │       ├── earnings/                    # Daily payouts & instant withdrawal
    │       └── profile/                     # Verification badge & transmission prefs
```

---

## 🚀 Running the Apps

### 1. Prerequisites
Ensure you have the Flutter SDK (>= 3.3.0) installed on your system.

### 2. Run Ridingo User App
```bash
cd ridingo_flutter/ridingo_user
flutter pub get
flutter run
```

### 3. Run Ridingo Driver App
```bash
cd ridingo_flutter/ridingo_driver
flutter pub get
flutter run
```

---

## 📦 Building Native Packages

### Android APK:
```bash
# User App:
cd ridingo_flutter/ridingo_user && flutter build apk --release

# Driver App:
cd ridingo_flutter/ridingo_driver && flutter build apk --release
```

### iOS IPA (macOS):
```bash
# User App:
cd ridingo_flutter/ridingo_user && flutter build ipa --no-codesign

# Driver App:
cd ridingo_flutter/ridingo_driver && flutter build ipa --no-codesign
```

---

## ✨ Features Implemented in Flutter
- **Exact UI & Design**: Custom HSL tokens, Ridingo Yellow (`#FFC70A`), rounded bento cards, reviews slider, and Cupertino/Material hybrid styling.
- **Riverpod State Management**: Fully decoupled UI and reactive state with `StateNotifier` and auto-disposing streams.
- **Supabase Realtime**: Live updates between User booking and Driver trip dispatch.
- **User Isolation & Persistence**: Scoped session storage with complete state wipe on logout.
