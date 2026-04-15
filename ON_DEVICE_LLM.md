# On-Device MedGemma 4B Implementation Plan

## Overview

This document outlines the approach for running MedGemma 4B completely on-device in the React Native app.

## Architecture Options

### Option 1: MLC WebLLM via WebView (Recommended)

**How it works:**
- MLC WebLLM runs in a React Native WebView
- Downloads quantized MedGemma 4B model (~2-3GB)
- Full on-device inference, no internet needed after download

**Pros:**
- True on-device, works 100% offline
- MLC handles WebGPU/Metal/Vulkan acceleration
- Actively maintained, good Gemma support
- No native module compilation needed

**Cons:**
- 2-3GB initial download
- Requires 4GB+ RAM device
- First load takes 1-2 minutes

**Implementation:**
```typescript
// WebView-based MLC Chat component
import { WebView } from 'react-native-webview';

const MLC_CHAT_HTML = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm"></script>
</head>
<body>
  <script>
    const chat = new webllm.ChatModule();
    chat.reload('MedGemma-4B-q4f16_1-MLC');
    
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'ready'
    }));
    
    window.handleChat = async (message) => {
      const response = await chat.generate(message);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'response',
        content: response
      }));
    };
  </script>
</body>
</html>
`;
```

**Model Requirements:**
- MedGemma 4B needs to be compiled to MLC format
- Upload to HuggingFace as `your-username/MedGemma-4B-q4f16_1-MLC`

---

### Option 2: @mlc-ai/web-llm Node Package (Future)

When MLC releases official React Native support:

```bash
npm install @mlc-ai/web-llm
```

```typescript
import { ChatModule } from '@mlc-ai/web-llm';

const chat = new ChatModule();
await chat.reload('MedGemma-4B-q4f16_1-MLC');
const response = await chat.generate('Hello');
```

---

### Option 3: ExecuTorch (PyTorch Mobile)

**How it works:**
- Convert MedGemma to ExecuTorch format
- Use react-native-executorch package

**Pros:**
- Native performance
- First-party Meta support

**Cons:**
- Requires native module compilation
- Complex build setup
- Less mature ecosystem

---

## Recommended Implementation Path

### Phase 1: Current (Mock Mode) ✅
- Pattern-based responses
- Works immediately, no setup
- Good for development

### Phase 2: Local Backend (Ready Now)
- Connect to MedSimulation FastAPI server
- Server runs vLLM with MedGemma 4B
- App works on same WiFi network

**Setup:**
```bash
# On your computer
cd MedSimulation
bash scripts/start_vllm.sh  # Starts vLLM with MedGemma 4B
python main.py --host 0.0.0.0 --port 8000
```

```bash
# In MedSimulation-App
cp .env.example .env
LLM_MODE=local
LOCAL_BACKEND_URL=http://192.168.x.x:8000  # Your computer's IP
```

### Phase 3: True On-Device (MLC WebLLM)

**Step 1: Convert MedGemma to MLC format**

```bash
# On a machine with GPU
pip install mlc-llm mlc-ai

# Convert MedGemma weights
mlc_llm convert_weight \
  google/medgemma-4b-it \
  --quantization q4f16_1 \
  -o MedGemma-4B-q4f16_1-MLC

# Generate config
mlc_llm gen_config \
  MedGemma-4B-q4f16_1-MLC \
  --quantization q4f16_1 \
  --device metal  # or cuda, vulkan

# Compile for target device
mlc_llm compile \
  MedGemma-4B-q4f16_1-MLC/mtj_model.json \
  --device metal \
  -o dist/MedGemma-4B-MLC
```

**Step 2: Upload to HuggingFace**

```bash
# Upload compiled model
huggingface-cli upload your-username/MedGemma-4B-q4f16_1-MLC ./dist/MedGemma-4B-MLC
```

**Step 3: Update app config**

```typescript
// In llm.ts, switch to MLC mode
const config: LLMConfig = {
  mode: 'mlc',
  mlcModelId: 'your-username/MedGemma-4B-q4f16_1-MLC',
  mlcModelUrl: 'https://huggingface.co/your-username/MedGemma-4B-q4f16_1-MLC',
};
```

---

## Model Size & Performance

| Model | Quantized Size | RAM Required | Inference Speed |
|-------|---------------|--------------|-----------------|
| Gemma 2B Q4 | ~1.5GB | 3GB | ~15 tokens/s |
| MedGemma 4B Q4 | ~2.5GB | 4GB | ~10 tokens/s |
| Gemma 7B Q4 | ~5GB | 8GB | ~5 tokens/s |

**Target devices:**
- iPhone 12+ (6GB RAM) - runs all models
- Android flagship 2022+ (8GB RAM) - runs all models
- Android mid-range (4-6GB RAM) - 2B/4B models only

---

## Current Status

- ✅ Mock mode working
- ✅ Local backend support ready
- ⏳ MLC WebLLM integration pending model conversion
- ⏳ Native module support pending MLC RN package

---

## Next Steps

1. **For local testing:** Use Phase 2 (local backend)
   - Start vLLM server on your computer
   - Set `LLM_MODE=local` in app
   - Test full MedGemma 4B capabilities

2. **For true on-device:** Wait for MLC RN support OR build custom WebView solution
   - Convert MedGemma to MLC format
   - Host on HuggingFace
   - Integrate WebView-based MLC component
