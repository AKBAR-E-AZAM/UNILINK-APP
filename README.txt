===============================================
UNILINK - UNIVERSITY MANAGEMENT SYSTEM
===============================================

A modern web application for students, staff, and HODs to manage meetings, timetables, and communications.

🚀 QUICK START GUIDE
====================

PREREQUISITES:
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Google account for Firebase
- Basic internet connection

STEP 1: FIREBASE SETUP (5-10 minutes)



1. CREATE FIREBASE PROJECT:
   - Go to: https://console.firebase.google.com/
   - Click "Create a project"
   - Project name: "unilink-app" (or any name you prefer)
   - Disable Google Analytics (not needed)
   - Click "Create project"

2. SETUP FIRESTORE DATABASE:
   - In your Firebase project, click "Firestore Database" in left sidebar
   - Click "Create database"
   - Choose "Start in test mode" (for development)
   - Select your preferred cloud location
   - Click "Done"

3. GET FIREBASE CONFIGURATION:
   - Go to Project Settings (gear icon)
   - Scroll to "Your apps" section
   - Click "Web" icon (</>)
   - App nickname: "UniLink Web App"
   - Copy the firebaseConfig object

STEP 2: CONFIGURE APPLICATION

1. UPDATE FIREBASE CONFIG IN script.js:
   - Open script.js file
   - Open migrate.html file
   - Find the firebaseConfig section (around line 4-11)
   - REPLACE the entire config object with your copied config:
   - Find users line in migrate.html and users.json replace with your own details with given structure

   const firebaseConfig = {
       apiKey: "your-copied-api-key",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project.appspot.com",
       messagingSenderId: "123456789",
       appId: "your-app-id",
       measurementId: "G-XXXXXXXXXX"
   };

STEP 3: ADD DEMO USERS TO FIRESTORE

1. CREATE "users" COLLECTION:
   - In Firestore Database, click "Start collection"
   - Collection ID: "users" (exactly)
   - Click "Next"

2. ADD FIRST STUDENT USER:
   - Document ID: (click "Auto-ID" to generate)
   - Add these fields:

   Field: username | Type: string | Value: 6176AC22UCS049
   Field: password | Type: string | Value: 05/11/2004
   Field: role | Type: string | Value: student
   Field: name | Type: string | Value: GOWSICK K
   Field: dept | Type: string | Value: B.E. CSE
   Field: year | Type: string | Value: 2022-2026
   Field: blood | Type: string | Value: B+
   Field: photo | Type: string | Value: https://i.pravatar.cc/150?img=49

3. ADD SECOND STUDENT USER:
   - Click "Add document" in users collection
   - Add fields:

   Field: username | Type: string | Value: 6176AC22UCS050
   Field: password | Type: string | Value: 19/11/2004
   Field: role | Type: string | Value: student
   Field: name | Type: string | Value: GRISHMAS
   Field: dept | Type: string | Value: B.E. CSE
   Field: year | Type: string | Value: 2022-2026
   Field: blood | Type: string | Value: B+
   Field: photo | Type: string | Value: https://i.pravatar.cc/150?img=50

4. ADD STAFF MEMBER:
   - Click "Add document" in users collection
   - Add fields:

   Field: username | Type: string | Value: STAFF001
   Field: password | Type: string | Value: 01/01/1980
   Field: role | Type: string | Value: staff
   Field: name | Type: string | Value: Dr. Alan Turing
   Field: dept | Type: string | Value: B.E. CSE
   Field: year | Type: string | Value: N/A
   Field: blood | Type: string | Value: O-
   Field: photo | Type: string | Value: https://i.pravatar.cc/150?img=51
   Field: status | Type: string | Value: available

   FOR TIMETABLE (Staff only):
   - Field: timetable | Type: array
   - Click "Add item" and add these 3 objects:

   Item 1:
   {
     "day": "Monday",
     "start": "9:00", 
     "end": "10:00",
     "activity": "AI Lecture"
   }

   Item 2:
   {
     "day": "Tuesday",
     "start": "11:00",
     "end": "12:30", 
     "activity": "Lab Session"
   }

   Item 3:
   {
     "day": "Friday",
     "start": "14:00",
     "end": "15:00",
     "activity": "Research Meet"
   }

5. ADD HOD (ADMIN):
   - Click "Add document" in users collection
   - Add fields:

   Field: username | Type: string | Value: HOD001
   Field: password | Type: string | Value: 01/01/1975
   Field: role | Type: string | Value: hod
   Field: name | Type: string | Value: Prof. John McCarthy
   Field: dept | Type: string | Value: B.E. CSE
   Field: year | Type: string | Value: N/A
   Field: blood | Type: string | Value: A+
   Field: photo | Type: string | Value: https://i.pravatar.cc/150?img=52
   Field: status | Type: string | Value: available

STEP 4: CREATE OTHER COLLECTIONS

1. MEETINGS COLLECTION:
   - Click "Start collection"
   - Collection ID: "meetings" (exactly)
   - Click "Next" (no need to add documents yet)

2. NOTIFICATIONS COLLECTION:
   - Click "Start collection" 
   - Collection ID: "notifications" (exactly)
   - Click "Next" (no need to add documents yet)

STEP 5: RUN THE APPLICATION

METHOD 1: LOCAL SERVER (RECOMMENDED)
- Open terminal/command prompt in project folder
- Run one of these commands:

  Python 3: python -m http.server 8000
  Python 2: python -m SimpleHTTPServer 8000
  Node.js: npx http-server
  PHP: php -S localhost:8000

- Open browser and go to: http://localhost:8000

METHOD 2: DIRECT FILE OPENING
- Simply double-click index.html file
- Or right-click → "Open with" → Your browser

STEP 6: TEST THE APPLICATION

USE THESE DEMO CREDENTIALS TO LOGIN:

STUDENT ACCOUNT:
- Username: 6176AC22UCS049
- Password: 05/11/2004
- Role: student

STAFF ACCOUNT:
- Username: STAFF001
- Password: 01/01/1980  
- Role: staff

HOD ACCOUNT:
- Username: HOD001
- Password: 01/01/1975
- Role: hod

FEATURES TO TEST:
- Login with different roles
- View staff directory
- Request meetings (students)
- Approve/deny meetings (staff/HOD)
- View notifications
- Use admin panel (HOD only)

📁 FILE STRUCTURE
=================

unilink-app/
├── .firebaserc
├── firebase.json
├── firestore.rules
├── fix-firestore.html
├── index.html          # Main application file
├── migrate.html
├── style.css           # All styling and themes
├── script.js           # Application logic and Firebase
└── README.txt          # This setup guide

🔧 TROUBLESHOOTING
==================

COMMON ISSUES AND SOLUTIONS:

1. "Firebase SDK not loaded" error:
   - Check your internet connection
   - Verify Firebase SDK URLs in index.html

2. "Permission denied" error:
   - Ensure Firestore is in "test mode"
   - Verify collection names: "users", "meetings", "notifications"

3. Login not working:
   - Verify user data exists in Firestore
   - Check username/password/role match exactly
   - Ensure all fields are spelled correctly

4. Modals not opening:
   - Check browser console for errors (F12)
   - Verify all JavaScript files are loaded

5. Real-time features not working:
   - Check Firestore rules (should be in test mode)
   - Verify internet connection

SUCCESS INDICATORS:
✅ Can login with demo credentials
✅ Staff directory shows users
✅ Can request meetings (student)
✅ Can approve/deny meetings (staff/HOD)
✅ Notifications work
✅ Admin panel accessible (HOD)

📞 SUPPORT
==========

IF YOU ENCOUNTER ISSUES:

1. Check browser console (F12) for error messages
2. Verify all setup steps were completed
3. Ensure Firebase project is properly configured
4. Double-check collection names and field names

FIREBASE DOCUMENTATION:
https://firebase.google.com/docs/firestore

🔒 SECURITY NOTES
=================

FOR DEVELOPMENT:
- Firestore "test mode" is OK
- No sensitive data in demo

FOR PRODUCTION:
- Change Firestore rules to be restrictive
- Implement proper authentication
- Never expose API keys in client-side code

🎯 APPLICATION FEATURES
=======================

STUDENTS CAN:
- View staff directory and timetables
- Request meetings with staff/HOD
- Receive meeting status notifications
- Update personal profile

STAFF CAN:
- Set availability status (Available/Busy)
- Receive and respond to meeting requests
- Manage personal timetable
- View student requests

HOD CAN:
- All staff features plus:
- Admin panel for user management
- Add/edit/delete users
- Export user data
- Full system oversight

SUPPORTED BROWSERS:
- Chrome 60+
- Firefox 55+ 
- Safari 12+
- Edge 79+

===============================================
SETUP COMPLETE! HAPPY CODING! 🎉
===============================================
