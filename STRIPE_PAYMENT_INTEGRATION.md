# Stripe Payment Integration Guide

This document describes how to integrate Stripe payments for orders in the Foodyz application.

## Table of Contents

1. [Overview](#overview)
2. [Payment Flow](#payment-flow)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation Steps](#frontend-implementation-steps)
5. [Stripe SDK Setup](#stripe-sdk-setup)
6. [Request/Response Examples](#requestresponse-examples)
7. [Error Handling](#error-handling)
8. [Testing](#testing)

---

## Overview

The payment system supports two payment methods:
- **CASH**: Payment marked as succeeded immediately
- **CARD**: Stripe payment using PaymentIntent API

### Key Concepts

- **PaymentIntent**: Stripe's object that tracks a payment attempt
- **clientSecret**: Secret key used by frontend to confirm payment with Stripe SDK
- **PaymentMethod**: Represents a payment method (card) created client-side using Stripe.js
- **paymentIntentId**: Unique identifier for a PaymentIntent (e.g., `pi_xxx`)
- **paymentMethodId**: Unique identifier for a PaymentMethod (e.g., `pm_xxx`)

---

## Payment Flow

### Cash Payment Flow

```
1. User selects "CASH" payment method
2. Frontend → POST /orders (with paymentMethod: "CASH")
3. Backend creates order + cash payment record (status: "succeeded")
4. Backend returns order object
5. Done ✅
```

### Card Payment Flow

```
1. User selects "CARD" payment method
2. Frontend → POST /orders (with paymentMethod: "CARD")
3. Backend creates PaymentIntent, returns:
   - order object
   - clientSecret (for Stripe SDK)
   - paymentIntentId (for confirmation)
4. Frontend shows payment form, collects card details
5. Frontend uses Stripe SDK to create PaymentMethod from card details
6. Frontend → POST /orders/payment/confirm
   Body: { paymentIntentId, paymentMethodId }
7. Backend confirms payment with Stripe, updates payment status
8. Backend returns order with confirmed payment
9. Done ✅
```

---

## API Endpoints

### 1. Create Order (with Payment Method)

**Endpoint:** `POST /orders`

**Request Body:**
```json
{
  "userId": "string (MongoDB ObjectId)",
  "professionalId": "string (MongoDB ObjectId)",
  "orderType": "eat-in" | "takeaway" | "delivery",
  "items": [
    {
      "menuItemId": "string (MongoDB ObjectId)",
      "name": "string",
      "quantity": "number",
      "chosenIngredients": [...],
      "chosenOptions": [...],
      "calculatedPrice": "number"
    }
  ],
  "totalPrice": "number (in USD, e.g., 25.99)",
  "deliveryAddress": "string (required if orderType is 'delivery')",
  "notes": "string (optional)",
  "scheduledTime": "ISO date string (optional)",
  "paymentMethod": "CASH" | "CARD"  // ⚠️ REQUIRED
}
```

**Response for CASH payment:**
```json
{
  "_id": "order_id",
  "userId": "user_id",
  "professionalId": "professional_id",
  "items": [...],
  "totalPrice": 25.99,
  "paymentMethod": "CASH",
  "paymentId": "payment_id",
  "status": "PENDING",
  "createdAt": "2025-12-18T10:00:00Z",
  ...
}
```

**Response for CARD payment:**
```json
{
  "order": {
    "_id": "order_id",
    "userId": "user_id",
    "professionalId": "professional_id",
    "items": [...],
    "totalPrice": 25.99,
    "paymentMethod": "CARD",
    "paymentId": "payment_id",
    "status": "PENDING",
    ...
  },
  "clientSecret": "pi_xxx_secret_yyy",  // ⚠️ Use this with Stripe SDK
  "paymentIntentId": "pi_xxx"  // ⚠️ Use this for confirmation
}
```

---

### 2. Confirm Card Payment

**Endpoint:** `POST /orders/payment/confirm`

**Request Body:**
```json
{
  "paymentIntentId": "pi_xxx",  // From create order response
  "paymentMethodId": "pm_xxx"   // Created client-side using Stripe SDK
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "_id": "order_id",
    "status": "PENDING",
    "paymentMethod": "CARD",
    ...
  }
}
```

**Error Response:**
```json
{
  "statusCode": 500,
  "message": "Payment failed: [error details]",
  "error": "Internal Server Error"
}
```

---

## Frontend Implementation Steps

### Step 1: Install Stripe SDK

#### For React Native (iOS/Android)

```bash
npm install @stripe/stripe-react-native
# or
yarn add @stripe/stripe-react-native
```

#### For Web (React)

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

#### For Flutter

```yaml
dependencies:
  flutter_stripe: ^10.0.0
```

---

### Step 2: Initialize Stripe (Frontend)

#### React Native Example

```typescript
import { initStripe, StripeProvider } from '@stripe/stripe-react-native';

// Initialize with your Stripe publishable key
const publishableKey = 'pk_test_51SeNqPRV5Vgu8dlffxGrQexSTTtQ4dvbeZXQ8h5K4ltKAJeWviIKKojf9SMd6LIHU2aZcsfhwdqWv133INDU2reF006oUE9LpG';

initStripe({
  publishableKey,
  merchantIdentifier: 'merchant.com.foodyz', // iOS only
});
```

#### React Web Example

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51SeNqPRV5Vgu8dlffxGrQexSTTtQ4dvbeZXQ8h5K4ltKAJeWviIKKojf9SMd6LIHU2aZcsfhwdqWv133INDU2reF006oUE9LpG');
```

---

### Step 3: Create Order (Choose Payment Method)

```typescript
// When user clicks "Place Order" button

async function createOrder(paymentMethod: 'CASH' | 'CARD') {
  try {
    const orderData = {
      userId: currentUser.id,
      professionalId: selectedRestaurant.id,
      orderType: selectedOrderType, // 'eat-in' | 'takeaway' | 'delivery'
      items: cartItems,
      totalPrice: cartTotal,
      deliveryAddress: deliveryAddress || undefined,
      notes: orderNotes || undefined,
      paymentMethod: paymentMethod, // ⚠️ REQUIRED: 'CASH' or 'CARD'
    };

    const response = await fetch('https://your-api.com/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create order');
    }

    // Handle response based on payment method
    if (paymentMethod === 'CASH') {
      // Cash payment - order is complete
      navigateToOrderConfirmation(result);
    } else if (paymentMethod === 'CARD') {
      // Card payment - proceed to payment screen
      navigateToPaymentScreen({
        order: result.order,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
      });
    }
  } catch (error) {
    console.error('Order creation failed:', error);
    showError(error.message);
  }
}
```

---

### Step 4: Collect Card Details & Confirm Payment

#### React Native Example

```typescript
import { useStripe, CardField } from '@stripe/stripe-react-native';

function PaymentScreen({ clientSecret, paymentIntentId, order }) {
  const { confirmPayment } = useStripe();
  const [loading, setLoading] = useState(false);

  async function handlePayPress() {
    try {
      setLoading(true);

      // 1. Confirm payment using Stripe SDK
      // This will collect card details and create PaymentMethod automatically
      const { paymentIntent, error: stripeError } = await confirmPayment(
        clientSecret,
        {
          paymentMethodType: 'Card',
          // Optional: billing details
          billingDetails: {
            email: userEmail,
            name: userName,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // 2. PaymentMethod is created automatically, but we need to send confirmation to backend
      // For React Native, you may need to create PaymentMethod separately first
      // Let's use a different approach - create PaymentMethod explicitly

      // Extract payment method ID from paymentIntent
      const paymentMethodId = paymentIntent.paymentMethod;

      // 3. Confirm payment on backend
      const confirmResponse = await fetch('https://your-api.com/orders/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId,
          paymentMethodId: paymentMethodId,
        }),
      });

      const confirmResult = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(confirmResult.message || 'Payment confirmation failed');
      }

      // 4. Success!
      navigateToOrderConfirmation(confirmResult.order);
    } catch (error) {
      console.error('Payment failed:', error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <CardField
        postalCodeEnabled={true}
        placeholders={{
          number: '4242 4242 4242 4242',
        }}
        cardStyle={{
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
        }}
        style={{
          width: '100%',
          height: 50,
          marginVertical: 30,
        }}
      />
      <Button
        title="Pay"
        onPress={handlePayPress}
        disabled={loading}
      />
    </View>
  );
}
```

#### React Native - Alternative Approach (More Control)

```typescript
import { useStripe, useConfirmPayment } from '@stripe/stripe-react-native';

function PaymentScreen({ clientSecret, paymentIntentId, order }) {
  const { createPaymentMethod } = useStripe();
  const { confirmPayment } = useConfirmPayment();
  const [loading, setLoading] = useState(false);

  async function handlePayPress(cardDetails) {
    try {
      setLoading(true);

      // 1. Create PaymentMethod from card details
      const { paymentMethod, error: pmError } = await createPaymentMethod({
        paymentMethodType: 'Card',
        card: cardDetails, // Card details from CardField or form
        billingDetails: {
          email: userEmail,
          name: userName,
        },
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      // 2. Confirm payment with backend
      const confirmResponse = await fetch('https://your-api.com/orders/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId,
          paymentMethodId: paymentMethod.id, // pm_xxx
        }),
      });

      const confirmResult = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(confirmResult.message || 'Payment confirmation failed');
      }

      // 3. Success!
      navigateToOrderConfirmation(confirmResult.order);
    } catch (error) {
      console.error('Payment failed:', error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      {/* Your card input UI */}
      <CardField ... />
      <Button title="Pay" onPress={() => handlePayPress(cardDetails)} />
    </View>
  );
}
```

#### React Web Example

```typescript
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_...');

function CheckoutForm({ clientSecret, paymentIntentId, order }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    try {
      setLoading(true);

      // 1. Create PaymentMethod from card element
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          email: userEmail,
          name: userName,
        },
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      // 2. Confirm payment on backend
      const confirmResponse = await fetch('https://your-api.com/orders/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId,
          paymentMethodId: paymentMethod.id, // pm_xxx
        }),
      });

      const confirmResult = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(confirmResult.message || 'Payment confirmation failed');
      }

      // 3. Success!
      navigateToOrderConfirmation(confirmResult.order);
    } catch (error) {
      console.error('Payment failed:', error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe || loading}>
        Pay
      </button>
    </form>
  );
}

// Wrap in Elements provider
function PaymentScreen({ clientSecret, paymentIntentId, order }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm 
        clientSecret={clientSecret}
        paymentIntentId={paymentIntentId}
        order={order}
      />
    </Elements>
  );
}
```

---

## Stripe SDK Setup

### Stripe Publishable Key

Use this key in your frontend application:

```
pk_test_51SeNqPRV5Vgu8dlffxGrQexSTTtQ4dvbeZXQ8h5K4ltKAJeWviIKKojf9SMd6LIHU2aZcsfhwdqWv133INDU2reF006oUE9LpG
```

⚠️ **IMPORTANT:** Never expose your Stripe Secret Key (`sk_xxx`) in frontend code. Only use the Publishable Key (`pk_xxx`).

---

## Request/Response Examples

### Example 1: Create Order with CASH Payment

**Request:**
```http
POST /orders
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "69217da1cc2c4f129d14cfeb",
  "professionalId": "507f1f77bcf86cd799439011",
  "orderType": "takeaway",
  "items": [
    {
      "menuItemId": "507f1f77bcf86cd799439012",
      "name": "Pizza Margherita",
      "quantity": 2,
      "calculatedPrice": 25.98
    }
  ],
  "totalPrice": 25.98,
  "paymentMethod": "CASH"
}
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "69217da1cc2c4f129d14cfeb",
  "professionalId": "507f1f77bcf86cd799439011",
  "items": [...],
  "totalPrice": 25.98,
  "paymentMethod": "CASH",
  "paymentId": "507f1f77bcf86cd799439014",
  "status": "PENDING",
  "createdAt": "2025-12-18T10:00:00.000Z"
}
```

---

### Example 2: Create Order with CARD Payment

**Request:**
```http
POST /orders
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "69217da1cc2c4f129d14cfeb",
  "professionalId": "507f1f77bcf86cd799439011",
  "orderType": "delivery",
  "items": [...],
  "totalPrice": 45.50,
  "deliveryAddress": "123 Main St, City",
  "paymentMethod": "CARD"
}
```

**Response (200 OK):**
```json
{
  "order": {
    "_id": "507f1f77bcf86cd799439015",
    "userId": "69217da1cc2c4f129d14cfeb",
    "professionalId": "507f1f77bcf86cd799439011",
    "items": [...],
    "totalPrice": 45.50,
    "paymentMethod": "CARD",
    "paymentId": "507f1f77bcf86cd799439016",
    "status": "PENDING",
    "createdAt": "2025-12-18T10:00:00.000Z"
  },
  "clientSecret": "pi_3ABC123_secret_xyz789",
  "paymentIntentId": "pi_3ABC123"
}
```

---

### Example 3: Confirm Card Payment

**Request:**
```http
POST /orders/payment/confirm
Content-Type: application/json
Authorization: Bearer <token>

{
  "paymentIntentId": "pi_3ABC123",
  "paymentMethodId": "pm_1DEF456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "_id": "507f1f77bcf86cd799439015",
    "status": "PENDING",
    "paymentMethod": "CARD",
    "paymentId": "507f1f77bcf86cd799439016",
    ...
  }
}
```

---

## Error Handling

### Common Error Scenarios

#### 1. Invalid Payment Method

**Error Response:**
```json
{
  "statusCode": 400,
  "message": ["paymentMethod must be one of the following values: CASH, CARD"],
  "error": "Bad Request"
}
```

**Solution:** Ensure `paymentMethod` is exactly `"CASH"` or `"CARD"` (case-sensitive).

---

#### 2. Missing Payment Method

**Error Response:**
```json
{
  "statusCode": 400,
  "message": ["paymentMethod should not be empty"],
  "error": "Bad Request"
}
```

**Solution:** Always include `paymentMethod` field in order creation request.

---

#### 3. Payment Confirmation Failed

**Error Response:**
```json
{
  "statusCode": 500,
  "message": "Payment failed: Your card was declined.",
  "error": "Internal Server Error"
}
```

**Solution:** 
- Check card details are correct
- For testing, use test card numbers (see Testing section)
- Verify `paymentMethodId` was created successfully
- Check Stripe dashboard for more details

---

#### 4. Payment Intent Not Found

**Error Response:**
```json
{
  "statusCode": 404,
  "message": "Payment not found",
  "error": "Not Found"
}
```

**Solution:** 
- Verify `paymentIntentId` is correct
- Ensure order was created successfully before confirming payment
- Check if payment was already confirmed

---

#### 5. Stripe API Error

**Error Response:**
```json
{
  "statusCode": 500,
  "message": "Failed to create payment intent",
  "error": "Internal Server Error"
}
```

**Solution:**
- Check backend logs for detailed Stripe error
- Verify Stripe API keys are correct
- Check Stripe dashboard for API status

---

## Testing

### Test Card Numbers (Stripe Test Mode)

Use these card numbers for testing:

#### Successful Payment

| Card Number | CVC | Expiry |
|-------------|-----|--------|
| `4242 4242 4242 4242` | Any 3 digits | Any future date |
| `4000 0566 5566 5556` | Any 3 digits | Any future date |

#### Declined Payment

| Card Number | CVC | Expiry | Result |
|-------------|-----|--------|--------|
| `4000 0000 0000 0002` | Any 3 digits | Any future date | Card declined |
| `4000 0000 0000 9995` | Any 3 digits | Any future date | Insufficient funds |

#### 3D Secure (Requires Authentication)

| Card Number | CVC | Expiry | Result |
|-------------|-----|--------|--------|
| `4000 0025 0000 3155` | Any 3 digits | Any future date | Requires authentication |

### Test Payment Flow

1. Create order with `paymentMethod: "CARD"`
2. Use test card `4242 4242 4242 4242`
3. Use any future expiry date (e.g., `12/25`)
4. Use any 3-digit CVC (e.g., `123`)
5. Confirm payment
6. Check order status in backend/Stripe dashboard

---

## Payment Status Flow

```
Order Created
  ↓
paymentMethod: "CARD"
  ↓
PaymentIntent Created (status: "requires_payment_method")
  ↓
Frontend collects card details
  ↓
PaymentMethod Created (pm_xxx)
  ↓
POST /orders/payment/confirm
  ↓
PaymentIntent Confirmed (status: "succeeded")
  ↓
Payment Record Updated (status: "succeeded")
  ↓
Order Status: "PENDING" (restaurant can confirm/refuse)
```

---

## Security Best Practices

1. **Never expose secret keys**: Only use publishable keys in frontend
2. **Always validate on backend**: Don't trust frontend data alone
3. **Use HTTPS**: All API calls must be over HTTPS in production
4. **Token-based auth**: Always include authentication tokens in requests
5. **Handle errors gracefully**: Show user-friendly error messages
6. **Don't store card details**: Let Stripe handle card data storage
7. **Verify payment status**: Always confirm payment succeeded before showing success

---

## Additional Resources

- [Stripe React Native Documentation](https://stripe.dev/stripe-react-native/)
- [Stripe Web Documentation](https://stripe.com/docs/payments/accept-a-payment)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [PaymentIntent API Reference](https://stripe.com/docs/api/payment_intents)

---

## Support

For issues or questions:
1. Check backend logs for detailed error messages
2. Check Stripe Dashboard → Payments for payment status
3. Verify API keys are correct
4. Ensure you're using test keys in development

---

**Last Updated:** December 18, 2025

