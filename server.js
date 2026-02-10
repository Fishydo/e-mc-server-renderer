import http from "http";
import WebSocket, { WebSocketServer } from "ws";

const PORT = process.env.PORT || 3000;
const FALIX_WS_URL = "ws://157.90.205.61:24660";

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (clientWs) => {
  console.log("Client connected");

  let falixWs;
  let alive = true;

  function connectFalix() {
    falixWs = new WebSocket(FALIX_WS_URL);

    falixWs.on("open", () => {
      console.log("Connected to Falix");
    });

    // Falix → Client
    falixWs.on("message", (msg) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(msg);
      }
    });

    falixWs.on("close", () => {
      console.log("Falix disconnected");
      if (alive) {
        setTimeout(connectFalix, 2000); // auto reconnect
      }
    });

    falixWs.on("error", (err) => {
      console.error("Falix error:", err.message);
    });
  }

  connectFalix();

  // Client → Falix
  clientWs.on("message", (msg) => {
    if (falixWs?.readyState === WebSocket.OPEN) {
      falixWs.send(msg);
    }
  });

  clientWs.on("close", () => {
    alive = false;
    falixWs?.close();
    console.log("Client disconnected");
  });

  clientWs.on("error", console.error);
});

// 🔁 Keep Render awake (every 5 minutes)
setInterval(() => {
  fetch("https://YOUR-RENDER-APP.onrender.com").catch(() => {});
}, 5 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`WS proxy running on ws://localhost:${PORT}`);
});
