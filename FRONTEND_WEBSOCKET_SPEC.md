# 📡 Frontend WebSocket Integration - Exact Implementation Guide

## 🔌 **Connection Details**

### WebSocket URL
```
ws://your-backend-url/order-tracking
// or
wss://your-backend-url/order-tracking (for production with SSL)
```

### Namespace
```
/order-tracking
```

---

## 📋 **STEP-BY-STEP IMPLEMENTATION**

### **STEP 1: Connect to WebSocket**

```javascript
// Using Socket.IO client
import io from 'socket.io-client';

const socket = io('http://your-backend-url/order-tracking', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('✅ Connected to order tracking');
  // Proceed to STEP 2
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from order tracking');
});
```

---

### **STEP 2: Join Order Room**

**When**: Immediately after connection (when Order Details screen opens)

```javascript
socket.emit('join-order', {
  orderId: 'your-order-id-here',  // String: MongoDB ObjectId
  userType: 'user'  // String: 'user' OR 'pro' (professional)
});
```

**Expected Response Events**:
1. `restaurant-location` - You'll receive this immediately
2. `user-joined` - Notification that you joined

---

### **STEP 3: Receive Restaurant Location**

**Event**: `restaurant-location`

**When**: Received automatically after joining order room

```javascript
socket.on('restaurant-location', (data) => {
  console.log('📍 Restaurant location received:', data);
  
  // data structure:
  // {
  //   lat: 36.8065,           // Number: Latitude
  //   lon: 10.1815,           // Number: Longitude
  //   name: "Main Branch",    // String: Restaurant/branch name (optional)
  //   address: "123 St..."    // String: Address (optional)
  // }
  
  // TODO: Place blue marker on map at (data.lat, data.lon)
  // TODO: Store these coordinates for distance calculation
});
```

**Action**: 
- Place a **BLUE marker** on your map at coordinates `(lat, lon)`
- Store these coordinates for later use

---

### **STEP 4: Start Location Sharing**

**When**: User clicks "Share Location" button

```javascript
// Request location permission first (platform-specific)
// Then:

socket.emit('start-sharing', {
  orderId: 'your-order-id-here',
  userId: 'current-user-id-here'  // String: MongoDB ObjectId
});
```

**Expected Response Event**:
- `sharing-started` - Confirmation that sharing started

```javascript
socket.on('sharing-started', (data) => {
  console.log('🟢 Sharing started:', data);
  // data.userId - User who started sharing
  // TODO: Update UI to show "Sharing your location" status
  // TODO: Start sending location updates (STEP 5)
});
```

---

### **STEP 5: Send Location Updates**

**When**: Every 5 seconds (or desired interval) while sharing is active

```javascript
// Get user's current GPS location (platform-specific API)
// Then send update:

socket.emit('location-update', {
  orderId: 'your-order-id-here',
  userId: 'current-user-id-here',
  lat: 34.0522,        // Number: User's current latitude
  lng: -118.2436,      // Number: User's current longitude
  accuracy: 10         // Number (optional): GPS accuracy in meters
});

// Repeat this every 5 seconds while sharing is active
```

**Example with GPS API (pseudocode)**:
```javascript
let locationInterval;

function startLocationUpdates() {
  // Get location every 5 seconds
  locationInterval = setInterval(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      socket.emit('location-update', {
        orderId: orderId,
        userId: userId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    });
  }, 5000); // 5 seconds
}

function stopLocationUpdates() {
  clearInterval(locationInterval);
}
```

---

### **STEP 6: Receive Location Updates (With Distance)**

**Event**: `location-update`

**When**: Received whenever someone sends a location update

```javascript
socket.on('location-update', (data) => {
  console.log('📍 Location update received:', data);
  
  // data structure:
  // {
  //   userId: "user123",              // String: User who sent update
  //   lat: 34.0522,                   // Number: User's latitude
  //   lng: -118.2436,                 // Number: User's longitude
  //   accuracy: 10,                   // Number: GPS accuracy (meters)
  //   timestamp: 1234567890,          // Number: Unix timestamp
  //   distance: 2.5,                  // Number: Distance in kilometers ✅
  //   distanceFormatted: "2.5 km",    // String: Formatted distance ✅
  //   restaurantLocation: {           // Object: Restaurant coordinates ✅
  //     lat: 36.8065,
  //     lon: 10.1815,
  //     name: "Main Branch"
  //   }
  // }
  
  // TODO: Update RED marker on map to (data.lat, data.lng)
  // TODO: Update distance display with data.distanceFormatted
  // TODO: Draw route line between restaurant and user location
});
```

**Actions**:
1. Move **RED marker** (user location) to `(data.lat, data.lng)`
2. Update distance display with `data.distanceFormatted`
3. Draw line between restaurant (blue) and user (red) markers

---

### **STEP 7: Stop Location Sharing**

**When**: User clicks "Stop Sharing" button

```javascript
socket.emit('stop-sharing', {
  orderId: 'your-order-id-here',
  userId: 'current-user-id-here'
});

// Also stop GPS location updates
stopLocationUpdates();
```

**Expected Response Event**:
- `sharing-stopped` - Confirmation that sharing stopped

```javascript
socket.on('sharing-stopped', (data) => {
  console.log('🛑 Sharing stopped:', data);
  // TODO: Update UI to show "Sharing stopped" status
  // TODO: Hide/disable location sharing button
});
```

---

### **STEP 8: Handle Other Events**

```javascript
// Someone joined the order room
socket.on('user-joined', (data) => {
  console.log('👤 User joined:', data);
  // data.userType - 'user' or 'pro'
  // data.clientId - WebSocket client ID
});

// Error occurred
socket.on('error', (data) => {
  console.error('❌ Error:', data.message);
  // Handle error (order not found, professional not found, etc.)
});
```

---

## 📊 **COMPLETE EVENT SUMMARY**

### **Events You SEND (emit):**

| Event | Payload | When to Send |
|-------|---------|--------------|
| `join-order` | `{ orderId: string, userType: 'user'\|'pro' }` | When Order Details screen opens |
| `start-sharing` | `{ orderId: string, userId: string }` | When user clicks "Share Location" |
| `location-update` | `{ orderId: string, userId: string, lat: number, lng: number, accuracy?: number }` | Every 5 seconds while sharing |
| `stop-sharing` | `{ orderId: string, userId: string }` | When user clicks "Stop Sharing" |

### **Events You RECEIVE (on):**

| Event | Payload | When Received |
|-------|---------|---------------|
| `restaurant-location` | `{ lat: number, lon: number, name?: string, address?: string }` | Immediately after joining |
| `location-update` | `{ userId, lat, lng, accuracy, timestamp, distance, distanceFormatted, restaurantLocation }` | Every time someone sends update |
| `user-joined` | `{ userType: string, clientId: string }` | When someone joins room |
| `sharing-started` | `{ userId: string }` | When sharing starts |
| `sharing-stopped` | `{ userId: string }` | When sharing stops |
| `error` | `{ message: string }` | When error occurs |

---

## 🗺️ **MAP INTEGRATION**

### **Markers:**

1. **Restaurant Marker (BLUE)**
   - Position: From `restaurant-location` event
   - Static (doesn't move)
   - Icon: Blue marker/pin

2. **User Marker (RED)**
   - Position: From `location-update` event (`data.lat`, `data.lng`)
   - Dynamic (updates every 5 seconds)
   - Icon: Red marker/pin

### **Distance Display:**
- Use `data.distanceFormatted` from `location-update` event
- Display: "Distance: 2.5 km" or "Distance: 150 m"
- Update in real-time as user moves

### **Route Line:**
- Draw a line between restaurant marker and user marker
- Update line when user location updates

---

## 🔐 **REQUIRED PERMISSIONS**

### Android (AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### iOS (Info.plist):
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to track your order delivery</string>
```

---

## 📱 **COMPLETE IMPLEMENTATION EXAMPLE**

```javascript
class OrderTrackingService {
  constructor(orderId, userId, userType) {
    this.orderId = orderId;
    this.userId = userId;
    this.userType = userType;
    this.socket = null;
    this.locationInterval = null;
    this.restaurantLocation = null;
  }

  connect() {
    this.socket = io('http://your-backend-url/order-tracking');
    
    // Connection handlers
    this.socket.on('connect', () => {
      console.log('✅ Connected');
      this.joinOrder();
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected');
    });

    // Event handlers
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Restaurant location
    this.socket.on('restaurant-location', (data) => {
      this.restaurantLocation = data;
      this.onRestaurantLocationReceived(data);
    });

    // Location updates
    this.socket.on('location-update', (data) => {
      this.onLocationUpdateReceived(data);
    });

    // Sharing status
    this.socket.on('sharing-started', (data) => {
      this.onSharingStarted(data);
    });

    this.socket.on('sharing-stopped', (data) => {
      this.onSharingStopped(data);
    });

    // Errors
    this.socket.on('error', (data) => {
      this.onError(data);
    });
  }

  joinOrder() {
    this.socket.emit('join-order', {
      orderId: this.orderId,
      userType: this.userType
    });
  }

  startSharing() {
    this.socket.emit('start-sharing', {
      orderId: this.orderId,
      userId: this.userId
    });

    // Start sending location updates
    this.startLocationUpdates();
  }

  stopSharing() {
    this.socket.emit('stop-sharing', {
      orderId: this.orderId,
      userId: this.userId
    });

    // Stop sending location updates
    this.stopLocationUpdates();
  }

  startLocationUpdates() {
    this.locationInterval = setInterval(() => {
      this.getCurrentLocation((lat, lng, accuracy) => {
        this.socket.emit('location-update', {
          orderId: this.orderId,
          userId: this.userId,
          lat: lat,
          lng: lng,
          accuracy: accuracy
        });
      });
    }, 5000); // Every 5 seconds
  }

  stopLocationUpdates() {
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
      this.locationInterval = null;
    }
  }

  // Platform-specific GPS implementation
  getCurrentLocation(callback) {
    // Implement using:
    // - Android: LocationManager or FusedLocationProviderClient
    // - iOS: CLLocationManager
    // - React Native: @react-native-community/geolocation
    // - Web: navigator.geolocation
  }

  // Callbacks (implement in your UI component)
  onRestaurantLocationReceived(data) {
    // Place blue marker at (data.lat, data.lon)
  }

  onLocationUpdateReceived(data) {
    // Move red marker to (data.lat, data.lng)
    // Update distance display with data.distanceFormatted
    // Draw route line
  }

  onSharingStarted(data) {
    // Update UI: Show "Sharing your location" status
  }

  onSharingStopped(data) {
    // Update UI: Show "Sharing stopped" status
  }

  onError(data) {
    // Show error message to user
  }

  disconnect() {
    this.stopSharing();
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Usage:
const tracking = new OrderTrackingService(orderId, userId, 'user');
tracking.connect();
```

---

## ✅ **TESTING CHECKLIST**

Before production, test:

- [ ] Connection to WebSocket succeeds
- [ ] `join-order` emits successfully
- [ ] `restaurant-location` event received after join
- [ ] Blue marker appears on map at restaurant location
- [ ] `start-sharing` emits successfully
- [ ] GPS location updates every 5 seconds
- [ ] `location-update` events sent successfully
- [ ] `location-update` events received with distance
- [ ] Red marker moves on map with location updates
- [ ] Distance display updates correctly
- [ ] Route line updates between markers
- [ ] `stop-sharing` works correctly
- [ ] Reconnection works if connection drops

---

## 🚨 **ERROR HANDLING**

Always listen for `error` event:

```javascript
socket.on('error', (data) => {
  switch(data.message) {
    case 'Order not found':
      // Handle: Order doesn't exist
      break;
    case 'Professional not found':
      // Handle: Restaurant account missing
      break;
    case 'Failed to join order room':
      // Handle: General error
      break;
    default:
      // Handle: Unknown error
  }
});
```

---

## 📝 **NOTES**

1. **Distance is calculated on backend** - You receive `distance` and `distanceFormatted` directly
2. **Restaurant location is sent once** - When you join, you'll receive it immediately
3. **Location updates include restaurant location** - For reference, but you already have it
4. **Send updates every 5 seconds** - Or adjust interval as needed
5. **Handle reconnection** - Socket.IO auto-reconnects, but you may need to re-join order room

---

*This specification provides everything needed to implement live order tracking on the frontend!*

