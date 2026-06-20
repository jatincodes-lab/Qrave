# Restaurant Owner Roadmap

This file tracks the next product changes needed to move Qrave from a strong MVP toward a product that restaurant and cafe owners can use daily.

## Planned Changes

### 1. QR Printing Design

Create professional printable QR designs for restaurant tables.

- Table-specific QR card design
- Restaurant/branch branding
- Modern, clean print layout
- Download/print-ready format
- Table number/name clearly visible

### 2. Bill Generation + Tax

Add billing support so restaurants can generate final customer bills.

- Order subtotal
- Tax addition
- Discount support
- Service charge support if needed
- Final payable total
- Payment status
- Bill view for staff/admin
- Printable bill format

### 3. KOT

Add Kitchen Order Ticket support for real kitchen operations.

- KOT view per order
- Item quantities, variants, and notes
- Table number
- Order time
- Print-ready KOT layout
- Kitchen/counter workflow support

### 4. Partial Order Item Cancellation

Allow customers or staff to cancel selected items from an order without cancelling the full order.

- Cancel specific order items while keeping the order active
- Support partial quantity cancellation, such as cancelling 1 of 3 coffees
- Track ordered quantity, cancelled quantity, and active quantity per order item
- Store cancellation reason and who requested/approved the cancellation
- Recalculate subtotal, tax, discount, service charge, and final payable amount after approval
- Require staff/manager approval for customer cancellation requests
- Block or restrict cancellation for items already prepared, ready, served, or billed
- Show cancelled items clearly in the kitchen/KOT workflow so staff do not prepare them
- Keep cancellation history for accountability and dispute handling
- Send realtime updates to admin/kitchen dashboards when items are cancelled

### 5. Realtime Alerts + Notification Center

Add clear staff alerts so restaurants immediately know when a new order, waiter call, or cancellation event happens.

- Play a sound when a new order is created
- Play a sound when a waiter call is created
- Play a different sound or alert tone for order cancellation requests and approved cancellations
- Show in-app notifications for new orders, waiter calls, cancellation requests, cancellation approvals, and cancellation rejections
- Add unread notification counts in the admin header/sidebar
- Let staff mark notifications as read
- Let staff click a notification to open the related order, waiter call, or cancellation request
- Support branch-scoped notifications so staff only receive alerts for assigned locations
- Add sound settings for mute/unmute, volume, and alert type
- Respect browser autoplay limits by enabling sound after the first staff interaction or explicit permission
- Avoid duplicate sounds when multiple dashboard tabs are open
- Keep realtime events backed by SignalR/admin notification records so alerts are not lost after page refresh

### 6. Mobile Experience

Improve admin, staff, and owner workflows on mobile devices.

- Better mobile layouts for orders
- Easier kitchen and waiter actions
- Cleaner forms on small screens
- Faster navigation for staff
- Touch-friendly controls

### 7. Multi-Location Staff Access

Allow owners with multiple cafes/branches to create staff or manager accounts that only see and operate on assigned locations.

- Owner can create staff/manager accounts
- Owner can assign one or more cafes/branches to each account
- Same manager can manage multiple assigned locations
- Staff/manager dashboards only show assigned locations
- Branch-scoped actions are allowed only for assigned locations
- Backend/API must enforce access checks for every branch-scoped route
- Add a user-to-branch assignment model, such as `user_branches` / `user_cafes`
- Support future role combinations like manager, cashier, kitchen, waiter, and staff per assigned location

### 8. Customer Feedback

Collect customer feedback after order completion.

- Rating flow
- Comment box
- Order-linked feedback
- Customer complaint/issue tracking
- Future Google review prompt support

### 9. Offers + Promotions

Add owner-controlled offers that can help restaurants promote items and increase repeat orders.

- Item-level offers
- Order-level discounts
- Coupon/promo codes
- Time-based offers
- Minimum order amount rules
- Branch-specific offers
- Customer-facing offer display
- Offer usage tracking

### 10. Super Admin Panel

Create a separate platform-owner login area for Qrave admins to manage all restaurants, users, and subscriptions.

- Separate super admin login, such as `/superadmin/login`
- Super admin dashboard for total restaurants, active trials, expired trials, suspended accounts, and paid accounts
- View and search all restaurant/cafe tenants
- Open tenant detail pages with owner, branches, tables, orders, staff, and usage summary
- Activate or suspend restaurant accounts
- Extend trial days
- Change plan manually
- Mark offline/manual payment received
- Manage owner accounts and reset access when needed
- Add internal subscription notes
- Track subscription/action history for accountability
- Keep subscription override controls out of the restaurant owner admin panel
- Start with a `super_admin` role and add `support_admin` / `sales_admin` later if needed

### 11. Plan + Subscription System

Add SaaS billing and plan controls.

- Free trial
- Monthly plans
- Plan limits for branches, tables, staff, and features
- Upgrade/downgrade flow
- Subscription status
- Payment provider integration

## Implemented Changes

### Returning Customer Profile + Previous Orders — Completed

- Remember customer name and WhatsApp on the same device after a successful order
- Reuse the profile across all table QR codes in the same branch
- Issue a secure, branch-scoped customer device credential with 90-day expiry
- Store only the credential hash on the server
- Show a My Orders action beside the cart for recognized customers
- Show full previous-order history with tracking and reorder actions
- Mask the saved phone number in the previous-orders view
- Allow customers to forget their saved identity on the device
- Keep marketing consent separate from remembered customer identity
- Remove phone-number-only access to private order history

## Recommended Implementation Order

1. QR Printing Design
2. Bill Generation + Tax
3. KOT
4. Partial Order Item Cancellation
5. Realtime Alerts + Notification Center
6. Mobile Experience
7. Multi-Location Staff Access
8. Customer Feedback
9. Offers + Promotions
10. Super Admin Panel
11. Plan + Subscription System

## Reasoning

QR printing helps restaurants actually start using the product at tables. Billing and KOT are core operational needs for real restaurant use. Partial order item cancellation should follow billing and KOT because it changes payable totals and must stop cancelled items from being prepared. Realtime alerts should come right after the core order workflow so staff do not miss new orders, waiter calls, or cancellation events during service. Mobile improvements increase daily staff adoption. Multi-location staff access becomes important once owners operate more than one cafe and need trusted managers to work only inside assigned locations. Feedback and offers help restaurants grow repeat usage and promote menu items, but they should come after the core restaurant workflow is strong. The super admin panel should own platform-level account and subscription control so restaurant owners never see internal override tools. Subscriptions are important for monetization, but they should come after the owner-facing product has enough operational value.
