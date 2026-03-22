# NUTRIBOT-V3
# Nutribot: Autonomous Agricultural Nutrient Dispenser

This repository contains the full stack for **Nutribot**, an automated system designed for precision plant care. It combines a web-based control station with a mobile robotic dispenser to monitor soil health and deliver specific nutrients to individual plant slots.

## 🚀 Features
* **AI Plant Analysis:** Integrated Gemini API logic to identify plant species and calculate NPK (Nitrogen, Phosphorus, Potassium) requirements from uploaded photos.
* **Web Serial Control:** A modern, browser-based dashboard built with **Tailwind CSS** that communicates directly with the Arduino via the **Web Serial API**.
* **Precision Dispensing:** Servo-controlled "plant door" mechanism for accurate nutrient delivery at timed intervals.
* **Real-Time Monitoring:** Live system logs and status updates displayed in a terminal-style interface.
* **Automated Navigation:** Sequence logic to move between multiple plant slots (A, B, and C) and return to a home position.

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3, JavaScript (ES6+), Tailwind CSS.
* **Hardware:** Arduino Uno, L298N Motor Driver, Servo Motors.
* **Communication:** Web Serial API.

## 📂 Project Structure
* `arduino_controller.ino`: Firmware for the Arduino Uno to handle motor movement and dispensing.
* `index.html`: The main dashboard user interface.
* `scripts.js`: Logic for serial communication, UI updates, and AI integration.
* `style.css`: Custom animations and glassmorphism styling.

## 🔧 How to Setup

### 1. Hardware Connections (Arduino Uno)
Connect your components to the Arduino Uno as defined in the source code:

| Component | Arduino Pin | Description |
| :--- | :--- | :--- |
| **Servo Motor** | `Pin 9` | Controls the nutrient dispensing door. |
| **L298N ENA** | `Pin 5` | PWM pin for controlling motor speed. |
| **L298N IN1** | `Pin 7` | Motor direction control 1. |
| **L298N IN2** | `Pin 8` | Motor direction control 2. |
| **Power** | `VIN / GND` | External power for motors (7-12V recommended). |

### 2. Software Installation
1.  **Flash the Arduino:** Open `arduino_controller.ino` in the Arduino IDE and upload it to your Uno.
2.  **Host the Web Interface:** Open `index.html` in a modern browser (Chrome or Edge recommended for Web Serial support).
3.  **Local Backend (Required for AI):** The system expects a local server at `http://localhost:3000/api/analyze` to handle Gemini AI image processing.

### 3. Usage
* **Connect:** Click **"CONNECT DEVICE"** and select the Arduino's COM port.
* **Analyze:** Upload a plant photo to a slot. The AI detects the species and calculates NPK requirements.
* **Run:** Press **"START SYSTEM"** to initiate the dispensing sequence.

## ⚠️ Troubleshooting
* **Serial Connection:** Ensure no other program (like the Arduino Serial Monitor) is using the COM port when connecting via the web dashboard.
* **Motor Movement:** If the bot moves in the wrong direction, the code includes a "Reversed Direction" logic by default; adjust the `in1` and `in2` pins if necessary.
* **Dispensing:** Ensure the `plantDoor` servo is calibrated to `0` (closed) and `90` (open).
