// test-client-pro.js (Run this in Terminal 1)
const io = require("socket.io-client");
const ORDER_ID = "ORD-7890";
let USER_ID = "Driver-A"; // Pro
let USER_TYPE = "pro"; 

console.log(`Attempting to connect to http://localhost:3000/order-tracking as ${USER_TYPE}...`);
const socket = io("http://localhost:3000/order-tracking", { timeout: 5000 }); 

let locationInterval;

socket.on("connect", () => {
  console.log(`\n✅ Connected as ${USER_TYPE}! Socket ID: ${socket.id}`);
  
  // 1. Join Order Room
  console.log(`[EMIT] join-order: Joining room ${ORDER_ID} as '${USER_TYPE}'`);
  socket.emit("join-order", { orderId: ORDER_ID, userType: USER_TYPE });

  // 2. Start Sharing (Pro must announce this)
  console.log(`[EMIT] start-sharing: Announcing location sharing start.`);
  socket.emit("start-sharing", { orderId: ORDER_ID, userId: USER_ID });

  // 3. Start Location Updates (Every 5 seconds)
  let lat = 34.052235; // Starting location
  let lng = -118.243683;

  locationInterval = setInterval(() => {
      lat += 0.00001; // Simulate movement
      const payload = {
          orderId: ORDER_ID,
          userId: USER_ID,
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6))
      };
      console.log(`[EMIT] location-update: Sending Lat: ${payload.lat}`);
      socket.emit("location-update", payload);
  }, 5000); 

  // Stop sharing after 30 seconds for cleanup and testing stop-sharing logic
  setTimeout(() => {
      clearInterval(locationInterval);
      console.log(`\n[EMIT] stop-sharing: Stopping location updates.`);
      socket.emit("stop-sharing", { orderId: ORDER_ID, userId: USER_ID });
      console.log("Client process terminating.");
      socket.disconnect();
  }, 30000);
});

// --- Listeners (Keep these active in both terminals) ---

socket.on("user-joined", (data) => {
  console.log(`[RECEIVE] user-joined: ${data.userType} joined the room.`);
});

socket.on("sharing-started", (data) => {
  console.log(`[RECEIVE] 🟢 SHARING STARTED by User ID: ${data.userId}`);
});

socket.on("sharing-stopped", (data) => {
  console.log(`[RECEIVE] 🛑 SHARING STOPPED by User ID: ${data.userId}`);
});

socket.on("location-update", (data) => {
  // Pro will also receive its own updates, which is normal
  console.log(`[RECEIVE] 🗺️ LOCATION UPDATE: Lat ${data.lat}, Lng ${data.lng}`);
});

socket.on("connect_error", (err) => {
  console.error("❌ CONNECTION FAILED:", err.message);
  process.exit(1); 
});