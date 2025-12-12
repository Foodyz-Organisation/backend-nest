# Frontend Integration Guide - Posts API Updates

This document contains all the backend API changes that need to be integrated into your Android Studio Jetpack Compose frontend application.

## Base URL
```
http://10.0.2.2:3000/posts
```
(Use `10.0.2.2` for Android Emulator, or your actual server IP for physical devices)

---

## 📋 Table of Contents
1. [New Post Fields](#new-post-fields)
2. [FoodType Enum](#foodtype-enum)
3. [New API Endpoints](#new-api-endpoints)
4. [Data Models](#data-models)
5. [Example Requests & Responses](#example-requests--responses)

---

## 🆕 New Post Fields

### Added Fields to Post Model

1. **foodType** (REQUIRED)
   - Type: `String` (enum)
   - Description: The type of food in the post
   - Values: See [FoodType Enum](#foodtype-enum) below

2. **price** (OPTIONAL)
   - Type: `Double` / `Float`
   - Description: Price in TND (Tunisian Dinar)
   - Example: `30.0` or `6.9`
   - **Display Format**: Show as `"30TND"` or `"6.9TND"` on frontend
   - Validation: Must be >= 0

3. **preparationTime** (OPTIONAL)
   - Type: `Int`
   - Description: Preparation time in minutes
   - Example: `15`
   - **Display Format**: Show as `"15 minutes"` on frontend
   - Validation: Must be >= 0

---

## 🍽️ FoodType Enum

The `foodType` field must be one of these exact string values:

```kotlin
enum class FoodType(val value: String) {
    SPICY("Spicy"),
    HEALTHY("Healthy"),
    MASHWI("Mashwi"),
    COUSCOUS("Couscous"),
    STREET_FOOD("Street food"),
    FAST_FOOD("Fast food"),
    SEAFOOD("Seafood"),
    FRIED("Fried"),
    DESSERTS("Desserts"),
    VEGETARIAN_FRIENDLY("Vegetarian-Friendly"),
    MEAT("Meat")
}
```

**Important**: When sending to API, use the exact string value (e.g., `"Spicy"`, `"Street food"`, `"Vegetarian-Friendly"`)

---

## 🔌 New API Endpoints

### 1. Get All Food Types

**Endpoint**: `GET /posts/food-types`

**Description**: Returns an array of all available food types. Use this to dynamically generate filter buttons in the frontend.

**Response**: Array of strings

**Example Request**:
```http
GET http://10.0.2.2:3000/posts/food-types
```

**Response**:
```json
[
  "Spicy",
  "Healthy",
  "Mashwi",
  "Couscous",
  "Street food",
  "Fast food",
  "Seafood",
  "Fried",
  "Desserts",
  "Vegetarian-Friendly",
  "Meat"
]
```

**Response Codes**:
- `200 OK`: Success

**Usage**: Call this endpoint when the app starts or when the feed screen loads to get all available food types and generate filter buttons dynamically.

---

### 2. Filter Posts by Food Type

**Endpoint**: `GET /posts/by-food-type/:foodType`

**Path Parameters**:
- `foodType` (String): One of the FoodType enum values

**Description**: Retrieves all posts filtered by a specific food type. Results are sorted by newest first.

**Example Requests**:
```http
GET http://10.0.2.2:3000/posts/by-food-type/Spicy
GET http://10.0.2.2:3000/posts/by-food-type/Street%20food
GET http://10.0.2.2:3000/posts/by-food-type/Vegetarian-Friendly
```

**Note**: For food types with spaces (e.g., "Street food", "Fast food"), URL encode them:
- `"Street food"` → `"Street%20food"`
- `"Fast food"` → `"Fast%20food"`

**Response Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid food type

**Error Response** (400):
```json
{
  "message": "Invalid food type. Must be one of: Spicy, Healthy, Mashwi, Couscous, Street food, Fast food, Seafood, Fried, Desserts, Vegetarian-Friendly, Meat",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 3. Create Post (Updated)

**Endpoint**: `POST /posts`

**Headers**:
```
x-user-id: <user-id>
x-owner-type: UserAccount | ProfessionalAccount
Content-Type: application/json
```

**Request Body** (Updated):
```json
{
  "caption": "Delicious spicy dish!",
  "mediaUrls": ["http://10.0.2.2:3000/uploads/image.jpg"],
  "mediaType": "image",
  "foodType": "Spicy",
  "price": 30.0,
  "preparationTime": 15
}
```

**New Required Field**: `foodType` (must be one of the FoodType enum values)

**New Optional Fields**:
- `price` (Double): Optional, must be >= 0
- `preparationTime` (Int): Optional, must be >= 0

**Response**: Post object with all fields including the new ones

---

## 📦 Data Models

### Updated Post Model (Kotlin Data Class)

```kotlin
data class Post(
    val _id: String,
    val ownerId: String,
    val ownerModel: String, // "UserAccount" or "ProfessionalAccount"
    val caption: String,
    val mediaUrls: List<String>,
    val mediaType: String, // "image", "reel", "carousel"
    val foodType: String, // NEW: Required field
    val price: Double? = null, // NEW: Optional
    val preparationTime: Int? = null, // NEW: Optional
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val saveCount: Int = 0,
    val thumbnailUrl: String? = null,
    val viewsCount: Int = 0,
    val duration: Double? = null,
    val aspectRatio: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val ownerId_populated: OwnerInfo? = null, // Populated owner data
    val comments: List<Comment>? = null
)

data class OwnerInfo(
    val _id: String,
    val username: String? = null,
    val fullName: String? = null,
    val profilePictureUrl: String? = null,
    val followerCount: Int = 0,
    val followingCount: Int = 0,
    val email: String? = null,
    val professionalData: ProfessionalData? = null
)

data class ProfessionalData(
    val fullName: String? = null,
    val licenseNumber: String? = null,
    val profilePictureUrl: String? = null
)
```

### Create Post Request Model

```kotlin
data class CreatePostRequest(
    val caption: String,
    val mediaUrls: List<String>,
    val mediaType: String, // "image", "reel", "carousel"
    val foodType: String, // NEW: Required
    val price: Double? = null, // NEW: Optional
    val preparationTime: Int? = null // NEW: Optional
)
```

---

## 📝 Example Requests & Responses

### Example 1: Create Post with Food Type and Price

**Request**:
```kotlin
val createPostRequest = CreatePostRequest(
    caption = "Amazing spicy couscous!",
    mediaUrls = listOf("http://10.0.2.2:3000/uploads/couscous.jpg"),
    mediaType = "image",
    foodType = "Spicy",
    price = 25.5,
    preparationTime = 30
)
```

**Response**:
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "ownerId": "60c72b2f9b1d8c001c8e4d1a",
  "ownerModel": "UserAccount",
  "caption": "Amazing spicy couscous!",
  "mediaUrls": ["http://10.0.2.2:3000/uploads/couscous.jpg"],
  "mediaType": "image",
  "foodType": "Spicy",
  "price": 25.5,
  "preparationTime": 30,
  "likeCount": 0,
  "commentCount": 0,
  "saveCount": 0,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "ownerId_populated": {
    "_id": "60c72b2f9b1d8c001c8e4d1a",
    "username": "chef_ahmed",
    "fullName": "Ahmed Ben Ali",
    "profilePictureUrl": "http://10.0.2.2:3000/uploads/profile.jpg"
  }
}
```

### Example 2: Get Saved Posts

**Request**:
```kotlin
// Retrofit/OkHttp call
GET /posts/saved
Header: x-user-id = "60c72b2f9b1d8c001c8e4d1a"
```

**Response**:
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "ownerId": "60c72b2f9b1d8c001c8e4d1a",
    "ownerModel": "ProfessionalAccount",
    "caption": "Delicious seafood platter",
    "mediaUrls": ["http://10.0.2.2:3000/uploads/seafood.jpg"],
    "mediaType": "image",
    "foodType": "Seafood",
    "price": 45.0,
    "preparationTime": 20,
    "likeCount": 15,
    "commentCount": 3,
    "saveCount": 5,
    "comments": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
        "userId": "60c72b2f9b1d8c001c8e4d1b",
        "text": "Looks amazing!",
        "createdAt": "2024-01-15T11:00:00.000Z"
      }
    ],
    "ownerId_populated": {
      "_id": "60c72b2f9b1d8c001c8e4d1a",
      "professionalData": {
        "fullName": "Restaurant Le Gourmet",
        "profilePictureUrl": "http://10.0.2.2:3000/uploads/restaurant.jpg"
      }
    }
  }
]
```

### Example 3: Filter by Food Type

**Request**:
```kotlin
// URL encode spaces
GET /posts/by-food-type/Street%20food
```

**Response**: Same format as Example 2, but filtered to only include posts with `foodType: "Street food"`

---

## 🎨 Frontend Display Guidelines

### Price Display
```kotlin
fun formatPrice(price: Double?): String {
    return if (price != null) {
        "${price}TND"
    } else {
        "" // or "Price not available"
    }
}

// Examples:
// price = 30.0 → "30.0TND"
// price = 6.9 → "6.9TND"
// price = null → "" or "Price not available"
```

### Preparation Time Display
```kotlin
fun formatPreparationTime(minutes: Int?): String {
    return if (minutes != null) {
        "$minutes minutes"
    } else {
        "" // or "Time not available"
    }
}

// Examples:
// preparationTime = 15 → "15 minutes"
// preparationTime = 30 → "30 minutes"
// preparationTime = null → "" or "Time not available"
```

### Food Type Display
- Display the food type as-is (e.g., "Spicy", "Street food", "Vegetarian-Friendly")
- Consider using chips/badges for visual distinction
- You may want to add icons or colors for each food type

---

## 🔧 Integration Checklist

### For Creating Posts:
- [ ] Add `foodType` dropdown/picker with all 11 food types
- [ ] Add optional `price` input field (Double/Float)
- [ ] Add optional `preparationTime` input field (Int)
- [ ] Update CreatePostRequest model to include new fields
- [ ] Validate foodType is selected (required)
- [ ] Validate price >= 0 if provided
- [ ] Validate preparationTime >= 0 if provided

### For Displaying Posts:
- [ ] Update Post model to include `foodType`, `price`, `preparationTime`
- [ ] Display food type (e.g., as a chip/badge)
- [ ] Display price with "TND" suffix (e.g., "30TND")
- [ ] Display preparation time with "minutes" suffix (e.g., "15 minutes")
- [ ] Handle null values gracefully (don't show if not provided)


### For Food Type Filtering:
- [ ] Call GET `/posts/food-types` on app start/screen load
- [ ] Store food types in state/local storage
- [ ] Generate filter buttons dynamically from API response
- [ ] Create food type filter UI (dropdown, chips, or tabs)
- [ ] Implement GET `/posts/by-food-type/:foodType` endpoint
- [ ] URL encode food types with spaces ("Street food" → "Street%20food")
- [ ] Handle invalid food type errors
- [ ] Display filtered results
- [ ] Optionally refresh food types list periodically or on pull-to-refresh

---

## ⚠️ Important Notes

1. **Food Type Values**: Use exact string values as shown in the enum. Case-sensitive.

2. **URL Encoding**: Food types with spaces must be URL encoded:
   - `"Street food"` → `"Street%20food"`
   - `"Fast food"` → `"Fast%20food"`

3. **Owner Full Name**: 
   - For `UserAccount`: Use `ownerId_populated.fullName`
   - For `ProfessionalAccount`: Use `ownerId_populated.professionalData.fullName`

4. **Optional Fields**: Both `price` and `preparationTime` are optional. Check for null before displaying.

5. **Base URL**: Remember to use `10.0.2.2` for Android Emulator, or your server's actual IP for physical devices.

6. **Headers**: Always include `x-user-id` header for endpoints that require it (like saved posts).

---

## 🐛 Error Handling

### Common Error Responses

**400 Bad Request - Invalid Food Type**:
```json
{
  "message": "Invalid food type. Must be one of: Spicy, Healthy, Mashwi, Couscous, Street food, Fast food, Seafood, Fried, Desserts, Vegetarian-Friendly, Meat",
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request - Missing Required Field**:
```json
{
  "message": ["foodType must be one of the following values: Spicy, Healthy, Mashwi, Couscous, Street food, Fast food, Seafood, Fried, Desserts, Vegetarian-Friendly, Meat"],
  "error": "Bad Request",
  "statusCode": 400
}
```

**400 Bad Request - Invalid User ID**:
```json
{
  "message": "x-user-id header is required.",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## 📱 Example Jetpack Compose Code Snippets

### Fetch Food Types from API

```kotlin
// Retrofit Interface
interface PostsApi {
    @GET("posts/food-types")
    suspend fun getFoodTypes(): List<String>
}

// ViewModel or Repository
class PostsRepository(private val api: PostsApi) {
    suspend fun getFoodTypes(): Result<List<String>> {
        return try {
            val foodTypes = api.getFoodTypes()
            Result.success(foodTypes)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// Usage in Composable
@Composable
fun FoodTypeFilters(
    viewModel: PostsViewModel,
    onFoodTypeSelected: (String) -> Unit
) {
    val foodTypes by viewModel.foodTypes.collectAsState()
    
    LaunchedEffect(Unit) {
        viewModel.loadFoodTypes()
    }
    
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(horizontal = 16.dp)
    ) {
        items(foodTypes) { foodType ->
            FoodTypeFilterButton(
                foodType = foodType,
                onClick = { onFoodTypeSelected(foodType) }
            )
        }
    }
}
```

### Food Type Enum (Kotlin) - Optional Helper
```kotlin
enum class FoodType(val displayName: String) {
    SPICY("Spicy"),
    HEALTHY("Healthy"),
    MASHWI("Mashwi"),
    COUSCOUS("Couscous"),
    STREET_FOOD("Street food"),
    FAST_FOOD("Fast food"),
    SEAFOOD("Seafood"),
    FRIED("Fried"),
    DESSERTS("Desserts"),
    VEGETARIAN_FRIENDLY("Vegetarian-Friendly"),
    MEAT("Meat");
    
    companion object {
        fun fromString(value: String): FoodType? {
            return values().find { it.displayName == value }
        }
    }
}
```

### Display Price Composable
```kotlin
@Composable
fun PriceDisplay(price: Double?) {
    if (price != null) {
        Text(
            text = "${price}TND",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
    }
}
```

### Display Preparation Time Composable
```kotlin
@Composable
fun PreparationTimeDisplay(minutes: Int?) {
    if (minutes != null) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Timer,
                contentDescription = "Preparation time",
                modifier = Modifier.size(16.dp)
            )
            Text(
                text = "$minutes minutes",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
```

---

## ✅ Testing Checklist

- [ ] Create post with all fields (foodType, price, preparationTime)
- [ ] Create post with only required fields (foodType)
- [ ] Create post with foodType and price (no preparationTime)
- [ ] Create post with foodType and preparationTime (no price)
- [ ] Verify food type validation (try invalid food type)
- [ ] Test Get Saved Posts endpoint
- [ ] Test Filter by Food Type for each food type
- [ ] Test URL encoding for "Street food" and "Fast food"
- [ ] Verify price displays as "30TND" or "6.9TND"
- [ ] Verify preparation time displays as "15 minutes"
- [ ] Handle null values for optional fields gracefully

---

**Last Updated**: Based on backend implementation as of latest changes
**Backend Base URL**: `http://10.0.2.2:3000` (for Android Emulator)

