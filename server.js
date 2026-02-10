import http from "http";
import WebSocket, { WebSocketServer } from "ws";

const PORT = process.env.PORT || 3000;

// Falix fallback endpoints (in order)
const FALIX_ENDPOINTS = [
  "ws://157.90.205.61:24660",
  "wss://157.90.205.61:24660",
  "ws://lccserver.falix.app",
  "wss://lccserver.falix.app"
];

// Your Render service URL (used for keep-alive)
const SELF_URL = "https://lcc-server-ec.onrender.com";

const server = http.createServer((req, res) => {
  // lightweight health check
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (clientWs) => {
  console.log("Client connected");

  let falixWs = null;
  let alive = true;
  let index = 0;

  function connectFalix() {
    if (!alive || index >= FALIX_ENDPOINTS.length) {
      console.error("All Falix endpoints failed");
      clientWs.close();
      return;
    }

    const url = FALIX_ENDPOINTS[index++];
    console.log("Trying Falix:", url);

    falixWs = new WebSocket(url, {
      handshakeTimeout: 5000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0",
        "Origin": "https://client.falixnodes.net"
      }
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
      connectFalix();
    });

    falixWs.on("error", (err) => {
      console.warn("Falix error:", url, err.message);
      connectFalix();
    });
  }

  connectFalix();

  // Client → Falix
  clientWs.on("message", (msg) => {
    if (falixWs && falixWs.readyState === WebSocket.OPEN) {
      falixWs.send(msg);
    }
  });

  clientWs.on("close", () => {
    alive = false;
    falixWs?.close();
    console.log("Client disconnected");
  });

  clientWs.on("error", () => {});
});

// ✅ keep Render awake (HTTP ping every 1 minute)
setInterval(() => {
  fetch(SELF_URL).catch(() => {});
}, 60 * 1000);

// ✅ REQUIRED: listen on process.env.PORT
server.listen(PORT, () => {
  console.log(`Proxy running on ws://localhost:${PORT}`);
});
