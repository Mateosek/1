// Main App JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    // DOM Elements
    const sections = document.querySelectorAll('.section');
    const navButtons = document.querySelectorAll('.nav-btn');
    const waterLevel = document.getElementById('water-level');
    const currentAmount = document.getElementById('current-amount');
    const goalAmount = document.getElementById('goal-amount');
    const addWaterBtn = document.getElementById('add-water');
    const waterOptions = document.getElementById('water-options');
    const waterOptionBtns = document.querySelectorAll('.water-option');
    const customAmountInput = document.getElementById('custom-amount');
    const addCustomBtn = document.getElementById('add-custom');
    const todayEntries = document.getElementById('today-entries');
    const saveSettingsBtn = document.getElementById('save-settings');
    const dailyGoalInput = document.getElementById('daily-goal');
    const reminderIntervalInput = document.getElementById('reminder-interval');
    const wakeupTimeInput = document.getElementById('wakeup-time');
    const sleepTimeInput = document.getElementById('sleep-time');
    const notification = document.getElementById('notification');
    const dismissNotificationBtn = document.getElementById('dismiss-notification');
    
    // App State
    let state = {
        currentAmount: 0,
        dailyGoal: 2000,
        reminderInterval: 60,
        wakeupTime: '07:00',
        sleepTime: '22:00',
        entries: [],
        lastReminderTime: null
    };
    
    // Timer for reminders
    let reminderTimer = null;
    
    // Initialize app
    function init() {
        loadState();
        updateUI();
        setupEventListeners();
        showSection('dashboard-section');
        scheduleReminders();
        requestNotificationPermission();
        setupTabsEventListeners();
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    // Aktualizuj service worker jeśli jest dostępna nowa wersja
                    registration.update();
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        }
    }
    

    
    // Load state from localStorage
    function loadState() {
        const savedState = localStorage.getItem('waterReminderState');
        if (savedState) {
            state = JSON.parse(savedState);
        }
        
        // Update input values
        dailyGoalInput.value = state.dailyGoal;
        reminderIntervalInput.value = state.reminderInterval;
        wakeupTimeInput.value = state.wakeupTime;
        sleepTimeInput.value = state.sleepTime;
        goalAmount.textContent = state.dailyGoal;
        
        // Check if it's a new day and reset if needed
        checkNewDay();
    }
    
    // Save state to localStorage
    function saveState() {
        localStorage.setItem('waterReminderState', JSON.stringify(state));
    }
    
    // Pokaż powiadomienie w aplikacji
    function showNotification(title, message, type = 'info') {
        const notificationContainer = document.getElementById('notification') || createNotificationContainer();
        
        notificationContainer.className = `notification ${type}`;
        notificationContainer.innerHTML = `
            <div class="notification-content">
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
            <button id="dismiss-notification" class="dismiss-btn">&times;</button>
        `;
        
        notificationContainer.classList.remove('hidden');
        
        // Dodaj obsługę przycisku zamknięcia
        document.getElementById('dismiss-notification').addEventListener('click', () => {
            notificationContainer.classList.add('hidden');
        });
        
        // Automatycznie ukryj po 5 sekundach
        setTimeout(() => {
            notificationContainer.classList.add('hidden');
        }, 5000);
    }
    
    // Utwórz kontener na powiadomienia, jeśli nie istnieje
    function createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification';
        container.className = 'notification hidden';
        document.body.appendChild(container);
        return container;
    }
    
    // Check if it's a new day and reset tracking if needed
    function checkNewDay() {
        if (state.entries.length > 0) {
            const lastEntryDate = new Date(state.entries[0].timestamp).toLocaleDateString();
            const today = new Date().toLocaleDateString();
            
            if (lastEntryDate !== today) {
                // It's a new day, reset tracking
                state.currentAmount = 0;
                state.entries = [];
                saveState();
            }
        }
    }
    
    // Update UI elements
    function updateUI() {
        // Update water level visualization
        const percentage = Math.min((state.currentAmount / state.dailyGoal) * 100, 100);
        waterLevel.style.height = `${percentage}%`;
        
        // Update text displays
        currentAmount.textContent = state.currentAmount;
        goalAmount.textContent = state.dailyGoal;
        
        // Update goal percentage
        const goalPercentage = document.getElementById('goal-percentage');
        if (goalPercentage) {
            goalPercentage.textContent = Math.round(percentage);
        }
        
        // Update current amount display in progress info
        const currentAmountDisplay = document.getElementById('current-amount-display');
        if (currentAmountDisplay) {
            currentAmountDisplay.textContent = state.currentAmount;
        }
        
        // Update goal amount display in progress info
        const goalAmountDisplay = document.getElementById('goal-amount-display');
        if (goalAmountDisplay) {
            goalAmountDisplay.textContent = state.dailyGoal;
        }
        
        // Render entries
        renderEntries();
        
        // Render recent entries
        renderRecentEntries();
    }
    
    // Render recent entries for dashboard
    function renderRecentEntries() {
        const recentEntriesList = document.getElementById('recent-entries');
        if (!recentEntriesList) return;
        
        recentEntriesList.innerHTML = '';
        
        if (state.entries.length === 0) {
            recentEntriesList.innerHTML = '<p class="no-entries">Brak wpisów na dziś</p>';
            return;
        }
        
        // Pokaż tylko 5 ostatnich wpisów
        const recentEntries = state.entries.slice(0, 5);
        
        recentEntries.forEach(entry => {
            const entryEl = document.createElement('div');
            entryEl.className = 'entry';
            
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            entryEl.innerHTML = `
                <span class="entry-time">${timeStr}</span>
                <span class="entry-amount">${entry.amount} ml</span>
            `;
            
            recentEntriesList.appendChild(entryEl);
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Navigation
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sectionId = btn.dataset.section;
                showSection(sectionId);
                setActiveNavButton(btn);
                
                // Update charts when navigating to stats section
                if (sectionId === 'stats-section' && window.waterCharts && window.waterCharts.updateCharts) {
                    window.waterCharts.updateCharts();
                }
            });
        });
        
        // Add water button
        addWaterBtn.addEventListener('click', () => {
            waterOptions.classList.toggle('hidden');
        });
        
        // Water option buttons
        waterOptionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount);
                addWater(amount);
                waterOptions.classList.add('hidden');
            });
        });
        
        // Quick add buttons
        const quickAddBtns = document.querySelectorAll('.quick-add-btn');
        quickAddBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount);
                addWater(amount);
                
                // Dodaj efekt animacji po kliknięciu
                btn.classList.add('clicked');
                setTimeout(() => {
                    btn.classList.remove('clicked');
                }, 300);
            });
        });
        
        // Add custom amount
        addCustomBtn.addEventListener('click', () => {
            const amount = parseInt(customAmountInput.value);
            if (amount && amount > 0) {
                addWater(amount);
                customAmountInput.value = '';
                waterOptions.classList.add('hidden');
            }
        });
        
        // Save settings
        saveSettingsBtn.addEventListener('click', saveSettings);
        
        // Dismiss notification
        dismissNotificationBtn.addEventListener('click', () => {
            notification.classList.add('hidden');
        });
    }
    
    // Show active section and hide others
    function showSection(sectionId) {
        sections.forEach(section => {
            if (section.id === sectionId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }
    
    // Set active navigation button
    function setActiveNavButton(activeBtn) {
        navButtons.forEach(btn => {
            if (btn === activeBtn) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    // Add water to tracking
    function addWater(amount) {
        state.currentAmount += amount;
        
        // Add entry
        const entry = {
            timestamp: new Date().getTime(),
            amount: amount
        };
        
        state.entries.unshift(entry);
        saveState();
        updateUI();
        
        // Update charts if available
        if (window.waterCharts && window.waterCharts.updateCharts) {
            window.waterCharts.updateCharts();
        }
    }
    
    // Render water entries
    function renderEntries() {
        todayEntries.innerHTML = '';
        
        if (state.entries.length === 0) {
            todayEntries.innerHTML = '<p class="no-entries">Brak wpisów na dziś</p>';
            return;
        }
        
        // Grupuj wpisy według daty
        const entriesByDate = {};
        
        state.entries.forEach(entry => {
            const date = new Date(entry.timestamp);
            const dateStr = date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
            
            if (!entriesByDate[dateStr]) {
                entriesByDate[dateStr] = [];
            }
            
            entriesByDate[dateStr].push(entry);
        });
        
        // Wyświetl wpisy pogrupowane według daty
        for (const dateStr in entriesByDate) {
            // Dodaj nagłówek z datą
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.textContent = dateStr;
            todayEntries.appendChild(dateHeader);
            
            // Dodaj wpisy dla danej daty
            entriesByDate[dateStr].forEach(entry => {
                const entryEl = document.createElement('div');
                entryEl.className = 'entry';
                
                const date = new Date(entry.timestamp);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                entryEl.innerHTML = `
                    <span class="entry-time">${timeStr}</span>
                    <span class="entry-amount">${entry.amount} ml</span>
                `;
                
                todayEntries.appendChild(entryEl);
            });
        }
    }
    
    // Save settings
    function saveSettings() {
        state.dailyGoal = parseInt(dailyGoalInput.value);
        state.reminderInterval = parseInt(reminderIntervalInput.value);
        state.wakeupTime = wakeupTimeInput.value;
        state.sleepTime = sleepTimeInput.value;
        
        saveState();
        updateUI();
        scheduleReminders();
        
        // Show confirmation
        alert('Ustawienia zostały zapisane!');
    }
    
    // Schedule water reminders
    function scheduleReminders() {
        // Clear existing timer
        if (reminderTimer) {
            clearInterval(reminderTimer);
        }
        
        // Set new timer based on interval
        const intervalMs = state.reminderInterval * 60 * 1000;
        reminderTimer = setInterval(() => {
            if (isInActiveHours()) {
                showReminder();
            }
        }, intervalMs);
        
        // Also schedule custom reminders if available
        if (window.customReminders && window.customReminders.scheduleCustomReminders) {
            window.customReminders.scheduleCustomReminders();
        }
    }
    
    // Check if current time is within active hours
    function isInActiveHours() {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [wakeHours, wakeMinutes] = state.wakeupTime.split(':').map(Number);
        const [sleepHours, sleepMinutes] = state.sleepTime.split(':').map(Number);
        
        const wakeTime = wakeHours * 60 + wakeMinutes;
        const sleepTime = sleepHours * 60 + sleepMinutes;
        
        return currentTime >= wakeTime && currentTime <= sleepTime;
    }
    
    // Show reminder notification
    function showReminder() {
        // Show in-app notification if app is visible
        notification.classList.remove('hidden');
        
        // Show system notification
        if ("Notification" in window && Notification.permission === "granted") {
            // If we have service worker and push is supported, use it for notifications
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                navigator.serviceWorker.ready.then(registration => {
                    // Create notification data
                    const notificationData = {
                        title: "Przypominacz o piciu wody",
                        body: "Czas na szklankę wody!",
                        icon: "https://cdn-icons-png.flaticon.com/512/824/824239.png",
                        timestamp: Date.now()
                    };
                    
                    // Try to use the push API if possible
                    try {
                        registration.showNotification(notificationData.title, {
                            body: notificationData.body,
                            icon: notificationData.icon,
                            badge: "https://cdn-icons-png.flaticon.com/512/824/824239.png",
                            tag: "water-reminder",
                            vibrate: [100, 50, 100],
                            data: {
                                dateOfArrival: Date.now(),
                                primaryKey: 1
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
                    body: "Czas na szklankę wody!",
                    icon: "https://cdn-icons-png.flaticon.com/512/824/824239.png"
                });
            }
        }
    }
    
    // Request notification permission
    function requestNotificationPermission() {
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Notification permission granted");
                    // Subscribe to push notifications if permission is granted
                    subscribeToPushNotifications();
                } else {
                    console.log("Notification permission denied");
                }
            });
        }
    }
    
    // Subscribe to push notifications
    function subscribeToPushNotifications() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready
                .then(registration => {
                    // Check if we already have a subscription
                    return registration.pushManager.getSubscription()
                        .then(subscription => {
                            if (subscription) {
                                return subscription;
                            }
                            
                            // Create a new subscription
                            return registration.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: urlBase64ToUint8Array(
                                    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
                                )
                            });
                        });
                })
                .then(subscription => {
                    console.log('User is subscribed to push notifications:', subscription);
                    // Here you would typically send the subscription to your server
                    // saveSubscription(subscription);
                })
                .catch(error => {
                    console.error('Failed to subscribe to push notifications:', error);
                });
        }
    }
    
    // Convert base64 to Uint8Array for applicationServerKey
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
            
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    // Initialize app
    init();
    
    // Setup tabs event listeners for stats section
    function setupTabsEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // Set active tab button
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show active tab content
                tabContents.forEach(content => {
                    if (content.id === tabId) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
                
                // Update charts when switching to weekly tab
                if (tabId === 'weekly-tab' && window.waterCharts && window.waterCharts.updateCharts) {
                    window.waterCharts.updateCharts();
                }
            });
        });
    }
    
    // Expose functions to global scope for use in other modules
    window.isInActiveHours = isInActiveHours;
});