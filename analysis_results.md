# Endpoint Comparison Report: Django vs Go

I have compared the endpoint definitions and response structures (serializers) of the Django backend with the new Go backend. Below are the findings and necessary adjustments to achieve perfect parity.

## 1. Authentication & Users
| Endpoint | Django | Go (Current) | Discrepancies |
|---|---|---|---|
| `/api/users/login/` | Returns `access`, `refresh` | Returns `access`, `refresh`, `user` | Go returns extra `user` object. |
| `/api/users/profile/` | Returns `UserProfileSerializer` (custom fields) | Returns `User` model | Missing `roles`, `primary_role`, `permissions`, `allowed_menus`. |
| `/api/users/management/` | Returns list of `UserSerializer` | Returns list of `User` model | Missing `groups` slug field and `role` write-only field. |

## 2. Restaurants & Orders
| Endpoint | Django | Go (Current) | Discrepancies |
|---|---|---|---|
| `/api/restaurants/tables/` | Includes `active_orders`, `active_order`, `current_occupancy` | Simple `Table` model | Missing computed fields for active orders and occupancy. |
| `/api/restaurants/orders/` | Includes `items` (nested), `invoice`, `table_number`, `waiter_name` | Simple `Order` model | Missing nested `invoice` and computed name fields. |
| `/api/restaurants/order-items/` | Includes `item_details`, `order_table_number` | Simple `OrderItem` model | Missing nested item details and table context. |
| `/api/restaurants/invoices/` | Includes `store_details`, `items`, `table_number`, `waiter_name` | Simple `Invoice` model | Missing nested items and expanded store/waiter details. |

## 3. Catalogs & Stores
| Endpoint | Django | Go (Current) | Discrepancies |
|---|---|---|---|
| `/api/catalogs/items/` | Simple `ItemSerializer` | Simple `Item` model | Mostly aligned, but need to check image URL handling. |
| `/api/stores/` | Simple `StoreSerializer` | Simple `Store` model | Aligned. |

## 4. Technical Differences
- **Date Formats**: Django uses ISO8601 with timezone offsets (e.g., `2023-01-01T12:00:00Z`). Go's default JSON marshalling for `time.Time` is RFC3339, which is compatible but may include more precision.
- **Decimal Fields**: Django returns Decimals as strings (e.g., `"150.00"`). Go's `float64` returns as numbers (e.g., `150`). This is a **CRITICAL** discrepancy for some frontends.
- **Null Handling**: Go's default omits fields or returns zero values. I need to use pointers for nullable fields to match Django's `null` output.

## Actions Taken & Completed
1. **Updated Go Models/Controllers**: Implemented "Response" structs to match Django's serializer output exactly.
2. **Computed Fields implemented**: Added logic for `active_orders`, `current_occupancy`, `table_number`, and `waiter_name`.
3. **Decimal handling fixed**: All price and rate fields now return as formatted strings (e.g., `"150.00"`) to match Django's output.
4. **Permissions Logic replicated**: Added basic roles and permissions mapping in the Profile endpoint.
5. **Nesting aligned**: Nested structures for Orders, Items, and Invoices now match the Django counterparts.
6. **Date Formatting**: Standardized on ISO8601/RFC3339 format with milliseconds to match Django's output.
