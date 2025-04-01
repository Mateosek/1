// Charts Module for Water Reminder App
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const weeklyChartCanvas = document.getElementById('weekly-chart');
    const monthlyStatsContainer = document.getElementById('monthly-stats');
    const exportDataBtn = document.getElementById('export-data');
    
    // Initialize charts
    function initCharts() {
        // Load data from localStorage
        const waterData = loadWaterData();
        
        // Render weekly chart if canvas exists
        if (weeklyChartCanvas) {
            renderWeeklyChart(waterData);
        }
        
        // Render monthly stats if container exists
        if (monthlyStatsContainer) {
            renderMonthlyStats(waterData);
        }
        
        // Setup event listeners
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', exportData);
        }
    }
    
    // Load water data from localStorage
    function loadWaterData() {
        // Get all entries from localStorage
        const savedState = localStorage.getItem('waterReminderState');
        if (!savedState) return { weeklyData: [], monthlyData: [] };
        
        const state = JSON.parse(savedState);
        const entries = state.entries || [];
        
        // Process data for weekly chart
        const weeklyData = processWeeklyData(entries);
        
        // Process data for monthly stats
        const monthlyData = processMonthlyData(entries);
        
        return {
            weeklyData,
            monthlyData
        };
    }
    
    // Process entries for weekly chart
    function processWeeklyData(entries) {
        // Get dates for the last 7 days
        const dates = [];
        const amounts = [];
        const goalAmounts = [];
        const dayObjects = [];
        
        // Get daily goal from localStorage
        const savedState = localStorage.getItem('waterReminderState');
        const dailyGoal = savedState ? JSON.parse(savedState).dailyGoal : 2000;
        
        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculate data for the last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            // Format date as string (e.g., "Mon", "Tue", etc.)
            const dateStr = date.toLocaleDateString('pl-PL', { weekday: 'short' });
            const fullDateStr = date.toLocaleDateString('pl-PL');
            dates.push(dateStr);
            
            // Calculate total amount for this day
            const dayStart = new Date(date).getTime();
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            const dayEndTime = dayEnd.getTime();
            
            // Filter entries for this day
            const dayEntries = entries.filter(entry => {
                const entryTime = entry.timestamp;
                return entryTime >= dayStart && entryTime <= dayEndTime;
            });
            
            // Sum up amounts
            const totalAmount = dayEntries.reduce((sum, entry) => sum + entry.amount, 0);
            amounts.push(totalAmount);
            
            // Add daily goal for comparison
            goalAmounts.push(dailyGoal);
            
            // Store day data for additional stats
            dayObjects.push({
                date: dateStr,
                fullDate: fullDateStr,
                amount: totalAmount,
                goalAchieved: totalAmount >= dailyGoal,
                percentage: dailyGoal > 0 ? Math.round((totalAmount / dailyGoal) * 100) : 0,
                entries: dayEntries.length,
                timestamp: date.getTime() // Dodajemy timestamp dla łatwiejszego porównywania dat
            });
        }
        
        // Calculate additional weekly stats
        const currentWeekTotal = amounts.reduce((sum, amount) => sum + amount, 0);
        const averageDaily = Math.round(currentWeekTotal / 7);
        
        // Find best and worst days
        const daysWithEntries = dayObjects.filter(day => day.amount > 0);
        let bestDay = { day: 'Brak danych', amount: 0 };
        let worstDay = { day: 'Brak danych', amount: Infinity };
        
        if (daysWithEntries.length > 0) {
            const maxAmount = Math.max(...daysWithEntries.map(day => day.amount));
            const minAmount = Math.min(...daysWithEntries.map(day => day.amount));
            
            const bestDayObj = daysWithEntries.find(day => day.amount === maxAmount);
            const worstDayObj = daysWithEntries.find(day => day.amount === minAmount);
            
            if (bestDayObj) {
                bestDay = { day: bestDayObj.date, amount: bestDayObj.amount };
            }
            
            if (worstDayObj) {
                worstDay = { day: worstDayObj.date, amount: worstDayObj.amount };
            }
        } else {
            worstDay.amount = 0; // Reset to 0 if no entries
        }
        
        // Calculate week-over-week change
        // Get previous week's data
        const previousWeekTotal = calculatePreviousWeekTotal(entries);
        const weeklyChange = previousWeekTotal > 0 ? 
            Math.round(((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100) : 0;
        
        // Count days where goal was achieved
        const daysGoalAchieved = dayObjects.filter(day => day.goalAchieved).length;
        
        // Calculate current streak (consecutive days with goal achieved)
        const currentStreak = calculateCurrentStreak(entries, dailyGoal);
        
        // Calculate best streak (longest consecutive days with goal achieved)
        const bestStreak = calculateBestStreak(entries, dailyGoal);
        
        // Calculate average percentage of goal achievement
        const avgGoalPercentage = dayObjects.reduce((sum, day) => sum + day.percentage, 0) / 7;
        
        return {
            dates,
            amounts,
            goalAmounts,
            currentWeekTotal,
            previousWeekTotal,
            weeklyChange,
            averageDaily,
            bestDay,
            worstDay,
            daysGoalAchieved,
            dayObjects,
            currentStreak,
            bestStreak,
            avgGoalPercentage: Math.round(avgGoalPercentage)
        };
    }
    
    // Helper function to calculate previous week's total
    function calculatePreviousWeekTotal(entries) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let total = 0;
        
        // Calculate data for the previous 7 days (days 7-13 from today)
        for (let i = 13; i >= 7; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            // Calculate total amount for this day
            const dayStart = new Date(date).getTime();
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            const dayEndTime = dayEnd.getTime();
            
            // Filter entries for this day
            const dayEntries = entries.filter(entry => {
                const entryTime = entry.timestamp;
                return entryTime >= dayStart && entryTime <= dayEndTime;
            });
            
            // Sum up amounts
            const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.amount, 0);
            total += dayTotal;
        }
        
        return total;
    }
    
    // Helper function to calculate current streak (consecutive days with goal achieved)
    function calculateCurrentStreak(entries, dailyGoal) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let streak = 0;
        let currentDate = new Date(today);
        let streakBroken = false;
        
        // Check up to 30 days back to find the current streak
        for (let i = 0; i < 30 && !streakBroken; i++) {
            // Calculate day boundaries
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayStartTime = dayStart.getTime();
            
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            const dayEndTime = dayEnd.getTime();
            
            // Filter entries for this day
            const dayEntries = entries.filter(entry => {
                const entryTime = entry.timestamp;
                return entryTime >= dayStartTime && entryTime <= dayEndTime;
            });
            
            // Calculate total amount for this day
            const totalAmount = dayEntries.reduce((sum, entry) => sum + entry.amount, 0);
            
            // Check if goal was achieved
            if (totalAmount >= dailyGoal) {
                streak++;
            } else {
                // If today's goal wasn't achieved, don't count it as breaking the streak
                if (i === 0 && dayEntries.length > 0) {
                    // Today has entries but goal not achieved - don't break streak yet
                } else {
                    streakBroken = true;
                }
            }
            
            // Move to previous day
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        return streak;
    }
    
    // Helper function to calculate best streak (longest consecutive days with goal achieved)
    function calculateBestStreak(entries, dailyGoal) {
        // Get earliest entry date
        if (entries.length === 0) return 0;
        
        const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);
        const earliestDate = new Date(sortedEntries[0].timestamp);
        earliestDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let currentStreak = 0;
        let bestStreak = 0;
        let currentDate = new Date(earliestDate);
        
        // Check each day from earliest entry to today
        while (currentDate <= today) {
            // Calculate day boundaries
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayStartTime = dayStart.getTime();
            
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            const dayEndTime = dayEnd.getTime();
            
            // Filter entries for this day
            const dayEntries = entries.filter(entry => {
                const entryTime = entry.timestamp;
                return entryTime >= dayStartTime && entryTime <= dayEndTime;
            });
            
            // Calculate total amount for this day
            const totalAmount = dayEntries.reduce((sum, entry) => sum + entry.amount, 0);
            
            // Check if goal was achieved
            if (totalAmount >= dailyGoal) {
                currentStreak++;
                bestStreak = Math.max(bestStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return bestStreak;
    }
    
    // Process entries for monthly stats
    function processMonthlyData(entries) {
        // Get current month
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Filter entries for current month
        const monthEntries = entries.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });
        
        // Calculate total amount
        const totalAmount = monthEntries.reduce((sum, entry) => sum + entry.amount, 0);
        
        // Calculate average daily amount
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const currentDay = Math.min(today.getDate(), daysInMonth);
        const averageAmount = currentDay > 0 ? Math.round(totalAmount / currentDay) : 0;
        
        // Calculate daily amounts and create day objects for detailed stats
        const dailyAmounts = {};
        const dayObjects = [];
        
        // Get daily goal from localStorage
        const savedState = localStorage.getItem('waterReminderState');
        const dailyGoal = savedState ? JSON.parse(savedState).dailyGoal : 2000;
        
        // Initialize day objects for each day of the month up to today
        for (let day = 1; day <= currentDay; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateStr = date.toLocaleDateString();
            dailyAmounts[dateStr] = 0;
            
            dayObjects.push({
                date: dateStr,
                amount: 0,
                goalAchieved: false,
                percentage: 0,
                entries: 0,
                timestamp: date.getTime()
            });
        }
        
        // Fill in actual data
        monthEntries.forEach(entry => {
            const entryDate = new Date(entry.timestamp);
            const dateStr = entryDate.toLocaleDateString();
            dailyAmounts[dateStr] = (dailyAmounts[dateStr] || 0) + entry.amount;
            
            // Update day object
            const dayObj = dayObjects.find(d => d.date === dateStr);
            if (dayObj) {
                dayObj.amount += entry.amount;
                dayObj.entries++;
                dayObj.goalAchieved = dayObj.amount >= dailyGoal;
                dayObj.percentage = dailyGoal > 0 ? Math.round((dayObj.amount / dailyGoal) * 100) : 0;
            }
        });
        
        let bestDay = { date: null, amount: 0 };
        let worstDay = { date: null, amount: Infinity };
        let daysAboveGoal = 0;
        let daysWithEntries = 0;
        
        // Process daily amounts
        for (const [date, amount] of Object.entries(dailyAmounts)) {
            if (amount > 0) {
                daysWithEntries++;
                
                // Find best day
                if (amount > bestDay.amount) {
                    bestDay = { date, amount };
                }
                
                // Find worst day (only count days with entries)
                if (amount < worstDay.amount) {
                    worstDay = { date, amount };
                }
                
                // Count days above goal
                if (amount >= dailyGoal) {
                    daysAboveGoal++;
                }
            }
        }
        
        // If no entries, set worst day to null
        if (worstDay.amount === Infinity) {
            worstDay = { date: null, amount: 0 };
        }
        
        // Calculate goal achievement percentage
        const goalAchievementRate = daysWithEntries > 0 ? Math.round((daysAboveGoal / daysWithEntries) * 100) : 0;
        
        // Calculate trend (comparing first half with second half of the month)
        let trend = 0;
        if (daysWithEntries >= 4) { // Only calculate trend if we have enough data
            const sortedDates = Object.keys(dailyAmounts).sort((a, b) => new Date(a) - new Date(b));
            const midPoint = Math.floor(sortedDates.length / 2);
            
            const firstHalfTotal = sortedDates.slice(0, midPoint).reduce((sum, date) => sum + dailyAmounts[date], 0);
            const secondHalfTotal = sortedDates.slice(midPoint).reduce((sum, date) => sum + dailyAmounts[date], 0);
            
            const firstHalfAvg = firstHalfTotal / midPoint;
            const secondHalfAvg = secondHalfTotal / (sortedDates.length - midPoint);
            
            trend = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
        }
        
        // Calculate longest streak in the month
        let currentStreak = 0;
        let longestStreak = 0;
        
        // Sort day objects by date
        const sortedDayObjects = [...dayObjects].sort((a, b) => a.timestamp - b.timestamp);
        
        // Calculate streaks
        sortedDayObjects.forEach(day => {
            if (day.goalAchieved) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        });
        
        // Calculate previous month data for comparison
        const previousMonthData = calculatePreviousMonthData(entries, currentMonth, currentYear, dailyGoal);
        
        // Calculate month-over-month change
        const monthlyChange = previousMonthData.totalAmount > 0 ?
            Math.round(((totalAmount - previousMonthData.totalAmount) / previousMonthData.totalAmount) * 100) : 0;
        
        // Calculate weekly averages within the month
        const weeklyAverages = calculateWeeklyAveragesInMonth(dayObjects);
        
        // Calculate average percentage of goal achievement
        const daysWithEntriesObjects = dayObjects.filter(day => day.entries > 0);
        const avgGoalPercentage = daysWithEntriesObjects.length > 0 ?
            Math.round(daysWithEntriesObjects.reduce((sum, day) => sum + day.percentage, 0) / daysWithEntriesObjects.length) : 0;
        
        return {
            totalAmount,
            averageAmount,
            bestDay,
            worstDay,
            daysAboveGoal,
            daysWithEntries,
            goalAchievementRate,
            trend,
            longestStreak,
            monthlyChange,
            previousMonthTotal: previousMonthData.totalAmount,
            weeklyAverages,
            avgGoalPercentage,
            dayObjects: sortedDayObjects
        };
    }
    
    // Helper function to calculate previous month's data
    function calculatePreviousMonthData(entries, currentMonth, currentYear, dailyGoal) {
        // Calculate previous month and year
        let previousMonth = currentMonth - 1;
        let previousYear = currentYear;
        
        if (previousMonth < 0) {
            previousMonth = 11; // December
            previousYear--;
        }
        
        // Filter entries for previous month
        const previousMonthEntries = entries.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate.getMonth() === previousMonth && entryDate.getFullYear() === previousYear;
        });
        
        // Calculate total amount
        const totalAmount = previousMonthEntries.reduce((sum, entry) => sum + entry.amount, 0);
        
        // Calculate days with entries and days above goal
        const dailyAmounts = {};
        previousMonthEntries.forEach(entry => {
            const entryDate = new Date(entry.timestamp).toLocaleDateString();
            dailyAmounts[entryDate] = (dailyAmounts[entryDate] || 0) + entry.amount;
        });
        
        let daysAboveGoal = 0;
        let daysWithEntries = 0;
        
        for (const [date, amount] of Object.entries(dailyAmounts)) {
            daysWithEntries++;
            
            // Find best day
            if (amount > bestDay.amount) {
                bestDay = { date, amount };
            }
            
            // Find worst day (only count days with entries)
            if (amount < worstDay.amount) {
                worstDay = { date, amount };
            }
            
            // Count days above goal
            if (amount >= dailyGoal) {
                daysAboveGoal++;
            }
        }
        
        // If no entries, set worst day to null
        if (worstDay.amount === Infinity) {
            worstDay = { date: null, amount: 0 };
        }
        
        // Calculate goal achievement percentage
        const goalAchievementRate = daysWithEntries > 0 ? Math.round((daysAboveGoal / daysWithEntries) * 100) : 0;
        
        // Calculate trend (comparing first half with second half of the month)
        let trend = 0;
        if (daysWithEntries >= 4) { // Only calculate trend if we have enough data
            const sortedDates = Object.keys(dailyAmounts).sort((a, b) => new Date(a) - new Date(b));
            const midPoint = Math.floor(sortedDates.length / 2);
            
            const firstHalfTotal = sortedDates.slice(0, midPoint).reduce((sum, date) => sum + dailyAmounts[date], 0);
            const secondHalfTotal = sortedDates.slice(midPoint).reduce((sum, date) => sum + dailyAmounts[date], 0);
            
            const firstHalfAvg = firstHalfTotal / midPoint;
            const secondHalfAvg = secondHalfTotal / (sortedDates.length - midPoint);
            
            trend = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
        }
        
        // Calculate longest streak in the month
        let currentStreak = 0;
        let longestStreak = 0;
        
        // Sort day objects by date
        const sortedDayObjects = [...dayObjects].sort((a, b) => a.timestamp - b.timestamp);
        
        // Calculate streaks
        sortedDayObjects.forEach(day => {
            if (day.goalAchieved) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        });
        
        // Calculate previous month data for comparison
        const previousMonthData = calculatePreviousMonthData(entries, currentMonth, currentYear, dailyGoal);
        
        // Calculate month-over-month change
        const monthlyChange = previousMonthData.totalAmount > 0 ?
            Math.round(((totalAmount - previousMonthData.totalAmount) / previousMonthData.totalAmount) * 100) : 0;
        
        // Calculate weekly averages within the month
        const weeklyAverages = calculateWeeklyAveragesInMonth(dayObjects);
        
        // Calculate average percentage of goal achievement
        const daysWithEntriesObjects = dayObjects.filter(day => day.entries > 0);
        const avgGoalPercentage = daysWithEntriesObjects.length > 0 ?
            Math.round(daysWithEntriesObjects.reduce((sum, day) => sum + day.percentage, 0) / daysWithEntriesObjects.length) : 0;
        
        return {
            totalAmount,
            averageAmount,
            bestDay,
            worstDay,
            daysAboveGoal,
            daysWithEntries,
            goalAchievementRate,
            trend,
            longestStreak,
            monthlyChange,
            previousMonthTotal: previousMonthData.totalAmount,
            weeklyAverages,
            avgGoalPercentage,
            dayObjects: sortedDayObjects
        };
    }
    
    // Helper function to calculate previous month's data
    function calculatePreviousMonthData(entries, currentMonth, currentYear, dailyGoal) {
        // Calculate previous month and year
        let previousMonth = currentMonth - 1;
        let previousYear = currentYear;
        
        if (previousMonth < 0) {
            previousMonth = 11; // December
            previousYear--;
        }
        
        // Filter entries for previous month
        const previousMonthEntries = entries.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate.getMonth() === previousMonth && entryDate.getFullYear() === previousYear;
        });
        
        // Calculate total amount
        const totalAmount = previousMonthEntries.reduce((sum, entry) => sum + entry.amount, 0);
        
        // Calculate days with entries and days above goal
        const dailyAmounts = {};
        previousMonthEntries.forEach(entry => {
            const entryDate = new Date(entry.timestamp).toLocaleDateString();
            dailyAmounts[entryDate] = (dailyAmounts[entryDate] || 0) + entry.amount;
        });
        
        let daysAboveGoal = 0;
        let daysWithEntries = 0;
        
        for (const [date, amount] of Object.entries(dailyAmounts)) {
            days
    
    // Render weekly chart
    function renderWeeklyChart(data) {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }
        
        // Destroy existing chart if it exists
        if (window.weeklyWaterChart) {
            window.weeklyWaterChart.destroy();
        }
        
        // Get color for bars based on goal achievement
        const barColors = data.weeklyData.dayObjects.map(day => {
            return day.goalAchieved ? 'rgba(76, 175, 80, 0.7)' : 'rgba(74, 144, 226, 0.7)';
        });
        
        const barBorderColors = data.weeklyData.dayObjects.map(day => {
            return day.goalAchieved ? 'rgba(76, 175, 80, 1)' : 'rgba(74, 144, 226, 1)';
        });
        
        // Create new chart
        const ctx = weeklyChartCanvas.getContext('2d');
        window.weeklyWaterChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.weeklyData.dates,
                datasets: [
                    {
                        label: 'Spożycie wody (ml)',
                        data: data.weeklyData.amounts,
                        backgroundColor: barColors,
                        borderColor: barBorderColors,
                        borderWidth: 1
                    },
                    {
                        label: 'Cel dzienny (ml)',
                        data: data.weeklyData.goalAmounts,
                        type: 'line',
                        fill: false,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Ilość (ml)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Dzień tygodnia'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    const dayObj = data.weeklyData.dayObjects[context.dataIndex];
                                    const percentage = dayObj.percentage;
                                    return [
                                        context.dataset.label + ': ' + context.raw + ' ml',
                                        'Realizacja celu: ' + percentage + '%',
                                        'Liczba wpisów: ' + dayObj.entries
                                    ];
                                }
                                return context.dataset.label + ': ' + context.raw + ' ml';
                            }
                        }
                    }
                }
            }
        });
        
        // Render weekly stats
        renderWeeklyStats(data.weeklyData);
    }
    
    // Render monthly stats
    function renderMonthlyStats(data) {
        const { 
            totalAmount, 
            averageAmount, 
            bestDay, 
            worstDay, 
            daysAboveGoal, 
            daysWithEntries, 
            goalAchievementRate, 
            trend, 
            longestStreak, 
            monthlyChange, 
            previousMonthTotal, 
            weeklyAverages, 
            avgGoalPercentage 
        } = data.monthlyData;
        
        // Format best day date
        const bestDayFormatted = bestDay.date ? new Date(bestDay.date).toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long'
        }) : 'Brak danych';
        
        // Format worst day date
        const worstDayFormatted = worstDay.date ? new Date(worstDay.date).toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long'
        }) : 'Brak danych';
        
        // Format trend indicator
        const trendIndicator = trend > 0 ? 
            `<span class="change-positive">+${trend}%</span>` : 
            (trend < 0 ? 
                `<span class="change-negative">${trend}%</span>` : 
                `<span class="change-neutral">0%</span>`);
        
        // Format monthly change indicator
        const monthlyChangeIndicator = monthlyChange > 0 ? 
            `<span class="change-positive">+${monthlyChange}%</span>` : 
            (monthlyChange < 0 ? 
                `<span class="change-negative">${monthlyChange}%</span>` : 
                `<span class="change-neutral">0%</span>`);
        
        // Get current month name
        const currentMonthName = new Date().toLocaleDateString('pl-PL', { month: 'long' });
        
        // Get previous month name
        const prevMonth = new Date();
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        const prevMonthName = prevMonth.toLocaleDateString('pl-PL', { month: 'long' });
        
        // Create weekly averages HTML
        let weeklyAveragesHTML = '';
        if (weeklyAverages && weeklyAverages.length > 0) {
            weeklyAveragesHTML = `
                <div class="weekly-averages">
                    <h3>Średnie tygodniowe</h3>
                    <div class="weekly-averages-grid">
            `;
            
            weeklyAverages.forEach(week => {
                weeklyAveragesHTML += `
                    <div class="week-item">
                        <div class="week-header">Tydzień ${week.week}</div>
                        <div class="week-value">${week.avgAmount} ml</div>
                        <div class="week-info">Dni z celem: ${week.daysAboveGoal}/${week.daysWithEntries}</div>
                    </div>
                `;
            });
            
            weeklyAveragesHTML += `
                    </div>
                </div>
            `;
        }
        
        // Create stats HTML
        monthlyStatsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${totalAmount}</div>
                <div class="stat-label">Całkowita ilość (ml)</div>
                <div class="stat-comparison">vs ${prevMonthName}: ${monthlyChangeIndicator}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${averageAmount}</div>
                <div class="stat-label">Średnio dziennie (ml)</div>
                <div class="stat-comparison">Trend: ${trendIndicator}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${bestDay.amount}</div>
                <div class="stat-label">Najlepszy dzień: ${bestDayFormatted}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${worstDay.amount}</div>
                <div class="stat-label">Najgorszy dzień: ${worstDayFormatted}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${goalAchievementRate}%</div>
                <div class="stat-label">Realizacja celu</div>
                <div class="stat-comparison">${daysAboveGoal} z ${daysWithEntries} dni</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${longestStreak}</div>
                <div class="stat-label">Najdłuższa seria</div>
                <div class="stat-comparison">Dni z osiągniętym celem</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${avgGoalPercentage}%</div>
                <div class="stat-label">Średnia realizacja celu</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${previousMonthTotal}</div>
                <div class="stat-label">Poprzedni miesiąc (ml)</div>
                <div class="stat-comparison">${prevMonthName}</div>
            </div>
        `;
        
        // Add weekly averages section
        if (weeklyAveragesHTML) {
            monthlyStatsContainer.insertAdjacentHTML('afterend', weeklyAveragesHTML);
        }
    }
    }
    
    // Export data as CSV
    function exportData() {
        // Get data from localStorage
        const savedState = localStorage.getItem('waterReminderState');
        if (!savedState) {
            alert('Brak danych do eksportu');
            return;
        }
        
        const state = JSON.parse(savedState);
        const entries = state.entries || [];
        
        // Create CSV content
        let csvContent = 'data:text/csv;charset=utf-8,Data,Godzina,Ilość (ml)\n';
        
        entries.forEach(entry => {
            const date = new Date(entry.timestamp);
            const dateStr = date.toLocaleDateString('pl-PL');
            const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            
            csvContent += `${dateStr},${timeStr},${entry.amount}\n`;
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'water_data.csv');
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
    }
    
    // Render weekly statistics
    function renderWeeklyStats(stats) {
        // Create or get weekly stats container
        let weeklyStatsContainer = document.getElementById('weekly-stats');
        
        if (!weeklyStatsContainer) {
            weeklyStatsContainer = document.createElement('div');
            weeklyStatsContainer.id = 'weekly-stats';
            weeklyStatsContainer.className = 'stats-grid';
            
            // Find the chart container and insert stats after it
            const chartContainer = document.querySelector('#weekly-tab .chart-container');
            if (chartContainer) {
                chartContainer.insertAdjacentElement('afterend', weeklyStatsContainer);
            } else {
                document.getElementById('weekly-tab').appendChild(weeklyStatsContainer);
            }
        }
        
        // Format change indicator
        const changeIndicator = stats.weeklyChange > 0 ? 
            `<span class="change-positive">+${stats.weeklyChange}%</span>` : 
            (stats.weeklyChange < 0 ? 
                `<span class="change-negative">${stats.weeklyChange}%</span>` : 
                `<span class="change-neutral">0%</span>`);
        
        // Create stats HTML
        weeklyStatsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${stats.currentWeekTotal}</div>
                <div class="stat-label">Całkowita ilość (ml)</div>
                <div class="stat-comparison">vs poprzedni tydzień: ${changeIndicator}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.averageDaily}</div>
                <div class="stat-label">Średnio dziennie (ml)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.bestDay.amount}</div>
                <div class="stat-label">Najlepszy dzień: ${stats.bestDay.day}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.worstDay.amount}</div>
                <div class="stat-label">Najgorszy dzień: ${stats.worstDay.day}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.daysGoalAchieved}</div>
                <div class="stat-label">Dni z osiągniętym celem</div>
                <div class="stat-comparison">z 7 dni tygodnia</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${Math.round(stats.daysGoalAchieved / 7 * 100)}%</div>
                <div class="stat-label">Skuteczność tygodniowa</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.currentStreak}</div>
                <div class="stat-label">Aktualna seria</div>
                <div class="stat-comparison">Dni z osiągniętym celem</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.bestStreak}</div>
                <div class="stat-label">Najlepsza seria</div>
                <div class="stat-comparison">Dni z osiągniętym celem</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.avgGoalPercentage}%</div>
                <div class="stat-label">Średnia realizacja celu</div>
            </div>
        `;
    }
    }

    // Update charts when water data changes
    function updateCharts() {
        const waterData = loadWaterData();
        
        if (weeklyChartCanvas) {
            renderWeeklyChart(waterData);
        }
        
        if (monthlyStatsContainer) {
            renderMonthlyStats(waterData);
        }
    }
    
    // Initialize charts
    initCharts();
    
    // Expose functions to global scope
    window.waterCharts = {
        updateCharts: updateCharts
    };
});