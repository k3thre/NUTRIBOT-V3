#include <Servo.h>

// Pin Definitions
const int servoPin = 9;
const int enA = 5; 
const int in1 = 7;
const int in2 = 8;

Servo plantDoor;

// --- CONFIGURATION ---
const int pulseWidth = 150;   
const int motorSpeed = 200;    
const int stepSize = 12; 

// --- WEB CONTROL STATE ---
bool isSystemActive = false;
bool plantA = false;
bool plantB = false;
bool plantC = false;
bool isInterrupted = false;
long timeA = 3000;
long timeB = 3000;
long timeC = 3000;

void setup() {
  Serial.begin(9600);
  pinMode(enA, OUTPUT);
  pinMode(in1, OUTPUT);
  pinMode(in2, OUTPUT);
  
  plantDoor.attach(servoPin);
  plantDoor.write(0); 

  stopLogic(false); 
  Serial.println("System Ready. Direction Reversed. Waiting for Web Command...");
}

void loop() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd.startsWith("START_")) {
      int firstU = cmd.indexOf('_');
      int secondU = cmd.indexOf('_', firstU + 1);
      int thirdU = cmd.indexOf('_', secondU + 1);
      int fourthU = cmd.indexOf('_', thirdU + 1);
      int fifthU = cmd.indexOf('_', fourthU + 1);
      int sixthU = cmd.indexOf('_', fifthU + 1);

      if (firstU != -1 && secondU != -1 && thirdU != -1 && cmd.length() >= thirdU + 2) {
          plantA = (cmd.charAt(firstU + 1) == '1');
          plantB = (cmd.charAt(secondU + 1) == '1');
          plantC = (cmd.charAt(thirdU + 1) == '1');
          
          if (fourthU != -1 && fifthU != -1 && sixthU != -1) {
             timeA = cmd.substring(fourthU + 1, fifthU).toInt();
             timeB = cmd.substring(fifthU + 1, sixthU).toInt();
             timeC = cmd.substring(sixthU + 1).toInt();
          }
          isInterrupted = false;
          runSequence();
      }
    } else if (cmd == "STOP") {
      stopLogic(false);
      isInterrupted = true;
      Serial.println("System Stopped.");
    }
  }
}

bool smartDelay(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    if (Serial.available() > 0) {
      if (Serial.readStringUntil('\n').indexOf("STOP") != -1) {
        isInterrupted = true;
        return true;
      }
    }
  }
  return false;
}

void runSequence() {
  unsigned long totalTravelTime = 0;
  unsigned long stepDuration = (unsigned long)stepSize * pulseWidth;

  // --- SLOT A ---
  if (!isInterrupted && (plantA || plantB || plantC)) {
    totalTravelTime += moveForward(stepDuration);
    if (!isInterrupted && plantA) performAction("A");
  }

  // --- SLOT B ---
  if (!isInterrupted && (plantB || plantC)) {
    totalTravelTime += moveForward(stepDuration);
    if (!isInterrupted && plantB) performAction("B");
  } 

  // --- SLOT C ---
  if (!isInterrupted && plantC) {
    totalTravelTime += moveForward(stepDuration);
    if (!isInterrupted) performAction("C");
  }

  // --- RETURN HOME ---
  if (totalTravelTime > 0) {
    Serial.println("Returning Home (Reversed)...");
    // REVERSED DIRECTION FOR RETURN
    digitalWrite(in1, LOW); 
    digitalWrite(in2, HIGH);
    analogWrite(enA, motorSpeed);
    
    unsigned long start = millis();
    while (millis() - start < totalTravelTime) {
      if (Serial.available() > 0 && Serial.readStringUntil('\n').indexOf("STOP") != -1) break;
    }
    stopLogic(true);
  }
  
  Serial.println("DONE");
}

unsigned long moveForward(unsigned long duration) {
  // REVERSED DIRECTION FOR FORWARD MOVE
  digitalWrite(in1, HIGH);
  digitalWrite(in2, LOW);
  analogWrite(enA, motorSpeed);
  
  unsigned long start = millis();
  while (millis() - start < duration && !isInterrupted) {
    if (Serial.available() > 0 && Serial.readStringUntil('\n').indexOf("STOP") != -1) isInterrupted = true;
  }
  
  unsigned long elapsed = millis() - start;
  stopLogic(false);
  return elapsed;
}

void performAction(String slot) {
  long delayTime = 3000;
  if (slot == "A" && timeA > 0) delayTime = timeA;
  else if (slot == "B" && timeB > 0) delayTime = timeB;
  else if (slot == "C" && timeC > 0) delayTime = timeC;

  plantDoor.write(90);  
  smartDelay(delayTime); 
  plantDoor.write(0);   
  if (!isInterrupted) smartDelay(4000); 
}

void stopLogic(bool wasReversing) {
  // REVERSED BRAKE POLARITY
  if (wasReversing) { 
    digitalWrite(in1, HIGH); 
    digitalWrite(in2, LOW); 
  } else { 
    digitalWrite(in1, LOW); 
    digitalWrite(in2, HIGH); 
  }
  
  analogWrite(enA, 255); 
  delay(40);             
  digitalWrite(in1, HIGH); digitalWrite(in2, HIGH); 
  delay(200); 
  digitalWrite(in1, LOW); digitalWrite(in2, LOW);
  analogWrite(enA, 0);
}