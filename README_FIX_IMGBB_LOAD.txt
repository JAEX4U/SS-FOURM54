FIXED VERSION

Changes:
- Image uploads now use ImgBB API instead of Firebase Storage.
- Avatar/profile picture upload now uses ImgBB.
- Marketplace item image upload now uses ImgBB.
- News banner upload now uses ImgBB.
- Homepage shows loading messages early.
- If Firestore rules block data, the page shows a message instead of staying blank.
- Mini profile and profile avatar display fixed.
- Crew dropdown clipping improved.

Important:
If you see 'blocked by Firebase rules', update Firestore rules to allow reads.
