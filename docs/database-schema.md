# Database Schema

## Overview

Phase 2 defines the normalized PostgreSQL schema for the planned Fleet and Booking Management System. Prisma Client, the initial migration, development seed data, and database validation scripts live in `apps/api/prisma`.

## Entities

- `User`
- `Vehicle`
- `Driver`
- `Customer`
- `Booking`
- `OvernightStay`
- `Expense`
- `AuditLog`
- `SystemSetting`
- `Notification`
- `AuthSession`

## Enums

### UserRole

- `ADMIN`
- `STAFF`

### BookingStatus

- `DRAFT`
- `CONFIRMED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

### VehicleStatus

- `AVAILABLE`
- `BOOKED`
- `MAINTENANCE`
- `OUT_OF_SERVICE`
- `INACTIVE`

### DriverStatus

- `AVAILABLE`
- `ASSIGNED`
- `ON_LEAVE`
- `INACTIVE`

### Additional Enums

- `TripType`: `CITY`, `OUTSIDE_CITY`, `OVERNIGHT`
- `ExpenseType`: `FUEL`, `TOLL`, `PARKING`, `ACCOMMODATION`, `MEAL`, `MAINTENANCE`, `OTHER`
- `NotificationType`: `SYSTEM`, `BOOKING`, `VEHICLE`, `DRIVER`, `REPORT`

## Mermaid ERD

```mermaid
erDiagram
  User {
    uuid id PK
    string fullName
    string email UK
    string passwordHash
    UserRole role
    boolean isActive
    timestamptz lastLoginAt
    timestamptz createdAt
    timestamptz updatedAt
    timestamptz deletedAt
  }

  Vehicle {
    uuid id PK
    string plateNumber UK
    string make
    string model
    int year
    int passengerCapacity
    VehicleStatus status
    string notes
    timestamptz createdAt
    timestamptz updatedAt
    timestamptz deletedAt
  }

  Driver {
    uuid id PK
    string fullName
    string phoneNumber
    DriverStatus status
    decimal overnightDailyRate
    string notes
    timestamptz createdAt
    timestamptz updatedAt
    timestamptz deletedAt
  }

  Customer {
    uuid id PK
    string fullName
    string phoneCountryCode
    string phoneNumber
    string nationality
    string notes
    timestamptz createdAt
    timestamptz updatedAt
    timestamptz deletedAt
  }

  Booking {
    uuid id PK
    string voucherNumber UK
    uuid customerId FK
    uuid vehicleId FK
    uuid driverId FK
    timestamptz startAt
    timestamptz endAt
    timestamptz availabilityStartAt
    timestamptz availabilityEndAt
    TripType tripType
    string destination
    BookingStatus status
    string notes
    uuid createdById FK
    uuid updatedById FK
    timestamptz createdAt
    timestamptz updatedAt
    timestamptz cancelledAt
    timestamptz deletedAt
  }

  OvernightStay {
    uuid id PK
    uuid bookingId FK
    string city
    string accommodationName
    date checkInDate
    date checkOutDate
    int nightsCount
    decimal driverDailyRate
    decimal totalDriverCost
    string notes
    timestamptz createdAt
    timestamptz updatedAt
  }

  Expense {
    uuid id PK
    uuid bookingId FK
    ExpenseType type
    decimal amount
    string currency
    string description
    timestamptz createdAt
    timestamptz updatedAt
  }

  AuditLog {
    uuid id PK
    uuid userId FK
    string action
    string entityType
    uuid entityId
    json oldValues
    json newValues
    string ipAddress
    timestamptz createdAt
  }

  SystemSetting {
    uuid id PK
    string key UK
    json value
    string description
    uuid updatedById FK
    timestamptz updatedAt
  }

  Notification {
    uuid id PK
    uuid userId FK
    NotificationType type
    string title
    string message
    boolean isRead
    timestamptz createdAt
  }

  AuthSession {
    uuid id PK
    uuid userId FK
    string refreshTokenHash UK
    timestamptz refreshTokenExpiresAt
    timestamptz revokedAt
    string replacedByTokenHash
    string ipAddress
    string userAgent
    timestamptz createdAt
    timestamptz updatedAt
  }

  Customer ||--o{ Booking : has
  Vehicle ||--o{ Booking : assigned_to
  Driver ||--o{ Booking : assigned_to
  User ||--o{ Booking : creates
  User |o--o{ Booking : updates
  Booking ||--o{ OvernightStay : includes
  Booking ||--o{ Expense : has
  User |o--o{ AuditLog : performs
  User |o--o{ SystemSetting : updates
  User ||--o{ Notification : receives
  User ||--o{ AuthSession : owns
```

## Indexes

The schema includes indexes for:

- Booking dates.
- Booking availability blocking dates.
- Booking `vehicleId`, `driverId`, `customerId`, `status`, and `voucherNumber`.
- Compound booking indexes for future vehicle/driver conflict checks.
- Vehicle `plateNumber` and `status`.
- Soft deletion fields on core business entities.

## Constraints

- `User.email` is unique.
- `Vehicle.plateNumber` is unique.
- `Booking.voucherNumber` is unique.
- `Booking.endAt` must be later than `Booking.startAt`.
- Phase 6 adds PostgreSQL `btree_gist` and exclusion constraints on `Booking` to prevent overlapping active bookings for the same `vehicleId` or `driverId`.
- Phase 7 moves those overlap constraints to the stored `availabilityStartAt` and `availabilityEndAt` range so overnight pre/post buffers block resources.
- The overlap constraints use `tstzrange("availabilityStartAt", "availabilityEndAt", '[)')`, so bookings that touch exactly at the boundary do not conflict.
- The overlap constraints apply only when `deletedAt IS NULL` and `status <> 'CANCELLED'`.
- `Booking.availabilityEndAt` must be later than `Booking.availabilityStartAt`.
- Monetary fields are decimal and must be non-negative.
- Vehicle capacity must be positive.
- Overnight stay checkout date must be later than check-in date.

## Phase 7 Migration

Migration `202607190002_phase_7_overnight_blocking_window` adds persisted availability windows to bookings, backfills existing records from `startAt` and `endAt`, and recreates the PostgreSQL exclusion constraints over the availability window.
