# iOS Integration Prompt - Food Type Preference & Personalized Feed

Use this prompt to implement the food type preference feature and personalized feed in your iOS Xcode application using SwiftUI and Swift.

---

## Context

I have a NestJS backend API for a food social media app. I need to implement a food type preference feature that:

1. Allows normal users to explicitly "prefer" a post's food type (adds it to their preferences)
2. Personalizes the home feed based on user preferences (70% preferred food types, 30% general)
3. Works seamlessly with the existing post feed

## Backend API Details

**Base URL**: `http://localhost:3000` (for iOS Simulator) or your server IP

### Endpoint 1: Add Food Type Preference

**POST** `/posts/:postId/prefer-foodtype`

**Description**: Adds the food type of a specific post to the user's preferred food types list. This enables personalized feed recommendations.

**Headers**:
```
x-user-id: <normal-user-id> (required)
```

**Path Parameters**:
- `postId` (String): The ID of the post whose food type should be added to preferences

**Request Example**:
```http
POST http://localhost:3000/posts/65a1b2c3d4e5f6g7h8i9j0k1/prefer-foodtype
Headers:
  x-user-id: 60c72b2f9b1d8c001c8e4d1a
```

**Response** (200 OK):
```json
{
  "_id": "60c72b2f9b1d8c001c8e4d1a",
  "username": "user123",
  "fullName": "John Doe",
  "preferredFoodTypes": ["Spicy", "Seafood", "Street food"],
  // ... other user fields
}
```

**Response Codes**:
- `200 OK`: Food type added successfully
- `400 Bad Request`: Invalid post ID or user ID format, or post has no food type
- `404 Not Found`: Post or user not found

**Important Notes**:
- This endpoint is idempotent - calling it multiple times with the same post won't create duplicates
- The food type is automatically extracted from the post
- Only normal users (UserAccount) should use this endpoint

---

### Endpoint 2: Get Personalized Feed

**GET** `/posts`

**Description**: Returns a personalized feed of posts. If user is authenticated and has food preferences, returns 70% preferred food types and 30% general posts. Otherwise returns general feed.

**Headers** (Optional):
```
x-user-id: <normal-user-id>
```

**Request Examples**:

**With Personalization** (User has preferences):
```http
GET http://localhost:3000/posts
Headers:
  x-user-id: 60c72b2f9b1d8c001c8e4d1a
```

**Without Personalization** (No header or no preferences):
```http
GET http://localhost:3000/posts
```

**Response** (200 OK):
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "ownerId": "60c72b2f9b1d8c001c8e4d1a",
    "ownerModel": "UserAccount",
    "caption": "Amazing spicy dish!",
    "mediaUrls": ["http://localhost:3000/uploads/image.jpg"],
    "mediaType": "image",
    "foodType": "Spicy",
    "price": 30.0,
    "preparationTime": 15,
    "likeCount": 10,
    "commentCount": 3,
    "saveCount": 5,
    "ownerId_populated": {
      "_id": "60c72b2f9b1d8c001c8e4d1a",
      "username": "chef_ahmed",
      "fullName": "Ahmed Ben Ali",
      "profilePictureUrl": "http://localhost:3000/uploads/profile.jpg"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
  // ... more posts (70% preferred, 30% general if user has preferences)
]
```

**Feed Logic**:
- **If user has preferences**: Returns ~35 posts matching preferred food types + ~15 general posts (70/30 split)
- **If user has no preferences**: Returns 50 general posts
- **If no userId header**: Returns 50 general posts
- Posts are sorted by `createdAt: -1` (newest first)

---

## UI/UX Requirements

### 1. Preference Button/Indicator

**Location**: On each post card or post detail screen

**States**:
- **Not Preferred**: Show "Prefer" button or icon (e.g., heart outline, star outline, or "Add to Preferences")
- **Preferred**: Show "Preferred ✓" or filled icon (different color, e.g., filled heart/star)
- **Loading**: Show loading indicator while API call is in progress
- **Error**: Show error message or retry option

**Visual Design**:
- Can be a small button, icon, or badge
- Should be visually distinct but not intrusive
- Consider placing it near other interaction buttons (like, comment, save)
- Follow iOS Human Interface Guidelines

**Example Placement**:
```
[Post Image]
[Like] [Comment] [Share] [Prefer] [Save]
```

### 2. Feed Display

**Home Feed Screen**:
- Automatically loads personalized feed if user is logged in
- Shows loading indicator while fetching
- Displays posts in a scrollable list
- Shows "Personalized for you" indicator if preferences are active (optional)

**Feed Behavior**:
- If user has preferences: Show mix of preferred + general posts
- If user has no preferences: Show general feed with message like "Interact with posts to personalize your feed" (optional)
- Pull-to-refresh to reload feed
- Infinite scroll/pagination (if implemented)

### 3. Preference Management (Optional)

**Settings/Profile Section**:
- Show list of preferred food types
- Allow users to remove preferences
- Show count of preferred types
- Visual representation (chips/badges)

---

## Implementation Requirements

### 1. Data Models (Swift)

```swift
// UserAccount model
struct UserAccount: Codable, Identifiable {
    let id: String
    let username: String
    let fullName: String
    // ... other fields
    var preferredFoodTypes: [String] = [] // NEW
}

// Post model
struct Post: Codable, Identifiable {
    let id: String
    let caption: String
    let mediaUrls: [String]
    let foodType: String // Required field
    let price: Double?
    let preparationTime: Int?
    // ... other fields
    var isPreferred: Bool = false // Local state to track if this post's food type is preferred
}

// Owner info model
struct OwnerInfo: Codable {
    let id: String
    let username: String?
    let fullName: String?
    let profilePictureUrl: String?
    let professionalData: ProfessionalData?
}

struct ProfessionalData: Codable {
    let fullName: String?
    let licenseNumber: String?
    let profilePictureUrl: String?
}
```

### 2. API Service (URLSession + Combine)

```swift
import Foundation
import Combine

class PostsAPIService {
    private let baseURL = "http://localhost:3000"
    private let session: URLSession
    
    init(session: URLSession = .shared) {
        self.session = session
    }
    
    // Add food type preference
    func preferFoodType(postId: String, userId: String) -> AnyPublisher<UserAccount, Error> {
        guard let url = URL(string: "\(baseURL)/posts/\(postId)/prefer-foodtype") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(userId, forHTTPHeaderField: "x-user-id")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: UserAccount.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
    
    // Get personalized feed
    func getPosts(userId: String? = nil) -> AnyPublisher<[Post], Error> {
        guard let url = URL(string: "\(baseURL)/posts") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let userId = userId {
            request.setValue(userId, forHTTPHeaderField: "x-user-id")
        }
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: [Post].self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
}
```

### 3. ViewModel (ObservableObject)

```swift
import Foundation
import Combine

@MainActor
class PostsViewModel: ObservableObject {
    @Published var posts: [Post] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var userPreferences: [String] = []
    @Published var preferringPostIds: Set<String> = []
    
    private let apiService: PostsAPIService
    private let userRepository: UserRepository
    private var cancellables = Set<AnyCancellable>()
    
    init(apiService: PostsAPIService = PostsAPIService(), 
         userRepository: UserRepository = UserRepository.shared) {
        self.apiService = apiService
        self.userRepository = userRepository
        loadUserPreferences()
    }
    
    // Load personalized feed
    func loadFeed() {
        isLoading = true
        errorMessage = nil
        
        let userId = userRepository.getCurrentUserId()
        
        apiService.getPosts(userId: userId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    if case .failure(let error) = completion {
                        self?.errorMessage = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] fetchedPosts in
                    self?.posts = fetchedPosts
                    self?.updatePreferredStates()
                }
            )
            .store(in: &cancellables)
    }
    
    // Prefer a post's food type
    func preferFoodType(postId: String) {
        guard let userId = userRepository.getCurrentUserId() else {
            errorMessage = "User not logged in"
            return
        }
        
        preferringPostIds.insert(postId)
        
        apiService.preferFoodType(postId: postId, userId: userId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.preferringPostIds.remove(postId)
                    if case .failure(let error) = completion {
                        self?.errorMessage = "Failed to add preference: \(error.localizedDescription)"
                    }
                },
                receiveValue: { [weak self] updatedUser in
                    self?.userPreferences = updatedUser.preferredFoodTypes
                    self?.updatePreferredStates()
                    // Optionally reload feed
                    // self?.loadFeed()
                }
            )
            .store(in: &cancellables)
    }
    
    // Check if post's food type is preferred
    func isFoodTypePreferred(foodType: String) -> Bool {
        return userPreferences.contains(foodType)
    }
    
    // Check if currently preferring a post
    func isPreferring(postId: String) -> Bool {
        return preferringPostIds.contains(postId)
    }
    
    // Update preferred states for all posts
    private func updatePreferredStates() {
        posts = posts.map { post in
            var updatedPost = post
            updatedPost.isPreferred = isFoodTypePreferred(foodType: post.foodType)
            return updatedPost
        }
    }
    
    // Load user preferences from cache
    private func loadUserPreferences() {
        if let user = userRepository.getCurrentUser() {
            userPreferences = user.preferredFoodTypes
        }
    }
    
    // Refresh feed
    func refreshFeed() {
        loadFeed()
    }
}
```

### 4. User Repository (Singleton)

```swift
import Foundation

class UserRepository {
    static let shared = UserRepository()
    
    private let userDefaults = UserDefaults.standard
    private let userIdKey = "current_user_id"
    private let userKey = "current_user"
    
    private init() {}
    
    func getCurrentUserId() -> String? {
        return userDefaults.string(forKey: userIdKey)
    }
    
    func getCurrentUser() -> UserAccount? {
        guard let data = userDefaults.data(forKey: userKey),
              let user = try? JSONDecoder().decode(UserAccount.self, from: data) else {
            return nil
        }
        return user
    }
    
    func saveCurrentUser(_ user: UserAccount) {
        userDefaults.set(user.id, forKey: userIdKey)
        if let data = try? JSONEncoder().encode(user) {
            userDefaults.set(data, forKey: userKey)
        }
    }
    
    func clearCurrentUser() {
        userDefaults.removeObject(forKey: userIdKey)
        userDefaults.removeObject(forKey: userKey)
    }
}
```

### 5. UI Components (SwiftUI)

#### A. Preference Button View

```swift
import SwiftUI

struct PreferFoodTypeButton: View {
    let post: Post
    let isPreferred: Bool
    let isLoading: Bool
    let onPreferClick: () -> Void
    
    var body: some View {
        Button(action: onPreferClick) {
            Group {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: isPreferred ? "heart.fill" : "heart")
                        .foregroundColor(isPreferred ? .red : .gray)
                        .font(.system(size: 20))
                }
            }
            .frame(width: 30, height: 30)
        }
        .disabled(isLoading)
    }
}
```

#### B. Post Card View

```swift
import SwiftUI

struct PostCard: View {
    let post: Post
    @ObservedObject var viewModel: PostsViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Post image
            AsyncImage(url: URL(string: post.mediaUrls.first ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
            }
            .frame(height: 300)
            .clipped()
            
            // Post actions row
            HStack {
                // Left side actions
                HStack(spacing: 16) {
                    Button(action: { /* Like action */ }) {
                        Image(systemName: "heart")
                            .font(.system(size: 20))
                    }
                    
                    Button(action: { /* Comment action */ }) {
                        Image(systemName: "message")
                            .font(.system(size: 20))
                    }
                    
                    Button(action: { /* Share action */ }) {
                        Image(systemName: "paperplane")
                            .font(.system(size: 20))
                    }
                }
                
                Spacer()
                
                // Right side actions
                HStack(spacing: 16) {
                    // Prefer button
                    PreferFoodTypeButton(
                        post: post,
                        isPreferred: post.isPreferred,
                        isLoading: viewModel.isPreferring(postId: post.id),
                        onPreferClick: {
                            viewModel.preferFoodType(postId: post.id)
                        }
                    )
                    
                    Button(action: { /* Save action */ }) {
                        Image(systemName: "bookmark")
                            .font(.system(size: 20))
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            
            // Post details
            Text(post.caption)
                .font(.body)
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
            
            // Food type badge
            FoodTypeChip(foodType: post.foodType)
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}
```

#### C. Home Feed View

```swift
import SwiftUI

struct HomeFeedView: View {
    @StateObject private var viewModel = PostsViewModel()
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.isLoading && viewModel.posts.isEmpty {
                    ProgressView("Loading feed...")
                } else if let error = viewModel.errorMessage {
                    VStack(spacing: 16) {
                        Text("Error")
                            .font(.headline)
                        Text(error)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding()
                        
                        Button("Retry") {
                            viewModel.refreshFeed()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                } else if viewModel.posts.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "photo.on.rectangle")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("No posts available")
                            .font(.headline)
                            .foregroundColor(.secondary)
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            // Personalized feed banner (optional)
                            if !viewModel.userPreferences.isEmpty {
                                PersonalizedFeedBanner(
                                    preferredTypes: viewModel.userPreferences
                                )
                                .padding(.horizontal)
                            }
                            
                            // Posts
                            ForEach(viewModel.posts) { post in
                                PostCard(post: post, viewModel: viewModel)
                                    .padding(.horizontal)
                            }
                        }
                        .padding(.vertical)
                    }
                    .refreshable {
                        viewModel.refreshFeed()
                    }
                }
            }
            .navigationTitle("Feed")
            .onAppear {
                if viewModel.posts.isEmpty {
                    viewModel.loadFeed()
                }
            }
        }
    }
}
```

#### D. Personalized Feed Banner (Optional)

```swift
import SwiftUI

struct PersonalizedFeedBanner: View {
    let preferredTypes: [String]
    
    var body: some View {
        HStack {
            Image(systemName: "person.circle.fill")
                .foregroundColor(.blue)
                .font(.system(size: 20))
            
            Text("Personalized for you")
                .font(.headline)
            
            Spacer()
            
            Text("\(preferredTypes.count) preferences")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.blue.opacity(0.1))
        .cornerRadius(12)
    }
}
```

#### E. Food Type Chip

```swift
import SwiftUI

struct FoodTypeChip: View {
    let foodType: String
    
    var body: some View {
        Text(foodType)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.blue.opacity(0.2))
            .foregroundColor(.blue)
            .cornerRadius(16)
    }
}
```

---

## User Flow

### Scenario 1: User Prefers a Food Type

1. User views a post with food type "Spicy"
2. User taps "Prefer" button (heart icon)
3. Loading indicator shows on button
4. API call: `POST /posts/{postId}/prefer-foodtype`
5. Button updates to "Preferred ✓" (filled heart icon)
6. User's preferences are updated locally
7. Optionally: Feed refreshes to show more "Spicy" posts

### Scenario 2: User Views Personalized Feed

1. User opens home feed
2. If user is logged in: API call with `x-user-id` header
3. Backend returns personalized feed (70% preferred, 30% general)
4. Feed displays with posts matching user's preferred food types prioritized
5. Optional banner shows "Personalized for you"

### Scenario 3: User Without Preferences

1. User opens home feed
2. API call without `x-user-id` or user has no preferences
3. Backend returns general feed
4. Feed displays normally
5. Optional message: "Interact with posts to personalize your feed"

---

## State Management Strategy

### Using @Published Properties

The `PostsViewModel` uses `@Published` properties that automatically trigger UI updates:

```swift
@Published var posts: [Post] = []
@Published var isLoading: Bool = false
@Published var userPreferences: [String] = []
```

### Using Combine Publishers

API calls use Combine publishers for reactive programming:

```swift
apiService.getPosts(userId: userId)
    .receive(on: DispatchQueue.main)
    .sink(
        receiveCompletion: { /* handle completion */ },
        receiveValue: { /* handle value */ }
    )
    .store(in: &cancellables)
```

---

## Error Handling

### Network Errors

```swift
apiService.preferFoodType(postId: postId, userId: userId)
    .receive(on: DispatchQueue.main)
    .sink(
        receiveCompletion: { completion in
            if case .failure(let error) = completion {
                if let urlError = error as? URLError {
                    switch urlError.code {
                    case .notConnectedToInternet:
                        errorMessage = "No internet connection"
                    case .timedOut:
                        errorMessage = "Request timed out"
                    default:
                        errorMessage = "Network error occurred"
                    }
                } else if let httpError = error as? HTTPError {
                    switch httpError.statusCode {
                    case 400:
                        errorMessage = "Invalid request"
                    case 404:
                        errorMessage = "Post or user not found"
                    default:
                        errorMessage = "Server error"
                    }
                } else {
                    errorMessage = "An unexpected error occurred"
                }
            }
        },
        receiveValue: { /* handle success */ }
    )
```

### User Feedback

- Show alert on error: `Alert` with retry option
- Show toast/banner on success: "Added to preferences"
- Show loading state: `ProgressView` or activity indicator

---

## Performance Considerations

1. **Caching**: Cache user preferences in UserDefaults to avoid repeated API calls
2. **Debouncing**: Debounce preference button taps to prevent rapid API calls
3. **Optimistic Updates**: Update UI immediately, rollback on error
4. **Image Caching**: Use `AsyncImage` with proper caching for post images
5. **Lazy Loading**: Use `LazyVStack` for efficient scrolling
6. **Feed Refresh**: Consider if feed should auto-refresh after adding preference

---

## Testing Checklist

- [ ] User can prefer a post's food type
- [ ] Button state updates correctly (preferred/not preferred)
- [ ] Loading indicator shows during API call
- [ ] Error handling works (network errors, 404, etc.)
- [ ] Feed loads personalized content when user has preferences
- [ ] Feed loads general content when user has no preferences
- [ ] Feed works without authentication (no userId header)
- [ ] Duplicate preferences are prevented (idempotent)
- [ ] User preferences are cached locally
- [ ] Pull-to-refresh works correctly
- [ ] Feed shows correct mix (70% preferred, 30% general)
- [ ] Multiple preferences work correctly
- [ ] UI updates immediately on preference change
- [ ] Error messages are user-friendly
- [ ] Network connectivity is handled gracefully
- [ ] App state persistence works correctly

---

## Additional Features (Optional)

1. **Preference Management Screen**:
   - View all preferred food types
   - Remove preferences
   - See preference count

2. **Analytics**:
   - Track which food types are most preferred
   - Track feed engagement with personalized vs general posts

3. **Smart Suggestions**:
   - Suggest food types based on user's interaction history
   - Show "You might also like" based on preferences

4. **Preference Badge**:
   - Show badge on posts matching user's preferences
   - "Recommended for you" indicator

---

## iOS-Specific Considerations

### 1. Info.plist Configuration

Add App Transport Security settings if using HTTP (for development):

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### 2. JSON Decoding

Handle date formatting for `createdAt`:

```swift
let decoder = JSONDecoder()
let formatter = DateFormatter()
formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
formatter.timeZone = TimeZone(secondsFromGMT: 0)
decoder.dateDecodingStrategy = .formatted(formatter)
```

### 3. Error Types

Create custom error types:

```swift
enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(Error)
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}
```

### 4. Network Reachability

Monitor network connectivity:

```swift
import Network

class NetworkMonitor: ObservableObject {
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")
    @Published var isConnected = false
    
    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
            }
        }
        monitor.start(queue: queue)
    }
}
```

---

## Integration Notes

1. **Authentication**: Ensure `x-user-id` header is included in all API calls when user is logged in
2. **User Context**: Store current user ID in UserRepository or similar
3. **State Persistence**: Save user preferences to UserDefaults
4. **Feed Refresh**: Decide when to refresh feed (immediately after preference, on pull-to-refresh, or on screen appear)
5. **Background Tasks**: Handle app backgrounding/foregrounding appropriately
6. **Memory Management**: Properly cancel Combine subscriptions to prevent memory leaks

---

## Example Complete Flow

```swift
// 1. User taps prefer button
PreferFoodTypeButton(
    post: post,
    isPreferred: false,
    onPreferClick: {
        viewModel.preferFoodType(postId: post.id)
    }
)

// 2. ViewModel handles the action
func preferFoodType(postId: String) {
    preferringPostIds.insert(postId)
    
    apiService.preferFoodType(postId: postId, userId: currentUserId)
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { [weak self] completion in
                self?.preferringPostIds.remove(postId)
                if case .failure(let error) = completion {
                    self?.errorMessage = "Failed to add preference"
                }
            },
            receiveValue: { [weak self] updatedUser in
                self?.userPreferences = updatedUser.preferredFoodTypes
                self?.updatePreferredStates()
            }
        )
        .store(in: &cancellables)
}

// 3. Feed automatically shows more of that food type
// (if feed refresh is enabled)
```

---

## Swift Package Dependencies (Optional)

Consider using these packages for enhanced functionality:

1. **Alamofire**: More robust networking library
2. **Kingfisher**: Advanced image loading and caching
3. **CombineExt**: Additional Combine operators

---

**Please implement this food type preference feature following the requirements above. Use modern iOS development practices with SwiftUI, Combine, proper state management, error handling, and user feedback. Follow iOS Human Interface Guidelines for the best user experience.**

