# 🚀 Android Stripe Integration - Complete Guide

**Date:** December 22, 2025  
**Purpose:** Integrate Stripe SDK to create PaymentMethod client-side (secure method)  
**Backend Status:** ✅ Ready to accept PaymentMethod IDs

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Add Stripe SDK](#step-1-add-stripe-sdk)
3. [Step 2: Initialize Stripe](#step-2-initialize-stripe)
4. [Step 3: Update Data Classes](#step-3-update-data-classes)
5. [Step 4: Create PaymentMethod](#step-4-create-paymentmethod)
6. [Step 5: Update Repository](#step-5-update-repository)
7. [Step 6: Update ViewModel](#step-6-update-viewmodel)
8. [Step 7: Update UI](#step-7-update-ui)
9. [Complete Code Examples](#complete-code-examples)
10. [Testing](#testing)
11. [Error Handling](#error-handling)

---

## Prerequisites

- ✅ Android Studio Arctic Fox or later
- ✅ Kotlin 1.5+
- ✅ Minimum SDK: 21 (Android 5.0)
- ✅ Internet permission in AndroidManifest.xml
- ✅ Backend running and accessible

---

## Step 1: Add Stripe SDK

### **File:** `app/build.gradle`

```gradle
android {
    compileSdk 34
    
    defaultConfig {
        applicationId "com.example.damprojectfinal"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }
    
    buildFeatures {
        compose true
    }
    
    composeOptions {
        kotlinCompilerExtensionVersion "1.5.1"
    }
}

dependencies {
    // Existing dependencies...
    implementation "androidx.core:core-ktx:1.12.0"
    implementation "androidx.lifecycle:lifecycle-runtime-ktx:2.7.0"
    
    // ⭐ ADD THIS: Stripe Android SDK
    implementation "com.stripe:stripe-android:20.40.1"
    
    // Retrofit (if not already added)
    implementation "com.squareup.retrofit2:retrofit:2.9.0"
    implementation "com.squareup.retrofit2:converter-gson:2.9.0"
    
    // Coroutines (if not already added)
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
}
```

**Action:** Click **"Sync Now"** in Android Studio

---

## Step 2: Initialize Stripe

### **File:** `app/src/main/AndroidManifest.xml`

Make sure you have internet permission:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.damprojectfinal">
    
    <!-- ⭐ REQUIRED: Internet permission -->
    <uses-permission android:name="android.permission.INTERNET" />
    
    <application
        android:name=".MyApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.DamProjectFinal">
        <!-- Activities... -->
    </application>
</manifest>
```

### **File:** `app/src/main/java/com/example/damprojectfinal/MyApplication.kt`

**Create this file if it doesn't exist:**

```kotlin
package com.example.damprojectfinal

import android.app.Application
import com.stripe.android.PaymentConfiguration

class MyApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // ⭐ Initialize Stripe with your publishable key
        PaymentConfiguration.init(
            applicationContext,
            "pk_test_51SeNqPRV5Vgu8dlffxGrQexSTTtQ4dvbeZXQ8h5K4ltKAJeWviIKKojf9SMd6LIHU2aZcsfhwdqWv133INDU2reF006oUE9LpG"
        )
        
        println("✅ Stripe SDK initialized")
    }
}
```

**⚠️ Important:** Update `AndroidManifest.xml` to use this Application class:

```xml
<application
    android:name=".MyApplication"  <!-- ⭐ ADD THIS -->
    ...>
```

---

## Step 3: Update Data Classes

### **File:** `data/model/PaymentConfirmRequest.kt`

**BEFORE (Wrong):**
```kotlin
data class PaymentConfirmRequest(
    val paymentIntentId: String,
    val cardNumber: String,      // ❌ Remove
    val expMonth: Int,            // ❌ Remove
    val expYear: Int,             // ❌ Remove
    val cvc: String,              // ❌ Remove
    val cardholderName: String    // ❌ Remove
)
```

**AFTER (Correct):**
```kotlin
package com.example.damprojectfinal.data.model

import com.google.gson.annotations.SerializedName

data class PaymentConfirmRequest(
    @SerializedName("paymentIntentId")
    val paymentIntentId: String,
    
    @SerializedName("paymentMethodId")
    val paymentMethodId: String  // ✅ Only this!
)
```

### **File:** `data/model/PaymentConfirmResponse.kt`

```kotlin
package com.example.damprojectfinal.data.model

import com.google.gson.annotations.SerializedName

data class PaymentConfirmResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("order")
    val order: Order?
)

data class Order(
    @SerializedName("_id")
    val id: String,
    
    @SerializedName("status")
    val status: String,
    
    @SerializedName("totalPrice")
    val totalPrice: Double,
    
    @SerializedName("paymentMethod")
    val paymentMethod: String
)
```

---

## Step 4: Create PaymentMethod

### **File:** `utils/StripeHelper.kt` (NEW FILE)

**Create this new helper class:**

```kotlin
package com.example.damprojectfinal.utils

import android.content.Context
import com.stripe.android.Stripe
import com.stripe.android.model.CardParams
import com.stripe.android.model.PaymentMethod
import com.stripe.android.model.PaymentMethodCreateParams
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

object StripeHelper {
    
    /**
     * Creates a PaymentMethod from card details using Stripe SDK
     * @return PaymentMethod ID (e.g., "pm_1Abc123...")
     */
    suspend fun createPaymentMethod(
        context: Context,
        cardNumber: String,
        expMonth: Int,
        expYear: Int,
        cvc: String,
        cardholderName: String
    ): String = suspendCancellableCoroutine { continuation ->
        
        println("🔐 ========== STRIPE SDK - CREATE PAYMENT METHOD ==========")
        println("💳 Card Number: ${cardNumber.take(4)}...${cardNumber.takeLast(4)}")
        println("📅 Expiry: $expMonth/$expYear")
        println("👤 Name: $cardholderName")
        println("🔒 Card details will be sent directly to Stripe (NOT to backend)")
        
        try {
            // Create CardParams from user input
            val cardParams = CardParams(
                number = cardNumber.replace(" ", ""),  // Remove spaces
                expMonth = expMonth,
                expYear = expYear,
                cvc = cvc
            )
            
            // Create PaymentMethodCreateParams with billing details
            val paymentMethodParams = PaymentMethodCreateParams.create(
                card = cardParams,
                billingDetails = PaymentMethod.BillingDetails(
                    name = cardholderName
                )
            )
            
            // Initialize Stripe
            val stripe = Stripe(
                context,
                publishableKey = "pk_test_51SeNqPRV5Vgu8dlffxGrQexSTTtQ4dvbeZXQ8h5K4ltKAJeWviIKKojf9SMd6LIHU2aZcsfhwdqWv133INDU2reF006oUE9LpG"
            )
            
            println("🚀 Sending card details to Stripe...")
            
            // Create PaymentMethod using Stripe SDK
            stripe.createPaymentMethod(
                params = paymentMethodParams,
                callback = object : com.stripe.android.ApiResultCallback<PaymentMethod> {
                    override fun onSuccess(result: PaymentMethod) {
                        val paymentMethodId = result.id
                        println("✅ PaymentMethod created successfully!")
                        println("🔑 PaymentMethod ID: $paymentMethodId")
                        println("💳 Card Brand: ${result.card?.brand}")
                        println("🔢 Last 4: ${result.card?.last4}")
                        println("✅ ========== PAYMENT METHOD CREATION COMPLETE ==========")
                        
                        continuation.resume(paymentMethodId)
                    }
                    
                    override fun onError(e: Exception) {
                        println("❌ Failed to create PaymentMethod: ${e.message}")
                        println("❌ ========== PAYMENT METHOD CREATION FAILED ==========")
                        continuation.resumeWithException(e)
                    }
                }
            )
        } catch (e: Exception) {
            println("❌ Error creating PaymentMethod: ${e.message}")
            continuation.resumeWithException(e)
        }
    }
    
    /**
     * Validates card number using Luhn algorithm
     */
    fun isValidCardNumber(cardNumber: String): Boolean {
        val digits = cardNumber.replace(" ", "").filter { it.isDigit() }
        
        if (digits.length < 13 || digits.length > 19) return false
        
        var sum = 0
        var alternate = false
        
        for (i in digits.length - 1 downTo 0) {
            var n = digits[i].toString().toInt()
            if (alternate) {
                n *= 2
                if (n > 9) n -= 9
            }
            sum += n
            alternate = !alternate
        }
        
        return sum % 10 == 0
    }
    
    /**
     * Validates expiry date
     */
    fun isValidExpiry(month: Int, year: Int): Boolean {
        if (month < 1 || month > 12) return false
        
        val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
        val currentMonth = java.util.Calendar.getInstance().get(java.util.Calendar.MONTH) + 1
        
        if (year < currentYear) return false
        if (year == currentYear && month < currentMonth) return false
        
        return true
    }
    
    /**
     * Validates CVV
     */
    fun isValidCvv(cvv: String): Boolean {
        return cvv.length in 3..4 && cvv.all { it.isDigit() }
    }
}
```

---

## Step 5: Update Repository

### **File:** `data/repository/OrderRepository.kt`

**Update the `confirmPayment` method:**

```kotlin
package com.example.damprojectfinal.data.repository

import android.content.Context
import com.example.damprojectfinal.data.api.ApiService
import com.example.damprojectfinal.data.model.*
import com.example.damprojectfinal.utils.StripeHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class OrderRepository(
    private val apiService: ApiService,
    private val context: Context
) {
    
    /**
     * Creates order and gets PaymentIntent
     */
    suspend fun createOrder(
        token: String,
        professionalId: String,
        orderType: String,
        paymentMethod: String,
        scheduledTime: String? = null,
        deliveryAddress: String? = null,
        notes: String? = null
    ): Result<CreateOrderResponse> = withContext(Dispatchers.IO) {
        try {
            println("📦 Creating order...")
            
            val request = CreateOrderRequest(
                professionalId = professionalId,
                orderType = orderType,
                paymentMethod = paymentMethod,
                scheduledTime = scheduledTime,
                deliveryAddress = deliveryAddress,
                notes = notes
            )
            
            val response = apiService.createOrder("Bearer $token", request)
            
            if (response.isSuccessful && response.body() != null) {
                val order = response.body()!!
                println("✅ Order created: ${order.orderId}")
                
                if (paymentMethod == "CARD" && order.clientSecret != null) {
                    println("💳 PaymentIntent created: ${order.paymentIntentId}")
                    println("🔑 Client Secret: ${order.clientSecret.take(20)}...")
                }
                
                Result.success(order)
            } else {
                println("❌ Failed to create order: ${response.code()}")
                Result.failure(Exception("Failed to create order: ${response.code()}"))
            }
        } catch (e: Exception) {
            println("❌ Error creating order: ${e.message}")
            Result.failure(e)
        }
    }
    
    /**
     * ⭐ NEW: Confirms payment using Stripe SDK + Backend
     * 
     * Flow:
     * 1. Use Stripe SDK to create PaymentMethod from card details
     * 2. Send PaymentMethod ID to backend
     * 3. Backend confirms payment with Stripe
     */
    suspend fun confirmPayment(
        token: String,
        paymentIntentId: String,
        cardNumber: String,
        expMonth: Int,
        expYear: Int,
        cvc: String,
        cardholderName: String
    ): Result<PaymentConfirmResponse> = withContext(Dispatchers.IO) {
        try {
            println("💳 ========== PAYMENT CONFIRMATION STARTED ==========")
            
            // ⭐ STEP 1: Create PaymentMethod using Stripe SDK
            println("🔐 STEP 1: Creating PaymentMethod with Stripe SDK...")
            val paymentMethodId = StripeHelper.createPaymentMethod(
                context = context,
                cardNumber = cardNumber,
                expMonth = expMonth,
                expYear = expYear,
                cvc = cvc,
                cardholderName = cardholderName
            )
            
            println("✅ PaymentMethod created: $paymentMethodId")
            println("🔒 Card details were sent directly to Stripe (NOT to backend)")
            
            // ⭐ STEP 2: Send PaymentMethod ID to backend
            println("📤 STEP 2: Sending PaymentMethod ID to backend...")
            val request = PaymentConfirmRequest(
                paymentIntentId = paymentIntentId,
                paymentMethodId = paymentMethodId  // ✅ Only sending token
            )
            
            val response = apiService.confirmPayment("Bearer $token", request)
            
            if (response.isSuccessful && response.body() != null) {
                val result = response.body()!!
                println("✅ Payment confirmed successfully!")
                println("📦 Order status: ${result.order?.status}")
                println("✅ ========== PAYMENT CONFIRMATION COMPLETE ==========")
                Result.success(result)
            } else {
                val errorBody = response.errorBody()?.string()
                println("❌ Payment confirmation failed: ${response.code()}")
                println("❌ Error: $errorBody")
                Result.failure(Exception("Payment failed: ${response.code()}"))
            }
            
        } catch (e: Exception) {
            println("❌ Error confirming payment: ${e.message}")
            println("❌ ========== PAYMENT CONFIRMATION FAILED ==========")
            Result.failure(e)
        }
    }
}
```

---

## Step 6: Update ViewModel

### **File:** `ui/viewmodel/CartViewModel.kt`

```kotlin
package com.example.damprojectfinal.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.damprojectfinal.data.repository.OrderRepository
import com.example.damprojectfinal.utils.StripeHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class CartViewModel(application: Application) : AndroidViewModel(application) {
    
    private val orderRepository = OrderRepository(
        apiService = /* your API service */,
        context = application.applicationContext
    )
    
    // UI State
    private val _paymentState = MutableStateFlow<PaymentState>(PaymentState.Idle)
    val paymentState: StateFlow<PaymentState> = _paymentState
    
    // Card details
    private val _cardNumber = MutableStateFlow("")
    val cardNumber: StateFlow<String> = _cardNumber
    
    private val _expiryMonth = MutableStateFlow("")
    val expiryMonth: StateFlow<String> = _expiryMonth
    
    private val _expiryYear = MutableStateFlow("")
    val expiryYear: StateFlow<String> = _expiryYear
    
    private val _cvv = MutableStateFlow("")
    val cvv: StateFlow<String> = _cvv
    
    private val _cardholderName = MutableStateFlow("")
    val cardholderName: StateFlow<String> = _cardholderName
    
    // Validation errors
    private val _cardNumberError = MutableStateFlow<String?>(null)
    val cardNumberError: StateFlow<String?> = _cardNumberError
    
    private val _expiryError = MutableStateFlow<String?>(null)
    val expiryError: StateFlow<String?> = _expiryError
    
    private val _cvvError = MutableStateFlow<String?>(null)
    val cvvError: StateFlow<String?> = _cvvError
    
    private val _nameError = MutableStateFlow<String?>(null)
    val nameError: StateFlow<String?> = _nameError
    
    /**
     * Updates card number
     */
    fun updateCardNumber(value: String) {
        // Format card number with spaces (4-4-4-4)
        val digitsOnly = value.filter { it.isDigit() }
        val formatted = digitsOnly.chunked(4).joinToString(" ").take(19)
        _cardNumber.value = formatted
        
        // Validate
        if (digitsOnly.isNotEmpty() && !StripeHelper.isValidCardNumber(digitsOnly)) {
            _cardNumberError.value = "Invalid card number"
        } else {
            _cardNumberError.value = null
        }
    }
    
    fun updateExpiryMonth(value: String) {
        if (value.length <= 2) {
            _expiryMonth.value = value.filter { it.isDigit() }
            validateExpiry()
        }
    }
    
    fun updateExpiryYear(value: String) {
        if (value.length <= 4) {
            _expiryYear.value = value.filter { it.isDigit() }
            validateExpiry()
        }
    }
    
    fun updateCvv(value: String) {
        if (value.length <= 4) {
            _cvv.value = value.filter { it.isDigit() }
            
            if (value.isNotEmpty() && !StripeHelper.isValidCvv(value)) {
                _cvvError.value = "Invalid CVV"
            } else {
                _cvvError.value = null
            }
        }
    }
    
    fun updateCardholderName(value: String) {
        _cardholderName.value = value
        _nameError.value = if (value.isBlank()) "Name is required" else null
    }
    
    private fun validateExpiry() {
        val month = _expiryMonth.value.toIntOrNull() ?: 0
        val year = _expiryYear.value.toIntOrNull() ?: 0
        
        if (month > 0 && year > 0 && !StripeHelper.isValidExpiry(month, year)) {
            _expiryError.value = "Card expired"
        } else {
            _expiryError.value = null
        }
    }
    
    /**
     * Validates all card details
     */
    private fun validateCardDetails(): Boolean {
        val cardDigits = _cardNumber.value.filter { it.isDigit() }
        val month = _expiryMonth.value.toIntOrNull() ?: 0
        val year = _expiryYear.value.toIntOrNull() ?: 0
        
        var isValid = true
        
        if (!StripeHelper.isValidCardNumber(cardDigits)) {
            _cardNumberError.value = "Invalid card number"
            isValid = false
        }
        
        if (!StripeHelper.isValidExpiry(month, year)) {
            _expiryError.value = "Invalid expiry date"
            isValid = false
        }
        
        if (!StripeHelper.isValidCvv(_cvv.value)) {
            _cvvError.value = "Invalid CVV"
            isValid = false
        }
        
        if (_cardholderName.value.isBlank()) {
            _nameError.value = "Name is required"
            isValid = false
        }
        
        return isValid
    }
    
    /**
     * Processes payment
     */
    fun processPayment(
        token: String,
        paymentIntentId: String
    ) {
        viewModelScope.launch {
            try {
                // Validate card details
                if (!validateCardDetails()) {
                    _paymentState.value = PaymentState.Error("Please fix card details")
                    return@launch
                }
                
                _paymentState.value = PaymentState.Processing
                
                println("💳 Starting payment process...")
                
                val result = orderRepository.confirmPayment(
                    token = token,
                    paymentIntentId = paymentIntentId,
                    cardNumber = _cardNumber.value.filter { it.isDigit() },
                    expMonth = _expiryMonth.value.toInt(),
                    expYear = _expiryYear.value.toInt(),
                    cvc = _cvv.value,
                    cardholderName = _cardholderName.value
                )
                
                if (result.isSuccess) {
                    println("✅ Payment successful!")
                    _paymentState.value = PaymentState.Success(result.getOrNull()!!)
                } else {
                    println("❌ Payment failed: ${result.exceptionOrNull()?.message}")
                    _paymentState.value = PaymentState.Error(
                        result.exceptionOrNull()?.message ?: "Payment failed"
                    )
                }
                
            } catch (e: Exception) {
                println("❌ Error processing payment: ${e.message}")
                _paymentState.value = PaymentState.Error(e.message ?: "Unknown error")
            }
        }
    }
}

/**
 * Payment state
 */
sealed class PaymentState {
    object Idle : PaymentState()
    object Processing : PaymentState()
    data class Success(val response: PaymentConfirmResponse) : PaymentState()
    data class Error(val message: String) : PaymentState()
}
```

---

## Step 7: Update UI

### **File:** `ui/screen/PaymentScreen.kt` (or your credit card form)

```kotlin
package com.example.damprojectfinal.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.damprojectfinal.ui.viewmodel.CartViewModel
import com.example.damprojectfinal.ui.viewmodel.PaymentState

@Composable
fun PaymentScreen(
    paymentIntentId: String,
    totalAmount: Double,
    token: String,
    onPaymentSuccess: () -> Unit,
    viewModel: CartViewModel = viewModel()
) {
    val paymentState by viewModel.paymentState.collectAsState()
    
    val cardNumber by viewModel.cardNumber.collectAsState()
    val expiryMonth by viewModel.expiryMonth.collectAsState()
    val expiryYear by viewModel.expiryYear.collectAsState()
    val cvv by viewModel.cvv.collectAsState()
    val cardholderName by viewModel.cardholderName.collectAsState()
    
    val cardNumberError by viewModel.cardNumberError.collectAsState()
    val expiryError by viewModel.expiryError.collectAsState()
    val cvvError by viewModel.cvvError.collectAsState()
    val nameError by viewModel.nameError.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Title
        Text(
            text = "Payment Details",
            style = MaterialTheme.typography.headlineMedium
        )
        
        Text(
            text = "Total: $${"%.2f".format(totalAmount)}",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.primary
        )
        
        Divider()
        
        // Card Number
        OutlinedTextField(
            value = cardNumber,
            onValueChange = { viewModel.updateCardNumber(it) },
            label = { Text("Card Number") },
            placeholder = { Text("4242 4242 4242 4242") },
            isError = cardNumberError != null,
            supportingText = {
                if (cardNumberError != null) {
                    Text(cardNumberError!!, color = MaterialTheme.colorScheme.error)
                }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        
        // Expiry Date
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = expiryMonth,
                onValueChange = { viewModel.updateExpiryMonth(it) },
                label = { Text("Month") },
                placeholder = { Text("12") },
                isError = expiryError != null,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f)
            )
            
            OutlinedTextField(
                value = expiryYear,
                onValueChange = { viewModel.updateExpiryYear(it) },
                label = { Text("Year") },
                placeholder = { Text("2025") },
                isError = expiryError != null,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f)
            )
        }
        
        if (expiryError != null) {
            Text(
                text = expiryError!!,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }
        
        // CVV
        OutlinedTextField(
            value = cvv,
            onValueChange = { viewModel.updateCvv(it) },
            label = { Text("CVV") },
            placeholder = { Text("123") },
            isError = cvvError != null,
            supportingText = {
                if (cvvError != null) {
                    Text(cvvError!!, color = MaterialTheme.colorScheme.error)
                }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        
        // Cardholder Name
        OutlinedTextField(
            value = cardholderName,
            onValueChange = { viewModel.updateCardholderName(it) },
            label = { Text("Cardholder Name") },
            placeholder = { Text("John Doe") },
            isError = nameError != null,
            supportingText = {
                if (nameError != null) {
                    Text(nameError!!, color = MaterialTheme.colorScheme.error)
                }
            },
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.weight(1f))
        
        // Payment State
        when (val state = paymentState) {
            is PaymentState.Processing -> {
                CircularProgressIndicator(modifier = Modifier.fillMaxWidth())
                Text("Processing payment...", modifier = Modifier.fillMaxWidth())
            }
            is PaymentState.Error -> {
                Text(
                    text = "Error: ${state.message}",
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            is PaymentState.Success -> {
                LaunchedEffect(Unit) {
                    onPaymentSuccess()
                }
            }
            else -> {}
        }
        
        // Pay Button
        Button(
            onClick = {
                viewModel.processPayment(token, paymentIntentId)
            },
            enabled = paymentState !is PaymentState.Processing,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Pay $${"%.2f".format(totalAmount)}")
        }
        
        // Test Card Info
        Text(
            text = "Test Card: 4242 4242 4242 4242 | Expiry: 12/2025 | CVV: 123",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
```

---

## Complete Code Examples

### **Complete Flow Example:**

```kotlin
// 1. User creates order
val orderResult = orderRepository.createOrder(
    token = token,
    professionalId = restaurantId,
    orderType = "TAKEAWAY",
    paymentMethod = "CARD"
)

if (orderResult.isSuccess) {
    val order = orderResult.getOrNull()!!
    val paymentIntentId = order.paymentIntentId
    
    // 2. Show payment form
    // User fills card details...
    
    // 3. When user clicks "Pay":
    // - Stripe SDK creates PaymentMethod (client-side)
    // - Backend confirms payment
    viewModel.processPayment(token, paymentIntentId)
    
    // 4. Handle result
    when (val state = paymentState) {
        is PaymentState.Success -> {
            // ✅ Payment succeeded!
            navigateToOrderSuccess()
        }
        is PaymentState.Error -> {
            // ❌ Payment failed
            showError(state.message)
        }
    }
}
```

---

## Testing

### **Test Cards (Stripe Test Mode)**

| Card Number | Scenario | Expected Result |
|-------------|----------|-----------------|
| `4242 4242 4242 4242` | Success | ✅ Payment succeeds |
| `4000 0000 0000 0002` | Declined | ❌ Card declined |
| `4000 0000 0000 9995` | Insufficient Funds | ❌ Insufficient funds |
| `4000 0000 0000 0341` | Attach Fails | ❌ Payment method invalid |

**Test Details:**
- Expiry: Any future date (e.g., 12/2025)
- CVV: Any 3 digits (e.g., 123)
- Name: Any name (e.g., John Doe)

### **Testing Steps:**

1. **Test Successful Payment:**
   ```
   Card: 4242 4242 4242 4242
   Expiry: 12/2025
   CVV: 123
   Name: Test User
   
   Expected: ✅ Payment succeeds, order confirmed
   ```

2. **Test Declined Card:**
   ```
   Card: 4000 0000 0000 0002
   Expiry: 12/2025
   CVV: 123
   Name: Test User
   
   Expected: ❌ Payment fails with "Card declined" error
   ```

3. **Test Invalid Card:**
   ```
   Card: 1234 5678 9012 3456
   Expiry: 12/2025
   CVV: 123
   Name: Test User
   
   Expected: ❌ Validation error before sending to Stripe
   ```

---

## Error Handling

### **Common Errors and Solutions:**

#### **Error: "Card number is invalid"**
**Cause:** Invalid card number format  
**Solution:** Ensure card number passes Luhn algorithm validation

#### **Error: "Your card was declined"**
**Cause:** Using test card `4000 0000 0000 0002`  
**Solution:** Use `4242 4242 4242 4242` for successful test

#### **Error: "Payment method is invalid"**
**Cause:** PaymentMethod creation failed  
**Solution:** Check card details and Stripe publishable key

#### **Error: "Network error"**
**Cause:** Backend not reachable  
**Solution:** Check backend URL and internet connection

---

## Security Checklist

- [x] ✅ Card details sent directly to Stripe (never touch backend)
- [x] ✅ Only PaymentMethod ID sent to backend
- [x] ✅ HTTPS used for all network calls
- [x] ✅ Stripe SDK validates card details
- [x] ✅ Backend validates PaymentMethod ID
- [x] ✅ No card details stored in database
- [x] ✅ PCI-DSS Level 1 compliant (via Stripe)

---

## Troubleshooting

### **"Unresolved reference: Stripe"**
**Solution:** Sync Gradle and rebuild project

### **"PaymentConfiguration not initialized"**
**Solution:** Make sure `MyApplication.kt` is set in `AndroidManifest.xml`

### **"No such PaymentMethod"**
**Solution:** Ensure you're sending PaymentMethod ID (not fake ID)

### **Backend returns 400**
**Solution:** Check that you're sending `paymentMethodId`, not card details

---

## Summary

### **What Changed:**

1. ✅ Added Stripe SDK to Android app
2. ✅ Card details processed by Stripe SDK (client-side)
3. ✅ Only PaymentMethod ID sent to backend
4. ✅ Backend already ready to accept PaymentMethod IDs
5. ✅ 100% secure, PCI-DSS compliant

### **Security Flow:**

```
User enters card → Stripe SDK → PaymentMethod created → PM ID sent to backend
                      ↓
                Card details NEVER touch your backend!
```

### **Next Steps:**

1. Sync Gradle to download Stripe SDK
2. Create `MyApplication.kt` and initialize Stripe
3. Update `PaymentConfirmRequest` to use `paymentMethodId`
4. Implement `StripeHelper.kt`
5. Update repository, ViewModel, and UI
6. Test with card `4242 4242 4242 4242`

---

**Questions? Issues?**
- Check console logs for detailed error messages
- Verify Stripe publishable key
- Test with Stripe test cards
- Ensure internet connection

**Backend is ready! Just integrate Stripe SDK and you're good to go! 🚀**

---

**Last Updated:** December 22, 2025  
**Status:** Complete Implementation Guide  
**Backend Version:** Compatible ✅

