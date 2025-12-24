# Frontend FoodType Update Guide

## Overview
The backend `FoodType` enum has been updated to match the `Category` enum. This guide provides frontend implementation examples for updating your app to use the new FoodType values.

## New FoodType Values

The FoodType enum now includes the following values (all uppercase):

### Core Categories
- `BURGER`
- `PIZZA`
- `PASTA`
- `MEXICAN`
- `SUSHI`
- `ASIAN`
- `INDIAN`
- `MIDEAST`
- `SEAFOOD`
- `CHICKEN`
- `SANDWICHES`
- `SOUPS`

### Dietary and Flavor
- `SALAD`
- `VEGETARIAN`
- `VEGAN`
- `HEALTHY`
- `GLUTEN_FREE`
- `SPICY`

### Item Type and Occasion
- `BREAKFAST`
- `DESSERT`
- `DRINKS`
- `KIDS_MENU`
- `FAMILY_MEAL`

## Kotlin/Compose Implementation Example

### 1. Update FoodType Enum (if you have one)

```kotlin
enum class FoodType(val value: String) {
    // Core Categories
    BURGER("BURGER"),
    PIZZA("PIZZA"),
    PASTA("PASTA"),
    MEXICAN("MEXICAN"),
    SUSHI("SUSHI"),
    ASIAN("ASIAN"),
    INDIAN("INDIAN"),
    MIDEAST("MIDEAST"),
    SEAFOOD("SEAFOOD"),
    CHICKEN("CHICKEN"),
    SANDWICHES("SANDWICHES"),
    SOUPS("SOUPS"),
    
    // Dietary and Flavor
    SALAD("SALAD"),
    VEGETARIAN("VEGETARIAN"),
    VEGAN("VEGAN"),
    HEALTHY("HEALTHY"),
    GLUTEN_FREE("GLUTEN_FREE"),
    SPICY("SPICY"),
    
    // Item Type and Occasion
    BREAKFAST("BREAKFAST"),
    DESSERT("DESSERT"),
    DRINKS("DRINKS"),
    KIDS_MENU("KIDS_MENU"),
    FAMILY_MEAL("FAMILY_MEAL");
    
    companion object {
        fun fromString(value: String): FoodType? {
            return values().find { it.value == value }
        }
    }
}
```

### 2. CategoryIconsRow Component for HomeUserScreen

Here's an example implementation similar to the CategoryIconsRow you mentioned:

```kotlin
@Composable
fun FoodTypeIconsRow(
    onFoodTypeSelected: (FoodType) -> Unit,
    selectedFoodType: FoodType? = null
) {
    val foodTypes = listOf(
        "🍔" to FoodType.BURGER,
        "🍕" to FoodType.PIZZA,
        "🍝" to FoodType.PASTA,
        "🌮" to FoodType.MEXICAN,
        "🍣" to FoodType.SUSHI,
        "🍜" to FoodType.ASIAN,
        "🍛" to FoodType.INDIAN,
        "🥙" to FoodType.MIDEAST,
        "🦞" to FoodType.SEAFOOD,
        "🍗" to FoodType.CHICKEN,
        "🥪" to FoodType.SANDWICHES,
        "🍲" to FoodType.SOUPS,
        "🥗" to FoodType.SALAD,
        "🌱" to FoodType.VEGETARIAN,
        "🌿" to FoodType.VEGAN,
        "🥑" to FoodType.HEALTHY,
        "🌾" to FoodType.GLUTEN_FREE,
        "🌶️" to FoodType.SPICY,
        "🥐" to FoodType.BREAKFAST,
        "🍰" to FoodType.DESSERT,
        "🥤" to FoodType.DRINKS,
        "🍟" to FoodType.KIDS_MENU,
        "👨‍👩‍👧‍👦" to FoodType.FAMILY_MEAL
    )
    
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        items(foodTypes) { (emoji, foodType) ->
            FoodTypeIconItem(
                emoji = emoji,
                foodType = foodType,
                isSelected = selectedFoodType == foodType,
                onClick = { onFoodTypeSelected(foodType) }
            )
        }
    }
}

@Composable
fun FoodTypeIconItem(
    emoji: String,
    foodType: FoodType,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clickable { onClick() }
            .padding(8.dp)
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(56.dp)
                .background(
                    color = if (isSelected) 
                        MaterialTheme.colorScheme.primary 
                    else 
                        MaterialTheme.colorScheme.surfaceVariant,
                    shape = CircleShape
                )
        ) {
            Text(
                text = emoji,
                fontSize = 24.sp
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = foodType.value.replace("_", " ").lowercase().capitalize(),
            style = MaterialTheme.typography.bodySmall,
            color = if (isSelected) 
                MaterialTheme.colorScheme.primary 
            else 
                MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
```

### 3. HomeUserScreen Integration

```kotlin
@Composable
fun HomeUserScreen(
    viewModel: HomeViewModel = hiltViewModel()
) {
    val posts by viewModel.posts.collectAsState()
    val selectedFoodType by viewModel.selectedFoodType.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    
    LaunchedEffect(Unit) {
        viewModel.loadPosts()
    }
    
    Column(modifier = Modifier.fillMaxSize()) {
        // Food Type Filter Row
        FoodTypeIconsRow(
            onFoodTypeSelected = { foodType ->
                viewModel.filterByFoodType(foodType)
            },
            selectedFoodType = selectedFoodType
        )
        
        // Posts List
        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
        } else {
            LazyColumn {
                items(posts) { post ->
                    PostItem(post = post)
                }
            }
        }
    }
}
```

### 4. ViewModel Implementation

```kotlin
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val postsRepository: PostsRepository
) : ViewModel() {
    
    private val _posts = MutableStateFlow<List<Post>>(emptyList())
    val posts: StateFlow<List<Post>> = _posts.asStateFlow()
    
    private val _selectedFoodType = MutableStateFlow<FoodType?>(null)
    val selectedFoodType: StateFlow<FoodType?> = _selectedFoodType.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    fun loadPosts() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val allPosts = postsRepository.getAllPosts()
                _posts.value = allPosts
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun filterByFoodType(foodType: FoodType?) {
        _selectedFoodType.value = foodType
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val filteredPosts = if (foodType != null) {
                    postsRepository.getPostsByFoodType(foodType.value)
                } else {
                    postsRepository.getAllPosts()
                }
                _posts.value = filteredPosts
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }
}
```

### 5. Repository/API Service Update

```kotlin
interface PostsApiService {
    @GET("posts")
    suspend fun getAllPosts(): Response<List<Post>>
    
    @GET("posts/by-food-type/{foodType}")
    suspend fun getPostsByFoodType(
        @Path("foodType") foodType: String
    ): Response<List<Post>>
    
    @GET("posts/food-types")
    suspend fun getAllFoodTypes(): Response<List<String>>
}

class PostsRepository @Inject constructor(
    private val apiService: PostsApiService
) {
    suspend fun getAllPosts(): List<Post> {
        val response = apiService.getAllPosts()
        if (response.isSuccessful) {
            return response.body() ?: emptyList()
        }
        throw Exception("Failed to load posts")
    }
    
    suspend fun getPostsByFoodType(foodType: String): List<Post> {
        val response = apiService.getPostsByFoodType(foodType)
        if (response.isSuccessful) {
            return response.body() ?: emptyList()
        }
        throw Exception("Failed to load posts by food type")
    }
    
    suspend fun getAllFoodTypes(): List<String> {
        val response = apiService.getAllFoodTypes()
        if (response.isSuccessful) {
            return response.body() ?: emptyList()
        }
        throw Exception("Failed to load food types")
    }
}
```

### 6. Post Creation Update

When creating a post, make sure to use the new FoodType values:

```kotlin
data class CreatePostRequest(
    val caption: String,
    val mediaUrls: List<String>,
    val mediaType: String, // "image", "reel", or "carousel"
    val foodType: String, // Use FoodType enum value, e.g., "BURGER", "PIZZA", etc.
    val price: Double? = null,
    val preparationTime: Int? = null
)

// Usage
val createPostRequest = CreatePostRequest(
    caption = "Delicious burger!",
    mediaUrls = listOf("https://..."),
    mediaType = "image",
    foodType = FoodType.BURGER.value, // "BURGER"
    price = 15.0,
    preparationTime = 20
)
```

## API Endpoints

The following endpoints are available:

1. **Get All Posts**: `GET /posts`
2. **Get Posts by Food Type**: `GET /posts/by-food-type/{foodType}`
   - Example: `GET /posts/by-food-type/BURGER`
3. **Get All Food Types**: `GET /posts/food-types`
   - Returns: `["BURGER", "PIZZA", "PASTA", ...]`

## Migration Notes

1. **Old FoodType values** (no longer valid):
   - `Spicy` → Use `SPICY`
   - `Healthy` → Use `HEALTHY`
   - `Mashwi` → Use `MIDEAST` (or appropriate category)
   - `Couscous` → Use `MIDEAST` (or appropriate category)
   - `Street food` → Use appropriate category like `FAST_FOOD`
   - `Fast food` → Use `FAST_FOOD` (if you want to keep this, you may need to add it)
   - `Seafood` → Use `SEAFOOD`
   - `Fried` → Use appropriate category
   - `Desserts` → Use `DESSERT`
   - `Vegetarian-Friendly` → Use `VEGETARIAN`
   - `Meat` → Use appropriate category like `CHICKEN` or `BURGER`

2. **All new values are UPPERCASE** - make sure your frontend handles this correctly.

3. **Database Migration**: Existing posts in the database with old FoodType values will need to be migrated. You may want to create a migration script or handle this in your backend.

## Testing Checklist

- [ ] Update FoodType enum/model in frontend
- [ ] Update post creation form to use new FoodType values
- [ ] Update HomeUserScreen with FoodTypeIconsRow
- [ ] Test filtering by food type
- [ ] Test post creation with new FoodType values
- [ ] Verify API calls use correct FoodType format (uppercase)
- [ ] Test edge cases (null selection, invalid food type, etc.)

