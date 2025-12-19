# Notification System Updates - Multi-Entity Support

## Overview

The notification system has been extended to support multiple entity types beyond just orders. The system now supports notifications for Events, Posts, Deals, Reclamations, and Chat messages, with full entity reference tracking for seamless navigation.

---

## 🔄 What Changed

### 1. **Notification Schema Updates** (`src/notification/schema/notification.schema.ts`)

#### New Notification Types Added:
```typescript
// Event notifications
EVENT_CREATED = 'event_created'

// Post notifications
POST_CREATED = 'post_created'
POST_LIKED = 'post_liked'
POST_COMMENTED = 'post_commented'

// Deal notifications
DEAL_CREATED = 'deal_created'

// Reclamation notifications
RECLAMATION_CREATED = 'reclamation_created'
RECLAMATION_UPDATED = 'reclamation_updated'
RECLAMATION_RESPONDED = 'reclamation_responded'

// Chat notifications
MESSAGE_RECEIVED = 'message_received'
CONVERSATION_STARTED = 'conversation_started'
```

#### New Entity Reference Fields:
- `eventId?: Types.ObjectId` - Reference to Event document
- `postId?: Types.ObjectId` - Reference to Post document
- `dealId?: Types.ObjectId` - Reference to Deals document
- `reclamationId?: Types.ObjectId` - Reference to Reclamation document
- `messageId?: Types.ObjectId` - Reference to Message document
- `conversationId?: Types.ObjectId` - Reference to Conversation document

#### Extended Metadata:
The metadata field now supports flexible data for all entity types:
- `eventName`, `eventDate` - For event notifications
- `postCaption` - For post notifications
- `dealName`, `restaurantName` - For deal notifications
- `reclamationStatus` - For reclamation notifications
- `senderName`, `messagePreview` - For chat notifications

---

### 2. **NotificationService Enhancements** (`src/notification/notification.service.ts`)

#### New Helper Methods:

##### `createEventNotification()`
Creates a notification when an event is created.
```typescript
await notificationService.createEventNotification(
  eventId: string,
  eventName: string,
  eventDate?: string,
  userId?: string,
  professionalId?: string,
  metadata?: any
)
```

##### `createPostNotification()`
Creates notifications for post-related events (created, liked, commented).
```typescript
await notificationService.createPostNotification(
  type: NotificationType.POST_CREATED | POST_LIKED | POST_COMMENTED,
  postId: string,
  postCaption?: string,
  ownerId?: string,
  ownerModel?: 'UserAccount' | 'ProfessionalAccount',
  recipientId?: string,
  recipientModel?: 'UserAccount' | 'ProfessionalAccount',
  metadata?: any
)
```

##### `createDealNotification()`
Creates a notification when a new deal is created.
```typescript
await notificationService.createDealNotification(
  dealId: string,
  dealName: string,
  restaurantName?: string,
  userId?: string,
  professionalId?: string,
  metadata?: any
)
```

##### `createReclamationNotification()`
Creates notifications for reclamation events (created, updated, responded).
```typescript
await notificationService.createReclamationNotification(
  type: NotificationType.RECLAMATION_CREATED | RECLAMATION_UPDATED | RECLAMATION_RESPONDED,
  reclamationId: string,
  userId?: string,
  professionalId?: string,
  status?: string,
  metadata?: any
)
```

##### `createChatNotification()`
Creates notifications for chat-related events (messages, conversations).
```typescript
await notificationService.createChatNotification(
  type: NotificationType.MESSAGE_RECEIVED | CONVERSATION_STARTED,
  messageId?: string,
  conversationId?: string,
  senderId?: string,
  senderName?: string,
  recipientId?: string,
  recipientModel?: 'UserAccount' | 'ProfessionalAccount',
  messagePreview?: string,
  metadata?: any
)
```

#### Enhanced Retrieval Methods:
All retrieval methods now populate entity references for easy navigation:
- `getNotificationsByUser()` - Populates all entity types
- `getNotificationsByProfessional()` - Populates all entity types
- `getUnreadNotifications()` - Populates all entity types

When you fetch notifications, you get fully populated entity data:
```typescript
{
  _id: "...",
  type: "event_created",
  title: "New Event Available",
  message: "A new event 'Summer Food Festival' has been created...",
  eventId: {
    _id: "...",
    nom: "Summer Food Festival",
    description: "...",
    date_debut: "...",
    lieu: "...",
    // ... full event data
  },
  isRead: false,
  metadata: { eventName: "...", eventDate: "..." }
}
```

---

### 3. **Service Integrations**

#### Events Service (`src/events/events.service.ts`)
**When:** Event is created
**Notification:** `EVENT_CREATED`
**Recipient:** All users (can be filtered by preferences)
**Details:** Notifies users about new events with event name, date, and location

```typescript
// Automatically called when creating an event
const event = await eventsService.create(createEventDto);
// Notification is created automatically
```

#### Posts Service (`src/posts/posts.service.ts`)
**When:** Post is created
**Notification:** `POST_CREATED`
**Recipient:** Followers of the post owner (extensible)
**Details:** Notifies followers about new posts with caption preview

```typescript
// Automatically called when creating a post
const post = await postsService.create(ownerId, ownerModel, createPostDto);
// Notification is created automatically
```

#### Deals Service (`src/deals/deals.service.ts`)
**When:** Deal is created
**Notification:** `DEAL_CREATED`
**Recipient:** All users or followers
**Details:** Notifies users about new deals with restaurant name and deal description

```typescript
// Automatically called when creating a deal
const deal = await dealsService.create(createDealDto);
// Notification is created automatically
```

#### Reclamation Service (`src/reclamation/reclamation.service.ts`)
**When:** 
1. Reclamation is created → `RECLAMATION_CREATED`
2. Reclamation is responded/updated → `RECLAMATION_UPDATED` or `RECLAMATION_RESPONDED`

**Recipients:**
- Created: Restaurant/Professional account
- Updated/Responded: User account

**Details:**
- Creation: Notifies restaurant about new reclamation with complaint type
- Update: Notifies user about status change or response

```typescript
// When reclamation is created
const reclamation = await reclamationService.create(createDto);
// Restaurant gets notification automatically

// When reclamation is responded
const updated = await reclamationService.respondToReclamation(id, dto, responderId);
// User gets notification automatically
```

#### Chat Service (`src/chat-management/chat-management.service.ts`)
**When:** Message is sent
**Notification:** `MESSAGE_RECEIVED`
**Recipient:** The recipient of the message (other participant in conversation)
**Details:** Notifies recipient with sender name and message preview

```typescript
// When message is sent
const message = await chatService.sendMessage(payload);
// Recipient gets notification automatically
```

---

## 📊 Database Structure

### Notification Document Example

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",  // Or null if for professional
  "professionalId": null,  // Or ID if for professional account
  "type": "message_received",
  "title": "New Message from John Doe",
  "message": "Hey, how are you doing?",
  "messageId": "507f1f77bcf86cd799439012",  // Entity reference
  "conversationId": "507f1f77bcf86cd799439013",
  "isRead": false,
  "metadata": {
    "senderName": "John Doe",
    "messagePreview": "Hey, how are you doing?",
    "messageId": "507f1f77bcf86cd799439012",
    "conversationId": "507f1f77bcf86cd799439013",
    "senderId": "507f191e810c19729de860eb"
  },
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z"
}
```

---

## 🎯 Usage Examples

### Frontend - Fetching Notifications

```typescript
// Get all notifications for a user
GET /notifications/user/:userId
Response: {
  notifications: [
    {
      _id: "...",
      type: "event_created",
      title: "New Event Available",
      message: "...",
      eventId: { /* full event data */ },
      createdAt: "...",
      isRead: false
    },
    {
      _id: "...",
      type: "message_received",
      title: "New Message from Alice",
      message: "...",
      messageId: { /* message data */ },
      conversationId: { /* conversation data */ },
      createdAt: "...",
      isRead: false
    }
    // ... more notifications
  ]
}
```

### Frontend - Handling Notification Clicks

```typescript
// When user clicks on a notification
function handleNotificationClick(notification) {
  switch(notification.type) {
    case 'event_created':
      navigate(`/events/${notification.eventId._id}`);
      break;
    case 'post_created':
      navigate(`/posts/${notification.postId._id}`);
      break;
    case 'deal_created':
      navigate(`/deals/${notification.dealId._id}`);
      break;
    case 'reclamation_created':
    case 'reclamation_updated':
    case 'reclamation_responded':
      navigate(`/reclamations/${notification.reclamationId._id}`);
      break;
    case 'message_received':
    case 'conversation_started':
      navigate(`/chat/${notification.conversationId._id}`);
      break;
    case 'order_created':
    case 'order_confirmed':
    // ... existing order types
      navigate(`/orders/${notification.orderId._id}`);
      break;
  }
  
  // Mark as read
  markNotificationAsRead(notification._id);
}
```

---

## 🔧 API Endpoints

All existing notification endpoints work with the new entity types:

### Get User Notifications
```
GET /notifications/user/:userId
```
Returns all notifications for a user with all entity references populated.

### Get Professional Notifications
```
GET /notifications/professional/:professionalId
```
Returns all notifications for a professional with all entity references populated.

### Get Unread Notifications
```
GET /notifications/unread?userId=:userId
GET /notifications/unread?professionalId=:professionalId
```
Returns unread notifications with all entity references populated.

### Mark as Read
```
PATCH /notifications/:notificationId/read
```

### Mark All as Read
```
PATCH /notifications/read-all?userId=:userId
PATCH /notifications/read-all?professionalId=:professionalId
```

---

## 🚀 Features

### ✅ Multi-Entity Support
- Notifications work with 6+ entity types
- Each notification stores the relevant entity reference
- Full entity data is populated when fetching notifications

### ✅ Automatic Creation
- Notifications are automatically created when:
  - Events are created
  - Posts are created
  - Deals are created
  - Reclamations are created/updated/responded
  - Messages are sent

### ✅ Smart Recipients
- User accounts get user-specific notifications
- Professional accounts get professional-specific notifications
- Chat notifications automatically identify recipient type

### ✅ Rich Metadata
- Each notification includes relevant metadata
- Frontend can display preview information
- Supports custom data per entity type

### ✅ Backward Compatible
- Existing order notifications still work
- No breaking changes to existing API
- All existing endpoints function as before

---

## 📝 Files Modified

1. `src/notification/schema/notification.schema.ts` - Schema updates
2. `src/notification/dto/create-notification.dto.ts` - DTO updates
3. `src/notification/notification.service.ts` - Service enhancements
4. `src/events/events.module.ts` - Added NotificationModule
5. `src/events/events.service.ts` - Event notification integration
6. `src/deals/deals.module.ts` - Added NotificationModule
7. `src/deals/deals.service.ts` - Deal notification integration
8. `src/posts/posts.module.ts` - Added NotificationModule
9. `src/posts/posts.service.ts` - Post notification integration
10. `src/reclamation/reclamation.module.ts` - Added NotificationModule
11. `src/reclamation/reclamation.service.ts` - Reclamation notification integration
12. `src/chat-management/chat-management.module.ts` - Added NotificationModule
13. `src/chat-management/chat-management.service.ts` - Chat notification integration

---

## 🎨 Frontend Integration Guide

### Display Notification List
```typescript
// Fetch notifications
const notifications = await api.get(`/notifications/user/${userId}`);

// Display in UI
notifications.forEach(notification => {
  // Show icon based on type
  const icon = getIconForType(notification.type);
  
  // Show entity-specific information
  if (notification.eventId) {
    showEventPreview(notification.eventId);
  } else if (notification.messageId) {
    showMessagePreview(notification.messageId);
  }
  // ... etc
});
```

### Navigation on Click
```typescript
function navigateToEntity(notification) {
  const entityMap = {
    'event_created': () => `/events/${notification.eventId._id}`,
    'post_created': () => `/posts/${notification.postId._id}`,
    'deal_created': () => `/deals/${notification.dealId._id}`,
    'reclamation_created': () => `/reclamations/${notification.reclamationId._id}`,
    'message_received': () => `/chat/${notification.conversationId._id}`,
    // ... order types
  };
  
  const navigator = entityMap[notification.type];
  if (navigator) {
    navigate(navigator());
    markAsRead(notification._id);
  }
}
```

---

## ✨ Next Steps / Future Enhancements

1. **Real-time Notifications**: Integrate with WebSocket for live notifications
2. **Notification Preferences**: Allow users to configure which notifications they want
3. **Batch Notifications**: Group similar notifications together
4. **Push Notifications**: Add mobile push notification support
5. **Email Notifications**: Optional email notifications for important events
6. **Notification Filters**: Filter notifications by type, entity, date range
7. **Read Receipts**: Track when notifications are viewed
8. **Action Buttons**: Add quick action buttons to notifications (e.g., "Accept", "Decline")

---

## 📚 Summary

The notification system now supports a comprehensive set of entities and provides:
- **Automatic notification creation** for key events
- **Rich entity references** for easy navigation
- **Flexible metadata** for custom data
- **Type-safe implementation** with proper TypeScript types
- **Backward compatibility** with existing order notifications

All notifications are stored with proper entity references, making it easy for the frontend to navigate to the relevant detail pages when a notification is clicked.

