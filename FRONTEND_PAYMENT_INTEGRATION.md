# 💳 Frontend Payment Integration Guide - Complete & Updated

## ⚠️ **IMPORTANT: Avoid 400 & 500 Errors**

**DO NOT send raw card details to the backend!** Stripe blocks this and will cause errors.

**✅ CORRECT:** Send `paymentMethodId` (created by Stripe SDK)  
**❌ WRONG:** Sending `cardNumber`, `expiryMonth`, `expiryYear`, `cvv` directly

---

## ✅ **Backend is Ready**

The backend accepts:
- `paymentIntentId` (string, required) - From order creation
- `paymentMethodId` (string, required) - Created by Stripe SDK on frontend

---

## 📡 **API Endpoint**

```
POST /orders/payment/confirm
Content-Type: application/json
```

### **Request Body (REQUIRED Format):**

```json
{
  "paymentIntentId": "pi_3SeQNJRV5Vgu8d1f1Jl2faqg",
  "paymentMethodId": "pm_1ABC123xyz"
}
```

### **✅ Success Response (200):**

```json
{
  "success": true,
  "order": {
    "_id": "order-id",
    "status": "pending",
    "paymentMethod": "CARD",
    ...
  }
}
```

### **❌ Error Responses:**

**400 Bad Request** - Missing or invalid fields:
```json
{
  "message": ["paymentIntentId should not be empty", "paymentMethodId should not be empty"],
  "error": "Bad Request",
  "statusCode": 400
}
```

**500 Internal Server Error** - Payment failed:
```json
{
  "message": "Payment failed: [Stripe error message]",
  "error": "Internal Server Error",
  "statusCode": 500
}
```

---

## 🔄 **Complete Payment Flow**

### **STEP 1: Create Order (Get PaymentIntent)**

```javascript
// Create order with paymentMethod: 'CARD'
const orderResponse = await fetch('http://127.0.0.1:3000/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    professionalId: 'professional-id',
    orderType: 'delivery',
    items: [...],
    totalPrice: 21.00,
    paymentMethod: 'CARD', // Important!
  }),
});

const orderData = await orderResponse.json();
// Response contains:
// {
//   order: {...},
//   clientSecret: "pi_xxx_secret_xxx",
//   paymentIntentId: "pi_xxx"
// }
```

### **STEP 2: Create PaymentMethod (Stripe SDK)**

Use Stripe SDK to create PaymentMethod from card details:

#### **React Native:**

```javascript
import { useStripe } from '@stripe/stripe-react-native';

const { createPaymentMethod } = useStripe();

// User enters card details in your UI
const cardDetails = {
  number: '5555555555554444',      // Without spaces
  expMonth: 12,                     // Number 1-12
  expYear: 2034,                    // Full year as number
  cvc: '123',                       // String
};

// Create PaymentMethod using Stripe SDK
const { paymentMethod, error } = await createPaymentMethod({
  paymentMethodType: 'Card',
  card: {
    number: cardDetails.number.replace(/\s/g, ''), // Remove spaces
    expMonth: cardDetails.expMonth,                 // Number 1-12
    expYear: cardDetails.expYear,                   // Number 2024+
    cvc: cardDetails.cvc,                           // String
  },
  billingDetails: {
    name: 'Khalil', // Cardholder name
  },
});

if (error) {
  console.error('PaymentMethod creation failed:', error);
  // Handle error
  return;
}

// paymentMethod.id will be like "pm_1ABC123xyz"
```

#### **iOS Native (Swift):**

```swift
import Stripe

let cardParams = STPPaymentMethodCardParams()
cardParams.number = "5555555555554444"
cardParams.expMonth = NSNumber(value: 12)  // 1-12
cardParams.expYear = NSNumber(value: 2034) // Full year
cardParams.cvc = "123"

let paymentMethodParams = STPPaymentMethodParams(
    card: cardParams,
    billingDetails: STPPaymentMethodBillingDetails(),
    metadata: nil
)

STPAPIClient.shared.createPaymentMethod(with: paymentMethodParams) { paymentMethod, error in
    if let error = error {
        print("Error: \(error)")
        return
    }
    
    guard let paymentMethodId = paymentMethod?.stripeId else { return }
    // paymentMethodId will be like "pm_1ABC123xyz"
    
    // Continue to STEP 3
}
```

### **STEP 3: Confirm Payment (Send to Backend)**

Send **ONLY** `paymentIntentId` and `paymentMethodId` to backend:

```javascript
const confirmResponse = await fetch('http://127.0.0.1:3000/orders/payment/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentIntentId: orderData.paymentIntentId,  // From STEP 1
    paymentMethodId: paymentMethod.id,            // From STEP 2 (Stripe SDK)
  }),
});

if (!confirmResponse.ok) {
  const error = await confirmResponse.json();
  console.error('Payment confirmation failed:', error);
  // Handle error
  return;
}

const result = await confirmResponse.json();
if (result.success) {
  // Payment successful! Order is confirmed
  console.log('Payment confirmed!', result.order);
}
```

---

## 🎨 **UI Implementation with Proper Date Pickers**

### **React Native Example (Complete):**

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useStripe } from '@stripe/stripe-react-native';

function PaymentScreen({ orderData }) {
  const { createPaymentMethod } = useStripe();
  
  // State for card details
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState(null); // Number 1-12
  const [expYear, setExpYear] = useState(null);   // Number 2024+
  const [cvc, setCvc] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate years array (current year to +10 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i);

  const handlePay = async () => {
    // Validation
    if (!cardholderName || !cardNumber || !expMonth || !expYear || !cvc) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Error', 'Invalid card number');
      return;
    }

    setLoading(true);

    try {
      // STEP 2: Create PaymentMethod using Stripe SDK
      const { paymentMethod, error: pmError } = await createPaymentMethod({
        paymentMethodType: 'Card',
        card: {
          number: cardNumber.replace(/\s/g, ''), // Remove spaces
          expMonth: expMonth,                     // Number 1-12
          expYear: expYear,                       // Number 2024+
          cvc: cvc,                               // String
        },
        billingDetails: {
          name: cardholderName,
        },
      });

      if (pmError) {
        Alert.alert('Payment Error', pmError.message);
        setLoading(false);
        return;
      }

      // STEP 3: Confirm payment with backend
      const response = await fetch('http://127.0.0.1:3000/orders/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: orderData.paymentIntentId,
          paymentMethodId: paymentMethod.id, // Send only the ID!
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        Alert.alert('Error', result.message || 'Payment failed');
        setLoading(false);
        return;
      }

      if (result.success) {
        Alert.alert('Success', 'Payment confirmed!');
        // Navigate to success screen
      }

    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      {/* Cardholder Name */}
      <Text>Cardholder Name</Text>
      <TextInput
        value={cardholderName}
        onChangeText={setCardholderName}
        placeholder="Khalil"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />

      {/* Card Number */}
      <Text>Card Number</Text>
      <TextInput
        value={cardNumber}
        onChangeText={setCardNumber}
        placeholder="5555 5555 5555 4444"
        keyboardType="number-pad"
        maxLength={19}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />

      {/* Expiry Date - Month Picker */}
      <Text>Expiry Month</Text>
      <Picker
        selectedValue={expMonth}
        onValueChange={(value) => setExpMonth(value)}
        style={{ borderWidth: 1, marginBottom: 10 }}
      >
        <Picker.Item label="Select Month" value={null} />
        {Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          return (
            <Picker.Item
              key={month}
              label={month.toString().padStart(2, '0')}
              value={month}
            />
          );
        })}
      </Picker>

      {/* Expiry Date - Year Picker */}
      <Text>Expiry Year</Text>
      <Picker
        selectedValue={expYear}
        onValueChange={(value) => setExpYear(value)}
        style={{ borderWidth: 1, marginBottom: 10 }}
      >
        <Picker.Item label="Select Year" value={null} />
        {years.map((year) => (
          <Picker.Item key={year} label={year.toString()} value={year} />
        ))}
      </Picker>

      {/* CVV */}
      <Text>CVV</Text>
      <TextInput
        value={cvc}
        onChangeText={setCvc}
        placeholder="123"
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />

      <Button
        title={loading ? 'Processing...' : `Pay ${orderData.order.totalPrice} DT`}
        onPress={handlePay}
        disabled={loading}
      />
    </View>
  );
}
```

---

## ⚠️ **Common Errors & Solutions**

### **Error 400: "property cardNumber should not exist"**

**Problem:** Sending raw card details to backend  
**Solution:** Use Stripe SDK to create PaymentMethod, send only `paymentMethodId`

```javascript
// ❌ WRONG
body: JSON.stringify({
  paymentIntentId: 'pi_xxx',
  cardNumber: '5555555555554444',  // DON'T DO THIS!
  expiryMonth: 12,
  expiryYear: 2034,
  cvv: '123',
})

// ✅ CORRECT
body: JSON.stringify({
  paymentIntentId: 'pi_xxx',
  paymentMethodId: 'pm_xxx',  // From Stripe SDK
})
```

---

### **Error 500: "Sending credit card numbers directly to the Stripe API is generally unsafe"**

**Problem:** Trying to send card details to Stripe API server-side  
**Solution:** Create PaymentMethod on frontend using Stripe SDK

```javascript
// ✅ Create PaymentMethod on frontend (CLIENT-SIDE)
const { paymentMethod } = await createPaymentMethod({
  paymentMethodType: 'Card',
  card: { number, expMonth, expYear, cvc },
});

// Then send paymentMethod.id to backend
```

---

### **Error 400: "Payment status: requires_payment_method"**

**Problem:** PaymentIntent doesn't have a payment method attached  
**Solution:** Make sure you're sending `paymentMethodId` correctly

```javascript
// ✅ Make sure paymentMethodId is valid Stripe PaymentMethod ID
if (!paymentMethod || !paymentMethod.id) {
  Alert.alert('Error', 'Failed to create payment method');
  return;
}

// Send it to backend
body: JSON.stringify({
  paymentIntentId: 'pi_xxx',
  paymentMethodId: paymentMethod.id, // Must be valid "pm_xxx" format
})
```

---

## 🔑 **Key Requirements**

1. ✅ **Use Stripe SDK** - Always create PaymentMethod client-side
2. ✅ **Date Format:**
   - Month: Number 1-12 (not string, not "01", just 1)
   - Year: Full year as number (2024, not 24)
3. ✅ **Card Number:** Remove all spaces before sending to Stripe SDK
4. ✅ **Send Only IDs:** Backend only accepts `paymentIntentId` and `paymentMethodId`
5. ✅ **Validation:** Validate fields before calling Stripe SDK

---

## 📋 **Checklist Before Sending Request**

- [ ] Created order with `paymentMethod: 'CARD'` and received `paymentIntentId`
- [ ] Used Stripe SDK to create PaymentMethod from card details
- [ ] Got `paymentMethod.id` (starts with "pm_")
- [ ] Removed spaces from card number before creating PaymentMethod
- [ ] Month is number 1-12 (not string)
- [ ] Year is full year as number (2024, not 24)
- [ ] Sending **ONLY** `paymentIntentId` and `paymentMethodId` to backend
- [ ] NOT sending `cardNumber`, `expiryMonth`, `expiryYear`, `cvv` to backend

---

## ✅ **Success Flow Summary**

1. User enters card details in UI (with proper month/year pickers)
2. Frontend validates input
3. Frontend calls Stripe SDK: `createPaymentMethod({ card: {...} })`
4. Stripe returns `paymentMethod.id` (e.g., "pm_1ABC123xyz")
5. Frontend sends to backend: `{ paymentIntentId, paymentMethodId }`
6. Backend attaches PaymentMethod to PaymentIntent and confirms
7. Backend returns: `{ success: true, order: {...} }`

---

## 🔗 **Stripe Documentation**

- **React Native SDK**: https://stripe.dev/stripe-react-native/
- **iOS SDK**: https://stripe.dev/stripe-ios/
- **Testing Cards**: https://stripe.com/docs/testing

---

**Follow this guide exactly to avoid 400 and 500 errors!**
