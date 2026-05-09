# Mario Backend API Documentation

This document provides a comprehensive overview of the REST API endpoints and WebSocket messages for the Mario Backend system.

## Table of Contents
1. [Base Configuration](#base-configuration)
2. [Authentication](#authentication)
3. [Headers](#headers)
4. [User Endpoints](#user-endpoints)
5. [Store Endpoints](#store-endpoints)
6. [Catalog Endpoints](#catalog-endpoints)
7. [Restaurant Endpoints](#restaurant-endpoints)
8. [Kitchen Endpoints](#kitchen-endpoints)
9. [Report Endpoints](#report-endpoints)
10. [Subscription Endpoints](#subscription-endpoints)
11. [Core & System Endpoints](#core--system-endpoints)
12. [Notification Endpoints](#notification-endpoints)
13. [WebSocket Documentation](#websocket-documentation)

---

## Base Configuration

- **Base URL**: `https://mario-api.ntoric.com/api`
- **Default Currency**: Indian Rupee (₹)
- **Response Format**: JSON

---

## Authentication

The API uses JWT (JSON Web Token) for authentication.

### Login
- **Endpoint**: `POST /users/login/`
- **Request Body**:
  ```json
  {
    "username": "your_username",
    "password": "your_password"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "access": "jwt_token_here",
      "refresh": "refresh_token_here",
      "user": { ... }
    }
  }
  ```

---

## Headers

Most endpoints require the following headers:

- `Authorization: Bearer <your_jwt_token>`
- `X-Store-ID: <store_id>` (Optional if user is assigned to a specific store)

---

## User Endpoints

### Profile
- `GET /users/profile/`: Get current user profile and permissions.

### Management (Protected)
- `GET /users/management/`: List all users (filtered by store).
- `POST /users/management/`: Create a new user.
  - **Request Body**:
    ```json
    {
      "username": "johndoe",
      "password": "securepassword123",
      "email": "john@example.com",
      "role": "MANAGER",
      "store": 1
    }
    ```
- `PATCH /users/management/:id/`: Update an existing user.
  - **Request Body**:
    ```json
    {
      "username": "johndoe_updated",
      "email": "john_new@example.com",
      "is_active": true,
      "role": "ADMIN",
      "password": "newpassword123",
      "store": 1
    }
    ```
- `DELETE /users/management/:id/`: Delete a user.

### Permissions & Groups
- `GET /users/groups/`: List available user groups/roles.
- `GET /users/menu-permissions/`: List menu permissions.
- `POST /users/menu-permissions/`: Create menu permission.
  - **Request Body**:
    ```json
    {
      "group": 1,
      "menu_key": "inventory",
      "is_enabled": true
    }
    ```
- `PATCH /users/menu-permissions/:id/`: Update menu permission.
  - **Request Body**: Same as POST, fields are optional.

---

## Store Endpoints

- `GET /stores/`: List stores (accessible by user).
- `GET /stores/:id/`: Get details of a specific store.
- `POST /stores/`: Create a new store (Super Admin only).
  - **Request Body**:
    ```json
    {
      "name": "Mario's Pizza",
      "address": "123 Street, City",
      "phone": "+91 99999 99999",
      "email": "mario@example.com",
      "gst_number": "22AAAAA0000A1Z5",
      "invoice_prefix": "MP",
      "location": "City Center"
    }
    ```
- `PATCH /stores/:id/`: Update store settings (Super Admin only).
  - **Request Body**: Same as POST, fields are optional.
- `DELETE /stores/:id/`: Delete a store (Super Admin only).

---

## Catalog Endpoints

### Categories
- `GET /catalogs/categories/`: List all categories.
- `POST /catalogs/categories/`: Create a category.
  - **Format**: `multipart/form-data`
  - **Fields**:
    - `name`: "Pizza"
    - `is_enabled`: "true"
    - `image`: [File Upload]
- `PATCH /catalogs/categories/:id/`: Update a category.
  - **Format**: `multipart/form-data` (Fields are optional)
- `DELETE /catalogs/categories/:id/`: Delete a category.
- `POST /catalogs/categories/:id/toggle_status/`: Toggle category enabled/disabled.

### Items
- `GET /catalogs/items/`: List all items.
- `GET /catalogs/items/:id/`: Get item details.
- `POST /catalogs/items/`: Create an item.
  - **Format**: `multipart/form-data`
  - **Fields**:
    - `name`: "Margherita Pizza"
    - `code`: "PIZ001"
    - `description`: "Classic cheese pizza"
    - `price`: "299.00"
    - `category`: "1" (Category ID)
    - `is_enabled`: "true"
    - `image`: [File Upload]
- `PATCH /catalogs/items/:id/`: Update an item.
  - **Format**: `multipart/form-data` (Fields are optional)
- `DELETE /catalogs/items/:id/`: Delete an item.
- `POST /catalogs/items/:id/toggle_status/`: Toggle item enabled/disabled.

---

## Restaurant Endpoints

### Tables
- `GET /restaurants/tables/`: List all tables with status and active orders.
- `POST /restaurants/tables/`: Create a table.
  - **Request Body**:
    ```json
    {
      "number": "T1",
      "capacity": 4,
      "pos_x": 100.5,
      "pos_y": 200.0
    }
    ```
- `PATCH /restaurants/tables/:id/`: Update table details.
- `DELETE /restaurants/tables/:id/`: Delete a table.
- `PATCH /restaurants/tables/:id/update_position/`: Update table layout position.
  - **Request Body**: `{"pos_x": 150.0, "pos_y": 250.0}`
- `POST /restaurants/tables/:id/release/`: Manually release a table to VACANT.
- `POST /restaurants/tables/recalculate_all/`: Recalculate all table statuses.

### Orders
- `GET /restaurants/orders/`: List orders (can filter by `status`).
- `GET /restaurants/orders/:id/`: Get order details with items.
- `POST /restaurants/orders/`: Create a new order.
  - **Request Body**:
    ```json
    {
      "table": 1,
      "customer_name": "John Doe",
      "customer_mobile": "9876543210",
      "number_of_persons": 2,
      "order_type": "DINE_IN",
      "notes": "No onions"
    }
    ```
- `PATCH /restaurants/orders/:id/`: Update order details.
- `DELETE /restaurants/orders/:id/`: Delete an order.
- `POST /restaurants/orders/:id/add_item/`: Add an item to an existing order.
  - **Request Body**:
    ```json
    {
      "item": 1,
      "quantity": 2,
      "notes": "Extra cheese"
    }
    ```
- `POST /restaurants/orders/:id/send_to_kitchen/`: Send ordered items to kitchen (sets status to PREPARING).
- `POST /restaurants/orders/:id/serve_all_ready/`: Mark all ready items as SERVED.
- `POST /restaurants/orders/:id/cancel_order/`: Cancel the order.
  - **Request Body**: `{"reason": "Customer left"}`
- `POST /restaurants/orders/:id/change_table/`: Move order to another table.
  - **Request Body**: `{"target_table_id": 2, "number_of_persons": 2}`
- `POST /restaurants/orders/:id/checkout/`: Finalize order and generate invoice.
  - **Request Body**:
    ```json
    {
      "payment_method": "CASH",
      "mark_as_paid": true,
      "notes": "Paid in full"
    }
    ```
- `GET /restaurants/orders/pending_settlements/`: List orders ready for payment.

---

## Kitchen Endpoints

- `GET /restaurants/kitchen/`: List items currently in kitchen (AWAITING/PREPARING).
- `POST /restaurants/kitchen/:id/attend/`: Mark item as being prepared.
- `POST /restaurants/kitchen/:id/ready/`: Mark item as ready to serve.
- `POST /restaurants/kitchen/:id/reject/`: Reject an item with a note.
  - **Request Body**: `{"rejection_note": "Out of stock"}`

---

## Report Endpoints

- `GET /reports/dashboard/`: Get high-level dashboard statistics.
- `GET /restaurants/reports/summary/`: General sales summary.
- `GET /restaurants/reports/sales_by_type/`: Sales by order type (DINE_IN/TAKE_AWAY).
- `GET /restaurants/reports/sales_by_payment/`: Sales by payment method.
- `GET /restaurants/reports/daily_sales/`: Daily sales breakdown.
- `GET /restaurants/reports/sales_by_category/`: Sales breakdown by category.
- `GET /restaurants/reports/sales_by_item/`: Sales breakdown by item.
- `GET /restaurants/reports/tax_report/`: Tax collected report.

---

## Subscription Endpoints

- `GET /subscriptions/`: List all subscriptions (Super Admin).
- `GET /subscriptions/mine/`: Get current store subscription details.
- `GET /subscriptions/store/:store_id/`: List subscriptions for a specific store.
- `POST /subscriptions/`: Create a subscription.
  - **Request Body**:
    ```json
    {
      "store_id": 1,
      "start_date": "2024-01-01T00:00:00Z",
      "end_date": "2025-01-01T00:00:00Z",
      "plan_name": "Premium",
      "amount": 9999.00,
      "is_active": true,
      "notes": "Yearly plan"
    }
    ```
- `PATCH /subscriptions/:id/`: Update a subscription.
- `DELETE /subscriptions/:id/`: Delete a subscription.

---

## Core & System Endpoints

- `GET /core/tax-configuration/`: Get tax settings.
- `PUT /core/tax-configuration/`: Update tax settings.
  - **Request Body**:
    ```json
    {
      "tax_type": "EXCLUSIVE",
      "is_gst_enabled": true,
      "cgst_rate": 2.5,
      "sgst_rate": 2.5,
      "igst_rate": 0.0,
      "is_cess_enabled": false,
      "cess_rate": 0.0
    }
    ```
- `POST /core/system-reset/`: Reset system data (Super Admin only).
- `GET /support/`: Get support contact information.

---

## Notification Endpoints

- `GET /notifications/`: List notifications for the store.
- `POST /notifications/mark-all-read/`: Mark all notifications as read.
- `PATCH /notifications/:id/mark-read/`: Mark a specific notification as read.

---

## WebSocket Documentation

The WebSocket provides real-time updates for table statuses, orders, and notifications.

### Connection
- **URL**: `wss://mario-api.ntoric.com/api/ws`
- **Protocol**: Standard WebSocket (upgraded from HTTP)

### Message Format (Outgoing from Server)
All messages from the server follow this structure:
```json
{
  "type": "EVENT_TYPE",
  "payload": { ... }
}
```

### Event Types
| Type | Description | Payload |
| :--- | :--- | :--- |
| `TABLE_UPDATED` | A table status or position changed | Table object or `{ "table_id": id, "status": "..." }` |
| `ORDER_CREATED` | A new order was created | Complete Order object |
| `ORDER_UPDATED` | An order was modified | Complete Order object or `{ "order_id": id, ... }` |
| `ORDER_DELETED` | An order was removed | `{ "id": id }` |
| `NEW_NOTIFICATION`| A new system notification | Notification object |

### Client-to-Server Messages
Currently, the WebSocket connection is primarily used for server-to-client broadcasts. No specific client messages are required to maintain the state other than the initial connection.
