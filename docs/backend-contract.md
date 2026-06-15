# Backend contract

All frontend calls POST JSON to the Apps Script Web App URL.

## Auth actions

### signup

```json
{
  "action": "signup",
  "profileKey": "jasper",
  "displayName": "Jasper",
  "email": "jasper@example.com",
  "username": "jasper",
  "password": "password here"
}
```

### signin

```json
{
  "action": "signin",
  "identifier": "jasper",
  "password": "password here",
  "profileKey": "jasper"
}
```

Returns `user.profileKey`, `sessionToken`, and `expiresAt`.

### signout

```json
{
  "action": "signout",
  "sessionToken": "..."
}
```

### me

```json
{
  "action": "me",
  "sessionToken": "..."
}
```

## Store/cart receipt action kept

### recordPurchase

```json
{
  "action": "recordPurchase",
  "sessionToken": "...",
  "storeName": "Squishy Store",
  "items": [
    { "name": "Reward item", "quantity": 1, "unitCostCopper": 10 }
  ],
  "note": "optional note"
}
```

The backend stores the purchase in the `Purchases` sheet and emails the other profile's configured notification recipient.
