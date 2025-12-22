# Deals System Implementation Guide

## Overview

The deals system allows restaurants to create discount offers that automatically apply to menu items. When a user adds items to cart or places an order, they receive the discounted price if a deal is active.

---

## Backend Changes Summary

### 1. Deal Schema (`src/deals/schemas/deals.schema.ts`)

**New Fields Added:**

```typescript
@Prop({ type: Types.ObjectId, ref: 'ProfessionalAccount', required: true })
professionalId: Types.ObjectId; // Restaurant that owns this deal

@Prop({ required: true, min: 0, max: 100 })
discountPercentage: number; // Discount percentage (e.g., 40, 50, 70)

@Prop({ type: [{ type: Types.ObjectId, ref: 'MenuItem' }], default: [] })
applicableMenuItems: Types.ObjectId[]; // Specific menu items (empty = all items)

@Prop({ type: [String], default: [] })
applicableCategories: string[]; // Menu categories (e.g., ['PIZZA', 'BURGER'])
```

**Purpose:** Links deals to specific restaurants and allows targeting specific menu items or categories.

---

### 2. MenuItem Schema (`src/menuitem/schema/menuitem.schema.ts`)

**New Fields Added:**

```typescript
@Prop({ required: false, default: null })
discountedPrice?: number; // Discounted price (if deal is active)

@Prop({ type: Types.ObjectId, ref: 'Deals', required: false })
activeDealId?: Types.ObjectId; // Reference to active deal

@Prop({ required: false, default: 0 })
discountPercentage?: number; // Current discount percentage
```

**Purpose:** Menu items now track their discounted price and which deal is currently active.

---

### 3. CartItem & OrderItem Schemas

**New Fields Added to Both:**

```typescript
@Prop({ required: false })
originalPrice?: number; // Original price before discount

@Prop({ required: false })
discountPercentage?: number; // Discount percentage applied

@Prop({ type: Types.ObjectId, ref: 'Deals', required: false })
dealId?: Types.ObjectId; // Deal applied to this item
```

**Purpose:** Cart and orders preserve deal information as a snapshot at the time of addition/purchase.

---

### 4. MenuItemService New Methods

#### `applyDealToMenuItems()`

Applies a deal to menu items based on:
- Specific menu item IDs
- Categories (e.g., all PIZZA items)
- All items (if no filters provided)

**Example:**
```typescript
await menuItemService.applyDealToMenuItems(
  dealId,
  50, // 50% discount
  professionalId,
  [menuItem1Id, menuItem2Id], // Optional: specific items
  ['PIZZA', 'BURGER'], // Optional: categories
);
```

#### `removeDealFromMenuItems()`

Removes a deal from all affected menu items (when deal expires or is deleted).

#### `getEffectivePrice()`

Returns the price to use (discounted if available, otherwise original).

---

### 5. DealsService Updates

**Automatic Deal Application:**

When a deal is created:
1. Deal is saved to database
2. Deal is automatically applied to menu items
3. Notification is sent to users

**Automatic Deal Removal:**

- Cron job runs every minute
- Expired deals are detected
- Deals are removed from menu items
- Expired deals are deleted

**Deal Update:**

When discount percentage or applicable items change:
1. Old deal application is removed
2. New deal is applied with updated values

---

## API Endpoints

### Create Deal

**Endpoint:** `POST /deals`

**Request Body:**
```json
{
  "professionalId": "507f1f77bcf86cd799439011",
  "restaurantName": "Pizza Palace",
  "description": "50% off all pizzas this weekend!",
  "image": "https://example.com/deal.jpg",
  "category": "Weekend Special",
  "discountPercentage": 50,
  "applicableMenuItems": [], // Empty = all items
  "applicableCategories": ["PIZZA"], // Optional: target specific categories
  "startDate": "2025-12-18T00:00:00Z",
  "endDate": "2025-12-22T23:59:59Z",
  "isActive": true
}
```

**Response:**
```json
{
  "_id": "deal_id",
  "professionalId": "507f1f77bcf86cd799439011",
  "restaurantName": "Pizza Palace",
  "discountPercentage": 50,
  "applicableCategories": ["PIZZA"],
  "startDate": "2025-12-18T00:00:00.000Z",
  "endDate": "2025-12-22T23:59:59.000Z",
  "isActive": true,
  "createdAt": "2025-12-18T10:00:00.000Z"
}
```

---

### Get Active Deals for Restaurant

**Endpoint:** `GET /deals/professional/:professionalId/active`

**Response:**
```json
[
  {
    "_id": "deal_id",
    "discountPercentage": 50,
    "description": "50% off all pizzas",
    "startDate": "2025-12-18T00:00:00.000Z",
    "endDate": "2025-12-22T23:59:59.000Z"
  }
]
```

---

## Frontend Integration Flow

### 1. Display Menu Items with Deals

When fetching menu items for a restaurant:

```typescript
// GET /menuitem/professional/:professionalId
const menuItems = await fetch(`/menuitem/professional/${restaurantId}`);

menuItems.forEach(item => {
  if (item.discountedPrice && item.activeDealId) {
    // Show discounted price
    displayPrice = item.discountedPrice;
    originalPrice = item.price;
    discountBadge = `${item.discountPercentage}% OFF`;
  } else {
    // Show normal price
    displayPrice = item.price;
  }
});
```

**UI Example:**
```
Pizza Margherita
$9.99  $19.99  [50% OFF]
 ↑       ↑         ↑
 new   original  badge
```

---

### 2. Add to Cart with Deal

When adding an item to cart, include deal information:

```typescript
const addToCart = async (menuItem) => {
  const cartItem = {
    menuItemId: menuItem._id,
    name: menuItem.name,
    quantity: 1,
    chosenIngredients: selectedIngredients,
    chosenOptions: selectedOptions,
    calculatedPrice: menuItem.discountedPrice || menuItem.price, // Use discounted price if available
    originalPrice: menuItem.price, // Always include original price
    discountPercentage: menuItem.discountPercentage || 0,
    dealId: menuItem.activeDealId || null,
  };

  await fetch('/cart/add', {
    method: 'POST',
    body: JSON.stringify(cartItem),
  });
};
```

---

### 3. Display Cart with Deals

When displaying cart:

```typescript
const displayCart = (cart) => {
  let subtotal = 0;
  let totalSavings = 0;

  cart.items.forEach(item => {
    const itemTotal = item.calculatedPrice * item.quantity;
    subtotal += itemTotal;

    if (item.originalPrice && item.discountPercentage > 0) {
      const originalTotal = item.originalPrice * item.quantity;
      const savings = originalTotal - itemTotal;
      totalSavings += savings;
    }
  });

  return {
    subtotal,
    totalSavings,
    finalTotal: subtotal,
  };
};
```

**UI Example:**
```
Cart Summary
--------------------
Subtotal:        $24.99
Savings:        -$25.00  [You saved 50%!]
--------------------
Total:           $24.99
```

---

### 4. Place Order with Deals

When creating an order, the deal information from cart is automatically preserved:

```typescript
const placeOrder = async () => {
  const orderData = {
    userId: currentUser.id,
    professionalId: restaurant.id,
    orderType: 'delivery',
    items: cart.items, // Items already have deal info
    totalPrice: calculateTotal(cart),
    paymentMethod: 'CARD',
  };

  const response = await fetch('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
};
```

The order will preserve:
- `calculatedPrice`: The price paid (with discount)
- `originalPrice`: The original price
- `discountPercentage`: The discount applied
- `dealId`: Reference to the deal

---

## Deal Display Screens

### Deals List Screen

**Endpoint:** `GET /deals`

Display all active deals:

```typescript
const deals = await fetch('/deals');

deals.forEach(deal => {
  // Display deal card with:
  // - Restaurant name
  // - Deal image
  // - Description
  // - Discount percentage badge
  // - Valid until date
  // - "View Menu" button
});
```

**UI Example:**
```
┌─────────────────────────────────┐
│  [Image]                  [50%] │
│  Pizza Palace                    │
│  50% off all pizzas!            │
│  Valid until Dec 22, 2025       │
│  [View Menu] ─────────────────▶ │
└─────────────────────────────────┘
```

---

### Deal Details in Menu

When viewing a restaurant's menu with active deals:

1. Fetch menu items: `GET /menuitem/professional/:id`
2. Each item shows:
   - Original price (strikethrough)
   - Discounted price (highlighted)
   - Discount badge
3. Add to cart uses discounted price

---

## Deal Lifecycle

### 1. Deal Creation

```
Professional creates deal
    ↓
Backend saves deal
    ↓
Backend applies discount to menu items
    ↓
Users see discounted prices in menu
    ↓
Notification sent to users
```

### 2. Active Deal

```
User views menu
    ↓
Sees discounted prices
    ↓
Adds items to cart with discount
    ↓
Places order with discounted prices
    ↓
Order preserves deal information
```

### 3. Deal Expiration

```
Cron job runs every minute
    ↓
Detects expired deals
    ↓
Removes discount from menu items
    ↓
Deletes expired deals
    ↓
Menu items return to original prices
```

---

## Example Scenarios

### Scenario 1: 50% Off All Items

```json
{
  "discountPercentage": 50,
  "applicableMenuItems": [],  // Empty = all items
  "applicableCategories": []  // Empty = all categories
}
```

Result: All menu items get 50% discount.

---

### Scenario 2: 40% Off Pizzas Only

```json
{
  "discountPercentage": 40,
  "applicableMenuItems": [],
  "applicableCategories": ["PIZZA"]
}
```

Result: Only items with category `PIZZA` get 40% discount.

---

### Scenario 3: 30% Off Specific Items

```json
{
  "discountPercentage": 30,
  "applicableMenuItems": [
    "menuItem1_id",
    "menuItem2_id",
    "menuItem3_id"
  ],
  "applicableCategories": []
}
```

Result: Only specified menu items get 30% discount.

---

## Testing

### Test Deal Creation

1. Create a professional account
2. Create menu items for that professional
3. Create a deal with discount percentage
4. Verify menu items now have `discountedPrice` field
5. Verify `activeDealId` is set on affected items

### Test Cart with Deals

1. Add discounted item to cart
2. Verify cart shows `calculatedPrice` (discounted)
3. Verify cart shows `originalPrice`
4. Verify cart shows `discountPercentage`

### Test Order with Deals

1. Place order with items that have deals
2. Verify order items preserve deal information
3. Verify `totalPrice` uses discounted prices

### Test Deal Expiration

1. Create a deal with `endDate` in the past
2. Wait for cron job to run (1 minute)
3. Verify deal is deleted
4. Verify menu items no longer have `discountedPrice`

---

## Price Calculation Logic

### MenuItem Price

```typescript
effectivePrice = menuItem.discountedPrice || menuItem.price;
```

### Cart Item Price

```typescript
itemTotal = cartItem.calculatedPrice * cartItem.quantity;
```

### Order Total

```typescript
orderTotal = order.items.reduce((sum, item) => {
  return sum + (item.calculatedPrice * item.quantity);
}, 0);
```

### Savings Calculation

```typescript
if (item.originalPrice && item.discountPercentage > 0) {
  const originalTotal = item.originalPrice * item.quantity;
  const actualTotal = item.calculatedPrice * item.quantity;
  const savings = originalTotal - actualTotal;
  const savingsPercentage = item.discountPercentage;
}
```

---

## Important Notes

1. **Deal Snapshot:** When an item is added to cart or order, the deal info is saved as a snapshot. Even if the deal expires later, the order preserves the discount.

2. **Multiple Deals:** Currently, only one deal can be active per menu item at a time. The most recent active deal takes precedence.

3. **Deal Updates:** If a deal is updated (discount % changed), all affected menu items are automatically updated.

4. **Deal Deletion:** Deleting a deal immediately removes discounts from all affected menu items.

5. **Options Pricing:** Deal discounts apply to base item price only, not to additional options (e.g., extra toppings).

---

## Database Indexes (Recommended)

For better performance, add these indexes:

```typescript
// MenuItem collection
db.menuitem.createIndex({ professionalId: 1, activeDealId: 1 });
db.menuitem.createIndex({ category: 1, professionalId: 1 });

// Deals collection
db.deals.createIndex({ professionalId: 1, isActive: 1, endDate: 1 });
db.deals.createIndex({ endDate: 1 }); // For cron job
```

---

## Error Handling

### Invalid Discount Percentage

```json
{
  "statusCode": 400,
  "message": ["discountPercentage must not be greater than 100"],
  "error": "Bad Request"
}
```

### Deal Not Found

```json
{
  "statusCode": 404,
  "message": "Deal non trouvé",
  "error": "Not Found"
}
```

---

## Future Enhancements

1. **Multiple Deals:** Allow stacking multiple deals
2. **User-Specific Deals:** Target deals to specific user segments
3. **Promo Codes:** Add promo code support
4. **Limited Quantity:** Limit number of times a deal can be used
5. **First-Time User Deals:** Special deals for new users
6. **Minimum Order Value:** Require minimum order to apply deal

---

**Last Updated:** December 18, 2025

