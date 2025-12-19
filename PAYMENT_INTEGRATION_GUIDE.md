# 💳 Payment Integration Guide - Frontend Implementation

## 📋 **Overview**

The backend now supports **CASH** and **CARD** payment methods for orders. Here's how to integrate it:

---

## 🔄 **Payment Flow**

### **CASH Payment:**
1. User selects "CASH" payment method
2. Order is created with `paymentMethod: 'CASH'`
3. ✅ Order proceeds immediately (status: `pending`)
4. Payment saved as "CASH" in database

### **CARD Payment:**
1. User selects "CARD" payment method
2. Order is created with `paymentMethod: 'CARD'`
3. Backend returns `clientSecret` from Stripe
4. Frontend opens Stripe payment screen
5. User completes payment on Stripe
6. Frontend confirms payment with backend
7. ✅ Order proceeds (status: `pending`)

---

## 📡 **API Endpoints**

### **1. Create Order (with Payment)**

**Endpoint**: `POST /orders`

**Request Body:**
```json
{
  "userId": "user-id",
  "professionalId": "professional-id",
  "orderType": "delivery",
  "items": [...],
  "totalPrice": 25.99,
  "deliveryAddress": "123 Main St",
  "notes": "Extra sauce please",
  "paymentMethod": "CASH"  // ✅ NEW: Required field - "CASH" or "CARD"
}
```

**Response (CASH Payment):**
```json
{
  "_id": "order-id",
  "userId": "user-id",
  "professionalId": "professional-id",
  "totalPrice": 25.99,
  "paymentMethod": "CASH",
  "paymentId": "payment-id",
  "status": "pending",
  ...
}
```

**Response (CARD Payment):**
```json
{
  "order": {
    "_id": "order-id",
    "userId": "user-id",
    "professionalId": "professional-id",
    "totalPrice": 25.99,
    "paymentMethod": "CARD",
    "paymentId": "payment-id",
    "status": "pending",
    ...
  },
  "clientSecret": "pi_xxx_secret_xxx",  // ✅ Stripe client secret
  "paymentIntentId": "pi_xxx"           // ✅ Stripe PaymentIntent ID
}
```

---

### **2. Confirm Card Payment**

**Endpoint**: `POST /orders/payment/confirm`

**Request Body:**
```json
{
  "paymentIntentId": "pi_xxx"  // From create order response
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "_id": "order-id",
    "status": "pending",
    ...
  }
}
```

---

## 🔧 **Frontend Implementation Steps**

### **STEP 1: Create Order with Payment Method**

```javascript
// User selects payment method (CASH or CARD)
const paymentMethod = userSelectedPaymentMethod; // 'CASH' or 'CARD'

// Create order
const orderData = {
  userId: currentUserId,
  professionalId: restaurantId,
  orderType: 'delivery',
  items: cartItems,
  totalPrice: totalPrice,
  deliveryAddress: deliveryAddress,
  paymentMethod: paymentMethod, // ✅ Include payment method
};

const response = await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData),
});

const result = await response.json();
```

---

### **STEP 2: Handle CASH Payment**

```javascript
if (paymentMethod === 'CASH') {
  // Order is created and ready!
  // Payment is already processed
  // Navigate to order confirmation screen
  navigateToOrderConfirmation(result._id);
}
```

---

### **STEP 3: Handle CARD Payment (Stripe Integration)**

```javascript
if (paymentMethod === 'CARD') {
  // Extract clientSecret and paymentIntentId from response
  const { clientSecret, paymentIntentId, order } = result;
  
  // Initialize Stripe (using Stripe.js)
  const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');
  
  // Open Stripe payment screen
  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement, // Your Stripe Card Element
      billing_details: {
        name: user.name,
        email: user.email,
      },
    },
  });

  if (error) {
    // Payment failed
    console.error('Payment failed:', error);
    showError(error.message);
  } else if (paymentIntent.status === 'succeeded') {
    // Payment succeeded! Confirm with backend
    await confirmPayment(paymentIntentId);
    
    // Navigate to order confirmation
    navigateToOrderConfirmation(order._id);
  }
}
```

---

### **STEP 4: Confirm Payment with Backend**

```javascript
async function confirmPayment(paymentIntentId) {
  try {
    const response = await fetch('/api/orders/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Payment confirmed!', result.order);
      return true;
    } else {
      throw new Error('Payment confirmation failed');
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
}
```

---

## 📱 **Complete Flow Example (React Native / Android)**

```javascript
// 1. User clicks "Place Order" with payment method selection
async function placeOrder(paymentMethod) {
  try {
    // Create order
    const orderResponse = await createOrder({
      ...orderData,
      paymentMethod: paymentMethod, // 'CASH' or 'CARD'
    });

    if (paymentMethod === 'CASH') {
      // Cash payment - order is ready
      navigation.navigate('OrderConfirmation', { orderId: orderResponse._id });
      
    } else if (paymentMethod === 'CARD') {
      // Card payment - need to process Stripe payment
      const { clientSecret, paymentIntentId, order } = orderResponse;
      
      // Initialize Stripe (using react-native-stripe)
      const { error, paymentIntent } = await confirmPaymentSheetPayment();
      
      if (!error && paymentIntent.status === 'succeeded') {
        // Confirm with backend
        await confirmPayment(paymentIntentId);
        
        // Navigate to confirmation
        navigation.navigate('OrderConfirmation', { orderId: order._id });
      } else {
        // Handle error
        showError('Payment failed. Please try again.');
      }
    }
  } catch (error) {
    console.error('Order creation failed:', error);
    showError('Failed to create order. Please try again.');
  }
}
```

---

## 🎨 **UI Flow Recommendations**

### **Order Checkout Screen:**

1. **Payment Method Selection:**
   - Radio buttons or tabs: "Cash" / "Card"
   - Default: "Card"

2. **Place Order Button:**
   - When clicked:
     - If CASH: Show loading → Order created → Navigate to confirmation
     - If CARD: Show loading → Order created → Open Stripe payment screen

3. **Stripe Payment Screen:**
   - After order creation, if CARD selected:
     - Show Stripe payment form
     - User enters card details
     - User confirms payment
     - On success: Confirm with backend → Navigate to confirmation
     - On error: Show error → Allow retry

---

## 🔐 **Environment Variables Needed**

**Backend (.env):**
```env
STRIPE_SECRET_KEY=sk_test_xxx  # Your Stripe secret key
```

**Frontend:**
- `STRIPE_PUBLISHABLE_KEY=pk_test_xxx` - Your Stripe publishable key

---

## ✅ **Testing Checklist**

- [ ] Create order with CASH payment → Order created successfully
- [ ] Create order with CARD payment → Receives clientSecret
- [ ] Complete Stripe payment → Payment succeeds
- [ ] Confirm payment with backend → Payment confirmed
- [ ] Verify order has correct paymentMethod in database
- [ ] Verify payment record created in database
- [ ] Test payment failure → Error handled gracefully
- [ ] Test payment cancellation → Order status handled correctly

---

## 📝 **Important Notes**

1. **Amount Format**: Backend expects amount in **cents** (e.g., $25.99 = 2599 cents)
   - Backend converts `totalPrice * 100` automatically
   - Frontend sends amount in dollars

2. **Payment Status**: 
   - CASH payments: Status = `succeeded` immediately
   - CARD payments: Status = `pending` → `succeeded` after confirmation

3. **Order Status**: Both payment methods create order with status `pending`
   - Restaurant still needs to confirm the order

4. **Error Handling**: Always handle payment errors gracefully
   - Show user-friendly error messages
   - Allow retry for failed payments
   - Consider canceling order if payment fails

---

## 🔗 **Stripe Integration Links**

- **Stripe Docs**: https://stripe.com/docs/payments
- **Stripe Android SDK**: https://stripe.dev/stripe-android/
- **Stripe React Native**: https://stripe.dev/stripe-react-native/

---

*This guide provides everything needed to integrate payment processing on the frontend!*

