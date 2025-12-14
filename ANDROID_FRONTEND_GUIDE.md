# 📱 Android Frontend Implementation Guide
## Google Maps + Live Order Tracking

---

## 🎯 **WHAT YOU'LL BUILD**

A live tracking screen where:
- User sees map with restaurant location (blue marker)
- User sees their own location (red marker)
- User can tap "Share Location" to start tracking
- Distance updates in real-time as user moves
- Professional sees the same view on their side

---

## 📋 **STEP-BY-STEP IMPLEMENTATION**

### **STEP 1: Order Details Screen Setup**

#### 1.1 Screen Layout Structure
```
OrderDetailsActivity
├── Toolbar (Back button + "Order Details" + Delete icon)
├── Order Type Card (Takeaway/Delivery/Eat-in)
├── MapView (Google Maps)
│   ├── Restaurant Marker (Blue)
│   ├── User Marker (Red)
│   └── Route Line (Polyline)
├── Distance Card Overlay (on map)
├── Location Sharing Status
│   ├── "Sharing your location" (green text)
│   └── "Stop Sharing" button (red text)
└── Order Items List
```

#### 1.2 What to Display
- **Order Type**: Show "Takeaway", "Delivery", or "Dine In" badge
- **Map**: Full-screen Google Maps view
- **Distance**: Display in card overlay on map (e.g., "Distance: 2.5 km")
- **Location Status**: Green indicator when sharing, red when stopped

---

### **STEP 2: Fetch Order Data on Screen Load**

#### 2.1 API Call (When Activity Opens)
```kotlin
// GET /orders/{orderId}
GET /api/orders/{orderId}
```

**Response you'll receive:**
```json
{
  "id": "order123",
  "userId": "user456",
  "professionalId": "pro789",
  "orderType": "delivery",
  "status": "confirmed",
  "deliveryAddress": "123 Main St",
  "items": [...]
}
```

#### 2.2 Fetch Professional Location
```kotlin
// GET /professionals/{professionalId}
GET /api/professionals/{professionalId}
```

**Response includes:**
```json
{
  "id": "pro789",
  "fullName": "My Restaurant",
  "locations": [
    {
      "name": "Main Branch",
      "address": "123 Restaurant St",
      "lat": 36.8065,
      "lon": 10.1815
    }
  ]
}
```

**✅ Action**: Extract `locations[0].lat` and `locations[0].lon` → This is your restaurant location!

---

### **STEP 3: Google Maps Setup**

#### 3.1 Add Google Maps to Layout
```xml
<!-- activity_order_details.xml -->
<com.google.android.gms.maps.MapView
    android:id="@+id/mapView"
    android:layout_width="match_parent"
    android:layout_height="0dp"
    android:layout_weight="1" />
```

#### 3.2 Initialize Map
```kotlin
// In onCreate()
mapView.onCreate(savedInstanceState)
mapView.getMapAsync { googleMap ->
    this.googleMap = googleMap
    
    // Enable location features
    googleMap.isMyLocationEnabled = true
    googleMap.uiSettings.isMyLocationButtonEnabled = true
    googleMap.uiSettings.isZoomControlsEnabled = true
    
    // Set initial camera position (center on restaurant)
    val restaurantLocation = LatLng(restaurantLat, restaurantLon)
    googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(restaurantLocation, 15f))
    
    // Add restaurant marker
    addRestaurantMarker(restaurantLat, restaurantLon)
}
```

#### 3.3 Add Restaurant Marker (Blue)
```kotlin
private fun addRestaurantMarker(lat: Double, lon: Double) {
    val restaurantLocation = LatLng(lat, lon)
    val restaurantMarker = googleMap.addMarker(
        MarkerOptions()
            .position(restaurantLocation)
            .title("Restaurant")
            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_BLUE))
    )
}
```

---

### **STEP 4: WebSocket Connection Setup**

#### 4.1 Connect to WebSocket (When Screen Opens)
```kotlin
// Use Socket.IO or similar library
val socket = IO.socket("http://your-backend-url/order-tracking")

socket.connect()

socket.on(Socket.EVENT_CONNECT) {
    // Step 4.2: Join order room
    joinOrderRoom(orderId)
}

socket.on(Socket.EVENT_DISCONNECT) {
    // Handle disconnect
}
```

#### 4.2 Join Order Room
```kotlin
private fun joinOrderRoom(orderId: String) {
    socket.emit("join-order", JSONObject().apply {
        put("orderId", orderId)
        put("userType", "user") // or "pro" if professional
    })
}
```

#### 4.3 Listen for Restaurant Location (if backend sends it)
```kotlin
socket.on("restaurant-location") { args ->
    val data = args[0] as JSONObject
    val lat = data.getDouble("lat")
    val lon = data.getDouble("lon")
    
    // Add restaurant marker if not already added
    addRestaurantMarker(lat, lon)
}
```

---

### **STEP 5: Location Sharing Feature**

#### 5.1 Request Location Permissions
```kotlin
// In onCreate or when user clicks "Share Location"
if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) 
    != PackageManager.PERMISSION_GRANTED) {
    ActivityCompat.requestPermissions(
        this,
        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
        LOCATION_PERMISSION_REQUEST_CODE
    )
}
```

#### 5.2 Start Location Sharing Button
```kotlin
// When user clicks "Share Location" button
shareLocationButton.setOnClickListener {
    startLocationSharing()
}

private fun startLocationSharing() {
    // Emit WebSocket event
    socket.emit("start-sharing", JSONObject().apply {
        put("orderId", orderId)
        put("userId", currentUserId)
    })
    
    // Start getting user's location updates
    startLocationUpdates()
    
    // Update UI
    locationStatusText.text = "Sharing your location"
    locationStatusText.setTextColor(Color.GREEN)
    stopSharingButton.visibility = View.VISIBLE
}
```

#### 5.3 Get User's Current Location (GPS)
```kotlin
private fun startLocationUpdates() {
    val locationRequest = LocationRequest.create().apply {
        interval = 5000  // Update every 5 seconds
        fastestInterval = 3000
        priority = LocationRequest.PRIORITY_HIGH_ACCURACY
    }
    
    locationCallback = object : LocationCallback() {
        override fun onLocationResult(locationResult: LocationResult) {
            val location = locationResult.lastLocation
            if (location != null) {
                val lat = location.latitude
                val lon = location.longitude
                
                // Update user marker on map
                updateUserMarker(lat, lon)
                
                // Send to WebSocket
                sendLocationUpdate(lat, lon)
                
                // Calculate and update distance
                calculateDistance(lat, lon)
            }
        }
    }
    
    LocationServices.getFusedLocationProviderClient(this)
        .requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
}
```

#### 5.4 Update User Marker on Map (Red)
```kotlin
private var userMarker: Marker? = null

private fun updateUserMarker(lat: Double, lon: Double) {
    val userLocation = LatLng(lat, lon)
    
    if (userMarker == null) {
        // Create new marker
        userMarker = googleMap.addMarker(
            MarkerOptions()
                .position(userLocation)
                .title("Your Location")
                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
        )
    } else {
        // Update existing marker position
        userMarker?.position = userLocation
    }
    
    // Optionally: Move camera to follow user (or keep restaurant centered)
    // googleMap.animateCamera(CameraUpdateFactory.newLatLng(userLocation))
}
```

#### 5.5 Send Location to WebSocket
```kotlin
private fun sendLocationUpdate(lat: Double, lon: Double) {
    socket.emit("location-update", JSONObject().apply {
        put("orderId", orderId)
        put("userId", currentUserId)
        put("lat", lat)
        put("lng", lon)
        put("accuracy", location.accuracy) // Optional
    })
}
```

#### 5.6 Listen for Location Updates (Receive from Others)
```kotlin
// Listen for location updates from WebSocket
socket.on("location-update") { args ->
    val data = args[0] as JSONObject
    val userId = data.getString("userId")
    val lat = data.getDouble("lat")
    val lon = data.getDouble("lng")
    
    // Update marker for this user (if professional is viewing)
    // Or if you want to show other users on map
    updateMarkerForUser(userId, lat, lon)
}
```

#### 5.7 Stop Location Sharing
```kotlin
stopSharingButton.setOnClickListener {
    stopLocationSharing()
}

private fun stopLocationSharing() {
    // Stop location updates
    LocationServices.getFusedLocationProviderClient(this)
        .removeLocationUpdates(locationCallback)
    
    // Emit WebSocket event
    socket.emit("stop-sharing", JSONObject().apply {
        put("orderId", orderId)
        put("userId", currentUserId)
    })
    
    // Update UI
    locationStatusText.text = "Location sharing stopped"
    locationStatusText.setTextColor(Color.RED)
    stopSharingButton.visibility = View.GONE
}
```

---

### **STEP 6: Distance Calculation & Display**

#### 6.1 Calculate Distance (Haversine Formula)
```kotlin
private fun calculateDistance(userLat: Double, userLon: Double) {
    val restaurantLat = restaurantLocation.latitude
    val restaurantLon = restaurantLocation.longitude
    
    val distance = calculateDistanceBetween(
        userLat, userLon,
        restaurantLat, restaurantLon
    )
    
    // Update distance display
    updateDistanceDisplay(distance)
    
    // Draw route line (optional)
    drawRouteLine(userLat, userLon, restaurantLat, restaurantLon)
}

private fun calculateDistanceBetween(
    lat1: Double, lon1: Double,
    lat2: Double, lon2: Double
): Double {
    val earthRadius = 6371.0 // kilometers
    
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    
    val a = sin(dLat / 2) * sin(dLat / 2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
            sin(dLon / 2) * sin(dLon / 2)
    
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    
    return earthRadius * c
}
```

#### 6.2 Display Distance on Map Overlay
```kotlin
private fun updateDistanceDisplay(distanceKm: Double) {
    // Format: "Distance: 2.5 km" or "Distance: 10412.99 km"
    val distanceText = if (distanceKm < 1) {
        "${(distanceKm * 1000).toInt()} m"
    } else {
        String.format("%.2f km", distanceKm)
    }
    
    distanceTextView.text = "Distance: $distanceText"
}
```

#### 6.3 Draw Route Line (Optional - Straight Line)
```kotlin
private var routePolyline: Polyline? = null

private fun drawRouteLine(
    userLat: Double, userLon: Double,
    restaurantLat: Double, restaurantLon: Double
) {
    val route = listOf(
        LatLng(restaurantLat, restaurantLon),
        LatLng(userLat, userLon)
    )
    
    if (routePolyline == null) {
        routePolyline = googleMap.addPolyline(
            PolylineOptions()
                .addAll(route)
                .color(Color.BLUE)
                .width(5f)
        )
    } else {
        routePolyline?.points = route
    }
}
```

---

### **STEP 7: UI Components Details**

#### 7.1 Location Status Indicator
```xml
<TextView
    android:id="@+id/locationStatusText"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="Tap to share location"
    android:textColor="@color/gray"
    android:drawableStart="@drawable/ic_location_off" />
```

**States:**
- **Not Sharing**: Gray text, "Tap to share location", location icon (gray)
- **Sharing**: Green text, "Sharing your location", location icon (green)
- **Stopped**: Red text, "Location sharing stopped", location icon (red)

#### 7.2 Stop Sharing Button
```xml
<Button
    android:id="@+id/stopSharingButton"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="Stop Sharing"
    android:textColor="@color/red"
    android:visibility="gone" />
```

#### 7.3 Distance Card (Overlay on Map)
```xml
<CardView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_gravity="center_horizontal|top"
    android:layout_marginTop="16dp"
    app:cardElevation="4dp">
    
    <TextView
        android:id="@+id/distanceTextView"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Distance: --"
        android:textColor="@color/red"
        android:textSize="16sp"
        android:padding="12dp" />
</CardView>
```

---

### **STEP 8: Professional Side (Same Screen, Different User Type)**

#### 8.1 Professional View
- Same map view
- Receives user's live location via WebSocket
- Sees restaurant marker (their own location)
- Sees user marker (moving as user moves)
- Sees distance updating in real-time

#### 8.2 Difference
```kotlin
// When joining order room
socket.emit("join-order", JSONObject().apply {
    put("orderId", orderId)
    put("userType", "pro") // Professional side
})

// Professional doesn't share their location (it's static from DB)
// Professional only receives user location updates
socket.on("location-update") { args ->
    // Update user marker on professional's map
    updateUserMarker(lat, lon)
    calculateDistance(restaurantLat, restaurantLon, lat, lon)
}
```

---

## 🎨 **VISUAL FLOW**

### **Initial State (No Sharing)**
```
┌─────────────────────────────┐
│  ← Order Details      🗑️    │
├─────────────────────────────┤
│  📦 Takeaway                │
├─────────────────────────────┤
│                             │
│    🗺️ Google Maps           │
│                             │
│    📍 (Blue Restaurant)     │
│                             │
│  [Distance: --]             │
├─────────────────────────────┤
│  📍 Tap to share location   │
│  [Share Location] ← Button  │
├─────────────────────────────┤
│  Order Items:               │
│  • burger x1                │
└─────────────────────────────┘
```

### **Active Sharing State**
```
┌─────────────────────────────┐
│  ← Order Details      🗑️    │
├─────────────────────────────┤
│  📦 Takeaway                │
├─────────────────────────────┤
│                             │
│    🗺️ Google Maps           │
│        ┌───┐                │
│        │ 📍│ Blue (Restaurant)
│        └───┘                │
│          │                  │
│      ────┼───               │  ← Route line
│          │                  │
│        📍 Red (You)         │  ← Moving
│                             │
│  [Distance: 2.5 km]         │
├─────────────────────────────┤
│  ✅ Sharing your location   │  ← Green
│  [Stop Sharing] ← Red button│
├─────────────────────────────┤
│  Order Items:               │
│  • burger x1                │
└─────────────────────────────┘
```

---

## 📦 **DEPENDENCIES NEEDED**

### build.gradle (Module: app)
```gradle
dependencies {
    // Google Maps
    implementation 'com.google.android.gms:play-services-maps:18.1.0'
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    
    // WebSocket (Socket.IO)
    implementation 'io.socket:socket.io-client:2.1.0'
    
    // JSON parsing
    implementation 'org.json:json:20210307'
    
    // Material Design
    implementation 'com.google.android.material:material:1.9.0'
}
```

---

## 🔑 **KEY POINTS TO REMEMBER**

1. **Restaurant Location**: Get from `GET /professionals/{id}` → `locations[0]`
2. **User Location**: Get from device GPS → Send to WebSocket every 5 seconds
3. **Map Markers**: Blue = Restaurant (static), Red = User (moving)
4. **Distance**: Calculate on frontend using Haversine formula
5. **WebSocket**: Join room on screen open, disconnect on screen close
6. **Permissions**: Request location permission before sharing

---

## ✅ **CHECKLIST**

- [ ] Add Google Maps to layout
- [ ] Initialize map in Activity
- [ ] Fetch order data on load
- [ ] Fetch professional location (restaurant coordinates)
- [ ] Add restaurant marker (blue)
- [ ] Setup WebSocket connection
- [ ] Join order room
- [ ] Request location permissions
- [ ] Add "Share Location" button
- [ ] Start GPS location updates
- [ ] Update user marker (red) on location change
- [ ] Send location to WebSocket every 5 seconds
- [ ] Calculate distance between markers
- [ ] Display distance on map overlay
- [ ] Draw route line (optional)
- [ ] Add "Stop Sharing" button
- [ ] Clean up on Activity destroy (stop location updates, disconnect socket)

---

*This guide covers the complete frontend implementation for live order tracking with Google Maps!*

