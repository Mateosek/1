// Custom Reminders Module
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const customReminderSection = document.getElementById('custom-reminder-section');
    const addReminderBtn = document.getElementById('add-reminder-btn');
    const remindersList = document.getElementById('reminders-list');
    const reminderTimeInput = document.getElementById('reminder-time');
    const saveReminderBtn = document.getElementById('save-reminder-btn');
    const cancelReminderBtn = document.getElementById('cancel-reminder-btn');
    const reminderForm = document.getElementById('reminder-form');
    
    // State
    let customReminders = [];
    let reminderTimers = [];
    
    // Initialize
    function init() {
        loadCustomReminders();
        renderReminders();
        scheduleCustomReminders();
        
        // Event listeners
        addReminderBtn.addEventListener('click', showReminderForm);
        saveReminderBtn.addEventListener('click', saveReminder);
        cancelReminderBtn.addEventListener('click', hideReminderForm);
    }
    
    function loadCustomReminders() {
        const savedReminders = localStorage.getItem('waterReminderCustomReminders');
        if (savedReminders) {
            customReminders = JSON.parse(savedReminders);
        }
    }
    
    function saveCustomReminders() {
        localStorage.setItem('waterReminderCustomReminders', JSON.stringify(customReminders));
    }
    
    function showReminderForm() {
        reminderForm.classList.remove('hidden');
        addReminderBtn.classList.add('hidden');
        reminderTimeInput.value = '';
    }
    
    function hideReminderForm() {
        reminderForm.classList.add('hidden');
        addReminderBtn.classList.remove('hidden');
    }
    
    function saveReminder() {
        const time = reminderTimeInput.value;
        if (!time) return;
        
        const reminder = {
            id: Date.now(),
            time: time
        };
        
        customReminders.push(reminder);
        saveCustomReminders();
        renderReminders();
        scheduleCustomReminders();
        hideReminderForm();
    }
    
    function renderReminders() {
        remindersList.innerHTML = '';
        
        if (customReminders.length === 0) {
            remindersList.innerHTML = '<p class="no-reminders">Brak niestandardowych przypomnień</p>';
            return;
        }
        
        // Sort reminders by time
        const sortedReminders = [...customReminders].sort((a, b) => {
            return a.time.localeCompare(b.time);
        });        
        sortedReminders.forEach(reminder => {
            const reminderEl = document.createElement('div');
            reminderEl.className = 'reminder-item';
            reminderEl.innerHTML = `
                <span class="reminder-time">${reminder.time}</span>
                <button class="delete-reminder" data-id="${reminder.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            remindersList.appendChild(reminderEl);
            
            // Add delete event listener
            const deleteBtn = reminderEl.querySelector('.delete-reminder');
            deleteBtn.addEventListener('click', () => deleteReminder(reminder.id));
        });    }
    
    function deleteReminder(id) {
        customReminders = customReminders.filter(reminder => reminder.id !== id);
        saveCustomReminders();
        renderReminders();
        scheduleCustomReminders();
    }
    
    function scheduleCustomReminders() {
        // Clear existing timers
        reminderTimers.forEach(timer => clearTimeout(timer));
        reminderTimers = [];
        
        customReminders.forEach(reminder => {
            const now = new Date();
            const [hours, minutes] = reminder.time.split(':').map(Number);
            
            // Set reminder time for today
            const reminderTime = new Date(now);
            reminderTime.setHours(hours, minutes, 0, 0);
            
            // If the time has already passed today, schedule for tomorrow
            if (reminderTime < now) {
                reminderTime.setDate(reminderTime.getDate() + 1);
            }
            
            const timeUntilReminder = reminderTime - now;
            
            // Schedule the reminder
            const timer = setTimeout(() => {
                triggerCustomReminder(reminder.time);
                // Reschedule for the next day
                scheduleCustomReminders();
            }, timeUntilReminder);
            
            reminderTimers.push(timer);
        });    }
    
    function triggerCustomReminder(time) {
        // Only show if in active hours (reusing the function from main app.js)
        if (window.isInActiveHours && window.isInActiveHours()) {
            // Show in-app notification
            const notification = document.getElementById('notification');
            if (notification) {
                notification.classList.remove('hidden');
                
                // Show system notification if permitted
                if ("Notification" in window && Notification.permission === "granted") {
                    // If we have service worker and push is supported, use it for notifications
                    if ('serviceWorker' in navigator && 'PushManager' in window) {
                        navigator.serviceWorker.ready.then(registration => {
                            // Create notification data
                            const notificationData = {
                                title: "Przypominacz o piciu wody",
                                body: `Zaplanowane przypomnienie (${time}): Czas na szklankę wody!`,
                                icon: "https://cdn-icons-png.flaticon.com/512/824/824239.png",
                                timestamp: Date.now()
                            };
                            
                            // Try to use the service worker for notifications
                            try {
                                registration.showNotification(notificationData.title, {
                                    body: notificationData.body,
                                    icon: notificationData.icon,
                                    badge: "https://cdn-icons-png.flaticon.com/512/824/824239.png",
                                    tag: "water-reminder-custom",
                                    vibrate: [100, 50, 100],
                                    data: {
                                        dateOfArrival: Date.now(),
                                        primaryKey: 2,
                                        time: time
                                    },
                                    actions: [
                                        { action: 'close', title: 'Zamknij' },
                                        { action: 'check', title: 'Sprawdź' }
                                    ]
                                });
                            } catch (error) {
                                // Fallback to regular Notification API
                                const notify = new Notification(notificationData.title, {
                                    body: notificationData.body,
                                    icon: notificationData.icon
                                });
                            }
                        });
                    } else {
                        // Fallback for browsers without service worker support
                        const notify = new Notification("Przypominacz o piciu wody", {
                            body: `Zaplanowane przypomnienie (${time}): Czas na szklankę wody!`,
                            icon: "https://cdn-icons-png.flaticon.com/512/824/824239.png"
                        });
                    }
                }
            }
        }
    }
    
    // Initialize when DOM is loaded
    init();
    
    // Expose functions to global scope for use in main app.js
    window.customReminders = {
        scheduleCustomReminders,
        loadCustomReminders
    };
});