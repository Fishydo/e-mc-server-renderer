import http from "http";
import WebSocket, { WebSocketServer } from "ws";

const PORT = process.env.PORT || 3000;

// Ordered fallbacks
const FALIX_ENDPOINTS = [
  "ws://157.90.205.61:24660",
  "wss://157.90.205.61:24660",
  "ws://lccserver.falix.app",
  "wss://lccserver.falix.app"
];

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (clientWs) => {
  console.log("Client connected");

  let falixWs = null;
  let active = true;
  let endpointIndex = 0;

  function tryNextEndpoint() {
    if (!active || endpointIndex >= FALIX_ENDPOINTS.length) {
      console.error("All Falix endpoints failed");
      clientWs.close();
      return;
    }

    const url = FALIX_ENDPOINTS[endpointIndex++];
    console.log("Trying Falix:", url);

    falixWs = new WebSocket(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0",
        "Origin": "https://client.falixnodes.net"
      },
      handshakeTimeout: 5000
    });

    falixWs.on("open", () => {
      console.log("Connected to Falix via", url);
    });

    falixWs.on("message", (msg) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(msg);
      }
    });

    falixWs.on("close", () => {
      console.warn("Falix closed:", url);
      tryNextEndpoint();
    });

    falixWs.on("error", (err) => {
      console.warn("Falix error:", url, err.message);
      tryNextEndpoint();
    });
  }

  // start fallback chain
  tryNextEndpoint();

  // Client → Falix
  clientWs.on("message", (msg) => {
    if (falixWs && falixWs.readyState === WebSocket.OPEN) {
      falixWs.send(msg);
    }
  });

  clientWs.on("close", () => {
    active = false;
    falixWs?.close();
    console.log("Client disconnected");
  });

  clientWs.on("error", () => {});
});

// keep Render awake (HTTP is enough)
setI
