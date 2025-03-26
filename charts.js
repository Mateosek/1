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
        }
        
        return {
            dates,
            amounts,
            goalAmounts
        };
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
        
        // Calculate best day
        const dailyAmounts = {};
        monthEntries.forEach(entry => {
            const entryDate = new Date(entry.timestamp).toLocaleDateString();
            dailyAmounts[entryDate] = (dailyAmounts[entryDate] || 0) + entry.amount;
        });
        
        let bestDay = { date: null, amount: 0 };
        for (const [date, amount] of Object.entries(dailyAmounts)) {
            if (amount > bestDay.amount) {
                bestDay = { date, amount };
            }
        }
        
        return {
            totalAmount,
            averageAmount,
            bestDay
        };
    }
    
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
                        backgroundColor: 'rgba(74, 144, 226, 0.7)',
                        borderColor: 'rgba(74, 144, 226, 1)',
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
                                return context.dataset.label + ': ' + context.raw + ' ml';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Render monthly stats
    function renderMonthlyStats(data) {
        const { totalAmount, averageAmount, bestDay } = data.monthlyData;
        
        // Format best day date
        const bestDayFormatted = bestDay.date ? new Date(bestDay.date).toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long'
        }) : 'Brak danych';
        
        // Create stats HTML
        monthlyStatsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${totalAmount}</div>
                <div class="stat-label">Całkowita ilość (ml)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${averageAmount}</div>
                <div class="stat-label">Średnio dziennie (ml)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${bestDay.amount}</div>
                <div class="stat-label">Najlepszy dzień: ${bestDayFormatted}</div>
            </div>
        `;
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
        `;
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