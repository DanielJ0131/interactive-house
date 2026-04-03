#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

//GLOBALS
void MusicEngine(); // Initalize method
void playExternalSong(String data);

// Initialize LCD and Servos based on YOUR corrected pins
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo doorServo; // Pin 9
Servo windowServo; // Pin 10

String serialBuf = "";
String songBuf = "";

// Defined later in the file; needed for telemetry helper.
extern bool manualBuzzerOn;

// Threshold for Gas Alarm (Adjust this number if it's too sensitive)
const int gasThreshold = 100;

//toggle function for the window/door
bool doorOpen = false; // remembers door state
bool windowOpen = false; // remembers window state
int lastBtn2State = HIGH; // for edge detection

//toggle function for lights
bool whiteLightOn = false; // pin 13
bool orangeLightOn = false; // pin 5

//SONG SETUP
//when the touch/water sensor detects something, a song will play
bool songPlayed = false;

//toggle function for the ventilator
bool fan_ina_on = false; // pin 7 state
bool fan_inb_on = false; // pin 6 state
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

// Push physical state to gateway for Firebase sync (bidirectional pipeline)
unsigned long lastStatePush = 0;
const unsigned long statePushInterval = 1000;

const char *openCloseStr(bool v) {
    return v ? "open" : "close";
}

const char *onOffStr(bool v) {
    return v ? "on" : "off";
}

void sendStateLine(int gas, int steam, int motion) {
    if (millis() - lastStatePush < statePushInterval) {
        return;
    }
    lastStatePush = millis();

    Serial.print("STATE door=");
    Serial.print(openCloseStr(doorOpen));
    Serial.print(" window=");
    Serial.print(openCloseStr(windowOpen));
    Serial.print(" buzzer=");
    Serial.print(onOffStr(manualBuzzerOn));
    Serial.print(" fan_ina=");
    Serial.print(onOffStr(fan_ina_on));
    Serial.print(" fan_inb=");
    Serial.print(onOffStr(fan_inb_on));
    Serial.print(" white_light=");
    Serial.print(onOffStr(whiteLightOn));
    Serial.print(" orange_light=");
    Serial.print(onOffStr(orangeLightOn));
    Serial.print(" gas=");
    Serial.print(gas);
    Serial.print(" steam=");
    Serial.print(steam);
    Serial.print(" motion=");
    Serial.println(motion);
}

////////////////////////////////////////////////////////////////////////////////////////////////
//HELPERS
// =====================================================
// Displays a temporary message for 3 seconds.
// After 3 seconds, LCD returns to normal sensor display.
// =====================================================
void showTempMessage(String line1, String line2) {
    tempLine1 = line1;
    tempLine2 = line2;
    messageUntil = millis() + 3000; // Message visible for 3 seconds
    lcdNeedsUpdate = true; // Force LCD refresh
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
    tone(3, 392, 180);
    delay(220); // G4
    tone(3, 523, 180);
    delay(220); // C5
    tone(3, 659, 220);
    delay(260); // E5
    tone(3, 784, 300);
    delay(340); // G5
    tone(3, 659, 260);
    delay(300); // E5
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

bool gasSequenceActive = false; // remembers state (we are inside a gas event)
bool gasWasHigh = false; // edge detection for gas event start
unsigned long gasStageUntil = 0; // timer used for each stage

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
bool manualBuzzerOn = false;

// Alarm clock style beep (non-blocking)
// This is a typical "beep beep ... beep beep" pattern.
bool alarmBeepActive = false;
bool alarmBeepOn = false;
unsigned long alarmBeepNextToggle = 0;
int alarmBeepStep = 0;

// You can adjust these numbers to change the alarm clock feeling. Play with the instructions if you want to learn.
const int alarmBeepFreq = 1800; // alarm clock pitch (higher = more "alarm clock")
const unsigned long alarmOnMs = 120; // beep ON time
const unsigned long alarmOffMs = 120; // short OFF between beeps
const unsigned long alarmGapMs = 350; // longer gap after the "beep beep" pair

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
        } else if (alarmBeepStep == 1) {
            noTone(3);
            alarmBeepOn = false;
            alarmBeepNextToggle = millis() + alarmOffMs;
        } else if (alarmBeepStep == 2) {
            tone(3, alarmBeepFreq);
            alarmBeepOn = true;
            alarmBeepNextToggle = millis() + alarmOnMs;
        } else {
            // alarmBeepStep == 3
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
    } else if (buzzerMode == BUZZ_SOLID) {
        // Important: stop tone so it can't interfere with solid pin HIGH
        updateSiren(false);
        noTone(3);
        digitalWrite(3, HIGH);
    } else if (buzzerMode == BUZZ_SIREN) {
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
    pinMode(5, OUTPUT); // Yellow LED
    pinMode(13, OUTPUT); // White LED
    pinMode(7, OUTPUT); // Fan (INA)
    pinMode(6, OUTPUT); // Fan (INB)
    pinMode(12, OUTPUT); // Relay
    pinMode(3, OUTPUT); // Buzzer

    // Input Pins
    pinMode(4, INPUT); // Button 1
    pinMode(8, INPUT); // Button 2
    pinMode(2, INPUT); // PIR Motion

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
                doorOpen = false;
                windowOpen = false;
                fan_ina_on = false;
                fan_inb_on = false;
                manualBuzzerOn = false;
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
            } else if (startupStep == 1) {
                // Step 1: attach servos (only now, not instantly at boot)
                doorServo.attach(9); //
                windowServo.attach(10); //
                doorServo.write(0);
                windowServo.write(0);

                startupStep++;
                startupStepUntil = millis() + 600; // give batteries time to recover from servo attach
            } else if (startupStep == 2) {
                // Step 2: tiny LED test (low current)
                digitalWrite(13, HIGH);
                startupStep++;
                startupStepUntil = millis() + 300;
            } else if (startupStep == 3) {
                // Step 3: LED off
                digitalWrite(13, LOW);
                startupStep++;
                startupStepUntil = millis() + 300;
            } else if (startupStep == 4) {
                // Step 4: fan remains OFF (we just confirm stable state)
                digitalWrite(7, LOW);
                digitalWrite(6, LOW);
                startupStep++;
                startupStepUntil = millis() + 300;
            } else if (startupStep == 5) {
                // Step 5: relay remains OFF (we just confirm stable state)
                digitalWrite(12, LOW);
                startupStep++;
                startupStepUntil = millis() + 300;
            } else if (startupStep == 6) {
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
                if (songBuf.length() > 0) {
                    playExternalSong(songBuf);
                    songBuf = "";
                } else if (serialBuf.length() > 0) {
                    // ... (Your existing if/else if blocks for X, Y, D, N, B, W, O, M) ...
                    // Toggle fan INA (pin 7)
                    if (serialBuf == "X") {
                        fan_ina_on = !fan_ina_on;
                        showTempMessage("Fan INA", fan_ina_on ? "ON" : "OFF");
                        forceShowTempMessageNow();
                    }

                    // Toggle fan INB (pin 6)
                    else if (serialBuf == "Y") {
                        fan_inb_on = !fan_inb_on;
                        showTempMessage("Fan INB", fan_inb_on ? "ON" : "OFF");
                        forceShowTempMessageNow();
                    }

                    // Door command: D (toggle), D:1 (open), D:0 (close)
                    else if (serialBuf == "D" || serialBuf == "D:1" || serialBuf == "D:0") {
                        if (serialBuf == "D:1") {
                            doorOpen = true;
                        } else if (serialBuf == "D:0") {
                            doorOpen = false;
                        } else {
                            doorOpen = !doorOpen;
                        }
                        showTempMessage("Door", doorOpen ? "OPEN" : "CLOSE");
                        forceShowTempMessageNow();
                    }

                    // Window command: N (toggle), N:1 (open), N:0 (close)
                    else if (serialBuf == "N" || serialBuf == "N:1" || serialBuf == "N:0") {
                        if (serialBuf == "N:1") {
                            windowOpen = true;
                        } else if (serialBuf == "N:0") {
                            windowOpen = false;
                        } else {
                            windowOpen = !windowOpen;
                        }
                        showTempMessage("Window", windowOpen ? "OPEN" : "CLOSE");
                        forceShowTempMessageNow();
                    }

                    // Buzzer command: B (toggle), B:1 (on), B:0 (off)
                    else if (serialBuf == "B" || serialBuf == "B:1" || serialBuf == "B:0") {
                        if (serialBuf == "B:1") {
                            manualBuzzerOn = true;
                            showTempMessage("Buzzer", "ON");
                        } else if (serialBuf == "B:0") {
                            manualBuzzerOn = false;
                            showTempMessage("Buzzer", "OFF");
                        } else {
                            manualBuzzerOn = !manualBuzzerOn;
                            if (manualBuzzerOn) {
                                showTempMessage("Buzzer", "ON");
                            } else {
                                showTempMessage("Buzzer", "OFF");
                            }
                        }
                        if (!gasSequenceActive) {
                            buzzerMode = manualBuzzerOn ? BUZZ_SIREN : BUZZ_OFF;
                        }
                        forceShowTempMessageNow();
                    }

                    // Toggle white light
                    else if (serialBuf == "W") {
                        whiteLightOn = !whiteLightOn;
                        showTempMessage("White Light", whiteLightOn ? "ON" : "OFF");
                        forceShowTempMessageNow();
                    }

                    // Toggle orange light
                    else if (serialBuf == "O") {
                        orangeLightOn = !orangeLightOn;
                        showTempMessage("Orange Light", orangeLightOn ? "ON" : "OFF");
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
                } else {
                    // If the first character is 'S', it's a song.
                    // Put it in songBuf so it doesn't break standard commands.
                    if (c == 'S' || songBuf.length() > 0) {
                        if (songBuf.length() < 1200) songBuf += c; // Fills the song variable
                    } else {
                        if (serialBuf.length() < 80) serialBuf += c; // Fills the standard command variable
                    }
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

            buzzerMode = manualBuzzerOn ? BUZZ_SIREN : BUZZ_OFF;
        } else {
            // Gas still high -> proceed through stages

            // ---------- Stage 0: initial 3 seconds SOLID gas alert (NO extra actions) ----------
            if (gasPlanStage == 0) {
                // Keep SOLID buzzer and GAS ALERT display during these 3 seconds
                buzzerMode = BUZZ_SOLID;

                // Once 3 seconds pass, NOW we evaluate your IF rules
                if (millis() >= gasStageUntil) {
                    // Decide plan based on CURRENT states AFTER the first 3 seconds
                    bool fanOn = (fan_ina_on || fan_inb_on);
                    bool houseOpen = (doorOpen || windowOpen);
                    if (houseOpen && fanOn) {
                        // 1) open + fan on -> no extra event, go straight to steady alert
                        gasPlan = PLAN_ONLY_ALERT;
                        gasPlanStage = 3;
                        gasStageUntil = millis(); // run immediately
                    } else if (houseOpen && !fanOn) {
                        // 2) open + fan off -> ventilator step only
                        gasPlan = PLAN_VENT_ONLY;
                        gasPlanStage = 2; // stage 2 = ventilator step
                        gasStageUntil = millis(); // run immediately
                    } else if (!houseOpen && !fanOn) {
                        // 3) closed + fan off -> open then ventilator
                        gasPlan = PLAN_OPEN_THEN_VENT;
                        gasPlanStage = 1; // stage 1 = opening step
                        gasStageUntil = millis(); // run immediately
                    } else {
                        // (!houseOpen && fanOn)
                        // 4) closed + fan on -> opening step only
                        gasPlan = PLAN_OPEN_ONLY;
                        gasPlanStage = 1; // stage 1 = opening step
                        gasStageUntil = millis(); // run immediately
                    }
                }
            }

            // ---------- Stage 1: OPENING HOUSE step (beep-beep for 3 seconds) ----------
            if (gasPlanStage == 1 && millis() >= gasStageUntil) {
                // Switch to alarm clock beep-beep ONLY for the safety action message
                buzzerMode = BUZZ_SIREN;

                if (!doorOpen || !windowOpen) {
                    doorOpen = true;
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
                else gasPlanStage = 3;
            }

            // ---------- Stage 2: VENTILATOR ON step (beep-beep for 3 seconds) ----------
            if (gasPlanStage == 2 && millis() >= gasStageUntil) {
                // Switch to alarm clock beep-beep ONLY for the safety action message
                buzzerMode = BUZZ_SIREN;

                fan_ina_on = true;
                fan_inb_on = false; // Set to motor forward direction

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
        // No gas alarm active -> keep manual buzzer state
        buzzerMode = manualBuzzerOn ? BUZZ_SIREN : BUZZ_OFF;
    }

    // Apply buzzer output (gas alarm owns the buzzer when active)
    applyBuzzerMode();

    // Track last gas state for edge detection
    gasWasHigh = gasHigh;

    ////////////////////////////////END GAS PART/////////////////////////////////////////////////////////////

    // --- LCD DISPLAY SYSTEM (Single Write Per Loop) ---
    if (lcdNeedsUpdate) {
        lcdNeedsUpdate = false; // Prevent multiple writes this loop

        // Check if we should show a temporary message
        if (millis() < messageUntil) {
            // Display temporary message
            lcd.setCursor(0, 0);
            lcd.print("                "); // Clear line
            lcd.setCursor(0, 0);
            lcd.print(tempLine1);

            lcd.setCursor(0, 1);
            lcd.print("                "); // Clear line
            lcd.setCursor(0, 1);
            lcd.print(tempLine2);
        } else {
            // Display normal sensor values
            lcd.setCursor(0, 0);
            lcd.print("                ");
            lcd.setCursor(0, 0);
            lcd.print("G:");
            lcd.print(gas);
            lcd.print(" L:");
            lcd.print(light);

            lcd.setCursor(0, 1);
            lcd.print("                ");
            lcd.setCursor(0, 1);
            lcd.print("Stm:");
            lcd.print(steam);
            lcd.print(" Sl:");
            lcd.print(soil);
        }
    }

    // --- 1. STEAM SENSOR TEST ---
    if (steam > 100) {
        // Auto-turn on white light on rain (unless controlled by Firebase)
        if (!whiteLightOn) {
            whiteLightOn = true;
        }

        if (!songPlayed) {
            showTempMessage("Rain alert!", "");
            forceShowTempMessageNow(); //shows the message immediately and ignores delays

            // IMPORTANT: do not fight the gas alarm buzzer
            if (!gasHigh && !gasSequenceActive) {
                // Simple melody
                tone(3, 262, 200);
                delay(250); // C
                tone(3, 294, 200);
                delay(250); // D
                tone(3, 330, 200);
                delay(250); // E
                tone(3, 349, 200);
                delay(250); // F
                noTone(3);
            }

            songPlayed = true;

            // New feature:
            // When Rain alert! Is turned on, after the event is made, we will trigger a new event:
            // if the door and window are open we will close them and display a message 'Closing door/window for safety'.
            if (doorOpen || windowOpen) {
                doorOpen = false;
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
        songPlayed = false;
    }

    // --- 3. BUTTON 1: FAN TEST ---
    if (btn1 == LOW && lastBtn1State == HIGH) {
        fan_ina_on = !fan_ina_on;
        showTempMessage("Fan INA", fan_ina_on ? "ON" : "OFF");
    }

    lastBtn1State = btn1;

    // Apply fan pin states
    if (fan_ina_on) {
        digitalWrite(7, HIGH);
    } else {
        digitalWrite(7, LOW);
    }

    if (fan_inb_on) {
        digitalWrite(6, HIGH);
    } else {
        digitalWrite(6, LOW);
    }

    // --- 4. BUTTON 2: SERVO TEST (TOGGLE HOUSE) ---
    if (btn2 == LOW && lastBtn2State == HIGH) {
        bool houseOpen = (doorOpen || windowOpen);
        houseOpen = !houseOpen;
        doorOpen = houseOpen;
        windowOpen = houseOpen;

        if (houseOpen) showTempMessage("Door/Window", "OPEN");
        else showTempMessage("Door/Window", "CLOSE");
    }

    lastBtn2State = btn2;

    // Apply door servo
    if (doorOpen) {
        doorServo.write(150);
    } else {
        doorServo.write(0);
    }

    // Apply window servo
    if (windowOpen) {
        windowServo.write(150);
    } else {
        windowServo.write(0);
    }

    // --- 5. MOTION TEST ---
    // Auto-turn on orange light on motion (unless controlled by Firebase)
    if (motion == HIGH) {
        if (!orangeLightOn) {
            orangeLightOn = true;
        }
    }

    // Apply light states
    if (whiteLightOn) {
        digitalWrite(13, HIGH);
    } else {
        digitalWrite(13, LOW);
    }

    if (orangeLightOn) {
        digitalWrite(5, HIGH);
    } else {
        digitalWrite(5, LOW);
    }
    MusicEngine();
    // Send current physical state and sensor values for Firebase bidirectional sync
    sendStateLine(gas, steam, motion);

    delay(200);
}


#include <Arduino.h>

// Pins
const int BUTTON_MUSIC = 8;
const int BUTTON_LED = 4;
const int BUZZER_PIN = 3;
const int LED_PIN = 13;

// Musical Notes
#define NOTE_G3  196
#define NOTE_GS3 208
#define NOTE_A3  220
#define NOTE_AS3 233
#define NOTE_B3  247
#define NOTE_C4  262
#define NOTE_CS4 277
#define NOTE_D4  294
#define NOTE_DS4 311
#define NOTE_E4  330
#define NOTE_F4  349
#define NOTE_FS4 370
#define NOTE_G4  392
#define NOTE_GS4 415
#define NOTE_A4  440
#define NOTE_AS4 466
#define NOTE_B4  494
#define NOTE_C5  523
#define NOTE_CS5 554
#define NOTE_D5  587
#define NOTE_DS5 622
#define NOTE_E5  659
#define NOTE_F5  698
#define NOTE_FS5 740
#define NOTE_G5  784
#define NOTE_GS5 831
#define NOTE_A5  880

// The Complete Extended Melody
int melody[] = {
    // Section 1: Main Theme
    NOTE_A4, NOTE_A4, NOTE_A4, NOTE_F4, NOTE_C5, NOTE_A4, NOTE_F4, NOTE_C5, NOTE_A4,
    NOTE_E5, NOTE_E5, NOTE_E5, NOTE_F5, NOTE_C5, NOTE_GS4, NOTE_F4, NOTE_C5, NOTE_A4,

    // Section 2: The Bridge
    NOTE_A5, NOTE_A4, NOTE_A4, NOTE_A5, NOTE_GS5, NOTE_G5, NOTE_FS5, NOTE_F5, NOTE_FS5,
    NOTE_AS4, NOTE_DS5, NOTE_D5, NOTE_CS5, NOTE_C5, NOTE_B4, NOTE_C5, NOTE_F4, NOTE_GS4,
    NOTE_F4, NOTE_A4, NOTE_C5, NOTE_A4, NOTE_C5, NOTE_E5,

    // Section 3: Bridge Part 2 & Higher Octave
    NOTE_A5, NOTE_A4, NOTE_A4, NOTE_A5, NOTE_GS5, NOTE_G5, NOTE_FS5, NOTE_F5, NOTE_FS5,
    NOTE_AS4, NOTE_DS5, NOTE_D5, NOTE_CS5, NOTE_C5, NOTE_B4, NOTE_C5, NOTE_F4, NOTE_GS4,
    NOTE_F4, NOTE_C5, NOTE_A4, NOTE_F4, NOTE_C5, NOTE_A4
};

int durations[] = {
    500, 500, 500, 350, 150, 500, 350, 150, 1000,
    500, 500, 500, 350, 150, 500, 350, 150, 1000,
    500, 350, 150, 500, 350, 150, 125, 125, 250,
    250, 500, 350, 150, 125, 125, 250, 250, 500,
    350, 150, 500, 350, 150, 1000,
    500, 350, 150, 500, 350, 150, 125, 125, 250,
    250, 500, 350, 150, 125, 125, 250, 250, 500,
    350, 150, 500, 350, 150, 1000
};

const int melodyLength = sizeof(melody) / sizeof(melody[0]);

// State Variables
bool isPlaying = false;
int currentNote = 0;
unsigned long lastNoteTime = 0;
bool lastButtonState = HIGH;
bool noteIsSounding = false;


void MusicEngine() {
    unsigned long currentMillis = millis();
    // --- PLAY/PAUSE LOGIC ---
    bool currentButtonState = digitalRead(BUTTON_MUSIC);
    if (lastButtonState == HIGH && currentButtonState == LOW) {
        isPlaying = !isPlaying;
        if (!isPlaying) {
            noTone(BUZZER_PIN);
            noteIsSounding = false;
        }
        delay(50); // Debounce
    }
    lastButtonState = currentButtonState;

    // --- MUSIC ENGINE ---
    if (isPlaying) {
        int totalNoteDuration = durations[currentNote];
        int soundDuration = totalNoteDuration * 0.9;

        if (noteIsSounding && (currentMillis - lastNoteTime >= soundDuration)) {
            noTone(BUZZER_PIN);
            noteIsSounding = false;
        }

        if (currentMillis - lastNoteTime >= totalNoteDuration) {
            currentNote++;

            if (currentNote >= melodyLength) {
                isPlaying = false;
                currentNote = 0;
                noTone(BUZZER_PIN);
            } else {
                tone(BUZZER_PIN, melody[currentNote]);
                lastNoteTime = currentMillis;
                noteIsSounding = true;
            }
        }
    }
}

void playExternalSong(String data) {
    String songData = data.substring(1); // Strip the 'S' prefix

    showTempMessage("Syncing Song...", "");
    forceShowTempMessageNow();

    while (songData.length() > 0) {
        int comma1 = songData.indexOf(',');
        if (comma1 == -1) break;

        int note = songData.substring(0, comma1).toInt();
        songData = songData.substring(comma1 + 1);

        int comma2 = songData.indexOf(',');
        int duration;
        if (comma2 == -1) {
            duration = songData.toInt();
            songData = "";
        } else {
            duration = songData.substring(0, comma2).toInt();
            songData = songData.substring(comma2 + 1);
        }

        // Safety check: Don't play if gas alarm is active
        if (!gasSequenceActive && note > 0) {
            tone(3, note, duration);
            delay(duration * 1.2);
        }
    }
    noTone(3);
}