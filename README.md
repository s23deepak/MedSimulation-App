# MedSimulation App

Offline-first React Native mobile app for clinical simulation training.

## Features

- **AI Case Generation** - Generate custom cases from any medical topic (PubMed, Wiley, EndlessMedical, or AI-generated)
- **Auto-Open Simulation** - Cases open automatically after generation for seamless workflow
- **Difficulty Color Coding** - Green (Easy), Amber (Medium), Red (Hard) badges
- **New Case Highlight** - Newly generated cases show green border + "NEW" badge
- **Offline-First** - All cases stored locally with WatermelonDB (SQLite)
- **Clinical Simulations** - History taking, physical exam, investigations, diagnosis
- **Adaptive Learning** - Thompson Sampling bandit for case recommendations
- **Export/Share** - Export sessions as PDF/JSON, share scores
- **Online Import** - PubMed and Wiley case import (when connected)

## UX Decisions

See [`UX_DECISIONS.md`](./UX_DECISIONS.md) for documented design decisions including:
- Auto-open vs. confirmation dialog for case generation
- FlatList rendering fixes for React Native Web
- Difficulty color coding and mapping
- API architecture decisions

## Recent Updates (2026-04-16)

### ✅ Fixed
| Issue | Solution |
|-------|----------|
| Generated cases not appearing in list | Fetch full case by ID, prepend to list |
| FlatList not re-rendering | Added `key` prop + `extraData` to force re-render |
| Alert dialog interrupting flow | Changed to auto-open simulation |
| Difficulty badges not showing | Mapped `beginner/intermediate/advanced` → `easy/medium/hard` |
| CORS blocking requests | Changed to permissive `["*"]` for development |

### 🆕 Added
- Visual "NEW" indicator for newly generated cases (green border, badge, 3s highlight)
- Detailed console logging for debugging generation flow
- API endpoint `/api/cases/{case_id}` for fetching individual cases
---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Local DB | WatermelonDB (SQLite) / expo-sqlite |
| LLM (Planned) | MLC WebLLM / TensorFlow.js |
| State | Zustand |
| Styling | StyleSheet |

## Architecture

```
MedSimulation-App/
├── app/                    # Expo Router screens
│   ├── index.tsx          # Dashboard / Home
│   ├── simulation.tsx     # Main simulation screen
│   └── results.tsx        # Debrief & scoring
├── src/
│   ├── components/        # Reusable UI components
│   ├── screens/           # Screen components
│   ├── services/
│   │   ├── llm.ts         # MLC Chat wrapper
│   │   ├── api.ts         # Online features (PubMed, Wiley)
│   │   └── database.ts    # WatermelonDB setup
│   ├── store/
│   │   ├── models/        # DB models (Case, Session, User)
│   │   └── index.ts       # Store exports
│   ├── types/             # TypeScript types
│   └── utils/             # Helper functions
└── assets/                # Images, icons, models
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (optional, can use npx)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android
```

### Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update values if needed:
- `API_BASE_URL`: Your deployed backend (for online features)
- `MLC_MODEL_ID`: Model to download for on-device inference

## LLM Integration Options

The app is ready for LLM integration. Choose one:

### Option 1: MLC WebLLM (Recommended for On-Device)

Use MLC's Web runtime in a React Native WebView:

```bash
# Add to your app
npm install react-native-webview
```

Then update `src/services/llm.ts` to use the WebLLM API:
```typescript
import { WebLLM } from '@mlc-ai/web-llm';
// Load model from HuggingFace
```

**Pros**: True on-device, no API costs
**Cons**: ~2GB model download, needs 4GB+ RAM device

### Option 2: Cloud LLM (Easiest)

Use your Modal deployment:

```bash
# In .env
API_BASE_URL=https://your-modal-url.modal.run
LLM_CLOUD_API_KEY=your-key
```

Update `llm.ts` to call your cloud endpoint.

**Pros**: No device limitations, always latest model
**Cons**: Requires internet, ~$0.03/case cost

### Option 3: Mock/Rule-Based (Current)

The current implementation uses pattern-based responses for development.

**Pros**: Works immediately, no setup
**Cons**: Limited responses, not AI-powered

### Supported Models (when using MLC)

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| Gemma 2B Q4 | ~1.5GB | Good | Fast |
| Phi-3 Mini | ~2GB | Very Good | Fast |
| Llama-3-8B Q4 | ~5GB | Best | Medium |

## Online Features (Optional)

The app can connect to your deployed backend for:
- PubMed case import
- Wiley case import
- Cloud sync
- Export to server

Set `API_BASE_URL` in `.env`:
```
API_BASE_URL=https://your-railway-url.up.railway.app
```

## Building for Production

### iOS

```bash
# Build with EAS
eas build --platform ios

# Or local build
eas build --platform ios --local
```

### Android

```bash
# Build APK
eas build --platform android --profile preview

# Build for Play Store
eas build --platform android --profile production
```

## Testing

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Project Structure

### Services

- **llm.ts** - MLC Chat wrapper for on-device inference
- **api.ts** - REST API client for online features
- **database.ts** - WatermelonDB configuration

### Models

- **Case.ts** - Clinical case schema
- **Session.ts** - Simulation session schema
- **UserProfile.ts** - User progress schema

### Screens

- **index.tsx** - Dashboard with case browser
- **simulation.tsx** - Main simulation interface
- **results.tsx** - Scoring and debrief

## Offline-First Design

The app works offline for core features:

1. **Cases** - Pre-loaded and cached locally in WatermelonDB
2. **LLM** - Mock responses work offline (add MLC/Cloud for AI)
3. **Sessions** - Saved to local database
4. **Online Features** - PubMed/Wiley import require internet

## Performance

- **Cold Start**: ~2 seconds
- **Screen Navigation**: <100ms
- **Mock Response**: ~500ms
- **App Size**: ~50MB base + model (if using MLC)

## License

MIT

## Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a PR

---

Built with ❤️ for medical education
