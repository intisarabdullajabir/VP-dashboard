// ==========================================
// DPN VIBRATION PERCEPTION ASSESSMENT
// ==========================================

// ==========================================
// 1. WEBSOCKET SETUP FOR ESP32
// ==========================================

// Replace with your ESP32 IP address
const ESP32_IP = "172.20.10.4"; 
let socket;

function connectESP32() {
    socket = new WebSocket(`ws://${ESP32_IP}:81/`);

    socket.onopen = () => {
        console.log("Connected to ESP32 WebSocket!");
        
        // Update connection dot UI on welcome screen
        const statusDot = document.querySelector(".status-dot");
        const statusContainer = document.querySelector(".connection-status");
        if (statusDot) statusDot.style.backgroundColor = "#4CAF50"; // Green
        if (statusContainer) statusContainer.style.color = "#ffffff";
    };

    socket.onmessage = (event) => {
        console.log("ESP32 Response:", event.data);
    };

    socket.onclose = () => {
        console.warn("ESP32 Disconnected. Retrying in 3s...");
        const statusDot = document.querySelector(".status-dot");
        if (statusDot) statusDot.style.backgroundColor = "#ff3d60"; // Red
        
        // Auto reconnect
        setTimeout(connectESP32, 3000);
    };

    socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
    };
}

// Send command to trigger vibration on ESP32
function sendToESP32(motor, vibration) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const command = JSON.stringify({
            motor: motor,
            vibrate: vibration
        });
        socket.send(command);
        console.log("Sent command to ESP32:", command);
    } else {
        console.error("ESP32 WebSocket not connected!");
        const testStatus = document.getElementById("test-status");
        if (testStatus) testStatus.textContent = "Device communication error";
    }
}

// Tell ESP32 to immediately stop vibrating when a button is clicked
function sendStopToESP32() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send("STOP");
        console.log("Sent STOP command to ESP32");
    }
}

// Initialize connection when app starts
connectESP32();


// ==========================================
// 18-TRIAL ASSESSMENT SEQUENCE
// ==========================================
const trials = [
    { motor: "M3", location: "3rd Metatarsal", vibration: true },
    { motor: "M1", location: "Great Toe", vibration: true },
    { motor: "M6", location: "Heel", vibration: true },

    { motor: "M4", location: "5th Metatarsal", vibration: true },
    { motor: "M2", location: "1st Metatarsal", vibration: true },
    { motor: "M5", location: "Instep", vibration: true },

    { motor: "M1", location: "Great Toe", vibration: true },
    { motor: "M4", location: "5th Metatarsal", vibration: true },
    { motor: "M2", location: "1st Metatarsal", vibration: true },

    { motor: "M6", location: "Heel", vibration: true },
    { motor: "M5", location: "Instep", vibration: true },
    { motor: "M3", location: "3rd Metatarsal", vibration: true },

    { motor: "M2", location: "1st Metatarsal", vibration: true },
    { motor: "M5", location: "Instep", vibration: true },
    { motor: "M1", location: "Great Toe", vibration: true },

    { motor: "M3", location: "3rd Metatarsal", vibration: true },
    { motor: "M6", location: "Heel", vibration: true },
    { motor: "M4", location: "5th Metatarsal", vibration: true }
];

const pointNames = {
    M1: "Great Toe",
    M2: "1st Metatarsal",
    M3: "3rd Metatarsal",
    M4: "5th Metatarsal",
    M5: "Instep",
    M6: "Heel"
};

let responses = [];
let currentTrial = 0;

// ==========================================
// GET HTML ELEMENTS
// ==========================================
const welcomeScreen = document.getElementById("welcome-screen");
const testScreen = document.getElementById("test-screen");
const processingScreen = document.getElementById("processing-screen");
const resultsScreen = document.getElementById("results-screen");

const startBtn = document.getElementById("start-btn");
const yesBtn = document.getElementById("yes-btn");
const noBtn = document.getElementById("no-btn");
const newTestBtn = document.getElementById("new-test-btn");

const trialCounter = document.getElementById("trial-counter");
const progressBar = document.getElementById("progress-bar");
const testStatus = document.getElementById("test-status");

// ==========================================
// START ASSESSMENT
// ==========================================
startBtn.onclick = function () {
    responses = [];
    currentTrial = 0;

    welcomeScreen.classList.remove("active");
    resultsScreen.classList.remove("active");
    processingScreen.classList.remove("active");
    testScreen.classList.add("active");

    progressBar.style.width = "0%";
    startTrial();
};

// ==========================================
// START TRIAL
// ==========================================
function startTrial() {
    const trial = trials[currentTrial];
    const trialNumber = currentTrial + 1;

    trialCounter.textContent = String(trialNumber).padStart(2, "0") + " / 18";
    progressBar.style.width = ((trialNumber / 18) * 100) + "%";
    testStatus.textContent = "Waiting for response";

    console.log(
        "Trial:", trialNumber,
        "| Motor:", trial.motor,
        "| Stimulus:", trial.vibration ? "APPLIED" : "NOT APPLIED"
    );

    // TRIGGER MOTOR ON ESP32 FOR CURRENT TRIAL
    sendToESP32(trial.motor, trial.vibration);
}

// ==========================================
// YES / NO BUTTON HANDLERS
// ==========================================
yesBtn.onclick = function () { recordResponse(true); };
noBtn.onclick = function () { recordResponse(false); };

// ==========================================
// RECORD PATIENT RESPONSE
// ==========================================
function recordResponse(patientResponse) {
    // 1. Immediately turn off the active motor on ESP32
    sendStopToESP32();

    const trial = trials[currentTrial];
    const correct = patientResponse === trial.vibration;

    responses.push({
        trialNumber: currentTrial + 1,
        motor: trial.motor,
        location: trial.location,
        vibration: trial.vibration,
        patientResponse: patientResponse,
        correct: correct
    });

    console.log("Patient:", patientResponse ? "YES" : "NO", "| Correct:", correct ? "YES" : "NO");

    testScreen.classList.remove("active");
    processingScreen.classList.add("active");

    setTimeout(function () {
        currentTrial++;
        processingScreen.classList.remove("active");

        if (currentTrial < trials.length) {
            testScreen.classList.add("active");
            startTrial();
        } else {
            resultsScreen.classList.add("active");
            calculateResults();
        }
    }, 400);
}

// ==========================================
// SCORING & RESULTS CALCULATIONS
// ==========================================
function getPointScore(motor) {
    return responses.filter(r => r.motor === motor && r.correct === true).length;
}

function getPointStatus(score) {
    if (score >= 2) return "PERCEPTION PRESENT";
    if (score === 1) return "REDUCED PERCEPTION";
    return "ABSENT PERCEPTION";
}

function calculateResults() {
    const scores = {
        M1: getPointScore("M1"),
        M2: getPointScore("M2"),
        M3: getPointScore("M3"),
        M4: getPointScore("M4"),
        M5: getPointScore("M5"),
        M6: getPointScore("M6")
    };

    const medialPoints = [scores.M1, scores.M2, scores.M3, scores.M5];
    const medialCount = medialPoints.filter(score => score >= 2).length;

    let medialResult = medialCount >= 3 ? "PERCEPTION PRESENT" : (medialCount >= 1 ? "REDUCED PERCEPTION" : "ABSENT PERCEPTION");
    const lateralScore = scores.M4;
    const lateralResult = getPointStatus(lateralScore);
    const tibialScore = scores.M6;
    const tibialResult = getPointStatus(tibialScore);

    document.getElementById("medial-score").textContent = medialCount + " / 4";
    document.getElementById("medial-result").textContent = medialResult;
    applyStatusClass(document.getElementById("medial-result"), medialResult);

    document.getElementById("lateral-score").textContent = lateralScore + " / 3";
    document.getElementById("lateral-result").textContent = lateralResult;
    applyStatusClass(document.getElementById("lateral-result"), lateralResult);

    document.getElementById("tibial-score").textContent = tibialScore + " / 3";
    document.getElementById("tibial-result").textContent = tibialResult;
    applyStatusClass(document.getElementById("tibial-result"), tibialResult);

    displayPointResults(scores);
    displayTrialResults();

    const nerveCount = [medialCount >= 2, lateralScore >= 2, tibialScore >= 2].filter(Boolean).length;
    let overallResult = nerveCount === 3 ? "PERCEPTION PRESENT" : (nerveCount >= 1 ? "REDUCED PERCEPTION" : "ABSENT PERCEPTION");

    const overallElement = document.getElementById("overall-result");
    overallElement.textContent = overallResult;
    applyStatusClass(overallElement, overallResult);

    document.getElementById("overall-summary").textContent = nerveCount + " of 3 nerve pathways demonstrate sufficient vibration perception.";
}

function displayPointResults(scores) {
    const container = document.getElementById("point-results");
    container.innerHTML = "";

    for (const motor of ["M1", "M2", "M3", "M4", "M5", "M6"]) {
        const score = scores[motor];
        const status = getPointStatus(score);
        let statusClass = score >= 2 ? "status-present" : (score === 1 ? "status-reduced" : "status-absent");

        const card = document.createElement("div");
        card.className = "point-card " + statusClass;
        card.innerHTML = `
            <div>
                <span class="point-code">${motor}</span>
                <h3>${pointNames[motor]}</h3>
            </div>
            <div class="point-score">
                <strong>${score}/3</strong>
                <span>${status}</span>
            </div>
        `;
        container.appendChild(card);
    }
}

function displayTrialResults() {
    const container = document.getElementById("trial-results");
    container.innerHTML = "";

    responses.forEach(response => {
        const row = document.createElement("tr");
        const stimulus = response.vibration ? "APPLIED" : "NOT APPLIED";
        const patient = response.patientResponse ? "YES" : "NO";
        const result = response.correct ? "✓ CORRECT" : "✕ INCORRECT";

        row.innerHTML = `
            <td>${response.trialNumber}</td>
            <td>
                <strong>${response.motor}</strong>
                <small>${response.location}</small>
            </td>
            <td>
                <span class="${response.vibration ? "applied" : "not-applied"}">${stimulus}</span>
            </td>
            <td>${patient}</td>
            <td>
                <span class="${response.correct ? "correct" : "incorrect"}">${result}</span>
            </td>
        `;
        container.appendChild(row);
    });
}

newTestBtn.onclick = function () {
    sendStopToESP32();
    responses = [];
    currentTrial = 0;
    resultsScreen.classList.remove("active");
    processingScreen.classList.remove("active");
    testScreen.classList.remove("active");
    welcomeScreen.classList.add("active");
    trialCounter.textContent = "01 / 18";
    progressBar.style.width = "0%";
    testStatus.textContent = "Waiting for response";
};

function applyStatusClass(element, status) {
    element.classList.remove("status-present", "status-reduced", "status-absent");
    if (status === "PERCEPTION PRESENT") element.classList.add("status-present");
    else if (status === "REDUCED PERCEPTION") element.classList.add("status-reduced");
    else element.classList.add("status-absent");
}

// ==========================================
// VANTA HALO BACKGROUND
// ==========================================
VANTA.HALO({
    el: "body",
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    backgroundColor: 0xf1e9e9,
    baseColor: 0x6e33cc,
    highlightColor: 0xff5500,
    size: 2.8,
    amplitudeFactor: 2.5,
    xOffset: 0.0,
    yOffset: 0.0
});