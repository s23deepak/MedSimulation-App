# MedSimulation App

Offline-first React Native mobile app for clinical simulation training.

## Features

- **On-Device AI Patient** - Powered by MLC Chat with Gemma 2B model (no internet required for inference)
- **Offline-First** - All cases stored locally with WatermelonDB
- **Clinical Simulations** - History taking, physical exam, investigations, diagnosis
- **Adaptive Learning** - Thompson Sampling bandit for case recommendations
- **Export/Share** - Export sessions as PDF/JSON, share scores

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Local DB | WatermelonDB (SQLite) |
| On-device LLM | MLC Chat (TVM) |
| State | Zustand |
| Styling | StyleSheet (no Tailwind) |

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

## On-Device LLM Setup

The app uses MLC Chat for local inference:

1. **First Launch**: App downloads the model (~2GB)
2. **Subsequent Launches**: Model cached locally
3. **No Internet**: Inference works completely offline

### Supported Models

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| Gemma 2B Q4 | ~1.5GB | Good | Fast |
| Phi-3 Mini | ~2GB | Very Good | Fast |
| Llama-3-8B Q4 | ~5GB | Best | Medium |

Configure in `.env`:
```
MLC_MODEL_ID=google/gemma-2b-it-q4f16_1-MLC
```

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

The app works 100% offline:

1. **Cases** - Pre-loaded and cached locally
2. **LLM** - On-device inference via MLC
3. **Sessions** - Saved to local database
4. **Sync** - Optional cloud sync when online

## Performance

- **Cold Start**: ~2 seconds
- **Model Load**: ~30 seconds (first time only)
- **Inference**: ~1-2 seconds per response
- **App Size**: ~50MB (without model)

## License

MIT

## Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a PR

---

Built with ❤️ for medical education
