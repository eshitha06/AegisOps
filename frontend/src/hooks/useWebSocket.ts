import { useWebSocketContext } from '../context/WebSocketContext';

export type { ConnectionStatus } from '../context/WebSocketContext';

export default function useWebSocket() {
  return useWebSocketContext();
}
