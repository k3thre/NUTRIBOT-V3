

// === Constants & State ===
let isSystemOn = false;
let isConnected = false;
let currentAction = "IDLE";
let logs = [];
const maxLogs = 19;
let slotsData = {
    'A': { id: 'A', species: '', n: '', p: '', k: '', n_rec: '', image: null, isAnalyzing: false },
    'B': { id: 'B', species: '', n: '', p: '', k: '', n_rec: '', image: null, isAnalyzing: false },
    'C': { id: 'C', species: '', n: '', p: '', k: '', n_rec: '', image: null, isAnalyzing: false }
};

// Hardware State
let port = null;
let writer = null;
let reader = null;
let keepReading = true;
let serialBuffer = "";

// === DOM Elements ===
const leavesContainer = document.getElementById('leavesContainer');
const slotsContainer = document.getElementById('slotsContainer');
const terminalBody = document.getElementById('terminalBody');
const mainToggleBtn = document.getElementById('mainToggleBtn');
const connectDeviceBtn = document.getElementById('connectDeviceBtn');
const resetDataBtn = document.getElementById('resetDataBtn');

const heroAura = document.getElementById('heroAura');
const mainIcon = document.getElementById('mainIcon');
const mainText = document.getElementById('mainText');
const subTextAction = document.getElementById('subTextAction');
const mainSubtext = document.getElementById('mainSubtext');
const innerGlow = document.getElementById('innerGlow');
const activeGlow = document.getElementById('activeGlow');

const confirmModal = document.getElementById('confirmModal');
const cancelResetBtn = document.getElementById('cancelResetBtn');
const confirmResetBtn = document.getElementById('confirmResetBtn');

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    // Check if slotsContainer exists to prevent errors
    const container = document.getElementById('slotsContainer');
    if (!container) {
        console.error("slotsContainer not found in the DOM!");
        return;
    }

    initLeafParticles();
    loadPersistedData();
    renderSlots();
    
    // Listeners
    if(connectDeviceBtn) connectDeviceBtn.addEventListener('click', toggleConnection);
    if(mainToggleBtn) mainToggleBtn.addEventListener('click', toggleSystem);
    if(resetDataBtn) resetDataBtn.addEventListener('click', showResetModal);
    if(cancelResetBtn) cancelResetBtn.addEventListener('click', hideResetModal);
    if(confirmResetBtn) confirmResetBtn.addEventListener('click', confirmReset);

    // Mouse tracker for 3D tilt effects
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--mouse-x', x.toFixed(2));
        document.documentElement.style.setProperty('--mouse-y', y.toFixed(2));
    });
});

// === Background Leaves ===
function initLeafParticles() {
    const colors = [
        '#10b981', '#059669', '#047857', // Greens
        '#34d399', '#6ee7b7', '#a7f3d0', // Light Greens
        '#f59e0b', '#d97706', '#b45309', // Oranges/Ambers
        '#ef4444', '#dc2626', '#b91c1c', // Reds
        '#84cc16', '#65a30d', '#4d7c0f', // Lime/Olive
        '#78350f', '#92400e', '#a16207'  // Browns/Golds
    ];
    const leafCount = 45;
    let html = '';
    
    for (let i = 0; i < leafCount; i++) {
        const size = Math.random() * 12 + 8;
        const left = Math.random() * 100;
        const animDuration = Math.random() * 40 + 20; 
        const delay = Math.random() * 20;
        const opacity = Math.random() * 0.4 + 0.2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const rotation = Math.random() * 360;

        html += `<div class="leaf-particle" style="width: ${size}px; height: ${size * 1.5}px; left: ${left}vw; animation-duration: ${animDuration}s; animation-delay: -${delay}s; opacity: ${opacity}; background-color: ${color}; transform: rotate(${rotation}deg);"></div>`;
    }
    leavesContainer.innerHTML = html;
}

// === Terminal Logs ===
function addLog(msg) {
    logs.push(msg);
    if (logs.length > maxLogs) logs.shift();
    renderTerminal();
}

function renderTerminal() {
    if (logs.length === 0) {
        terminalBody.innerHTML = '<div class="opacity-50">READY. CONNECT TO INITIATE...</div>';
        return;
    }
    
    terminalBody.innerHTML = logs.map(log => {
        return `<div class="mb-1"><span class="opacity-50 mr-2">[${new Date().toLocaleTimeString()}]</span>${log}</div>`;
    }).join("");
    
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

// === Hardware Serial USB ===
async function toggleConnection() {
    if (isConnected) {
        // Disconnect logic if needed, web serial is usually closed by page reload
        return;
    }
    
    if (!('serial' in navigator)) {
        addLog("ERROR: WEB SERIAL NOT SUPPORTED IN THIS BROWSER.");
        return;
    }

    addLog("ATTEMPTING TO CONNECT VIA SERIAL...");
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        
        writer = port.writable.getWriter();
        
        isConnected = true;
        connectDeviceBtn.textContent = 'CONNECTED';
        connectDeviceBtn.className = 'px-6 py-2 rounded-lg text-xs font-bold transition-all bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';
        
        addLog("SUCCESS: SYSTEM LINKED TO UNO.");
        addLog("INITIALIZING HARDWARE...");
        
        readLoop();
        
    } catch (e) {
        addLog("CONNECTION ERROR.");
        console.error(e);
    }
}

async function readLoop() {
    try {
        keepReading = true;
        while (port.readable && keepReading) {
            reader = port.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    serialBuffer += new TextDecoder().decode(value);

                    let lineEndIndex = serialBuffer.indexOf('\n');
                    while (lineEndIndex !== -1) {
                        const line = serialBuffer.substring(0, lineEndIndex).trim();
                        serialBuffer = serialBuffer.substring(lineEndIndex + 1);

                        if (line) {
                            addLog("UNO: " + line);
                            handleArduinoMessage(line);
                        }
                        lineEndIndex = serialBuffer.indexOf('\n');
                    }
                }
            } catch (error) {
                console.error("Error reading data:", error);
                addLog("READ ERROR.");
                break;
            } finally {
                reader.releaseLock();
            }
        }
    } catch (e) {
        console.error("Fatal read error:", e);
    } finally {
        isConnected = false;
        isSystemOn = false;
        connectDeviceBtn.textContent = 'CONNECT DEVICE';
        connectDeviceBtn.className = 'px-6 py-2 rounded-lg text-xs font-bold transition-all bg-white text-black hover:bg-emerald-50 shadow-lg shadow-emerald-900/10 hover-lift';
        updateSystemUI();
        addLog("CONNECTION LOST.");
    }
}

function handleArduinoMessage(line) {
    if (line.includes("Moving to Slot")) {
        currentAction = line.toUpperCase();
    } else if (line.includes("Opening Door")) {
        currentAction = "DISPENSING...";
    } else if (line.includes("Closing Door")) {
        currentAction = "SEALING...";
    } else if (line.includes("Returning Home")) {
        currentAction = "RETURNING HOME...";
    } else if (line.includes("System Ready")) {
        currentAction = "READY";
    } else if (line.includes("DONE")) {
        isSystemOn = false;
        currentAction = "IDLE";
        addLog("SYSTEM CYCLE COMPLETE. MACHINE READY.");
    } else if (line.includes("System Stopped")) {
        isSystemOn = false;
        currentAction = "STOPPED";
    }
    updateSystemUI();
}

async function sendCommand(cmd) {
    if (!writer) {
        addLog("ERROR: CONNECT USB FIRST.");
        return;
    }
    try {
        const data = new TextEncoder().encode(cmd + "\n");
        await writer.write(data);
        addLog("SENT: " + cmd);
    } catch (e) {
        addLog("ERROR SENDING COMMAND.");
        console.error(e);
    }
}

// === Main System Controls ===
function toggleSystem() {
    if (!isConnected) {
        toggleConnection();
        return;
    }

    if (!isSystemOn) {
        const hasA = slotsData['A'].species !== "" ? "1" : "0";
        const hasB = slotsData['B'].species !== "" ? "1" : "0";
        const hasC = slotsData['C'].species !== "" ? "1" : "0";

        if (hasA === "0" && hasB === "0" && hasC === "0") {
            addLog("ERROR: ALL SLOTS EMPTY. ADD A PLANT FIRST.");
            return;
        }

        const tA = hasA === "1" && slotsData['A'].n_rec ? Math.round(parseFloat(slotsData['A'].n_rec) * 200) : 0;
        const tB = hasB === "1" && slotsData['B'].n_rec ? Math.round(parseFloat(slotsData['B'].n_rec) * 200) : 0;
        const tC = hasC === "1" && slotsData['C'].n_rec ? Math.round(parseFloat(slotsData['C'].n_rec) * 200) : 0;

        sendCommand(`START_${hasA}_${hasB}_${hasC}_${tA}_${tB}_${tC}`);
        isSystemOn = true;
        currentAction = "ACTIVE";
        addLog("SYSTEM INITIATED. MONITORING ACTIVE.");
    } else {
        sendCommand('STOP');
        isSystemOn = false;
        currentAction = "STOPPED";
        addLog("SYSTEM STANDBY.");
    }
    updateSystemUI();
}

function updateSystemUI() {
    if (isSystemOn) {
        heroAura.classList.replace('opacity-20', 'opacity-60');
        heroAura.classList.add('animate-pulse');
        
        mainToggleBtn.className = "group relative flex flex-col items-center gap-2 px-20 py-10 rounded-[3rem] font-black transition-all duration-700 overflow-hidden bg-emerald-500 text-white shadow-[0_30px_80px_rgba(16,185,129,0.5)] scale-110";
        innerGlow.classList.add('hidden');
        
        mainIcon.className = "fa-solid fa-bolt fill-white animate-pulse text-4xl";
        mainText.textContent = "SYSTEM ACTIVE";
        
        subTextAction.textContent = currentAction;
        subTextAction.classList.remove('hidden');
        mainSubtext.classList.add('hidden');
        activeGlow.classList.remove('hidden');
    } else {
        heroAura.classList.replace('opacity-60', 'opacity-20');
        heroAura.classList.remove('animate-pulse');
        
        mainToggleBtn.className = "group relative flex flex-col items-center gap-2 px-20 py-10 rounded-[3rem] font-black transition-all duration-700 overflow-hidden bg-white/40 backdrop-blur-3xl text-emerald-900 border-[3px] border-white/80 hover:bg-white/60 hover:scale-105 shadow-[0_20px_60px_rgba(0,0,0,0.1)]";
        innerGlow.classList.remove('hidden');
        
        mainIcon.className = "fa-solid fa-bolt text-emerald-600 animate-bounce text-4xl";
        mainText.textContent = "START SYSTEM";
        
        subTextAction.classList.add('hidden');
        mainSubtext.classList.remove('hidden');
        activeGlow.classList.add('hidden');
    }
}

// === Reset Data Data ===
function showResetModal() {
    confirmModal.classList.remove('hidden');
    setTimeout(() => {
        confirmModal.classList.remove('opacity-0');
        confirmModal.querySelector('div').classList.replace('scale-95', 'scale-100');
    }, 10);
}

function hideResetModal() {
    confirmModal.classList.add('opacity-0');
    confirmModal.querySelector('div').classList.replace('scale-100', 'scale-95');
    setTimeout(() => {
        confirmModal.classList.add('hidden');
    }, 300);
}

function confirmReset() {
    Object.keys(slotsData).forEach(id => {
        slotsData[id] = { id: id, species: '', n: '', p: '', k: '', n_rec: '', image: null, isAnalyzing: false };
    });
    localStorage.removeItem('nutribot_slots');
    addLog("ALL SLOT DATA RESET.");
    if(isConnected) sendCommand("CLEAR_ALL");
    renderSlots();
    hideResetModal();
}

// === Persist Data ===
function loadPersistedData() {
    const persisted = localStorage.getItem('nutribot_slots');
    if (persisted) {
        try {
            const parsed = JSON.parse(persisted);
            Object.keys(slotsData).forEach(id => {
                if(parsed[id]) {
                    slotsData[id].species = parsed[id].species || '';
                    if (parsed[id].n !== undefined) {
                        slotsData[id].n = parsed[id].n;
                        slotsData[id].p = parsed[id].p;
                        slotsData[id].k = parsed[id].k;
                    } else if (parsed[id].npk) {
                        const parts = parsed[id].npk.split('-');
                        if (parts.length === 3) {
                            slotsData[id].n = parts[0];
                            slotsData[id].p = parts[1];
                            slotsData[id].k = parts[2];
                        } else {
                            slotsData[id].n = parsed[id].npk;
                        }
                    }
                    slotsData[id].n_rec = parsed[id].n_rec || '';
                    slotsData[id].image = parsed[id].img || null;
                }
            });
        } catch (e) {
            console.error(e);
        }
    }
}

function savePersistedData() {
    const toSave = {};
    Object.keys(slotsData).forEach(id => {
        if(slotsData[id].species !== "") {
            toSave[id] = {
                species: slotsData[id].species,
                n: slotsData[id].n,
                p: slotsData[id].p,
                k: slotsData[id].k,
                n_rec: slotsData[id].n_rec,
                img: slotsData[id].image
            };
        }
    });
    localStorage.setItem('nutribot_slots', JSON.stringify(toSave));
}


// === AI Gemini API Logic ===
async function analyzePlantImage(base64Image) {
    try {
        console.log("Starting analysis via local backend...");
        
        const response = await fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with status ${response.status}`);
        }

        console.log("Received response from backend");
        const analysis = await response.json();
        console.log("Parsed JSON result:", analysis);
        
        return {
            species: analysis.species || "Unknown Species",
            n: analysis.n || "-",
            p: analysis.p || "-",
            k: analysis.k || "-",
            n_rec: analysis.n_rec || "-",
        };
    } catch (error) {
        // Add log to UI
        const errorMsg = error.message || "Unknown error";
        console.error("Analysis Error:", error);
        addLog(`API ERROR: ${errorMsg}`);
        
        return { species: "Detection Failed", n: "-", p: "-", k: "-" };
    }
}

// === Slot Rendering and Interactions ===
function renderSlots() {
    let html = '';
    
    ['A', 'B', 'C'].forEach(id => {
        const slot = slotsData[id];
        const displayImage = slot.image;
        
        const indicatorClass = slot.image ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-white/10';
        
        let imageAreaHTML = '';
        if (displayImage) {
            imageAreaHTML = `
                <div class="w-full h-full relative group rounded-2xl overflow-hidden aspect-square bg-white/20 border border-white/40 flex items-center justify-center shadow-inner cursor-pointer" onclick="document.getElementById('fileInput-${slot.id}').click()">
                    <img src="${displayImage}" alt="Plant ${slot.id}" class="w-full h-full object-cover" />
                    <button onclick="event.stopPropagation(); window.removeSlotImage('${slot.id}')" class="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-lg text-white shadow-lg transition-all z-20 flex items-center justify-center opacity-0 group-hover:opacity-100" title="Remove Image">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                    ${slot.isAnalyzing ? `
                        <div class="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                            <i class="fa-solid fa-arrows-rotate animate-spin text-emerald-600 text-3xl"></i>
                            <span class="text-[10px] font-bold tracking-[0.2em] text-emerald-600">ANALYZING...</span>
                        </div>
                    ` : `
                        <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <i class="fa-solid fa-arrows-rotate text-white/70 text-2xl"></i>
                        </div>
                    `}
                </div>
            `;
        } else {
            imageAreaHTML = `
                <div class="w-full rounded-2xl overflow-hidden aspect-square bg-white/20 border border-white/40 flex flex-col items-center justify-center shadow-inner cursor-pointer hover:text-emerald-400 transition-colors" onclick="document.getElementById('fileInput-${slot.id}').click()">
                    <i class="fa-solid fa-upload text-3xl opacity-20 mb-2"></i>
                    <span class="text-xs font-medium opacity-40">UPLOAD PHOTO</span>
                     ${slot.isAnalyzing ? `
                        <div class="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                            <i class="fa-solid fa-arrows-rotate animate-spin text-emerald-600 text-3xl"></i>
                            <span class="text-[10px] font-bold tracking-[0.2em] text-emerald-600">ANALYZING...</span>
                        </div>
                    ` : ""}
                </div>
            `;
        }

        html += `
            <div class="plot-card glass-panel p-6 flex flex-col gap-4 rounded-3xl transition-all duration-300">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 font-bold tracking-wider text-sm text-emerald-950">
                        <span class="w-2 h-2 rounded-full ${indicatorClass}"></span>
                        SLOT ${slot.id}
                    </div>
                    <div class="text-emerald-500/50">
                        <i class="fa-solid fa-leaf text-xl"></i>
                    </div>
                </div>

                ${imageAreaHTML}

                <div class="space-y-3">
                    <input type="text" value="${slot.species}" placeholder="AI detects species..." readonly class="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none placeholder:text-emerald-900/20 text-emerald-950 font-medium" />
                    
                    <div class="grid grid-cols-3 gap-2">
                        <div class="relative">
                            <span class="absolute -top-2 left-2 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm z-10 shadow-sm">N</span>
                            <input type="text" value="${slot.n || ''}" placeholder="N" readonly class="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-2 py-2.5 text-center text-sm font-mono text-emerald-700 focus:outline-none placeholder:text-emerald-900/20 font-bold" />
                        </div>
                        <div class="relative">
                            <span class="absolute -top-2 left-2 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm z-10 shadow-sm">P</span>
                            <input type="text" value="${slot.p || ''}" placeholder="P" readonly class="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-2 py-2.5 text-center text-sm font-mono text-emerald-700 focus:outline-none placeholder:text-emerald-900/20 font-bold" />
                        </div>
                        <div class="relative">
                            <span class="absolute -top-2 left-2 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm z-10 shadow-sm">K</span>
                            <input type="text" value="${slot.k || ''}" placeholder="K" readonly class="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-2 py-2.5 text-center text-sm font-mono text-emerald-700 focus:outline-none placeholder:text-emerald-900/20 font-bold" />
                        </div>
                    </div>

                    <div class="relative mt-2">
                        <p class="text-[10px] font-bold tracking-wider text-emerald-700 mb-1 ml-1 uppercase">How much nitrogen nutrients does it need?</p>
                        <div class="relative flex items-center">
                            <input type="text" value="${slot.n_rec || ''}" placeholder="AI recommendation..." readonly class="w-full bg-white/30 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2.5 pr-8 text-[11px] leading-tight font-medium text-emerald-800 focus:outline-none placeholder:text-emerald-900/40" />
                            ${slot.n_rec ? `<span class="absolute right-4 text-xs font-bold text-emerald-600">g</span>` : ''}
                        </div>
                    </div>

                    <input type="file" id="fileInput-${slot.id}" accept="image/*" class="hidden" onchange="window.handleSlotFileChange(event, '${slot.id}')" />
                </div>
                
                ${displayImage && !slot.isAnalyzing && slot.species === '' ? `
                    <div class="grid grid-cols-2 gap-3 mt-2">
                         <button onclick="window.analyzeSlot('${slot.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs transition-colors">ANALYZE</button>
                         <button onclick="window.clearSlot('${slot.id}')" class="bg-black/5 hover:bg-red-500/10 text-black/40 hover:text-red-500 font-bold py-2 rounded-lg text-xs transition-colors border border-black/5">CLEAR</button>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    slotsContainer.innerHTML = html;
}

// Global functions for inline HTML event handlers
window.handleSlotFileChange = (e, id) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const base64 = evt.target.result;
            slotsData[id].image = base64;
            // Clear prior results so the analyze buttons pop up
            slotsData[id].species = "";
            slotsData[id].n = "";
            slotsData[id].p = "";
            slotsData[id].k = "";
            slotsData[id].n_rec = "";
            renderSlots();
        };
        reader.readAsDataURL(file);
    }
};

window.analyzeSlot = async (id) => {
    if(!slotsData[id].image) return;
    
    slotsData[id].isAnalyzing = true;
    renderSlots();
    addLog(`SLOT ${id}: ANALYZING IMAGE...`);
    
    const analysis = await analyzePlantImage(slotsData[id].image);
    
    slotsData[id].species = analysis.species;
    slotsData[id].n = analysis.n;
    slotsData[id].p = analysis.p;
    slotsData[id].k = analysis.k;
    slotsData[id].n_rec = analysis.n_rec;
    slotsData[id].isAnalyzing = false;
    
    const npkString = `${analysis.n}-${analysis.p}-${analysis.k}`;
    addLog(`SLOT ${id}: DETECTED ${analysis.species.toUpperCase()}. NPK: ${npkString}`);
    savePersistedData();
    renderSlots();
    
    if(isConnected) {
        sendCommand(`SET_${id}_${analysis.species}_${npkString}`);
    }
};

window.clearSlot = (id) => {
    slotsData[id].image = null;
    slotsData[id].species = "";
    slotsData[id].n = "";
    slotsData[id].p = "";
    slotsData[id].k = "";
    slotsData[id].n_rec = "";
    savePersistedData();
    renderSlots();
    addLog(`SLOT ${id} CLEARED.`);
    if (isConnected) sendCommand(`CLEAR_${id}`);
};

window.removeSlotImage = window.clearSlot;
