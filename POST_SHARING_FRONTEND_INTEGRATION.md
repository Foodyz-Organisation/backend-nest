# Post Sharing Feature - Frontend Integration Guide

## Overview

This feature allows users (both UserAccount and ProfessionalAccount) to share posts with other users through the chat management system. When a post is shared, it creates or uses an existing private conversation and sends a special message containing the post details.

## Backend Implementation Summary

### What Was Implemented

1. **New DTO**: `SharePostDto` for post sharing requests
2. **New Endpoint**: `POST /posts/:id/share` to share a post
3. **Service Method**: `sharePost()` in `PostsService` that handles the sharing logic
4. **Message Type Extension**: Messages now support a `'post'` type in addition to `'text'`, `'image'`, and `'file'`
5. **Notification System**: Recipients receive notifications when a post is shared with them

### Key Features

- Shares posts via private conversations
- Automatically creates conversation if it doesn't exist
- Supports optional message along with the shared post
- Works for both UserAccount and ProfessionalAccount
- Sends notifications to recipients
- Post data is embedded in the message's `meta` field

---

## Frontend Integration Steps

### 1. Search for Users to Share With

**Endpoint**: `GET /chat/peers`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response**:
```json
[
  {
    "id": "60c72b2f9b1d8c001c8e4d1a",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "kind": "user",
    "avatarUrl": "https://..."
  },
  {
    "id": "60c72b2f9b1d8c001c8e4d1b",
    "name": "Pizza Palace",
    "email": "info@pizzapalace.com",
    "role": "professional",
    "kind": "professional",
    "avatarUrl": "https://..."
  }
]
```

**Frontend Implementation**:

```typescript
// services/chatService.ts
export const searchUsersToShare = async (searchQuery?: string) => {
  try {
    const response = await axios.get('/chat/peers', {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    // Optional: Filter by search query on frontend
    if (searchQuery) {
      return response.data.filter((user: any) => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};
```

---

### 2. Share a Post

**Endpoint**: `POST /posts/:id/share`

**Headers**:
```
x-user-id: <sender_user_id>
x-owner-type: UserAccount | ProfessionalAccount
Content-Type: application/json
```

**Request Body**:
```json
{
  "recipientId": "60c72b2f9b1d8c001c8e4d1a",
  "message": "Check out this amazing dish!" // Optional
}
```

**Response**:
```json
{
  "success": true,
  "conversation": {
    "_id": "...",
    "kind": "private",
    "participants": ["...", "..."],
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": {
    "_id": "...",
    "conversation": "...",
    "sender": "...",
    "content": "Check out this amazing dish!",
    "type": "post",
    "meta": {
      "postId": "...",
      "postCaption": "Delicious homemade pizza",
      "postMediaUrls": ["https://..."],
      "postMediaType": "image",
      "postFoodType": "PIZZA",
      "postThumbnailUrl": "https://...",
      "postOwner": {
        "id": "...",
        "name": "Chef Mario",
        "avatarUrl": "https://..."
      },
      "price": 30,
      "preparationTime": 25,
      "likeCount": 45,
      "commentCount": 12,
      "saveCount": 8
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "post": {
    "_id": "...",
    "caption": "Delicious homemade pizza",
    "mediaUrls": ["https://..."],
    "mediaType": "image",
    "foodType": "PIZZA"
    // ... other post fields
  }
}
```

**Frontend Implementation**:

```typescript
// services/postService.ts
export const sharePost = async (
  postId: string,
  recipientId: string,
  message?: string,  // Optional: only if user adds custom text
  currentUserId: string,
  userType: 'UserAccount' | 'ProfessionalAccount'
) => {
  try {
    const response = await axios.post(
      `/posts/${postId}/share`,
      {
        recipientId,
        // IMPORTANT: Don't send default message - let backend send empty content
        // so frontend displays the post image instead of text
        ...(message && { message })  // Only include message if user provided one
      },
      {
        headers: {
          'x-user-id': currentUserId,
          'x-owner-type': userType,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error sharing post:', error);
    throw error;
  }
};
```

---

### 3. UI Components

#### 3.1 Share Button on Post

Add a share button to each post card:

```typescript
// components/PostCard.tsx
import React, { useState } from 'react';
import { ShareModal } from './ShareModal';

interface PostCardProps {
  post: Post;
  currentUser: User;
}

export const PostCard: React.FC<PostCardProps> = ({ post, currentUser }) => {
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <div className="post-card">
      {/* Post content */}
      <div className="post-actions">
        <button onClick={() => setShowShareModal(true)}>
          <ShareIcon />
          Share
        </button>
      </div>

      {showShareModal && (
        <ShareModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
```

#### 3.2 Share Modal with User Search

```typescript
// components/ShareModal.tsx
import React, { useState, useEffect } from 'react';
import { searchUsersToShare, sharePost } from '../services';

interface ShareModalProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ 
  post, 
  currentUser, 
  onClose 
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await searchUsersToShare();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (recipientId: string) => {
    try {
      setLoading(true);
      await sharePost(
        post._id,
        recipientId,
        message || undefined,
        currentUser._id,
        currentUser.role === 'professional' ? 'ProfessionalAccount' : 'UserAccount'
      );
      
      // Show success message
      alert('Post shared successfully!');
      onClose();
    } catch (error) {
      console.error('Error sharing post:', error);
      alert('Failed to share post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Post</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Post Preview */}
          <div className="post-preview">
            <img src={post.mediaUrls[0]} alt={post.caption} />
            <p>{post.caption}</p>
          </div>

          {/* Optional Message */}
          <div className="message-input">
            <label>Add a message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something about this post..."
              rows={3}
            />
          </div>

          {/* User Search */}
          <div className="user-search">
            <label>Search for a user</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
            />
          </div>

          {/* User List */}
          <div className="user-list">
            {loading ? (
              <div className="loading">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="no-results">No users found</div>
            ) : (
              filteredUsers.map(user => (
                <div 
                  key={user.id} 
                  className="user-item"
                  onClick={() => handleShare(user.id)}
                >
                  <img 
                    src={user.avatarUrl || '/default-avatar.png'} 
                    alt={user.name}
                    className="user-avatar"
                  />
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email}</div>
                    <div className="user-type">
                      {user.kind === 'professional' ? '🏢 Professional' : '👤 User'}
                    </div>
                  </div>
                  <button className="share-button">Share →</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### 3.3 CSS Styles (Example)

```css
/* ShareModal.css */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.modal-header button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.post-preview {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 20px;
}

.post-preview img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 8px;
}

.post-preview p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.message-input {
  margin-bottom: 20px;
}

.message-input label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
}

.message-input textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.user-search {
  margin-bottom: 20px;
}

.user-search label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
}

.user-search input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.user-list {
  max-height: 300px;
  overflow-y: auto;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-item:hover {
  background: #f5f5f5;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 12px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 2px;
}

.user-email {
  font-size: 13px;
  color: #666;
  margin-bottom: 2px;
}

.user-type {
  font-size: 12px;
  color: #999;
}

.share-button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.share-button:hover {
  background: #0056b3;
}

.loading, .no-results {
  text-align: center;
  padding: 40px;
  color: #666;
}
```

---

### 4. Displaying Shared Posts in Chat

When displaying messages in the chat interface, check if `message.type === 'post'` and render the post image/thumbnail instead of text:

#### Option 1: Simple Image Bubble (Matches Your UI)

```typescript
// components/ChatMessage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ChatMessageProps {
  message: any;
  isOwnMessage?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwnMessage }) => {
  const navigate = useNavigate();

  if (message.type === 'post') {
    const postMeta = message.meta;
    
    // Get the thumbnail/image to display
    const imageUrl = postMeta.postMediaType === 'reel' 
      ? postMeta.postThumbnailUrl || postMeta.postMediaUrls[0]
      : postMeta.postMediaUrls[0];
    
    return (
      <div className={`chat-message-wrapper ${isOwnMessage ? 'own-message' : 'received-message'}`}>
        {/* Optional: Show custom message text if provided */}
        {message.content && (
          <div className="message-bubble text-bubble">
            <p>{message.content}</p>
          </div>
        )}

        {/* Shared Post Image - Clickable */}
        <div 
          className="message-bubble image-bubble"
          onClick={() => navigate(`/posts/${postMeta.postId}`)}
        >
          <img 
            src={imageUrl}
            alt={postMeta.postCaption}
            className="shared-post-image"
          />
          
          {/* Show play icon for videos */}
          {postMeta.postMediaType === 'reel' && (
            <div className="play-icon-overlay">▶</div>
          )}
        </div>

        <span className="timestamp">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  // Regular text message
  return (
    <div className={`chat-message-wrapper ${isOwnMessage ? 'own-message' : 'received-message'}`}>
      <div className="message-bubble text-bubble">
        <p>{message.content}</p>
      </div>
      <span className="timestamp">{formatTime(message.createdAt)}</span>
    </div>
  );
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString();
};
```

**CSS for Image Bubble (Yellow Bubble Style)**:

```css
/* ChatMessage.css */
.chat-message-wrapper {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  max-width: 75%;
  align-items: flex-start;
}

.chat-message-wrapper.own-message {
  align-self: flex-end;
  align-items: flex-end;
}

.message-bubble {
  margin-bottom: 4px;
}

.text-bubble {
  background: #f0f0f0;
  padding: 10px 14px;
  border-radius: 18px;
  word-wrap: break-word;
}

.text-bubble p {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
}

.own-message .text-bubble {
  background: #FFD60A;
  color: #000;
}

.image-bubble {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  transition: opacity 0.2s;
  max-width: 250px;
}

.image-bubble:active {
  opacity: 0.8;
}

.shared-post-image {
  width: 100%;
  height: auto;
  max-height: 280px;
  min-height: 150px;
  object-fit: cover;
  display: block;
}

.play-icon-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #000;
  padding-left: 3px;
}

.timestamp {
  font-size: 11px;
  color: #999;
  padding: 0 8px;
}

.own-message .timestamp {
  text-align: right;
}
```

---

#### Option 2: Image with Caption Overlay (More Details)

```typescript
// Alternative: Show caption overlay on image
export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwnMessage }) => {
  const navigate = useNavigate();

  if (message.type === 'post') {
    const postMeta = message.meta;
    
    const imageUrl = postMeta.postMediaType === 'reel' 
      ? postMeta.postThumbnailUrl || postMeta.postMediaUrls[0]
      : postMeta.postMediaUrls[0];
    
    return (
      <div className={`chat-message-wrapper ${isOwnMessage ? 'own-message' : 'received-message'}`}>
        {/* Custom message text if provided */}
        {message.content && (
          <div className="message-bubble text-bubble">
            <p>{message.content}</p>
          </div>
        )}

        {/* Post Image with Info Overlay */}
        <div 
          className="message-bubble image-bubble-detailed"
          onClick={() => navigate(`/posts/${postMeta.postId}`)}
        >
          <img 
            src={imageUrl}
            alt={postMeta.postCaption}
            className="shared-post-image"
          />
          
          {/* Video play icon */}
          {postMeta.postMediaType === 'reel' && (
            <div className="play-icon-overlay">▶</div>
          )}

          {/* Bottom overlay with post info */}
          <div className="post-info-overlay">
            <p className="post-caption-text">{postMeta.postCaption}</p>
            <div className="post-stats-mini">
              <span>❤️ {postMeta.likeCount}</span>
              <span>💬 {postMeta.commentCount}</span>
              {postMeta.price && <span>{postMeta.price} TND</span>}
            </div>
          </div>
        </div>

        <span className="timestamp">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  // Regular text message...
};
```

**Additional CSS for Detailed View**:

```css
.image-bubble-detailed {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  max-width: 280px;
}

.post-info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  padding: 40px 12px 12px;
  color: white;
}

.post-caption-text {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.post-stats-mini {
  display: flex;
  gap: 12px;
  font-size: 12px;
  opacity: 0.9;
}

.post-stats-mini span {
  display: flex;
  align-items: center;
  gap: 4px;
}
```

---

### 4b. Displaying Shared Posts in Chat List Preview

For the conversation list (where you see all your chats), show the post thumbnail as a preview:

```typescript
// components/ChatListItem.tsx
import React from 'react';

interface ChatListItemProps {
  chat: any;
  onClick: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ chat, onClick }) => {
  // Check if last message is a shared post
  const isSharedPost = chat.lastMessage?.type === 'post';
  const postMeta = chat.lastMessage?.meta;

  return (
    <div className="chat-list-item" onClick={onClick}>
      <img 
        src={chat.avatarUrl || '/default-avatar.png'} 
        alt={chat.name}
        className="chat-avatar"
      />
      
      <div className="chat-info">
        <div className="chat-name">{chat.name}</div>
        
        {isSharedPost && postMeta ? (
          <div className="last-message-preview shared-post-preview">
            <img 
              src={postMeta.postMediaType === 'reel' 
                ? postMeta.postThumbnailUrl || postMeta.postMediaUrls[0]
                : postMeta.postMediaUrls[0]
              }
              alt="Shared post"
              className="preview-thumbnail"
            />
            <span className="preview-text">
              {postMeta.postMediaType === 'reel' ? '🎥' : '📷'} Shared a post
            </span>
          </div>
        ) : (
          <div className="last-message-preview">
            {chat.lastMessage?.content || 'No messages yet'}
          </div>
        )}
      </div>
      
      <div className="chat-meta">
        <span className="time">{formatTime(chat.lastMessage?.createdAt)}</span>
        {chat.unreadCount > 0 && (
          <span className="unread-badge">{chat.unreadCount}</span>
        )}
      </div>
    </div>
  );
};

const formatTime = (timestamp: string) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString();
};
```

**CSS for Chat List with Post Thumbnails**:

```css
/* ChatListItem.css */
.chat-list-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.chat-list-item:hover {
  background: #f8f8f8;
}

.chat-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 12px;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.last-message-preview {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shared-post-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
}

.preview-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.time {
  font-size: 11px;
  color: #999;
}

.unread-badge {
  background: #FFD60A;
  color: #000;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}
```

---

### 5. Handling Notifications

When a user receives a post share notification:

```typescript
// services/notificationService.ts
export const handleNotification = (notification: any) => {
  if (notification.type === 'MESSAGE_RECEIVED' && notification.meta?.isSharedPost) {
    // Show notification: "John shared a post with you"
    showToast(`${notification.actorName} shared a post with you`);
    
    // Navigate to conversation when clicked
    if (notification.meta.conversationId) {
      navigate(`/chat/${notification.meta.conversationId}`);
    }
  }
};
```

---

## Complete Flow Example

### User Journey: Sharing a Post

1. **User sees a post they want to share**
   - Clicks the "Share" button on the post card

2. **Share modal opens**
   - Shows post preview
   - Provides optional message input
   - Shows search bar for finding users

3. **User searches for recipient**
   - Types name or email in search bar
   - System filters the user list in real-time
   - Shows both normal users and professional accounts

4. **User selects recipient**
   - Clicks on a user from the list
   - Backend creates/finds private conversation
   - Sends message with post data embedded

5. **Recipient receives notification**
   - Gets notification: "John shared a post with you"
   - Clicks notification to open conversation

6. **Recipient views shared post in chat**
   - Sees special post card in chat message
   - Can view post details, stats, and media
   - Can click to navigate to full post view

---

## API Testing with Postman/cURL

### Test 1: Search for Users

```bash
curl -X GET http://localhost:3000/chat/peers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 2: Share a Post

```bash
curl -X POST http://localhost:3000/posts/POST_ID_HERE/share \
  -H "x-user-id: YOUR_USER_ID" \
  -H "x-owner-type: UserAccount" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "RECIPIENT_USER_ID",
    "message": "Check out this amazing dish!"
  }'
```

### Test 3: Get Chat Messages (to see shared post)

```bash
curl -X GET http://localhost:3000/chat/conversations/CONVERSATION_ID/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Error Handling

### Common Errors and Solutions

1. **404 - Post not found**
   - Ensure the post ID is valid
   - Check if post was deleted

2. **404 - Recipient not found**
   - Verify recipient ID is correct
   - Check if recipient account still exists

3. **400 - Invalid IDs**
   - All IDs must be valid MongoDB ObjectIds (24 hex characters)

4. **401 - Unauthorized**
   - Ensure JWT token is valid and not expired
   - Check authentication headers

---

## TypeScript Types (Optional but Recommended)

```typescript
// types/post.ts
export interface Post {
  _id: string;
  ownerId: string | User | ProfessionalAccount;
  ownerModel: 'UserAccount' | 'ProfessionalAccount';
  caption: string;
  mediaUrls: string[];
  mediaType: 'image' | 'reel' | 'carousel';
  foodType: string;
  price?: number;
  preparationTime?: number;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  thumbnailUrl?: string;
  viewsCount: number;
  duration?: number;
  aspectRatio?: string;
  createdAt: string;
  updatedAt: string;
}

// types/message.ts
export interface Message {
  _id: string;
  conversation: string;
  sender: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'post';
  meta?: SharedPostMeta | Record<string, any>;
  isSpam?: boolean;
  spamConfidence?: number;
  hasBadWords?: boolean;
  moderatedContent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedPostMeta {
  postId: string;
  postCaption: string;
  postMediaUrls: string[];
  postMediaType: 'image' | 'reel' | 'carousel';
  postFoodType: string;
  postThumbnailUrl?: string;
  postOwner: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  price?: number;
  preparationTime?: number;
  likeCount: number;
  commentCount: number;
  saveCount: number;
}

// types/chat.ts
export interface Peer {
  id: string;
  name: string;
  email: string;
  role: string;
  kind: 'user' | 'professional';
  avatarUrl: string;
}
```

---

## Additional Features to Consider

### 1. Share History
Track which posts have been shared and with whom:
```typescript
// Add to post card
<div className="share-count">
  Shared {post.shareCount || 0} times
</div>
```

### 2. Multiple Recipients
Allow sharing with multiple users at once by modifying the modal to support multi-select.

### 3. Share to Groups
Extend the feature to allow sharing posts in group conversations (requires backend updates).

### 4. Copy Link Alternative
Provide a "Copy Link" button as an alternative to direct sharing:
```typescript
const copyPostLink = (postId: string) => {
  const link = `${window.location.origin}/posts/${postId}`;
  navigator.clipboard.writeText(link);
  showToast('Link copied to clipboard!');
};
```

---

## Summary

The post sharing feature is now fully implemented on the backend. To integrate it on the frontend:

1. ✅ Use `/chat/peers` to get list of users to share with
2. ✅ Implement search/filter functionality for user selection
3. ✅ Call `POST /posts/:id/share` with recipient ID and optional message
4. ✅ Display shared posts as special message cards in chat
5. ✅ Handle notifications for shared posts
6. ✅ Provide navigation from shared post to full post view

The implementation is flexible and can be extended with additional features like share analytics, multiple recipients, or group sharing as needed.

