# Setup Guide

## Prerequisites

- Node.js (v20 or higher) installed
- npm installed
- A Google account

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window to authenticate with your Google account.

Verify you're logged in:
```bash
firebase projects:list
```

## Step 3: Navigate to Project Directory

```bash
cd smart-house-api
```

## Step 4 (Optional): Initialize Firebase Project (Add additional Firebase features)

```bash
firebase init
```

**Selected features:**
The following features have already been installed:

- Functions: Configure a Cloud Functions directory and its files
- Firestore: Configure security rules and indexes files

If you want to select more features, you can use spacebar to select and then press enter to confirm your choice(s).

## Step 5: Project Structure

```
smart-house-api/
├── functions/
│   ├── index.js           # API code
│   ├── package.json
│   └── node_modules/
├── firestore.rules        # Database security rules
├── firestore.indexes.json
├── firebase.json
└── .firebaserc
```

## Step 6: Install Dependencies

```bash
cd functions
npm install
cd ..
```

## Step 7: Deploy changes to Firebase

```bash
firebase deploy --only functions
```

This will:
- Build the functions API
- Upload it to Firebase
- Provide the public URL where it is hosted

**Expected output:**
```
✔  functions[api(us-central1)] http function initialized
https://us-central1-smarthouse-617fe.cloudfunctions.net/api
```

## Common Commands Reference

### Deployment Commands

```bash
# Deploy everything
firebase deploy

# Deploy only functions (faster)
firebase deploy --only functions

# Deploy functions and firestore rules
firebase deploy --only functions,firestore:rules
```

### Development Commands

```bash
# View function logs
firebase functions:log

# View logs for specific function
firebase functions:log --only api

# List all deployed functions
firebase functions:list

# Test functions locally with emulator
firebase emulators:start
```

### Project Management

```bash
# List all your Firebase projects
firebase projects:list

# Switch to a different project
firebase use <project-id>

# Add another project (e.g., for staging)
firebase use --add

# Check current project
firebase projects:list
```

### Team Collaboration

```bash
# Login with your account
firebase login

# Logout
firebase logout

# Check who is logged in
firebase login:list
```

## Local Development with Emulators

For testing without deploying:

```bash
# Install emulators
firebase init emulators

# Start emulators
firebase emulators:start
```

Your local API will be at:
```
http://localhost:5001/smarthouse-617fe/us-central1/api
```

## Troubleshooting

### Error: "Billing account not configured"
- Solution: Upgrade to Blaze plan (see Step 8)

### Error: "Failed to update function"
- Solution: Check function logs
  ```bash
  firebase functions:log
  ```

### Error: "CORS policy blocked"
- Solution: The API already includes CORS headers. Make sure you're using the correct URL.

### Function URL not working
- Wait 1-2 minutes after deployment
- Check deployment status:
  ```bash
  firebase functions:list
  ```

### Can't find my function URL
```bash
firebase functions:list
```
Or check Firebase Console → Functions

## Testing with Postman

A Postman collection (JSON file) is provided with example requests for all API endpoints.
This collection includes proper headers, request bodies, and variable management.

### How to import the collection

1. Open Postman.
2. Click **Import** in the top-left corner.
3. Select the file: `Smart-House-Backend.postman_collection.json`.
4. The collection will appear in your left sidebar with all requests organized.

### Setting up environment variables

The Postman collection uses environment variables to manage API URLs and authentication tokens.
You must create an environment with the following variables:

1. In Postman, click the **Environments** icon on the left sidebar.
2. Click **Create** to create a new environment (e.g., "SmartHouse Development").
3. Add the following variables:

| Variable | Initial Value | Current Value | Description |
|----------|---------------|---------------|-------------|
| `baseUrl` | `https://us-central1-smarthouse-617fe.cloudfunctions.net` | (same) | Your Firebase function URL. |
| `apiKey` | (from your `.env` file) | (same) | The `REGISTRATION_API_KEY` value from `.env`. |
| `token` | (leave empty) | (set after login) | JWT token; automatically set after successful login. |

4. Click **Save** to persist the environment.
5. Make sure to **select the environment** from the dropdown before running requests.

> **Tip:** You can find these values in your `.env` file in the `functions/` directory.

### Order of API calls (workflow)

Follow this sequence to properly test the API using your configured environment variables:

1. **Register** (`POST /users/register`)
   - The `X-API-Key` header is automatically set from the `{{apiKey}}` environment variable.
   - Body: `{ "username": "test_user", "password": "test_password" }`.
   - **Save the username** for later calls.

2. **Login** (`POST /users/login`)
   - Body: `{ "username": "test_user", "password": "test_password" }`.
   - Copy the returned **token** value.

3. **Set the JWT token variable** (Important!)
   - After a successful login, copy the token from the response.
   - Either manually paste it into the `token` environment variable, or highlight the token and click "Set as variable > token".

4. **All authenticated requests** (Get user, Update device, etc.)
   - These requests already include `Authorization: Bearer {{token}}` in the header.
   - Postman will automatically substitute the `token` variable from your environment.
   - If the token is missing or invalid, you'll get a `401 Unauthorized` error.

5. **Update Password** (`PATCH /users/update-password`)
   - Requires JWT token in header (already set).
   - Body: `{ "currentPassword": "test_password", "newPassword": "new_password" }`.

6. **Device operations** (`PATCH /users/device`, `DELETE /users/device`)
   - Require JWT token in header.
   - Update: `{ "deviceName": "light", "value": "on" }`.
   - Delete: `{ "deviceName": "light" }`.

7. **Get Current User** (`GET /users/me`)
   - Requires JWT token only; no body needed.

### Header requirements summary

| Endpoint | Headers required | Notes |
|----------|------------------|-------|
| `/users/register` | `X-API-Key` | No JWT needed. |
| `/users/login` | None | Returns token in response. |
| `/users/update-password` | `Authorization: Bearer {{token}}` | Use saved JWT. |
| `/users/device` (PATCH/DELETE) | `Authorization: Bearer {{token}}` | Use saved JWT. |
| `/users/me` | `Authorization: Bearer {{token}}` | Use saved JWT. |
| `/users/logout` | `Authorization: Bearer {{token}}` | Use saved JWT. |

### Tips for using the collection

- **Token expiry**: JWTs last 2 hours. If you get "Invalid or expired token", log in again and update the token variable.
- **Using variables**: After each successful response, you can click on values and "Set as variable" to auto-populate headers in subsequent requests.
- **Check the response**: Always verify the response status code (201, 200, 401, 403) to understand what happened.
- **Reset between tests**: Delete the user from Firestore and repeat from step 1 to test the full flow again.

## API Endpoints

The backend exposes the following endpoints under `/users`.
Most of them require a **JWT bearer token** in the `Authorization` header.

### What is a JWT token?
A JSON Web Token is a stateless, URL-safe string containing a payload (in
our case the authenticated username) signed by the server with a secret.
Clients obtain one by logging in and then include this HTTP header on every subsequent
request:

```
Authorization: Bearer <token>
```

Tokens issued by this API are valid for **2 hours**. This validity period can be changed in the code. After expiry, the client must log in again to get a new one. Since they are stateless the server does **not** store or revoke them; logging out is therefore just a client-side operation (simply delete the token from storage).

### Available routes

| Method | Path                 | Auth required | Description |
|--------|----------------------|---------------|-------------|
| POST   | `/users/register`    | API Key       | Create a new user. Requires `username` and `password` in JSON body, and `X-API-Key` header. |
| POST   | `/users/login`       | No            | Authenticate and return a JWT. Send `username` and `password`.
| PATCH  | `/users/update-password` | Yes      | Change password. Body must contain `currentPassword` and `newPassword`.
| PATCH  | `/users/device`      | Yes           | Add or update a device state. JSON: `{ deviceName, value }`.
| DELETE | `/users/device`      | Yes           | Remove a device field. JSON: `{ deviceName }`.
| GET    | `/users/me`          | Yes           | Retrieve devices related to current user logged in.

### API Key for Registration

The `/users/register` endpoint requires an **API Key** in the `X-API-Key` header
to prevent unauthorized account creation. This key is stored in the server's `.env` file
as `REGISTRATION_API_KEY` and must be included in every registration request:

```
POST /users/register
X-API-Key: your-registration-key
Content-Type: application/json

{
  "username": "john",
  "password": "secure-password"
}
```

Without a valid API key, registration will be rejected with a `403 Forbidden` response.

### JWT Authentication

Most other endpoints require a **JWT bearer token** instead. Obtain one by logging in
and then include it in the `Authorization` header on subsequent requests:

```
Authorization: Bearer <token>
```

## Security Rules (Optional)

Edit `firestore.rules` to secure your database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for authenticated users only
    match /sensors/{document=**} {
      allow read: if true;  // Anyone can read
      allow write: if request.auth != null;  // Only authenticated users can write
    }
  }
}
```