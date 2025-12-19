# 🔔 Notification System - Complete Implementation

## ✅ **What Was Implemented**

A complete notification system integrated with the Order system. Notifications are automatically created when orders are created or status changes.

---

## 📋 **Notification Schema**

**File**: `src/notification/schema/notification.schema.ts`

### Fields:
- `userId` - User who receives notification (optional)
- `professionalId` - Professional who receives notification (optional)
- `type` - Notification type (enum: ORDER_CREATED, ORDER_CONFIRMED, etc.)
- `title` - Notification title
- `message` - Notification message
- `orderId` - Related order (optional)
- `isRead` - Read status (default: false)
- `metadata` - Additional data (order status, price, etc.)
- `createdAt`, `updatedAt` - Timestamps

### Notification Types:
- `ORDER_CREATED` - New order received (professional)
- `ORDER_CONFIRMED` - Order confirmed (user)
- `ORDER_COMPLETED` - Order completed (user)
- `ORDER_CANCELLED` - Order cancelled (user)
- `ORDER_REFUSED` - Order refused (user)
- `PAYMENT_SUCCESS` - Payment succeeded (user)
- `PAYMENT_FAILED` - Payment failed (user)

---

## 🔄 **Automatic Notifications**

### **1. When User Creates Order**
**Trigger**: `POST /orders` (order creation)

**Notification Created:**
- **Type**: `ORDER_CREATED`
- **Recipient**: Professional (restaurant)
- **Title**: "New Order Received"
- **Message**: "You have received a new order. Please review and confirm."
- **Metadata**: Includes order status, total price, item count, order type

**Location**: `order.service.ts` - `createOrder()` method

---

### **2. When Professional Updates Order Status**
**Trigger**: `PATCH /orders/:orderId/status` (status update)

**Notifications Created Based on Status:**

| Status | Notification Type | Recipient | Title | Message |
|--------|------------------|-----------|-------|---------|
| `confirmed` | `ORDER_CONFIRMED` | User | "Order Confirmed" | "Your order has been confirmed by the restaurant." |
| `completed` | `ORDER_COMPLETED` | User | "Order Completed" | "Your order has been completed. Thank you for your order!" |
| `cancelled` | `ORDER_CANCELLED` | User | "Order Cancelled" | "Your order has been cancelled." |
| `refused` | `ORDER_REFUSED` | User | "Order Refused" | "Your order has been refused by the restaurant." |

**Location**: `order.service.ts` - `updateStatus()` method

---

### **3. When Payment is Confirmed**
**Trigger**: `POST /orders/payment/confirm` (payment confirmation)

**Notifications Created:**

- **Payment Success**:
  - **Type**: `PAYMENT_SUCCESS`
  - **Recipient**: User
  - **Title**: "Payment Successful"
  - **Message**: "Your payment has been processed successfully."

- **Payment Failed**:
  - **Type**: `PAYMENT_FAILED`
  - **Recipient**: User
  - **Title**: "Payment Failed"
  - **Message**: "Your payment could not be processed. Please try again."

**Location**: `order.service.ts` - `confirmPayment()` method

---

## 📡 **API Endpoints**

### **Get Notifications**

#### Get User Notifications
```
GET /notifications/user/:userId
```
Returns all notifications for a user.

#### Get Professional Notifications
```
GET /notifications/professional/:professionalId
```
Returns all notifications for a professional.

#### Get Unread Notifications
```
GET /notifications/unread?userId=xxx
GET /notifications/unread?professionalId=xxx
```
Returns unread notifications.

---

### **Mark as Read**

#### Mark Single Notification as Read
```
PATCH /notifications/:id/read
```

#### Mark All as Read
```
PATCH /notifications/read-all?userId=xxx
PATCH /notifications/read-all?professionalId=xxx
```

---

### **Delete Notifications**

#### Delete Single Notification
```
DELETE /notifications/:id
```

#### Delete All Notifications
```
DELETE /notifications?userId=xxx
DELETE /notifications?professionalId=xxx
```

---

## 📊 **Notification Response Format**

```json
{
  "_id": "notification-id",
  "userId": "user-id",
  "professionalId": null,
  "type": "order_created",
  "title": "New Order Received",
  "message": "You have received a new order. Please review and confirm.",
  "orderId": {
    "_id": "order-id",
    "totalPrice": 21.00,
    "status": "pending",
    "orderType": "delivery"
  },
  "isRead": false,
  "metadata": {
    "orderStatus": "pending",
    "totalPrice": 21.00,
    "itemCount": 3,
    "orderType": "delivery"
  },
  "createdAt": "2025-12-15T01:00:00.000Z",
  "updatedAt": "2025-12-15T01:00:00.000Z"
}
```

---

## 🔄 **Complete Flow Examples**

### **Flow 1: User Creates Order**

```
1. User creates order → POST /orders
2. Order saved to database
3. ✅ Notification created automatically:
   - Type: ORDER_CREATED
   - Recipient: Professional
   - Professional receives notification
```

### **Flow 2: Professional Confirms Order**

```
1. Professional updates status → PATCH /orders/:id/status { status: "confirmed" }
2. Order status updated
3. ✅ Notification created automatically:
   - Type: ORDER_CONFIRMED
   - Recipient: User
   - User receives notification
```

### **Flow 3: Payment Confirmed**

```
1. User confirms payment → POST /orders/payment/confirm
2. Payment verified with Stripe
3. ✅ Notification created automatically:
   - Type: PAYMENT_SUCCESS
   - Recipient: User
   - User receives notification
```

---

## 🎯 **Integration Points**

### **Order Service Integration:**

1. **`createOrder()`** - Creates `ORDER_CREATED` notification for professional
2. **`updateStatus()`** - Creates status-specific notifications for user
3. **`confirmPayment()`** - Creates `PAYMENT_SUCCESS` or `PAYMENT_FAILED` notifications

### **Error Handling:**

- Notifications are created in try-catch blocks
- If notification creation fails, order operations still succeed
- Errors are logged but don't break the order flow

---

## 📝 **Usage Example**

### **Frontend: Get User Notifications**

```javascript
// Get all notifications for user
const response = await fetch(`/api/notifications/user/${userId}`);
const notifications = await response.json();

// Get unread notifications
const unreadResponse = await fetch(`/api/notifications/unread?userId=${userId}`);
const unreadNotifications = await unreadResponse.json();

// Mark notification as read
await fetch(`/api/notifications/${notificationId}/read`, {
  method: 'PATCH',
});

// Mark all as read
await fetch(`/api/notifications/read-all?userId=${userId}`, {
  method: 'PATCH',
});
```

---

## ✅ **Features**

- ✅ Automatic notification creation on order events
- ✅ Separate notifications for users and professionals
- ✅ Read/unread status tracking
- ✅ Order details included in notifications
- ✅ Metadata for additional context
- ✅ RESTful API endpoints
- ✅ Error handling (notifications don't break orders)

---

## 🔗 **Files Modified/Created**

1. ✅ `src/notification/schema/notification.schema.ts` - Complete schema
2. ✅ `src/notification/notification.service.ts` - Full service implementation
3. ✅ `src/notification/notification.controller.ts` - REST endpoints
4. ✅ `src/notification/notification.module.ts` - Module with schema
5. ✅ `src/notification/dto/create-notification.dto.ts` - DTO validation
6. ✅ `src/order/order.service.ts` - Integrated notification creation
7. ✅ `src/order/order.module.ts` - Imported NotificationModule

---

**The notification system is fully integrated and working! Notifications are automatically created for all order events.**

