import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  WebSocketMessage, 
  StreamUpdateMessage, 
  StreamCompleteMessage, 
  RawMessage 
} from '@/types/index';

// Determine if we're in production based on the current hostname
const isProd = typeof window !== 'undefined' && 
  (window.location.hostname.endsWith('iweapps.com') || 
   process.env.NODE_ENV === 'production');

// Base WebSocket URL - use environment variable if available, otherwise fallback
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 
  (isProd ? 'wss://api.iweapps.com' : 'ws://localhost:8080');

// Debug logging for WebSocket configuration
console.log('🌐 WebSocket Configuration:', {
  isProd,
  WS_BASE_URL,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
  protocol: typeof window !== 'undefined' ? window.location.protocol : 'server',
  env: process.env.NODE_ENV
});

// Get auth token from localStorage for development
const getDevAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  // Try to get token from auth context first, then fallback to localStorage
  try {
    const authState = JSON.parse(localStorage.getItem('auth_state') || '{}');
    return authState?.token || localStorage.getItem('dev_jwt');
  } catch (e) {
    return localStorage.getItem('dev_jwt');
  }
};

// Construct WebSocket URL with proper authentication
const getWebSocketUrl = (isReactNative: boolean = false): string => {
  if (isReactNative) {
    return `${WS_BASE_URL}/ws/auth`;
  }
  
  if (isProd) {
    // In production, use cookie-based auth (HttpOnly cookie)
    console.log('🔒 Using cookie-based WebSocket authentication');
    return `${WS_BASE_URL}/ws`;
  }
  
  // In development, prefer token-based auth if available
  const token = getDevAuthToken();
  if (token) {
    console.log('🔑 Using dev JWT token for WebSocket connection');
    return `${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`;
  }
  
  // Fallback to public connection with test user ID
  const testUserId = 'c0a8012e-0000-4000-8000-000000000001';
  console.log('👤 Using public WebSocket connection with test user ID');
  return `${WS_BASE_URL}/ws?user_id=${testUserId}`;
};

const WS_URL = getWebSocketUrl();
const WS_AUTH_URL = getWebSocketUrl(true);

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  reconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;
  
  const debug = (message: string, data?: any) => {
    console.log(`[WebSocket] ${message}`, data || '');
  };

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const messageBufferRef = useRef(''); // Buffer for streaming messages
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(() => {
    try {
      // Get the auth token from cookies (will be sent automatically by the browser)
      const token = typeof window !== 'undefined' ? 
        document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] : null;
      
      // For React Native, we'll use the auth endpoint with token in headers
      const isReactNative = typeof navigator !== 'undefined' && 
        navigator.product === 'ReactNative';
      
      const wsUrl = WS_URL;
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      // In production, we rely on cookies for authentication
      // The browser will automatically include the HttpOnly cookie
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Debug WebSocket events
      ws.addEventListener('open', (event) => {
        console.log('✅ WebSocket connection established');
      });
      
      ws.addEventListener('error', (error) => {
        console.error('❌ WebSocket error:', {
          type: 'WebSocket Error',
          timestamp: new Date().toISOString(),
          error,
          readyState: ws.readyState,
          url: wsUrl
        });
      });
      
      ws.addEventListener('close', (event) => {
        console.log('🔌 WebSocket connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
      });

      ws.onopen = (event) => {
        debug('WebSocket Connected', {
          url: WS_URL,
          protocol: ws.protocol,
          extensions: ws.extensions,
          timestamp: new Date().toISOString()
        });
        setIsConnected(true);
        onConnect?.();
        reconnectAttemptsRef.current = 0;
        
        // Send a test message to verify connection
        try {
          const testMessage = JSON.stringify({ type: 'ping', timestamp: Date.now() });
          ws.send(testMessage);
          debug('Sent test ping message');
        } catch (error) {
          debug('Error sending test message', error);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          debug('Received message', {
            type: message.type,
            timestamp: new Date().toISOString(),
            data: message
          });
          
          // Handle test pong response
          if (message.type === 'pong') {
            debug('Received pong response', {
              latency: Date.now() - message.timestamp,
              serverTime: message.serverTime
            });
            return;
          }
          
          // Log raw message for debugging
          console.log('📨 Raw WebSocket message:', event.data);
          
          // Try to parse as JSON, fallback to raw text
          try {
            const rawData = typeof event.data === 'string' ? event.data : '';
            const message = JSON.parse(rawData) as WebSocketMessage;
            
            // Handle different message types
            setLastMessage(message);
            
            // Process based on message type
            switch (message.type) {
              case 'ai_chunk':
                // Handle streaming chunks
                messageBufferRef.current += message.chunk || '';
                onMessage?.({
                  type: 'stream_update',
                  data: messageBufferRef.current,
                  done: false,
                  timestamp: new Date().toISOString()
                } as StreamUpdateMessage);
                break;
                
              case 'job_completed':
                // Handle job completion
                onMessage?.({
                  type: 'stream_complete',
                  data: messageBufferRef.current,
                  done: true,
                  timestamp: new Date().toISOString()
                } as StreamCompleteMessage);
                messageBufferRef.current = ''; // Reset buffer
                onMessage?.(message); // Also forward the original message
                break;
                
              case 'job_update':
                // Forward job updates
                onMessage?.(message);
                break;
                
              case 'error':
                console.error('WebSocket error:', message.error);
                onMessage?.(message);
                break;
                
              default:
                console.log('Unhandled message type:', message.type, message);
                onMessage?.(message);
            }
          } catch (parseError) {
            // Handle non-JSON messages or parse errors
            console.log('Non-JSON WebSocket message:', event.data);
            onMessage?.({
              type: 'raw',
              data: event.data,
              timestamp: new Date().toISOString()
            } as RawMessage);
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };

      ws.onerror = (event) => {
        const error = {
          type: 'WebSocket Error',
          timestamp: new Date().toISOString(),
          error: event,
          readyState: ws.readyState,
          url: WS_URL
        };
        console.error('WebSocket error:', error);
        debug('WebSocket Error', error);
        onError?.(event);
        ws.close();
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        onDisconnect?.();

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1),
            30000 // Max 30 seconds
          );
          
          debug(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            debug(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            
            // In development, try to get a fresh token if available
            if (!isProd) {
              const token = getDevAuthToken();
              if (token) {
                debug('Using fresh token for reconnection');
                const newUrl = `${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`;
                if (wsRef.current) {
                  wsRef.current = new WebSocket(newUrl);
                  return;
                }
              }
            }
            
            connect();
          }, delay);
        } else {
          const error = new Event('max_reconnect_attempts');
          debug('Max reconnection attempts reached');
          onError?.(error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [onMessage, onConnect, onDisconnect, onError, reconnectInterval, maxReconnectAttempts]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      debug('Closing existing connection');
      wsRef.current.close();
    }

    debug(`Connecting to WebSocket: ${WS_URL}`);
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnect,
  };
}
