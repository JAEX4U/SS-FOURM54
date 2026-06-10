SPIN VAR PLANT - FIXED WEBSITE

IMPORTANT SETUP

1. Open script.js and change this line:
   const ADMIN_EMAIL = "your@email.com";

   Replace it with your real Firebase login email.

2. Firebase Console:
   Authentication > Sign-in method > Enable Email/Password
   Firestore Database > Rules > use the rules below.

3. Firestore rules example:

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null
      && request.auth.token.email == "your@email.com";
    }

    match /threads/{threadId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if isAdmin();

      match /replies/{replyId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow delete: if isAdmin();
      }
    }

    match /marketplace/{itemId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if isAdmin();
    }

    match /news/{newsId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}

Replace your@email.com in rules too.

WHAT I FIXED:
- Removed .git folder from ZIP
- Fixed firebase.js loading race issue
- Added firebase-ready event
- Added admin-only UI system
- Added working email/password auth functions
- Added email verification check
- Added thread replies, likes, pin, delete
- Added marketplace delete for admin
- Added news create/delete for admin
- Added sessionStorage cache for faster page switching
- Added missing CREW placeholder pages
