# Frontend Integration Prompt - Food Types Filter

Use this prompt to implement the food types filter feature in your Android Jetpack Compose application.

---

## Context

I have a NestJS backend API for a food social media app. I need to implement a food type filter feature in my Android Jetpack Compose frontend that:

1. Fetches all available food types from the backend API
2. Displays them as horizontal scrollable filter buttons (chips)
3. Allows users to filter posts by food type when a button is clicked

## Backend API Details

**Base URL**: `http://10.0.2.2:3000` (for Android Emulator)

### Endpoint: Get All Food Types

**GET** `/posts/food-types`

**Description**: Returns an array of all available food types as strings.

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

**No authentication required** - This is a public endpoint.

### Endpoint: Filter Posts by Food Type

**GET** `/posts/by-food-type/:foodType`

**Path Parameter**: `foodType` (String) - One of the food types from the list above

**Description**: Returns filtered posts matching the specified food type.

**Example Requests**:
```
GET /posts/by-food-type/Spicy
GET /posts/by-food-type/Street%20food  (URL encoded for spaces)
GET /posts/by-food-type/Vegetarian-Friendly
```

**Note**: Food types with spaces must be URL encoded:
- `"Street food"` → `"Street%20food"`
- `"Fast food"` → `"Fast%20food"`

**Response**: Array of Post objects (same structure as regular posts endpoint)

---

## UI Requirements

Based on the app design, I need:

1. **Horizontal Scrollable Row of Filter Buttons**:
   - Display below the main navigation bar
   - Each button shows a food type name (e.g., "Spicy", "Healthy", "Street food")
   - Buttons should be rounded rectangles/chips
   - Include icons for some food types (optional but nice):
     - Spicy: 🔥 flame icon
     - Healthy: 🥗 leaf icon
     - Desserts: 🍰 cake icon
   - Selected state: Different background color (e.g., dark grey for selected, light grey for unselected)
   - "All" button at the start to show all posts (optional)

2. **Filter Behavior**:
   - When a filter button is clicked:
     - Update the button's selected state
     - Call the filter API endpoint
     - Update the posts feed to show filtered results
   - When "All" is selected (if implemented), show all posts without filter

3. **Loading States**:
   - Show loading indicator while fetching food types
   - Show loading indicator while fetching filtered posts

4. **Error Handling**:
   - Handle network errors gracefully
   - Show error message if food types fail to load
   - Show error message if filter fails

---

## Implementation Requirements

### 1. Data Models

Create a data class for the Post model (if not already exists) that includes:
- `foodType: String` (required field)

### 2. API Service

Create/update Retrofit interface:
```kotlin
interface PostsApi {
    @GET("posts/food-types")
    suspend fun getFoodTypes(): List<String>
    
    @GET("posts/by-food-type/{foodType}")
    suspend fun getPostsByFoodType(
        @Path("foodType") foodType: String
    ): List<Post>
}
```

### 3. Repository/ViewModel

- Fetch food types on screen initialization
- Store food types in state
- Handle filter selection
- Fetch filtered posts when filter is selected
- Manage loading and error states

### 4. UI Components

Create Jetpack Compose components:
- `FoodTypeFilterRow`: Horizontal scrollable row of filter buttons
- `FoodTypeFilterButton`: Individual filter button/chip
- Handle selected/unselected states
- Handle click events to trigger filtering

### 5. State Management

- Selected food type filter state
- Food types list state
- Filtered posts state
- Loading states
- Error states

---

## Expected Behavior

1. **On Screen Load**:
   - Fetch food types from `GET /posts/food-types`
   - Display loading indicator while fetching
   - Once loaded, display filter buttons horizontally
   - Initially show all posts (or "All" button selected)

2. **On Filter Button Click**:
   - Update selected state (visual feedback)
   - URL encode the food type if it contains spaces
   - Call `GET /posts/by-food-type/{foodType}`
   - Show loading indicator
   - Update posts feed with filtered results

3. **URL Encoding**:
   - Automatically handle URL encoding for food types with spaces
   - Use `URLEncoder.encode()` or Retrofit's `@Path` with proper encoding

---

## Technical Stack

- **Language**: Kotlin
- **UI Framework**: Jetpack Compose
- **Networking**: Retrofit + OkHttp
- **State Management**: ViewModel + StateFlow/Flow (or your preferred approach)
- **Dependency Injection**: Hilt/Koin (or your preferred DI solution)

---

## Additional Notes

1. **Caching**: Consider caching food types locally to avoid unnecessary API calls
2. **Refresh**: Optionally add pull-to-refresh to reload food types
3. **Icons**: Food type icons are optional but enhance UX
4. **Accessibility**: Ensure filter buttons are accessible (content descriptions, etc.)
5. **Performance**: Use `LazyRow` for horizontal scrolling of filter buttons

---

## Example Code Structure (Pseudo-code)

```kotlin
// ViewModel
class PostsViewModel : ViewModel() {
    private val _foodTypes = MutableStateFlow<List<String>>(emptyList())
    val foodTypes: StateFlow<List<String>> = _foodTypes.asStateFlow()
    
    private val _selectedFoodType = MutableStateFlow<String?>(null)
    val selectedFoodType: StateFlow<String?> = _selectedFoodType.asStateFlow()
    
    fun loadFoodTypes() {
        viewModelScope.launch {
            try {
                val types = postsRepository.getFoodTypes()
                _foodTypes.value = types
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
    
    fun selectFoodType(foodType: String?) {
        _selectedFoodType.value = foodType
        if (foodType != null) {
            loadFilteredPosts(foodType)
        } else {
            loadAllPosts()
        }
    }
}

// Composable
@Composable
fun FoodTypeFilterRow(
    foodTypes: List<String>,
    selectedFoodType: String?,
    onFoodTypeSelected: (String?) -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(horizontal = 16.dp)
    ) {
        // "All" button (optional)
        item {
            FilterChip(
                selected = selectedFoodType == null,
                onClick = { onFoodTypeSelected(null) },
                label = { Text("All") }
            )
        }
        
        // Food type buttons
        items(foodTypes) { foodType ->
            FilterChip(
                selected = selectedFoodType == foodType,
                onClick = { onFoodTypeSelected(foodType) },
                label = { Text(foodType) }
            )
        }
    }
}
```

---

## Testing Checklist

- [ ] Food types are fetched successfully on screen load
- [ ] Filter buttons are displayed correctly
- [ ] Filter buttons are horizontally scrollable
- [ ] Selected state is visually distinct
- [ ] Clicking a filter button triggers API call
- [ ] URL encoding works for food types with spaces ("Street food", "Fast food")
- [ ] Filtered posts are displayed correctly
- [ ] Loading states are shown appropriately
- [ ] Error states are handled gracefully
- [ ] "All" button (if implemented) shows all posts
- [ ] Multiple filter selections work correctly
- [ ] Network errors are handled

---

## Questions to Consider

1. Should there be an "All" button to show all posts without filter?
2. Should filter buttons show icons? If yes, which icons for which food types?
3. Should food types be cached locally? For how long?
4. Should there be a pull-to-refresh to reload food types?
5. What should happen if the filter API call fails? Show error or revert to all posts?

---

**Please implement this food type filter feature following the requirements above. Use modern Android development practices with Jetpack Compose, proper state management, and error handling.**

