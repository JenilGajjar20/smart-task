# Security Specification for SmartTask

This document defines the security boundaries, data invariants, and negative test cases ("Dirty Dozen") for the SmartTask Firestore database.

## 1. Data Invariants

1. **Identity Containment**: Every task document must contain a `userId` field that strictly matches the authenticated user's UID (`request.auth.uid`). No user can read, create, update, or delete another user's tasks.
2. **Title Requirement and Constraints**: The task `title` is mandatory, must be a string, and its length must be between 1 and 100 characters.
3. **Valid Priority**: The task `priority` is mandatory and must be one of: `'low'`, `'medium'`, `'high'`.
4. **Valid Category**: The task `category` is mandatory and must be one of: `'Work'`, `'Personal'`, `'Education'`, `'Health'`, `'Shopping'`, `'Finance'`, `'Other'`.
5. **Types and Formats**:
   - `completed`: Boolean value.
   - `dueDate`: Mandatory string representing an ISO timestamp.
   - `reminderTime`: Optional string representing an ISO timestamp.
   - `createdAt` and `updatedAt`: Mandatory string timestamps.
6. **Temporal Trust**:
   - `createdAt` must match the server's execution timestamp (`request.time`) on creation.
   - `updatedAt` must match the server's execution timestamp (`request.time`) on updates.
7. **Immutability of Owner**: Once a task is created, the `userId` field cannot be modified (it must match the existing value).

---

## 2. The "Dirty Dozen" (Malicious Payloads)

Here are the 12 malicious payloads designed to test the robustness of the security rules. All of these payloads must be rejected with `PERMISSION_DENIED`.

### Case 1: Unauthenticated Creation
Attempts to create a task without signing in.
* **Payload**:
```json
{
  "userId": "user_abc",
  "title": "Unauthenticated Task",
  "priority": "medium",
  "category": "Work",
  "completed": false,
  "dueDate": "2026-06-15T12:00:00.000Z",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```

### Case 2: Identity Spoofing (Creating for another user)
An authenticated user attempts to create a task for a different user.
* **Auth UID**: `attacker_123`
* **Payload**:
```json
{
  "userId": "victim_456",
  "title": "Spoofed User Task",
  "priority": "medium",
  "category": "Personal",
  "completed": false,
  "dueDate": "2026-06-15T12:00:00.000Z",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```

### Case 3: Identity Hijacking (Updating another user's task)
An authenticated user attempts to update a task owned by another user.
* **Auth UID**: `attacker_123`
* **Target Document User ID**: `victim_456`
* **Payload**:
```json
{
  "title": "Hijacked Task Edit"
}
```

### Case 4: Owner field Mutation (Transferring ownership)
An authenticated user attempts to change the ownership (`userId`) of their own task, possibly to bypass query logic or pollute another user's list.
* **Auth UID**: `user_123`
* **Payload**:
```json
{
  "userId": "victim_456",
  "title": "Transferring Task",
  "priority": "medium",
  "category": "Personal",
  "completed": false,
  "dueDate": "2026-06-15T12:00:00.000Z",
  "createdAt": "2026-06-03T04:52:51.000Z",
  "updatedAt": "request.time"
}
```

### Case 5: Empty Title Injection
Attempting to create a task with an empty title or pathologically long title (>100 characters).
* **Auth UID**: `user_123`
* **Payload**:
```json
{
  "userId": "user_123",
  "title": "",
  "priority": "medium",
  "category": "Work",
  "completed": false,
  "dueDate": "2026-06-15T12:00:00.000Z",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```

### Case 6: Extraneous Hidden Field ("Shadow Update")
Attempt to inject a secret administrative field (`isAdmin`, `isVerified`, etc.) into the document to exploit dynamic systems.
* **Auth UID**: `user_123`
* **Payload**:
```json
{
  "userId": "user_123",
  "title": "Hacked Task",
  "priority": "medium",
  "category": "Work",
  "completed": false,
  "dueDate": "2026-06-15T12:00:00.000Z",
  "createdAt": "request.time",
  "updatedAt": "request.time",
  "isVerifiedAdmin": true
}
```

### Case 7: Invalid Priority Value
Setting `priority` to an unauthorized enum value like `'ultra'`.
* **Auth UID**: `user_123`
* **Payload**:
```json
{
  "userId": "user_123",
  "title": "Invalid Priority Task",
  "priority": "ultra",
  "category": "Work",
  "completed": false,
  "dueDate": "2026-06-15T12:00:00.000Z",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```

### Case 8: Invalid Category Value
Attempting to use an unsupported task category like `'Gaming'`.
* **Auth UID**: `user_123`
* **Payload**:
```json
{
  "userId": "user_123",
  "title": "Invalid Category Task",
  "priority": "high",
  "category": "Gaming",
  "completed": false,
  "dueDate": "2026-06-15T12:00:00.000Z",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```

### Case 9: Typo/Type Spoofing on Fields
Setting a boolean where a string is expected, or vice-versa (e.g., setting `completed` as `"yes"` instead of `true`).
* **Auth UID**: `user_123`
* **Payload**:
```json
{
  "userId": "user_123",
  "title": "Bad Type Task",
  "priority": "medium",
  "category": "Work",
  "completed": "true-spoof",
  "dueDate": "2026-06-15T12:00:00.000Z",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```

### Case 10: Client-Forged Timestamps
Attempts to set `createdAt` or `updatedAt` to a random custom timestamp instead of the authentic server request time.
* **Auth UID**: `user_123`
* **Payload**:
```json
{
  "userId": "user_123",
  "title": "Forged Timestamp Task",
  "priority": "medium",
  "category": "Work",
  "completed": false,
  "dueDate": "2026-06-15T12:00:00.000Z",
  "createdAt": "2020-01-01T00:00:00.000Z",
  "updatedAt": "2020-01-01T00:00:00.000Z"
}
```

### Case 11: Denial of Wallet ID Poisoning
Attempts to create or fetch a document containing an oversized, toxic ID containing non-alphanumeric characters.
* **Auth UID**: `user_123`
* **Target Document ID**: `task_$$$__Poisoned-String-10e982138902!@^#*(&@*!!!__Very_Long_Oversized_ID`
* **Payload**: Standard task payload.

### Case 12: Blanket List Scraping
An authenticated user attempts to perform a query targeting the whole `tasks` collection without filtering by their own `userId` (equivalent to a full collection read breach).
* **Query**: `db.collection('tasks').get()` (No `where('userId', '==', uid)` clause).

---

## 3. Test Runner Definitions
For simulated validation, these scenarios are mapped inside the `firestore.rules` assertions.
