// subscription.js — GraphQL WebSocket subscription client (graphql-transport-ws)

const WS_URL = 'ws://localhost:4000/graphql';

export class SubscriptionClient {
  constructor({ onEvent, onStatusChange, onError }) {
    this.ws = null;
    this.active = false;
    this.onEvent = onEvent;
    this.onStatusChange = onStatusChange;
    this.onError = onError;
  }

  start(sessionId) {
    this.ws = new WebSocket(WS_URL, 'graphql-transport-ws');

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'connection_ack') {
        this.onStatusChange(true);

        // Use attendanceMarked (per-session) or attendanceUpdated (all sessions)
        const query = sessionId
          ? `subscription($sessionId: ID!) {
               attendanceMarked(sessionId: $sessionId) {
                 id status markedAt
                 student { name studentId }
                 session { date location }
               }
             }`
          : `subscription {
               attendanceUpdated {
                 id status markedAt
                 student { name studentId }
                 session { date location }
               }
             }`;

        this.ws.send(JSON.stringify({
          id: '1',
          type: 'subscribe',
          payload: {
            query,
            variables: sessionId ? { sessionId } : {},
          },
        }));
      }

      if (msg.type === 'next') {
        const record =
          msg.payload?.data?.attendanceMarked ||
          msg.payload?.data?.attendanceUpdated;
        if (record) this.onEvent(record);
      }

      if (msg.type === 'error') {
        this.onError(msg.payload);
      }
    };

    this.ws.onclose = () => this.onStatusChange(false);
    this.ws.onerror = () => this.onStatusChange(false);

    this.active = true;
  }

  stop() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ id: '1', type: 'complete' }));
      this.ws.close();
      this.ws = null;
    }
    this.active = false;
    this.onStatusChange(false);
  }

  toggle(sessionId) {
    if (this.active) this.stop();
    else this.start(sessionId);
  }
}
