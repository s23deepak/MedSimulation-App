/**
 * MLC Chat WebView Component
 *
 * Embeds MLC WebLLM in a WebView for true on-device inference.
 * Supports MedGemma 4B and other MLC-compatible models.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { WebViewMessageEvent } from 'react-native-webview';

export interface MLCChatConfig {
  modelId: string;
  modelUrl?: string;
  systemPrompt?: string;
}

export interface MLCChatViewProps {
  config: MLCChatConfig;
  onReady?: () => void;
  onResponse?: (response: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

interface WebViewMessage {
  type: 'ready' | 'response' | 'error' | 'progress';
  content?: string;
  error?: string;
  progress?: number;
}

const MLC_WEBVIEW_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MLC Chat</title>
  <script src="https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@latest/dist/index.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
      color: #fff;
      font-family: system-ui;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    #status {
      text-align: center;
      padding: 20px;
    }
    #progress {
      width: 80%;
      height: 4px;
      background: #333;
      border-radius: 2px;
      margin: 10px 0;
      overflow: hidden;
    }
    #progress-bar {
      height: 100%;
      background: #2563eb;
      width: 0%;
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  <div id="status">Initializing MLC Chat...</div>
  <div id="progress"><div id="progress-bar"></div></div>

  <script>
    let chatModule = null;
    let isReady = false;

    function updateStatus(message) {
      document.getElementById('status').textContent = message;
    }

    function updateProgress(progress) {
      document.getElementById('progress-bar').style.width = progress + '%';
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'progress',
        progress: progress
      }));
    }

    async function initMLC() {
      try {
        const config = window.MLC_CONFIG;

        chatModule = new webllm.ChatModule();

        chatModule.setInitProgressCallback((progress) => {
          updateProgress(progress * 100);
          updateStatus('Loading model... ' + Math.round(progress * 100) + '%');
        });

        await chatModule.reload(config.modelId, config.modelUrl ? [config.modelUrl] : undefined);

        isReady = true;
        updateStatus('Model loaded successfully');

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ready'
        }));
      } catch (error) {
        updateStatus('Error: ' + error.message);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          error: error.message
        }));
      }
    }

    // Handle messages from React Native
    window.addEventListener('message', async (event) => {
      if (!isReady) return;

      const data = event.data;
      if (data.type === 'chat') {
        try {
          updateStatus('Generating response...');

          const response = await chatModule.generate(data.message);

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'response',
            content: response
          }));

          updateStatus('Ready');
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            error: error.message
          }));
        }
      }
    });

    // Store config and start initialization
    window.MLC_CONFIG = {
      modelId: '${MLC_MODEL_ID}',
      modelUrl: '${MLC_MODEL_URL}' || undefined
    };

    initMLC();
  </script>
</body>
</html>
`;

class MLCChatViewClass extends React.Component<MLCChatViewProps> {
  private webViewRef = useRef<WebView>(null);
  private messageQueue: string[] = [];
  private isReady = false;

  state = {
    isLoading: true,
    error: null as string | null,
    progress: 0,
  };

  private handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message: WebViewMessage = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case 'ready':
          this.isReady = true;
          this.setState({ isLoading: false, progress: 100 });
          this.props.onReady?.();
          // Process any queued messages
          this.messageQueue.forEach((msg) => this.sendToWebView(msg));
          this.messageQueue = [];
          break;

        case 'response':
          if (message.content) {
            this.props.onResponse?.(message.content);
          }
          break;

        case 'error':
          this.setState({ error: message.error || 'Unknown error', isLoading: false });
          this.props.onError?.(new Error(message.error));
          break;

        case 'progress':
          if (message.progress !== undefined) {
            this.setState({ progress: message.progress });
            this.props.onProgress?.(message.progress);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebView message:', error);
    }
  }, []);

  private sendToWebView = (message: string) => {
    if (this.isReady && this.webViewRef.current) {
      this.webViewRef.current.postMessage(
        JSON.stringify({ type: 'chat', message })
      );
    } else {
      this.messageQueue.push(message);
    }
  };

  public async generateResponse(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MLC response timeout'));
      }, 60000);

      const handler = (response: string) => {
        clearTimeout(timeout);
        this.props.onResponse = handler;
        resolve(response);
      };

      this.sendToWebView(message);
    });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {this.state.error}</Text>
        </View>
      );
    }

    const html = MLC_WEBVIEW_HTML
      .replace('${MLC_MODEL_ID}', this.props.config.modelId)
      .replace('${MLC_MODEL_URL}', this.props.config.modelUrl || '');

    return (
      <View style={styles.container}>
        {this.state.isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>
              Loading model... {Math.round(this.state.progress)}%
            </Text>
          </View>
        )}
        <WebView
          ref={this.webViewRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={this.handleMessage}
          style={[styles.webView, this.state.isLoading && styles.hidden]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  hidden: {
    opacity: 0,
  },
});

export function MLCChatView(props: MLCChatViewProps) {
  return <MLCChatViewClass {...props} />;
}

export default MLCChatView;
