document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const weightInput = document.getElementById('weight');
    const heightInput = document.getElementById('height');
    const ageInput = document.getElementById('age');
    const genderSelect = document.getElementById('gender');
    const activitySelect = document.getElementById('activity');
    const caloriesInput = document.getElementById('calories');
    const dateInput = document.getElementById('date');
    const calculateBtn = document.getElementById('calculate-btn');
    
    const bmiValue = document.getElementById('bmi-value');
    const bmiCategory = document.getElementById('bmi-category');
    const calorieValue = document.getElementById('calorie-value');
    const calorieBalance = document.getElementById('calorie-balance');
    
    const historyData = document.getElementById('history-data');
    const bmiChartCanvas = document.getElementById('bmi-chart');
    
    // Set default date to today
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dateInput.value = formattedDate;
    
    // Chart initialization
    let bmiChart;
    initChart();
    
    // Load history from localStorage
    let history = loadHistory();
    updateHistoryTable();
    updateChart();
    
    // Event listeners
    calculateBtn.addEventListener('click', calculateAndSave);
    
    // Functions
    function calculateAndSave() {
        // Validate inputs
        if (!validateInputs()) {
            return;
        }
        
        // Get input values
        const weight = parseFloat(weightInput.value);
        const height = parseFloat(heightInput.value);
        const age = parseInt(ageInput.value);
        const gender = genderSelect.value;
        const activity = parseFloat(activitySelect.value);
        const calories = parseInt(caloriesInput.value);
        const date = dateInput.value;
        
        // Calculate BMI
        const bmi = calculateBMI(weight, height);
        const category = getBMICategory(bmi);
        
        // Calculate BMR and daily calorie needs
        const bmr = calculateBMR(weight, height, age, gender);
        const dailyCalories = calculateDailyCalories(bmr, activity);
        
        // Calculate calorie balance
        const balance = calories - dailyCalories;
        const balanceStatus = getCalorieBalanceStatus(balance);
        
        // Update UI
        bmiValue.textContent = bmi.toFixed(2);
        bmiCategory.textContent = category.text;
        bmiCategory.className = category.class;
        
        calorieValue.textContent = dailyCalories.toFixed(0) + ' kcal';
        calorieBalance.textContent = balanceStatus.text;
        calorieBalance.className = balanceStatus.class;
        
        // Save to history
        const entry = {
            date: date,
            weight: weight,
            height: height,
            bmi: bmi,
            category: category.text,
            bmr: bmr,
            dailyCalories: dailyCalories,
            consumedCalories: calories,
            balance: balance,
            balanceStatus: balanceStatus.text
        };
        
        history.push(entry);
        saveHistory(history);
        
        // Update history table and chart
        updateHistoryTable();
        updateChart();
    }
    
    function validateInputs() {
        // Check if all required fields are filled
        if (!weightInput.value || !heightInput.value || !ageInput.value || 
            !caloriesInput.value || !dateInput.value) {
            alert('Proszę wypełnić wszystkie pola!');
            return false;
        }
        
        return true;
    }
    
    function calculateBMI(weight, height) {
        // BMI = weight(kg) / (height(m))²
        const heightInMeters = height / 100;
        return weight / (heightInMeters * heightInMeters);
    }
    
    function getBMICategory(bmi) {
        if (bmi < 18.5) {
            return { text: 'Niedowaga', class: 'underweight' };
        } else if (bmi < 25) {
            return { text: 'Prawidłowa waga', class: 'normal' };
        } else if (bmi < 30) {
            return { text: 'Nadwaga', class: 'overweight' };
        } else {
            return { text: 'Otyłość', class: 'obese' };
        }
    }
    
    function calculateBMR(weight, height, age, gender) {
        // Harris-Benedict Equation
        if (gender === 'male') {
            return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
        } else {
            return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        }
    }
    
    function calculateDailyCalories(bmr, activityLevel) {
        return bmr * activityLevel;
    }
    
    function getCalorieBalanceStatus(balance) {
        if (balance < -200) {
            return { text: 'Deficyt kaloryczny', class: 'deficit' };
        } else if (balance > 200) {
            return { text: 'Nadwyżka kaloryczna', class: 'surplus' };
        } else {
            return { text: 'Bilans zrównoważony', class: 'maintenance' };
        }
    }
    
    function loadHistory() {
        const savedHistory = localStorage.getItem('bmiCalorieHistory');
        return savedHistory ? JSON.parse(savedHistory) : [];
    }
    
    function saveHistory(history) {
        localStorage.setItem('bmiCalorieHistory', JSON.stringify(history));
    }
    
    function updateHistoryTable() {
        // Clear existing rows
        historyData.innerHTML = '';
        
        // Sort history by date (newest first)
        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add rows for each entry
        sortedHistory.forEach(entry => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(entry.date);
            
            const bmiCell = document.createElement('td');
            bmiCell.textContent = entry.bmi.toFixed(2);
            bmiCell.classList.add(getBMICategory(entry.bmi).class);
            
            const calorieCell = document.createElement('td');
            calorieCell.textContent = `${entry.consumedCalories} / ${entry.dailyCalories.toFixed(0)}`;
            
            const balanceCell = document.createElement('td');
            balanceCell.textContent = entry.balanceStatus;
            balanceCell.classList.add(getCalorieBalanceStatus(entry.balance).class);
            
            row.appendChild(dateCell);
            row.appendChild(bmiCell);
            row.appendChild(calorieCell);
            row.appendChild(balanceCell);
            
            historyData.appendChild(row);
        });
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pl-PL');
    }
    
    function initChart() {
        const ctx = bmiChartCanvas.getContext('2d');
        bmiChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'BMI',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 15,
                        max: 35,
                        ticks: {
                            stepSize: 5
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const index = context.dataIndex;
                                const entry = history[index];
                                if (entry) {
                                    return [
                                        `BMI: ${entry.bmi.toFixed(2)} (${entry.category})`,
                                        `Waga: ${entry.weight} kg`,
                                        `Wzrost: ${entry.height} cm`
                                    ];
                                }
                                return `BMI: ${context.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function updateChart() {
        if (history.length === 0) return;
        
        // Sort history by date (oldest first for chart)
        const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Extract dates and BMI values
        const labels = sortedHistory.map(entry => formatDate(entry.date));
        const data = sortedHistory.map(entry => entry.bmi);
        
        // Update chart data
        bmiChart.data.labels = labels;
        bmiChart.data.datasets[0].data = data;
        
        // Update chart
        bmiChart.update();
    }
});