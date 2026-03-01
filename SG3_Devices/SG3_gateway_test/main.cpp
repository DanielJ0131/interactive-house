#include <Arduino.h>
#include <Wire.h> 
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

//GLOBALS

// Initialize LCD and Servos based on YOUR corrected pins
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo doorServo;   // Pin 9
Servo windowServo; // Pin 10

String serialBuf = "";

// Threshold for Gas Alarm (Adjust this number if it's too sensitive)
const int gasThreshold = 5; 

//toggle function for the window/door
bool windowOpen = false;   // remembers state
int lastBtn2State = HIGH;  // for edge detection

//SONG SETUP
//when the touch/water sensor detects something, a song will play
bool songPlayed = false;

//toggle function for the ventilator
bool fanOn = false;       // remembers state
int lastBtn1State = HIGH; // for edge detection

// ================= LCD CONTROL SYSTEM =================

// Controls how long temporary messages stay on screen (3 seconds)
unsigned long messageUntil = 0;

// Stores temporary message lines
String tempLine1 = "";
String tempLine2 = "";

// Prevents writing to LCD multiple times per loop
bool lcdNeedsUpdate = true;

// Limits how often the normal sensor screen is refreshed (reduces flicker)
unsigned long lastSensorLcdUpdate = 0;
const unsigned long sensorLcdInterval = 500; // 2 updates per second

////////////////////////////////////////////////////////////////////////////////////////////////
//HELPERS
// =====================================================
// Displays a temporary message for 3 seconds.
// After 3 seconds, LCD returns to normal sensor display.
// =====================================================
void showTempMessage(String line1, String line2) {
  tempLine1 = line1;
  tempLine2 = line2;
  messageUntil = millis() + 3000;   // Message visible for 3 seconds
  lcdNeedsUpdate = true;            // Force LCD refresh
}

// Immediately draw the temporary message to the LCD.
// Useful before long delays (like playing a melody), so the message appears instantly.
void forceShowTempMessageNow() {
  lcd.setCursor(0, 0);
  lcd.print("                ");
  lcd.setCursor(0, 0);
  lcd.print(tempLine1);

  lcd.setCursor(0, 1);
  lcd.print("                ");
  lcd.setCursor(0, 1);
  lcd.print(tempLine2);
}

////////////////////////////////////////////////////////////////////////////////////////////////
//Windows-XP-style startup SFX sound for when we boot the device
// Plays during the welcome message
void playStartupMelody() {
  tone(3, 392, 180); delay(220); // G4
  tone(3, 523, 180); delay(220); // C5
  tone(3, 659, 220); delay(260); // E5
  tone(3, 784, 300); delay(340); // G5
  tone(3, 659, 260); delay(300); // E5
  noTone(3);
}

////////////////////////////////////////////////////////////////////////////////////////////////
// STARTUP SEQUENCE
bool startupDone = false;
int startupStep = 0;
unsigned long startupStepUntil = 0;

////////////////////////////////////////////////////////////////////////////////////////////////
// ========================= GAS ALERT LOGIC =========================
// - For the FIRST 3 seconds after gas triggers, we ONLY do:
//     * Show "!! GAS ALERT !!"
//     * Play the basic alert buzzer
// - ONLY AFTER those 3 seconds are finished, we evaluate the IF rules:
//
//   Gas alert triggered (evaluated AFTER the initial 3 seconds):
//   1) Door/window OPEN   + ventilator ON  -> no extra event, just continue the gas buzzer
//   2) Door/window OPEN   + ventilator OFF -> "Ventilator ON for safety" + beep-beep for 3s
//   3) Door/window CLOSED + ventilator OFF -> "Opening house for safety" + beep-beep 3s,
//                                          then "Ventilator ON for safety" + beep-beep 3s
//   4) Door/window CLOSED + ventilator ON  -> "Opening house for safety" + beep-beep for 3s
//
// After any needed extra events finish:
// - We return to "!! GAS ALERT !!" display and SOLID buzzer while gas is still high.
// - When gas ends, we stop the buzzer and LCD goes back to normal.

bool gasSequenceActive = false;     // remembers state (we are inside a gas event)
bool gasWasHigh = false;            // edge detection for gas event start
unsigned long gasStageUntil = 0;    // timer used for each stage

// The plan decided AFTER the first 3 seconds
enum GasPlan { PLAN_NONE, PLAN_ONLY_ALERT, PLAN_VENT_ONLY, PLAN_OPEN_ONLY, PLAN_OPEN_THEN_VENT };
GasPlan gasPlan = PLAN_NONE;

// Stages:
// 0 = initial 3 seconds GAS ALERT with SOLID buzzer (NO extra actions)
// 1 = opening step (if needed) with beep-beep 3s
// 2 = ventilator step (if needed) with beep-beep 3s
// 3 = steady GAS ALERT while gas remains high (SOLID buzzer)
int gasPlanStage = 0;

// Buzzer mode controller so nothing else can interrupt gas alarm beeps
enum BuzzerMode { BUZZ_OFF, BUZZ_SOLID, BUZZ_SIREN };
BuzzerMode buzzerMode = BUZZ_OFF;

// Alarm clock style beep (non-blocking)
// This is a typical "beep beep ... beep beep" pattern.
bool alarmBeepActive = false;
bool alarmBeepOn = false;
unsigned long alarmBeepNextToggle = 0;
int alarmBeepStep = 0;

// You can adjust these numbers to change the alarm clock feeling. Play with the instructions if you want to learn.
const int alarmBeepFreq = 1800;              // alarm clock pitch (higher = more "alarm clock")
const unsigned long alarmOnMs = 120;         // beep ON time
const unsigned long alarmOffMs = 120;        // short OFF between beeps
const unsigned long alarmGapMs = 350;        // longer gap after the "beep beep" pair

void updateSiren(bool enableAlarmClockBeep) {
  // NOTE: I kept the old function name "updateSiren" because it originally was a siren sound (but it was too scary, so I changed to a beep).
  // but in practice here we only changed the sound system and we did't touch anything else in the code's logic.
  if (!enableAlarmClockBeep) {
    if (alarmBeepActive) {
      noTone(3);
    }
    alarmBeepActive = false;
    alarmBeepOn = false;
    alarmBeepNextToggle = 0;
    alarmBeepStep = 0;
    return;
  }

  if (!alarmBeepActive) {
    alarmBeepActive = true;
    alarmBeepOn = false;
    alarmBeepNextToggle = 0;
    alarmBeepStep = 0;
  }

  if (alarmBeepNextToggle == 0 || millis() >= alarmBeepNextToggle) {

    // alarmBeepStep cycles: 0=beep1 ON, 1=beep1 OFF, 2=beep2 ON, 3=beep2 OFF (long gap)
    if (alarmBeepStep == 0) {
      tone(3, alarmBeepFreq);
      alarmBeepOn = true;
      alarmBeepNextToggle = millis() + alarmOnMs;
    }
    else if (alarmBeepStep == 1) {
      noTone(3);
      alarmBeepOn = false;
      alarmBeepNextToggle = millis() + alarmOffMs;
    }
    else if (alarmBeepStep == 2) {
      tone(3, alarmBeepFreq);
      alarmBeepOn = true;
      alarmBeepNextToggle = millis() + alarmOnMs;
    }
    else { // alarmBeepStep == 3
      noTone(3);
      alarmBeepOn = false;
      alarmBeepNextToggle = millis() + alarmGapMs;
    }

    alarmBeepStep++;
    if (alarmBeepStep > 3) alarmBeepStep = 0;
  }
}

// Apply buzzer output based on mode (single owner of buzzer)
// BUZZ_SOLID uses the original style that Ryad had (digitalWrite HIGH)
// BUZZ_SIREN uses the alarm clock style beep I came up with (Dani SG4)
void applyBuzzerMode() {
  if (buzzerMode == BUZZ_OFF) {
    updateSiren(false);
    digitalWrite(3, LOW);
  }
  else if (buzzerMode == BUZZ_SOLID) {
    // Important: stop tone so it can't interfere with solid pin HIGH
    updateSiren(false);
    noTone(3);
    digitalWrite(3, HIGH);
  }
  else if (buzzerMode == BUZZ_SIREN) {
    // Important: keep pin LOW so tone output is clean
    digitalWrite(3, LOW);
    updateSiren(true);
  }
}

/////////////////////////////////
// PROGRAM

void setup() {
  Serial.begin(9600); // Start serial for VSC monitor
  lcd.init();
  lcd.backlight();
  
  // Output Pins
  pinMode(5, OUTPUT);  // Yellow LED
  pinMode(13, OUTPUT); // White LED
  pinMode(7, OUTPUT);  // Fan (INA)
  pinMode(6, OUTPUT);  // Fan (INB)
  pinMode(12, OUTPUT); // Relay
  pinMode(3, OUTPUT);  // Buzzer
  
  // Input Pins
  pinMode(4, INPUT);   // Button 1
  pinMode(8, INPUT);   // Button 2
  pinMode(2, INPUT);   // PIR Motion

  // NEW: Force everything OFF immediately at boot to avoid "everything turns on automatically at the same time"
  digitalWrite(5, LOW);  
  digitalWrite(13, LOW); 
  digitalWrite(7, LOW);  
  digitalWrite(6, LOW);  
  digitalWrite(12, LOW); 
  digitalWrite(3, LOW);  
  noTone(3);

  // NEW: Welcome message that stays during staged startup
  tempLine1 = "Welcome! Turning";
  tempLine2 = "the device on...";
  messageUntil = millis() + 99999999UL; // keep welcome message until startup finishes
  forceShowTempMessageNow();

  // NEW: play startup melody during the welcome message
  playStartupMelody();

  // NEW: Start the staged startup steps
  startupDone = false;
  startupStep = 0;
  startupStepUntil = millis();
}

void loop() {
  // Request a normal LCD refresh only 2 times per second (reduces flicker)
  if (millis() - lastSensorLcdUpdate >= sensorLcdInterval) {
    lastSensorLcdUpdate = millis();
    lcdNeedsUpdate = true;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // NEW: staged startup (ONE FEATURE AT A TIME)
  if (!startupDone) {

    if (millis() >= startupStepUntil) {

      if (startupStep == 0) {
        // Step 0: baseline off + stable variables
        digitalWrite(5, LOW);  
        digitalWrite(13, LOW); 
        digitalWrite(7, LOW);  
        digitalWrite(6, LOW);  
        digitalWrite(12, LOW); 
        digitalWrite(3, LOW);  
        noTone(3);

        // Ensure safe default states
        windowOpen = false;
        fanOn = false;
        songPlayed = false;

        // Reset gas system
        gasSequenceActive = false;
        gasWasHigh = false;
        gasPlan = PLAN_NONE;
        gasPlanStage = 0;
        gasStageUntil = 0;

        buzzerMode = BUZZ_OFF;
        applyBuzzerMode();

        startupStep++;
        startupStepUntil = millis() + 400;
      }
      else if (startupStep == 1) {
        // Step 1: attach servos (only now, not instantly at boot)
        doorServo.attach(9);  //
        windowServo.attach(10); //
        doorServo.write(0);
        windowServo.write(0);

        startupStep++;
        startupStepUntil = millis() + 600; // give batteries time to recover from servo attach
      }
      else if (startupStep == 2) {
        // Step 2: tiny LED test (low current)
        digitalWrite(13, HIGH);
        startupStep++;
        startupStepUntil = millis() + 300;
      }
      else if (startupStep == 3) {
        // Step 3: LED off
        digitalWrite(13, LOW);
        startupStep++;
        startupStepUntil = millis() + 300;
      }
      else if (startupStep == 4) {
        // Step 4: fan remains OFF (we just confirm stable state)
        digitalWrite(7, LOW);  
        digitalWrite(6, LOW);
        startupStep++;
        startupStepUntil = millis() + 300;
      }
      else if (startupStep == 5) {
        // Step 5: relay remains OFF (we just confirm stable state)
        digitalWrite(12, LOW);
        startupStep++;
        startupStepUntil = millis() + 300;
      }
      else if (startupStep == 6) {
        // Startup finished
        startupDone = true;
        showTempMessage("All ready", "");
        forceShowTempMessageNow();
      }
    }

    // Keep welcome/all-ready message behavior and DO NOT run the rest of the system during startup
    return;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // NORMAL PROGRAM AFTER STARTUP

  //bluetooth instructions
  while (Serial.available()) {
  char c = Serial.read();

  if (c == '\r') continue;     
  if (c == '\n') {              
    if (serialBuf.length() > 0) {

      // Toggle fan
      if (serialBuf == "F") {
        fanOn = !fanOn;
        showTempMessage("Ventilator", fanOn ? "ON" : "OFF");
        forceShowTempMessageNow();
      }

      // Toggle door/window
      else if (serialBuf == "D") {
        windowOpen = !windowOpen;
        showTempMessage("Door/Window", windowOpen ? "OPEN" : "CLOSE");
        forceShowTempMessageNow();
      }

      // LCD message: M<line1>|<line2>
      else if (serialBuf.startsWith("M")) {
        String msg = serialBuf.substring(1);

        String line1 = msg;
        String line2 = "";

        int sep = msg.indexOf('|');
        if (sep >= 0) {
          line1 = msg.substring(0, sep);
          line2 = msg.substring(sep + 1);
        }

        // 16x2: trimma
        if (line1.length() > 16) line1 = line1.substring(0, 16);
        if (line2.length() > 16) line2 = line2.substring(0, 16);

        showTempMessage(line1, line2);
        forceShowTempMessageNow();
      }
    }

    serialBuf = ""; // reset
  } else {
    if (serialBuf.length() < 80) serialBuf += c; // protection against to big serialbuf
  }
}
  // Read all sensors
  int gas = analogRead(A0);
  int light = analogRead(A1);
  int soil = analogRead(A2);
  int steam = analogRead(A3);
  int motion = digitalRead(2);
  int btn1 = digitalRead(4);
  int btn2 = digitalRead(8);

  // --- 2. GAS ALARM TEST ---
  bool gasHigh = (gas > gasThreshold);

  // ========================= GAS ALERT EXECUTION =========================

  // Start the gas event only once when gas becomes high (rising edge)
  if (gasHigh && !gasWasHigh && !gasSequenceActive) {

    gasSequenceActive = true;

    // Stage 0 = FIRST 3 seconds ONLY: GAS ALERT + SOLID buzzer
    gasPlanStage = 0;
    gasStageUntil = millis() + 3000;

    // Show GAS ALERT immediately
    showTempMessage("!! GAS ALERT !!", "");
    forceShowTempMessageNow();

    // Gas alert sound MUST be the old SOLID buzzer (Ryad)
    buzzerMode = BUZZ_SOLID;

    // Plan not decided yet — we decide it AFTER these 3 seconds
    gasPlan = PLAN_NONE;
  }

  // While gas sequence is active, we manage stages with IF statements + timers
  if (gasSequenceActive) {

    // If gas ends at any time, stop everything cleanly
    if (!gasHigh) {
      gasSequenceActive = false;
      gasPlan = PLAN_NONE;
      gasPlanStage = 0;
      gasStageUntil = 0;

      // Let LCD go back to normal sensor display
      messageUntil = 0;
      lcdNeedsUpdate = true;

      buzzerMode = BUZZ_OFF;
    }
    else {
      // Gas still high -> proceed through stages

      // ---------- Stage 0: initial 3 seconds SOLID gas alert (NO extra actions) ----------
      if (gasPlanStage == 0) {

        // Keep SOLID buzzer and GAS ALERT display during these 3 seconds
        buzzerMode = BUZZ_SOLID;

        // Once 3 seconds pass, NOW we evaluate your IF rules
        if (millis() >= gasStageUntil) {

          // Decide plan based on CURRENT states AFTER the first 3 seconds
          if (windowOpen && fanOn) {
            // 1) open + fan on -> no extra event, go straight to steady alert
            gasPlan = PLAN_ONLY_ALERT;
            gasPlanStage = 3;
            gasStageUntil = millis(); // run immediately
          }
          else if (windowOpen && !fanOn) {
            // 2) open + fan off -> ventilator step only
            gasPlan = PLAN_VENT_ONLY;
            gasPlanStage = 2;          // stage 2 = ventilator step
            gasStageUntil = millis();  // run immediately
          }
          else if (!windowOpen && !fanOn) {
            // 3) closed + fan off -> open then ventilator
            gasPlan = PLAN_OPEN_THEN_VENT;
            gasPlanStage = 1;          // stage 1 = opening step
            gasStageUntil = millis();  // run immediately
          }
          else { // (!windowOpen && fanOn)
            // 4) closed + fan on -> opening step only
            gasPlan = PLAN_OPEN_ONLY;
            gasPlanStage = 1;          // stage 1 = opening step
            gasStageUntil = millis();  // run immediately
          }
        }
      }

      // ---------- Stage 1: OPENING HOUSE step (beep-beep for 3 seconds) ----------
      if (gasPlanStage == 1 && millis() >= gasStageUntil) {

        // Switch to alarm clock beep-beep ONLY for the safety action message
        buzzerMode = BUZZ_SIREN;

        if (!windowOpen) {
          windowOpen = true;
          doorServo.write(150);
          windowServo.write(150);
        }

        showTempMessage("Opening house", "for safety");
        forceShowTempMessageNow();

        // Hold this message + beep-beep for 3 seconds
        gasStageUntil = millis() + 3000;

        // Next stage depends on plan:
        // - OPEN_THEN_VENT -> go ventilator step
        // - OPEN_ONLY      -> go steady alert
        if (gasPlan == PLAN_OPEN_THEN_VENT) gasPlanStage = 2;
        else                               gasPlanStage = 3;
      }

      // ---------- Stage 2: VENTILATOR ON step (beep-beep for 3 seconds) ----------
      if (gasPlanStage == 2 && millis() >= gasStageUntil) {

        // Switch to alarm clock beep-beep ONLY for the safety action message
        buzzerMode = BUZZ_SIREN;

        fanOn = true;
        digitalWrite(7, HIGH); digitalWrite(6, LOW); // Fan ON

        showTempMessage("Ventilator ON", "for safety");
        forceShowTempMessageNow();

        // Hold this message + beep-beep for 3 seconds
        gasStageUntil = millis() + 3000;

        // After ventilator message, go steady alert
        gasPlanStage = 3;
      }

      // ---------- Stage 3: steady GAS ALERT (SOLID buzzer while gas remains high) ----------
      if (gasPlanStage == 3 && millis() >= gasStageUntil) {

        // Return to SOLID gas alert sound (requested)
        buzzerMode = BUZZ_SOLID;

        // Keep GAS ALERT on the LCD continuously while gas is present
        tempLine1 = "!! GAS ALERT !!";
        tempLine2 = "";
        messageUntil = millis() + 99999999UL;
        lcdNeedsUpdate = true;
        forceShowTempMessageNow();

        // Push the timer forward so we don't spam forceShowTempMessageNow() every loop
        gasStageUntil = millis() + 1000;
      }
    }
  } else {
    // No gas alarm active -> keep buzzer off unless used by other features
    buzzerMode = BUZZ_OFF;
  }

  // Apply buzzer output (gas alarm owns the buzzer when active)
  applyBuzzerMode();

  // Track last gas state for edge detection
  gasWasHigh = gasHigh;
  
  ////////////////////////////////END GAS PART/////////////////////////////////////////////////////////////

  // --- LCD DISPLAY SYSTEM (Single Write Per Loop) ---
  if (lcdNeedsUpdate) {

    lcdNeedsUpdate = false;  // Prevent multiple writes this loop

    // Check if we should show a temporary message
    if (millis() < messageUntil) {

      // Display temporary message
      lcd.setCursor(0, 0);
      lcd.print("                ");  // Clear line
      lcd.setCursor(0, 0);
      lcd.print(tempLine1);

      lcd.setCursor(0, 1);
      lcd.print("                ");  // Clear line
      lcd.setCursor(0, 1);
      lcd.print(tempLine2);

    } else {

      // Display normal sensor values
      lcd.setCursor(0, 0);
      lcd.print("                ");
      lcd.setCursor(0, 0);
      lcd.print("G:"); lcd.print(gas);
      lcd.print(" L:"); lcd.print(light);

      lcd.setCursor(0, 1);
      lcd.print("                ");
      lcd.setCursor(0, 1);
      lcd.print("Stm:"); lcd.print(steam);
      lcd.print(" Sl:"); lcd.print(soil);
    }
  }

  // --- 1. STEAM SENSOR TEST ---
  if (steam > 100) { 
    digitalWrite(13, HIGH); 

    if (!songPlayed) {

      showTempMessage("Rain alert!", "");
      forceShowTempMessageNow(); //shows the message immediately and ignores delays

      // IMPORTANT: do not fight the gas alarm buzzer
      if (!gasHigh && !gasSequenceActive) {
        // Simple melody
        tone(3, 262, 200); delay(250); // C
        tone(3, 294, 200); delay(250); // D
        tone(3, 330, 200); delay(250); // E
        tone(3, 349, 200); delay(250); // F
        noTone(3);
      }

      songPlayed = true;

      // New feature:
      // When Rain alert! Is turned on, after the event is made, we will trigger a new event:
      // if the door and window are open we will close them and display a message 'Closing door/window for safety'.
      if (windowOpen) {
        windowOpen = false;

        showTempMessage("Closing house", 
                        "for safety");
        forceShowTempMessageNow();

        // Servos restored to original settings (both move together immediately, no delay)
        doorServo.write(0);
        windowServo.write(0);
      }
    }

  } else {
    digitalWrite(13, LOW);
    songPlayed = false;
  }

  // --- 3. BUTTON 1: LED & FAN TEST ---
  if (btn1 == LOW && lastBtn1State == HIGH) {
    fanOn = !fanOn;

    if (fanOn) showTempMessage("Ventilator ", "ON");
    else       showTempMessage("Ventilator ", "OFF");

  }

  lastBtn1State = btn1;

  if (fanOn) {
    digitalWrite(7, HIGH); digitalWrite(6, LOW); // Fan ON
  } else {
    digitalWrite(7, LOW); digitalWrite(6, LOW); // Fan OFF
  }

  // --- 4. BUTTON 2: SERVO TEST (TOGGLE) ---
  if (btn2 == LOW && lastBtn2State == HIGH) {
    windowOpen = !windowOpen;

    if (windowOpen) showTempMessage("Door/Window", "OPEN");
    else            showTempMessage("Door/Window", "CLOSE");
  }

  lastBtn2State = btn2;

  // Servos restored to original settings (both move together immediately, no delay)
  if (windowOpen) {
    doorServo.write(150);
    windowServo.write(150);
  } else {
    doorServo.write(0);
    windowServo.write(0);
  }

  // --- 5. MOTION TEST ---
  // If motion detected, click the Relay (Pin 12)
  if (motion == HIGH) {
    digitalWrite(5, HIGH); 
  } else {
    digitalWrite(5, LOW);
  }

  delay(200); 
}