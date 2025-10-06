// Firebase Configuration
const firebaseConfig = {
          apiKey: "your-copied-api-key",
          authDomain: "your-project.firebaseapp.com",
          projectId: "your-project-id",
          storageBucket: "your-project.appspot.com",
          messagingSenderId: "123456789",
          appId: "your-app-id",
          measurementId: "G-XXXXXXXXXX"
      };// PASTE YOUR FIREBASE CONFIG HERE

// Initialize Firebase
let db;
let firebaseInitialized = false;

function initializeFirebase() {
    return new Promise((resolve, reject) => {
        try {
            if (typeof firebase === 'undefined') {
                reject(new Error('Firebase SDK not loaded. Please check your internet connection.'));
                return;
            }

            // Check if Firebase is already initialized
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                console.log('🔥 Firebase app initialized');
            } else {
                console.log('🔥 Firebase app already initialized, using existing instance');
            }
            
            db = firebase.firestore();
            firebaseInitialized = true;
            console.log('✅ Firebase Firestore initialized successfully');
            
            // Enable offline persistence with error handling
            db.enablePersistence().catch((err) => {
                console.warn('Firebase offline persistence error: ', err.code);
            });
            
            resolve(db);
        } catch (error) {
            console.error('❌ Firebase initialization error:', error);
            firebaseInitialized = false;
            reject(error);
        }
    });
}

// Global Variables
let currentUser = null;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 UniLink App Initializing...');
    initializeApp();
});

function initializeApp() {
    setupLoginForm();
    setupModals();
    checkAutoLogin();
}

// ===== AUTHENTICATION SERVICE =====
const authService = {
    login: async function(username, password, role) {
        try {
            console.log('🔐 Attempting login for:', username, 'Role:', role);
            
            // Ensure Firebase is initialized
            if (!firebaseInitialized || !db) {
                console.log('🔄 Initializing Firebase...');
                await initializeFirebase();
            }
            
            if (!db) {
                throw new Error('Database not available. Please refresh the page and check your internet connection.');
            }
            
            // Query user from Firestore
            console.log('📡 Querying user from Firestore...');
            const usersRef = db.collection('users');
            const snapshot = await usersRef
                .where('username', '==', username)
                .where('password', '==', password)
                .where('role', '==', role)
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                currentUser = { 
                    id: doc.id, 
                    ...doc.data(),
                    uid: doc.id
                };
                
                console.log('✅ Login successful:', currentUser.name);
                
                // Save to localStorage for persistence
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                return currentUser;
            } else {
                console.log('❌ No matching user found');
                throw new Error('Invalid Register No. or DOB! Please check your credentials.');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            
            // Provide more user-friendly error messages
            if (error.message.includes('permission-denied')) {
                throw new Error('Database access denied. Please use migrate.html to set up the database first.');
            } else if (error.message.includes('network') || error.message.includes('offline')) {
                throw new Error('Network error. Please check your internet connection.');
            } else {
                throw error;
            }
        }
    },

    logout: function() {
        return new Promise((resolve) => {
            console.log('👋 Logging out user:', currentUser?.name);
            currentUser = null;
            localStorage.removeItem('currentUser');
            resolve();
        });
    }
};

// ===== DATABASE SERVICE =====
const databaseService = {
    // Always check if Firebase is initialized
    checkFirebase: async function() {
        if (!firebaseInitialized || !db) {
            try {
                await initializeFirebase();
            } catch (error) {
                throw new Error('Firebase not initialized. Please refresh the page and check your internet connection.');
            }
        }
        return true;
    },

    // Get all users (for HOD admin panel)
    getAllUsers: async function() {
        await this.checkFirebase();
        try {
            const snapshot = await db.collection('users').get();
            console.log(`📊 Retrieved ${snapshot.size} users from database`);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    },

    // Get users by role
    getUsersByRole: async function(role) {
        await this.checkFirebase();
        try {
            const snapshot = await db.collection('users')
                .where('role', '==', role)
                .get();
            console.log(`📊 Retrieved ${snapshot.size} ${role} users`);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting users by role:', error);
            return [];
        }
    },

    // Add new user (HOD function)
    addUser: async function(userData) {
        await this.checkFirebase();
        try {
            const docRef = await db.collection('users').add(userData);
            console.log('✅ User added with ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error adding user:', error);
            throw error;
        }
    },

    // Update user
    updateUser: async function(userId, updates) {
        await this.checkFirebase();
        try {
            await db.collection('users').doc(userId).update(updates);
            console.log('✅ User updated:', userId);
            
            // Update current user if it's the same user
            if (currentUser && currentUser.id === userId) {
                currentUser = { ...currentUser, ...updates };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    // Delete user (HOD function)
    deleteUser: async function(userId) {
        await this.checkFirebase();
        try {
            await db.collection('users').doc(userId).delete();
            console.log('✅ User deleted:', userId);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    // ===== MEETING SYSTEM =====
    createMeetingRequest: async function(meetingData) {
        await this.checkFirebase();
        try {
            const meetingWithTimestamp = {
                ...meetingData,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await db.collection('meetings').add(meetingWithTimestamp);
            console.log('✅ Meeting request created:', docRef.id);
            
            // Create notification for staff
            await this.createNotification({
                type: 'meeting_request',
                meetingId: docRef.id,
                fromUserId: meetingData.from,
                fromUserName: meetingData.fromUserName,
                toUserId: meetingData.to,
                toUserName: meetingData.toUserName,
                message: `Meeting request from ${meetingData.fromUserName}: ${meetingData.purpose}`,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return docRef.id;
        } catch (error) {
            console.error('Error creating meeting request:', error);
            throw error;
        }
    },

    // Get meetings for user - FIXED: Remove orderBy to avoid index issues
    getMeetingsForUser: async function(userId) {
        await this.checkFirebase();
        try {
            const snapshot = await db.collection('meetings')
                .where('to', '==', userId)
                .where('status', '==', 'pending')
                .get();
            
            console.log(`📅 Retrieved ${snapshot.size} pending meetings for user: ${userId}`);
            
            const meetings = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Convert Firestore timestamp to readable date
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                };
            });
            
            // Sort manually by creation date (newest first)
            meetings.sort((a, b) => b.createdAt - a.createdAt);
            
            return meetings;
        } catch (error) {
            console.error('Error getting meetings:', error);
            // If there's an index error, try without the status filter
            if (error.code === 'failed-precondition') {
                try {
                    const snapshot = await db.collection('meetings')
                        .where('to', '==', userId)
                        .get();
                    
                    const allMeetings = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                        };
                    });
                    
                    // Filter pending meetings manually
                    const pendingMeetings = allMeetings.filter(meeting => meeting.status === 'pending');
                    pendingMeetings.sort((a, b) => b.createdAt - a.createdAt);
                    
                    console.log(`📅 Retrieved ${pendingMeetings.length} pending meetings (manual filter)`);
                    return pendingMeetings;
                } catch (fallbackError) {
                    console.error('Fallback meeting query failed:', fallbackError);
                    return [];
                }
            }
            return [];
        }
    },

    // Update meeting status
    updateMeetingStatus: async function(meetingId, status) {
        await this.checkFirebase();
        try {
            await db.collection('meetings').doc(meetingId).update({
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Meeting ${meetingId} status updated to: ${status}`);

            // Get meeting details for notification
            const meetingDoc = await db.collection('meetings').doc(meetingId).get();
            const meeting = meetingDoc.data();
            
            if (meeting) {
                await this.createNotification({
                    type: 'meeting_response',
                    meetingId: meetingId,
                    fromUserId: meeting.to, // staff
                    fromUserName: meeting.toUserName,
                    toUserId: meeting.from, // student
                    toUserName: meeting.fromUserName,
                    message: `Your meeting request "${meeting.purpose}" has been ${status} by ${meeting.toUserName}`,
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error updating meeting status:', error);
            throw error;
        }
    },

    // ===== NOTIFICATION SYSTEM =====
    createNotification: async function(notificationData) {
        await this.checkFirebase();
        try {
            await db.collection('notifications').add(notificationData);
            console.log('✅ Notification created');
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    },

    getNotificationsForUser: async function(userId) {
        await this.checkFirebase();
        try {
            const snapshot = await db.collection('notifications')
                .where('toUserId', '==', userId)
                .get();
            
            console.log(`🔔 Retrieved ${snapshot.size} notifications for user: ${userId}`);
            
            const notifications = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Convert Firestore timestamp to readable date
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                };
            });
            
            // Sort manually by creation date (newest first)
            notifications.sort((a, b) => b.createdAt - a.createdAt);
            
            return notifications;
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    },

    markNotificationAsRead: async function(notificationId) {
        await this.checkFirebase();
        try {
            await db.collection('notifications').doc(notificationId).update({
                read: true
            });
            console.log('✅ Notification marked as read:', notificationId);
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }
};

// ===== MEETING SYSTEM UI =====
const meetingSystem = {
    currentStaffMember: null,

    setupMeetingModal: function() {
        const confirmBtn = document.getElementById('confirmMeet');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const purpose = document.getElementById('meetingPurpose').value.trim();
                if (purpose && this.currentStaffMember) {
                    try {
                        // Create meeting with proper structure
                        const meetingData = {
                            from: currentUser.id,
                            fromUserName: currentUser.name,
                            fromUserRole: currentUser.role,
                            to: this.currentStaffMember.id,
                            toUserName: this.currentStaffMember.name,
                            toUserRole: this.currentStaffMember.role,
                            purpose: purpose,
                            status: 'pending',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        await databaseService.createMeetingRequest(meetingData);
                        
                        this.showToast('✅ Meeting request sent successfully!', 'success');
                        this.closeMeetModal();
                        document.getElementById('meetingPurpose').value = '';
                        
                    } catch (error) {
                        this.showToast('❌ Error sending meeting request: ' + error.message, 'error');
                    }
                } else {
                    this.showToast('⚠️ Please enter a purpose for the meeting.', 'warning');
                }
            });
        }
    },

    openMeetModal: function(staff) {
        this.currentStaffMember = staff;
        const meetStaffName = document.getElementById('meetStaffName');
        const meetModal = document.getElementById('meetModal');
        
        if (meetStaffName) meetStaffName.textContent = `Request Meeting with ${staff.name}`;
        if (meetModal) meetModal.style.display = 'flex';
        
        const meetingPurpose = document.getElementById('meetingPurpose');
        if (meetingPurpose) {
            meetingPurpose.value = '';
            meetingPurpose.focus();
        }
    },

    closeMeetModal: function() {
        const meetModal = document.getElementById('meetModal');
        if (meetModal) meetModal.style.display = 'none';
        this.currentStaffMember = null;
    },

    showToast: function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.style.background = type === 'error' ? 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' : 
                              type === 'warning' ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' :
                              'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)';
        
        toast.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; margin-left: 10px; padding: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    ×
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }
};

// ===== REAL-TIME LISTENERS =====
const realTimeService = {
    setupRealtimeListeners: function(user) {
        if (!user || !db) {
            console.log('❌ Cannot setup real-time listeners: user or db not available');
            return;
        }
        
        try {
            console.log('🔔 Setting up real-time listeners for user:', user.id);
            
            // Listen for new meetings (for staff/HOD)
            if (user.role !== 'student') {
                db.collection('meetings')
                    .where('to', '==', user.id)
                    .where('status', '==', 'pending')
                    .onSnapshot((snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === 'added') {
                                const meeting = change.doc.data();
                                console.log('📅 New meeting request received:', meeting);
                                // Update alerts if alerts page is visible
                                const alertPage = document.getElementById('alertPage');
                                if (alertPage && !alertPage.classList.contains('hidden')) {
                                    updateAlerts();
                                }
                                // Show notification
                                this.showNotificationAlert({
                                    message: `New meeting request from ${meeting.fromUserName}`,
                                    type: 'meeting'
                                });
                            }
                        });
                    }, (error) => {
                        console.error('Meeting listener error:', error);
                    });
            }
            
            // Listen for new notifications
            db.collection('notifications')
                .where('toUserId', '==', user.id)
                .where('read', '==', false)
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const notification = change.doc.data();
                            console.log('📩 New notification received:', notification);
                            this.showNotificationAlert(notification);
                        }
                    });
                    
                    // Update alerts page if it's visible
                    const alertPage = document.getElementById('alertPage');
                    if (alertPage && !alertPage.classList.contains('hidden')) {
                        updateAlerts();
                    }
                }, (error) => {
                    console.error('Notification listener error:', error);
                });
                
        } catch (error) {
            console.error('Error setting up real-time listeners:', error);
        }
    },

    showNotificationAlert: function(notification) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        
        const message = notification.message || `New ${notification.type} alert`;
        
        toast.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <strong style="display: block; margin-bottom: 5px; font-size: 1rem;">📩 New Alert!</strong>
                    <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; margin-left: 10px; padding: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    ×
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 6 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 6000);
    }
};

// ===== ADMIN PANEL (HOD ONLY) =====
const adminPanel = {
    currentEditingUser: null,

    init: async function() {
        if (currentUser && currentUser.role === 'hod') {
            console.log('👨‍💼 Initializing admin panel for HOD');
            await this.loadUsersTable();
            this.setupEditModal();
        }
    },

    setupEditModal: function() {
        const editModal = document.getElementById('editUserModal');
        const closeBtn = document.getElementById('editUserCloseBtn');
        const saveBtn = document.getElementById('saveUserChanges');

        if (closeBtn) {
            closeBtn.onclick = () => this.closeEditModal();
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveUserChanges());
        }

        window.addEventListener('click', (e) => {
            if (e.target === editModal) {
                this.closeEditModal();
            }
        });
    },

    openEditModal: async function(userId) {
        this.currentEditingUser = userId;
        const editModal = document.getElementById('editUserModal');
        
        if (editModal) {
            editModal.style.display = 'flex';
            
            try {
                // Load user data
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    
                    // Populate form fields
                    document.getElementById('editUserNameInput').value = userData.name || '';
                    document.getElementById('editUserUsernameInput').value = userData.username || '';
                    document.getElementById('editUserRoleSelect').value = userData.role || 'student';
                    document.getElementById('editUserDeptInput').value = userData.dept || '';
                    
                    // Update modal title
                    const editUserName = document.getElementById('editUserName');
                    if (editUserName) {
                        editUserName.textContent = `Editing: ${userData.name}`;
                    }
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                meetingSystem.showToast('❌ Error loading user data', 'error');
            }
        }
    },

    closeEditModal: function() {
        const editModal = document.getElementById('editUserModal');
        if (editModal) {
            editModal.style.display = 'none';
            this.currentEditingUser = null;
            
            // Clear form fields
            document.getElementById('editUserNameInput').value = '';
            document.getElementById('editUserUsernameInput').value = '';
            document.getElementById('editUserRoleSelect').value = 'student';
            document.getElementById('editUserDeptInput').value = '';
        }
    },

    saveUserChanges: async function() {
        if (!this.currentEditingUser) return;

        try {
            const updates = {
                name: document.getElementById('editUserNameInput').value.trim(),
                username: document.getElementById('editUserUsernameInput').value.trim(),
                role: document.getElementById('editUserRoleSelect').value,
                dept: document.getElementById('editUserDeptInput').value.trim()
            };

            // Validate inputs
            if (!updates.name || !updates.username || !updates.dept) {
                meetingSystem.showToast('⚠️ Please fill in all fields', 'warning');
                return;
            }

            await databaseService.updateUser(this.currentEditingUser, updates);
            meetingSystem.showToast('✅ User updated successfully!', 'success');
            this.closeEditModal();
            await this.loadUsersTable();
            
        } catch (error) {
            console.error('Error saving user changes:', error);
            meetingSystem.showToast('❌ Error saving changes: ' + error.message, 'error');
        }
    },

    loadUsersTable: async function() {
        const tableBody = document.querySelector('#adminUsersTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading users...</td></tr>';

        try {
            const allUsers = await databaseService.getAllUsers();
            tableBody.innerHTML = '';

            if (allUsers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No users found in database. Use migrate.html to add users.</td></tr>';
                return;
            }

            allUsers.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${user.photo}" alt="${user.name}" 
                                 style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color);"
                                 onerror="this.src='https://i.pravatar.cc/150?img=1'">
                            ${user.name}
                        </div>
                    </td>
                    <td>${user.username}</td>
                    <td><span class="role-badge ${user.role}">${user.role.toUpperCase()}</span></td>
                    <td>${user.dept}</td>
                    <td>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <button onclick="adminPanel.editUser('${user.id}')" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;">Edit</button>
                            ${user.role !== 'hod' ? `<button onclick="adminPanel.deleteUser('${user.id}', '${user.name}')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">Delete</button>` : ''}
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            console.log('✅ Admin users table loaded with', allUsers.length, 'users');
        } catch (error) {
            console.error('Error loading users table:', error);
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #e74c3c;">Error loading users. Please check console.</td></tr>';
        }
    },

    addUser: function() {
        meetingSystem.showToast('👤 Add New User - This would open a user creation form in a full implementation.', 'info');
    },

    editUser: function(userId) {
        this.openEditModal(userId);
    },

    deleteUser: async function(userId, userName) {
        if (confirm(`🗑️ Are you sure you want to delete user:\n"${userName}"?\n\nThis action cannot be undone.`)) {
            try {
                await databaseService.deleteUser(userId);
                meetingSystem.showToast(`✅ User "${userName}" deleted successfully`, 'success');
                await this.loadUsersTable();
                
            } catch (error) {
                meetingSystem.showToast('❌ Error deleting user: ' + error.message, 'error');
            }
        }
    },

    exportUsers: async function() {
        try {
            const allUsers = await databaseService.getAllUsers();
            const dataStr = JSON.stringify(allUsers, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `unilink_users_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            meetingSystem.showToast(`📊 Exported ${allUsers.length} users successfully!`, 'success');
        } catch (error) {
            meetingSystem.showToast('❌ Error exporting users: ' + error.message, 'error');
        }
    }
};

// ===== SETUP FUNCTIONS =====
function setupLoginForm() {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) {
        console.error('❌ Login form not found');
        return;
    }
    
    loginForm.addEventListener("submit", async e => {
        e.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const role = document.getElementById("role").value;

        if (!username || !password || !role) {
            document.getElementById("loginError").textContent = 'Please fill in all fields';
            document.getElementById("loginError").style.display = "block";
            return;
        }

        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;

        try {
            currentUser = await authService.login(username, password, role);
            
            document.getElementById("loginPage").style.display = "none";
            document.getElementById("appPage").classList.remove("hidden");
            setupDashboard();
            document.getElementById("loginError").style.display = "none";
            
            console.log('🎉 Login successful, dashboard setup complete');
        } catch (error) {
            document.getElementById("loginError").textContent = error.message;
            document.getElementById("loginError").style.display = "block";
            console.error('❌ Login failed:', error);
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

function setupDashboard() {
    const navList = document.getElementById("navList");
    if (!navList) {
        console.error('❌ Navigation list not found');
        return;
    }
    
    // Add Admin link for HOD
    const adminLink = currentUser.role === 'hod' ? 
        '<li><a href="#" class="nav-link" data-page="admin">👨Admin Panel</a></li>' : '';
    
    navList.innerHTML = `
        <li><a href="#" class="nav-link active" data-page="home">Home</a></li>
        <li><a href="#" class="nav-link" data-page="timetable">Timetable</a></li>
        <li><a href="#" class="nav-link" data-page="alert">Alerts</a></li>
        <li><a href="#" class="nav-link" data-page="profile">Profile</a></li>
        <li><a href="#" class="nav-link" data-page="settings">Settings</a></li>
        ${adminLink}
        <li><a href="#" id="logoutBtn" style="color: #ff6b6b;">🚪 Logout</a></li>
    `;

    // Update welcome message
    const welcomeTitle = document.getElementById("welcomeTitle");
    const roleInfo = document.getElementById("roleInfo");
    if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${currentUser.name}`;
    if (roleInfo) roleInfo.textContent = `${currentUser.role.toUpperCase()} - ${currentUser.dept}`;

    setupNav();
    setupSettings();
    renderProfile();
    renderStaffList();
    updateAlerts();

    // Initialize components
    meetingSystem.setupMeetingModal();
    realTimeService.setupRealtimeListeners(currentUser);
    
    if (currentUser.role === 'hod') {
        adminPanel.init();
    }

    // Logout handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                await authService.logout();
                location.reload();
            }
        });
    }
    
    console.log('✅ Dashboard setup complete for user:', currentUser.name);
}

// ===== NAVIGATION =====
function setupNav() {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            const targetPage = link.dataset.page;
            
            // Hide all pages
            document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
            
            // Remove active class from all links
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            
            // Show target page and set active link
            link.classList.add("active");
            const targetElement = document.getElementById(targetPage + "Page");
            if (targetElement) {
                targetElement.classList.remove("hidden");
            }
            
            // Refresh specific pages when navigated to
            if (targetPage === 'alert') {
                updateAlerts();
            } else if (targetPage === 'admin' && currentUser.role === 'hod') {
                adminPanel.loadUsersTable();
            } else if (targetPage === 'home') {
                renderStaffList();
            }
            
            console.log('Navigated to:', targetPage);
        });
    });
}

// ===== PROFILE PAGE =====
function renderProfile() {
    const box = document.getElementById("profileContainer");
    if (!box || !currentUser) return;
    
    const statusDisplay = (currentUser.role === 'staff' || currentUser.role === 'hod') ? 
        `<p><b>Current Status:</b> <span id="currentStatus" style="color: ${currentUser.status === 'busy' ? '#e74c3c' : '#27ae60'}; font-weight: 600;">${currentUser.status || 'available'}</span></p>` : '';
        
    box.innerHTML = `
        <div class="profile-box">
            <img src="${currentUser.photo}" alt="profile" onerror="this.src='https://i.pravatar.cc/150?img=1'">
            <h2>${currentUser.name}</h2>
            <p><b>Register No:</b> ${currentUser.username}</p>
            <p><b>Department:</b> ${currentUser.dept}</p>
            <p><b>Academic Year:</b> ${currentUser.year}</p>
            <p><b>Blood Group:</b> ${currentUser.blood}</p>
            <p><b>Role:</b> <span class="role-badge ${currentUser.role}">${currentUser.role.toUpperCase()}</span></p>
            ${statusDisplay}
        </div>
    `;
    
    console.log('✅ Profile rendered for user:', currentUser.name);
}

// ===== STAFF LIST (HOME PAGE) - ENHANCED DUPLICATE REMOVAL =====
async function renderStaffList() {
    const container = document.getElementById("staffContainer");
    if (!container) return;
    
    container.innerHTML = "<p style='text-align: center; padding: 40px; color: var(--text-secondary);'>Loading staff directory...</p>";

    try {
        const staff = await databaseService.getUsersByRole('staff');
        const hod = await databaseService.getUsersByRole('hod');
        
        // Combine all staff and HOD
        const allStaff = [...staff, ...hod];
        
        // Enhanced duplicate removal: Remove duplicates by username AND name
        const uniqueStaffMap = new Map();
        
        allStaff.forEach(staffMember => {
            // Create a unique key using both ID and username to catch more duplicates
            const uniqueKey = `${staffMember.id}-${staffMember.username}`;
            
            // Only add if not current user
            if (staffMember.id !== currentUser.id) {
                uniqueStaffMap.set(uniqueKey, staffMember);
            }
        });
        
        const displayStaff = Array.from(uniqueStaffMap.values());

        if (displayStaff.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px; font-style: italic;">No staff members found in the directory.</p>';
            return;
        }

        container.innerHTML = '';
        displayStaff.forEach(staffMember => {
            const status = staffMember.status || 'available';
            const statusColor = status === 'busy' ? '#e74c3c' : 
                              status === 'offline' ? '#95a5a6' : '#27ae60';
            const statusText = status === 'busy' ? 'Busy' : 
                             status === 'offline' ? 'Offline' : 'Available';
            
            const card = document.createElement("div");
            card.className = "staff-card";
            card.innerHTML = `
                <img src="${staffMember.photo}" alt="${staffMember.name}" onerror="this.src='https://i.pravatar.cc/150?img=1'">
                <h3>${staffMember.name}</h3>
                <p>${staffMember.dept} (${staffMember.role.toUpperCase()})</p>
                <p><small style="color: ${statusColor}; font-weight: 500;">Status: ${statusText}</small></p>
                ${staffMember.timetable ? '<button class="viewTimetable" style="margin: 5px;">View Timetable</button>' : ''}
                ${currentUser.role === 'student' || 
                  (currentUser.role === 'staff' && staffMember.role === 'hod') || 
                  (currentUser.role === 'hod' && staffMember.role === 'staff') ? 
                  '<button class="meetStaff" style="margin: 5px;">Request Meeting</button>' : ''}
            `;

            if (staffMember.timetable) {
                card.querySelector(".viewTimetable").addEventListener("click", () => {
                    openTimetable(staffMember);
                });
            }

            // Enable meeting requests for: student→anyone, staff→HOD, HOD→staff
            const meetButton = card.querySelector(".meetStaff");
            if (meetButton) {
                meetButton.addEventListener("click", () => {
                    meetingSystem.openMeetModal(staffMember);
                });
            }

            container.appendChild(card);
        });
        
        console.log('✅ Staff list rendered with', displayStaff.length, 'unique staff members');
        console.log('📊 Staff details:', displayStaff.map(s => ({ name: s.name, username: s.username, role: s.role })));
    } catch (error) {
        console.error('Error rendering staff list:', error);
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Error loading staff directory. Please check console.</p>';
    }
}

// ===== ALERTS PAGE - IMPROVED DISPLAY =====
async function updateAlerts() {
    const alertList = document.getElementById("alertList");
    if (!alertList) return;
    
    alertList.innerHTML = "<li style='text-align: center; padding: 20px; color: var(--text-secondary);'>Loading alerts...</li>";

    try {
        const notifications = await databaseService.getNotificationsForUser(currentUser.id);
        const pendingMeetings = currentUser.role !== 'student' ? 
            await databaseService.getMeetingsForUser(currentUser.id) : [];

        alertList.innerHTML = '';

        if (pendingMeetings.length === 0 && notifications.length === 0) {
            alertList.innerHTML = '<li style="text-align: center; padding: 30px; color: var(--text-secondary); font-style: italic;">No new alerts or notifications.</li>';
            return;
        }
        
        // Display pending meeting requests (for staff/HOD only)
        if (currentUser.role !== 'student') {
            pendingMeetings.forEach(meeting => {
                const li = document.createElement("li");
                li.className = "meeting-request-alert";
                li.style.borderLeft = '5px solid #e74c3c';
                li.style.background = 'rgba(231, 76, 60, 0.05)';
                li.style.marginBottom = '15px';
                li.style.padding = '20px';
                li.style.borderRadius = '10px';
                li.innerHTML = `
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #e74c3c; display: block; margin-bottom: 10px;">📅 Meeting Request from ${meeting.fromUserName}</strong>
                        <p style="margin: 8px 0; color: var(--text-primary); font-weight: 500; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 5px;">Purpose: ${meeting.purpose}</p>
                        <small style="color: var(--text-secondary);">Sent: ${meeting.createdAt ? meeting.createdAt.toLocaleString() : 'Recently'}</small>
                    </div>
                    <div class="request-actions" style="display: flex; gap: 10px;">
                        <button onclick="handleMeetingResponse('${meeting.id}', 'approved')" class="btn-primary" style="flex: 1; background: #27ae60; border: none; padding: 10px; border-radius: 5px; color: white; cursor: pointer;">✅ Approve</button>
                        <button onclick="handleMeetingResponse('${meeting.id}', 'denied')" class="btn-secondary" style="flex: 1; background: #e74c3c; border: none; padding: 10px; border-radius: 5px; color: white; cursor: pointer;">❌ Deny</button>
                    </div>
                `;
                alertList.appendChild(li);
            });
        }

        // Display notifications for all users
        notifications.forEach(notification => {
            const li = document.createElement("li");
            li.className = notification.read ? 'notification read' : 'notification unread';
            li.style.borderLeft = notification.read ? '5px solid #95a5a6' : '5px solid #3498db';
            li.style.background = notification.read ? 'var(--background-card)' : 'rgba(52, 152, 219, 0.05)';
            li.style.opacity = notification.read ? '0.8' : '1';
            li.style.marginBottom = '10px';
            li.style.padding = '15px 20px';
            li.style.borderRadius = '10px';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            
            li.innerHTML = `
                <div class="notification-content" style="flex: 1;">
                    <p style="margin: 0 0 8px 0; color: var(--text-primary); font-weight: 500;">${notification.message}</p>
                    <small style="color: var(--text-secondary);">${notification.createdAt ? notification.createdAt.toLocaleString() : 'Recently'}</small>
                </div>
                ${!notification.read ? `
                    <button onclick="markNotificationAsRead('${notification.id}')" class="btn-primary" style="white-space: nowrap; background: #3498db; border: none; padding: 8px 16px; border-radius: 5px; color: white; cursor: pointer;">
                        Mark Read
                    </button>
                ` : ''}
            `;
            alertList.appendChild(li);
        });

        console.log('✅ Alerts updated:', { 
            meetings: pendingMeetings.length, 
            notifications: notifications.length,
            userRole: currentUser.role 
        });

    } catch (error) {
        console.error('Error updating alerts:', error);
        alertList.innerHTML = '<li style="text-align: center; padding: 20px; color: #e74c3c;">Error loading alerts. Please check console.</li>';
    }
}

// ===== MEETING RESPONSE HANDLER =====
async function handleMeetingResponse(meetingId, response) {
    try {
        await databaseService.updateMeetingStatus(meetingId, response);
        meetingSystem.showToast(`✅ Meeting request ${response}`, 'success');
        updateAlerts();
    } catch (error) {
        meetingSystem.showToast('❌ Error processing meeting request: ' + error.message, 'error');
    }
}

// ===== NOTIFICATION HANDLER =====
async function markNotificationAsRead(notificationId) {
    try {
        await databaseService.markNotificationAsRead(notificationId);
        updateAlerts();
    } catch (error) {
        console.error('Error marking notification as read:', error);
        meetingSystem.showToast('❌ Error marking notification as read', 'error');
    }
}

// ===== SETTINGS PAGE =====
function setupSettings() {
    const themeSwitch = document.getElementById("themeSwitch");
    const busySwitch = document.getElementById("busySwitch");
    const meetingSwitch = document.getElementById("meetingSwitch");

    // Dark mode toggle
    if (themeSwitch) {
        themeSwitch.addEventListener("change", () => {
            if (themeSwitch.checked) {
                document.body.classList.add("dark-mode");
                localStorage.setItem('theme', 'dark');
                console.log('Dark mode enabled');
            } else {
                document.body.classList.remove("dark-mode");
                localStorage.setItem('theme', 'light');
                console.log('Light mode enabled');
            }
        });
        
        // Apply saved theme preference on load
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add("dark-mode");
            themeSwitch.checked = true;
        }
    }

    // Busy toggle (for staff/HOD only)
    if (busySwitch && (currentUser.role === 'staff' || currentUser.role === 'hod')) {
        // Set initial state
        busySwitch.checked = currentUser.status === 'busy';
        
        busySwitch.addEventListener("change", async () => {
            const status = busySwitch.checked ? "busy" : "available";
            const statusColor = status === 'busy' ? '#e74c3c' : '#27ae60';
            
            try {
                await databaseService.updateUser(currentUser.id, { status: status });
                
                // Update profile display
                const statusElement = document.getElementById('currentStatus');
                if (statusElement) {
                    statusElement.textContent = status;
                    statusElement.style.color = statusColor;
                }
                
                meetingSystem.showToast(`Status updated to: ${status}`, 'success');
                console.log('✅ User status updated to:', status);
                
            } catch (error) {
                meetingSystem.showToast('❌ Error updating status: ' + error.message, 'error');
                // Revert switch on error
                busySwitch.checked = !busySwitch.checked;
            }
        });
    } else if (busySwitch) {
        // Hide busy switch for students
        busySwitch.parentElement.style.display = 'none';
    }

    // Meeting mode toggle
    if (meetingSwitch) {
        meetingSwitch.addEventListener("change", () => {
            const status = meetingSwitch.checked ? "ON" : "OFF";
            const message = meetingSwitch.checked ? 
                "Meeting mode ON: You'll receive notifications for all meeting requests." :
                "Meeting mode OFF: You'll only receive important notifications.";
            meetingSystem.showToast(`${message}`, 'info');
            console.log('Meeting mode:', status);
        });
    }
    
    console.log('✅ Settings setup complete');
}

// ===== TIMETABLE MODAL =====
function openTimetable(staff) {
    meetingSystem.closeMeetModal();
    const staffName = document.getElementById("staffName");
    const tbody = document.querySelector("#timetable tbody");
    const modal = document.getElementById("modal");
    
    if (staffName) staffName.textContent = `${staff.name}'s Timetable`;
    if (tbody) {
        tbody.innerHTML = "";
        
        if (!staff.timetable || staff.timetable.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">No timetable available.</td></tr>';
        } else {
            staff.timetable.forEach(row => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${row.day}</strong></td>
                    <td>${row.start}</td>
                    <td>${row.end}</td>
                    <td>${row.activity}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
    
    if (modal) modal.style.display = "flex";
    console.log('Timetable opened for:', staff.name);
}

function closeModal(modalElement) {
    if (modalElement) modalElement.style.display = "none";
}

// ===== MODAL SETUP =====
function setupModals() {
    const modal = document.getElementById("modal");
    const closeBtn = document.getElementById("closeBtn");
    const meetModal = document.getElementById("meetModal");
    const meetCloseBtn = document.getElementById("meetCloseBtn");

    if (closeBtn) closeBtn.onclick = () => closeModal(modal);
    if (meetCloseBtn) meetCloseBtn.onclick = () => meetingSystem.closeMeetModal();

    window.addEventListener("click", e => {
        if (e.target === modal) closeModal(modal);
        if (e.target === meetModal) meetingSystem.closeMeetModal();
    });
    
    console.log('✅ Modals setup complete');
}

// ===== AUTO LOGIN CHECK =====
function checkAutoLogin() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('🔑 Auto-login found for user:', currentUser.name);
            showAppPage();
            setupDashboard();
        } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem('currentUser');
        }
    } else {
        console.log('🔑 No auto-login found, showing login page');
    }
}

function showAppPage() {
    const loginPage = document.getElementById("loginPage");
    const appPage = document.getElementById("appPage");
    
    if (loginPage) loginPage.style.display = "none";
    if (appPage) appPage.classList.remove("hidden");
}

// ===== DUPLICATE CLEANUP FUNCTION =====
// TEMPORARY: Clean duplicate staff members from database
window.cleanDuplicateStaff = async function() {
    try {
        console.log('🧹 Cleaning duplicate staff members...');
        
        const allUsers = await databaseService.getAllUsers();
        const staffUsers = allUsers.filter(user => user.role === 'staff' || user.role === 'hod');
        
        // Find duplicates by username
        const usernameMap = new Map();
        const duplicates = [];
        
        staffUsers.forEach(user => {
            if (usernameMap.has(user.username)) {
                duplicates.push(user);
            } else {
                usernameMap.set(user.username, user);
            }
        });
        
        console.log(`🗑️ Found ${duplicates.length} duplicate staff members to delete:`, duplicates);
        
        if (duplicates.length === 0) {
            console.log('✅ No duplicates found!');
            meetingSystem.showToast('✅ No duplicate staff members found!', 'success');
            return;
        }
        
        // Delete duplicates
        for (const duplicate of duplicates) {
            await databaseService.deleteUser(duplicate.id);
            console.log(`✅ Deleted duplicate: ${duplicate.name} (${duplicate.username})`);
        }
        
        console.log(`✅ Successfully cleaned ${duplicates.length} duplicates`);
        meetingSystem.showToast(`✅ Successfully cleaned ${duplicates.length} duplicate staff members!`, 'success');
        
        // Refresh staff list
        if (currentUser) {
            renderStaffList();
        }
        
    } catch (error) {
        console.error('Error cleaning duplicates:', error);
        meetingSystem.showToast('❌ Error cleaning duplicates: ' + error.message, 'error');
    }
};

// DEBUG FUNCTION - Check database contents
window.debugDatabase = async function() {
    console.log('🔍 DEBUG DATABASE CONTENTS:');
    
    try {
        // Check meetings
        const meetingsSnapshot = await db.collection('meetings').get();
        console.log('Meetings:', meetingsSnapshot.size);
        meetingsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log('Meeting:', doc.id, {
                from: data.fromUserName,
                to: data.toUserName,
                purpose: data.purpose,
                status: data.status,
                createdAt: data.createdAt ? data.createdAt.toDate() : 'No date'
            });
        });
        
        // Check notifications
        const notificationsSnapshot = await db.collection('notifications').get();
        console.log('Notifications:', notificationsSnapshot.size);
        notificationsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log('Notification:', doc.id, {
                to: data.toUserId,
                message: data.message,
                read: data.read,
                createdAt: data.createdAt ? data.createdAt.toDate() : 'No date'
            });
        });
        
        // Check users
        const usersSnapshot = await db.collection('users').get();
        console.log('👥 Users:', usersSnapshot.size);
        
    } catch (error) {
        console.error('Debug error:', error);
    }
};

// Make functions global
window.currentUser = currentUser;
window.updateAlerts = updateAlerts;
window.renderProfile = renderProfile;
window.openTimetable = openTimetable;
window.handleMeetingResponse = handleMeetingResponse;
window.markNotificationAsRead = markNotificationAsRead;
window.adminPanel = adminPanel;
window.meetingSystem = meetingSystem;
window.databaseService = databaseService;

// Add CSS for role badges and animations
const style = document.createElement('style');
style.textContent = `
    .role-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    .role-badge.student { background: #e3f2fd; color: #1976d2; }
    .role-badge.staff { background: #f3e5f5; color: #7b1fa2; }
    .role-badge.hod { background: #e8f5e8; color: #2e7d32; }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 350px;
        animation: slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        border-left: 4px solid #2575fc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    #editUserModal .modal-content {
        max-width: 500px;
    }
    
    #editUserModal input,
    #editUserModal select {
        width: 100%;
        padding: 12px;
        margin: 8px 0;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.3s ease;
    }
    
    #editUserModal input:focus,
    #editUserModal select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 5px rgba(37, 117, 252, 0.3);
    }
    
    .dark-mode #editUserModal input,
    .dark-mode #editUserModal select {
        background: #2c2c2c;
        border-color: #444;
        color: var(--text-primary);
    }
`;
document.head.appendChild(style);