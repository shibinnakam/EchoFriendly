# EchoFriendly Backend — AWS SAM

## Project Structure
```
backend/
├── template.yaml          ← SAM infrastructure (Cognito, DynamoDB, API Gateway, Lambda)
├── samconfig.toml         ← SAM build/deploy settings
└── src/
    ├── package.json       ← Node.js dependencies for Lambda
    └── handlers/
        └── profile.js     ← Lambda function handler
```

---

## Prerequisites
Make sure these are installed and configured:
- AWS CLI (`aws configure` — set your Access Key, Secret Key, Region: `us-east-1`)
- AWS SAM CLI (`sam --version`)
- Node.js 20.x (`node --version`)
- Docker (required for `sam local` testing)

---

## Step 1: Install Lambda Dependencies

Open **PowerShell** or **Command Prompt** and run:

```bash
cd d:\echofriendly\backend\src
npm install
```

---

## Step 2: Build the SAM Project

```bash
cd d:\echofriendly\backend
sam build
```

This compiles your Lambda functions and creates a `.aws-sam/` build output folder.

---

## Step 3: Deploy to AWS

```bash
sam deploy --guided
```

Answer the prompts:
| Prompt | Your Answer |
|---|---|
| Stack Name | `echofriendly-backend` |
| AWS Region | `us-east-1` (or your region) |
| Confirm changes before deploy | `y` |
| Allow SAM CLI IAM role creation | `y` |
| Disable rollback | `n` |
| Save to samconfig.toml | `y` |

---

## Step 4: Get Your Config Values

After deploy, SAM will print **Outputs** like:
```
ApiEndpoint = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/
UserPoolId  = us-east-1_XXXXXXXXX
UserPoolClientId = xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 5: Update Frontend Config

Open `d:\echofriendly\script.js` and update these lines at the top of the Auth section:

```js
AWS.config.region = 'us-east-1';   // ← your deploy region
const poolData = {
    UserPoolId: 'us-east-1_XXXXXXXXX',     // ← from SAM output
    ClientId:   'xxxxxxxxxxxxxxxxxxxxxxxxxx' // ← from SAM output
};
```

---

## Step 6: Also Add CDN for Amazon Cognito SDK

Make sure `index.html` has this BEFORE `script.js`:

```html
<script src="https://sdk.amazonaws.com/js/aws-sdk-2.1408.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/amazon-cognito-identity-js@6.3.6/dist/amazon-cognito-identity.min.js"></script>
<script src="script.js"></script>
```

---

## Auth Flow Summary

```
User fills Signup Form (Name, Email, Password)
         ↓
  Cognito.signUp() called
         ↓
  OTP sent to email automatically by Cognito
         ↓
  User enters OTP in verification modal
         ↓
  Cognito.confirmRegistration() called
         ↓
  ✅ Signup Successful! User redirected to Login tab
         ↓
  User logs in → Cognito returns JWT tokens
         ↓
  Tokens stored in localStorage
```
