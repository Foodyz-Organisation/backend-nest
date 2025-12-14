# ⚡ Quick Reference - Live Location Tracking

## 🔌 Connect
```javascript
const socket = io('http://your-backend-url/order-tracking');
```

---

## 📨 SEND EVENTS

### 1. Join Order Room
```javascript
socket.emit('join-order', {
  orderId: 'order-id',
  userType: 'user' // or 'pro'
});
```

### 2. Start Sharing
```javascript
socket.emit('start-sharing', {
  orderId: 'order-id',
  userId: 'user-id'
});
```

### 3. Send Location (every 5 seconds)
```javascript
socket.emit('location-update', {
  orderId: 'order-id',
  userId: 'user-id',
  lat: 34.0522,
  lng: -118.2436,
  accuracy: 10
});
```

### 4. Stop Sharing
```javascript
socket.emit('stop-sharing', {
  orderId: 'order-id',
  userId: 'user-id'
});
```

---

## 📥 RECEIVE EVENTS

### 1. Restaurant Location (on join)
```javascript
socket.on('restaurant-location', (data) => {
  // data.lat, data.lon → Place BLUE marker
  // data.name, data.address
});
```

### 2. Location Updates (with distance)
```javascript
socket.on('location-update', (data) => {
  // data.lat, data.lng → Move RED marker
  // data.distanceFormatted → Display distance ("2.5 km")
  // data.distance → Number in kilometers
});
```

### 3. Sharing Status
```javascript
socket.on('sharing-started', (data) => { });
socket.on('sharing-stopped', (data) => { });
socket.on('error', (data) => { });
```

---

## 📊 Payloads

### `restaurant-location` Response:
```json
{
  "lat": 36.8065,
  "lon": 10.1815,
  "name": "Main Branch",
  "address": "123 Restaurant St"
}
```

### `location-update` Response:
```json
{
  "userId": "user123",
  "lat": 34.0522,
  "lng": -118.2436,
  "accuracy": 10,
  "timestamp": 1234567890,
  "distance": 2.5,
  "distanceFormatted": "2.5 km",
  "restaurantLocation": {
    "lat": 36.8065,
    "lon": 10.1815,
    "name": "Main Branch"
  }
}
```

---

## ✅ Flow

1. Connect → `socket.connect()`
2. Join → `emit('join-order')`
3. Receive → `on('restaurant-location')` → Place blue marker
4. Start → `emit('start-sharing')`
5. Send GPS → `emit('location-update')` every 5s
6. Receive → `on('location-update')` → Move red marker, show distance
7. Stop → `emit('stop-sharing')`

---

See `FRONTEND_WEBSOCKET_SPEC.md` for full details.

