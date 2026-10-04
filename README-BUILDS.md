# Ridingo Production Mobile Build Suite (iOS & Android)

This repository is configured to build **4 separate, non-conflicting native mobile production packages** for the **Ridingo User App** and **Ridingo Driver App**.

---

## 1. App Identification & Bundling Matrix

| Application | Platform | Package File Name | Application ID / Bundle Identifier | App Name | Entry Point |
|---|---|---|---|---|---|
| **User App** | **Android** | `Ridingo-User.apk` | `com.ridingo.user` | **Ridingo** | Mounts User UI full-screen |
| **User App** | **iOS** | `Ridingo-User.ipa` | `com.ridingo.user` | **Ridingo** | Mounts User UI full-screen |
| **Driver App** | **Android** | `Ridingo-Driver.apk` | `com.ridingo.driver` | **Ridingo Driver** | Mounts Driver UI full-screen |
| **Driver App** | **iOS** | `Ridingo-Driver.ipa` | `com.ridingo.driver` | **Ridingo Driver** | Mounts Driver UI full-screen |

---

## 2. Clean Native Production UI Features

- **No Simulated Device Frames**: All browser headers, simulated iPhone bezels, dynamic island cutouts, and status bar clock/battery mockups are stripped in native production mode.
- **Safe Area Insets**: Uses standard CSS `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to conform to device notches, dynamic islands, and home indicator bars.
- **Top Status Bar Backing Container**: A fixed status bar backing header container prevents scrolled page content from bleeding behind the native iOS or Android status bar.
- **Non-Conflicting Bundle Identifiers**: The User and Driver apps use distinct package names (`com.ridingo.user` and `com.ridingo.driver`), allowing both to be installed side-by-side on the same device without collision.

---

## 3. Instant Browser Standalone Previews

You can test either app in full-screen native standalone mode right in your browser:

- **User App Standalone**: [http://localhost:5173/?app=user](http://localhost:5173/?app=user)
- **Driver App Standalone**: [http://localhost:5173/?app=driver](http://localhost:5173/?app=driver)
- **Interactive Dual Demo Mode**: [http://localhost:5173/](http://localhost:5173/)

---

## 4. Local Build Commands

Ensure dependencies are installed:
```bash
npm install
```

### Build Web Distributions
Compiles `dist/user/index.html` and `dist/driver/index.html`:
```bash
npm run build:web
```

### Build Android Packages
Generates Android APKs in `build-outputs/`:
```bash
# Build User App APK
npm run build:android:user    # Outputs: build-outputs/Ridingo-User.apk

# Build Driver App APK
npm run build:android:driver  # Outputs: build-outputs/Ridingo-Driver.apk
```

### Build iOS Packages
Generates iOS IPAs in `build-outputs/`:
```bash
# Build User App IPA (macOS with Xcode)
npm run build:ios:user        # Outputs: build-outputs/Ridingo-User.ipa

# Build Driver App IPA (macOS with Xcode)
npm run build:ios:driver      # Outputs: build-outputs/Ridingo-Driver.ipa
```

---

## 5. Automated GitHub Actions CI/CD Pipeline

The repository includes a ready-to-run GitHub Actions workflow located at [`.github/workflows/build-mobile.yml`](.github/workflows/build-mobile.yml):

- **Automatic Trigger**: Triggers automatically on push/merge to `main` or via **Run workflow** in the GitHub Actions tab.
- **Parallel Builds**:
  - `build-android` (Ubuntu runner with Java 17 + Android SDK) builds `Ridingo-User.apk` and `Ridingo-Driver.apk`.
  - `build-ios` (macOS runner with Xcode) builds `Ridingo-User.ipa` and `Ridingo-Driver.ipa`.
- **Downloadable Artifacts**:
  - All 4 packages are uploaded to GitHub Actions artifacts and can be downloaded immediately with a single click.
