#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

// ================= MUSICAL NOTES =================
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

// ================= GLOBALS =================
void MusicEngine(); // Initalize method
void playExternalSong(String data);
bool normalizeSongPair(int &note, int &duration);
void beginPlaybackFromLoadedSong();

// Initialize LCD and Servos
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo doorServo;   // Pin 9
Servo windowServo; // Pin 10

String serialBuf = "";
String songBuf = "";

extern bool manualBuzzerOn;

// Threshold for Gas Alarm
const int gasThreshold = 100;

// Toggle function for the window/door
bool doorOpen = false;
bool windowOpen = false;
int lastBtn2State = HIGH;

// Toggle function for lights
bool whiteLightOn = false; // pin 13
int orangeLightValue = 0; // PWM pin 5, 0-255

// Song Setup (Rain alert)
bool songPlayed = false;

// Toggle function for the ventilator
bool fan_ina_on = false; // pin 7 state
bool fan_inb_on = false; // pin 6 state
int lastBtn1State = HIGH;

// ================= MUSIC ENGINE VARIABLES =================
const int maxSongNotes = 150;
int songMelody[maxSongNotes];
int songDurations[maxSongNotes];
int songLength = 0;
bool uploadActive = false;
bool isPlaying = false;
int currentNote = 0;
unsigned long lastNoteTime = 0;
bool noteIsSounding = false;
bool musicModeOn = false;
unsigned long normalBeepNextAt = 0;
bool normalBeepOn = false;
const unsigned long normalBeepOnMs = 180;
const unsigned long normalBeepOffMs = 420;

// ================= LCD CONTROL SYSTEM =================
unsigned long messageUntil = 0;
String tempLine1 = "";
String tempLine2 = "";
bool lcdNeedsUpdate = true;
unsigned long lastSensorLcdUpdate = 0;
const unsigned long sensorLcdInterval = 500;

unsigned long lastStatePush = 0;
const unsigned long statePushInterval = 1000;

const char *openCloseStr(bool v) { return v ? "open" : "close"; }
const char *onOffStr(bool v) { return v ? "on" : "off"; }

void sendStateLine(int gas, int steam, int motion, int light, int soil) {
    if (millis() - lastStatePush < statePushInterval) return;
    lastStatePush = millis();

    Serial.print("STATE door="); Serial.print(openCloseStr(doorOpen));
    Serial.print(" window="); Serial.print(openCloseStr(windowOpen));
    Serial.print(" buzzer="); Serial.print(onOffStr(manualBuzzerOn));
    Serial.print(" fan_ina="); Serial.print(onOffStr(fan_ina_on));
    Serial.print(" fan_inb="); Serial.print(onOffStr(fan_inb_on));
    Serial.print(" white_light="); Serial.print(onOffStr(whiteLightOn));
    Serial.print(" orange_light="); Serial.print(orangeLightValue);
    Serial.print(" gas="); Serial.print(gas);
    Serial.print(" light="); Serial.print(light);
    Serial.print(" soil="); Serial.print(soil);
    Serial.print(" steam="); Serial.print(steam);
    Serial.print(" motion="); Serial.println(motion);
}

// ================= HELPERS =================
void showTempMessage(String line1, String line2) {
    tempLine1 = line1;
    tempLine2 = line2;
    messageUntil = millis() + 3000;
    lcdNeedsUpdate = true;
}

void forceShowTempMessageNow() {
    lcd.setCursor(0, 0); lcd.print("                ");
    lcd.setCursor(0, 0); lcd.print(tempLine1);
    lcd.setCursor(0, 1); lcd.print("                ");
    lcd.setCursor(0, 1); lcd.print(tempLine2);
}

void playStartupMelody() {
    // One-shot boot beep so hardware can be verified quickly.
    tone(3, 1000, 180);
    delay(220);
    noTone(3);
}

// ================= STARTUP & GAS =================
bool startupDone = false;
int startupStep = 0;
unsigned long startupStepUntil = 0;

bool gasSequenceActive = false;
bool gasWasHigh = false;
unsigned long gasStageUntil = 0;

enum GasPlan { PLAN_NONE, PLAN_ONLY_ALERT, PLAN_VENT_ONLY, PLAN_OPEN_ONLY, PLAN_OPEN_THEN_VENT };
GasPlan gasPlan = PLAN_NONE;
int gasPlanStage = 0;

enum BuzzerMode { BUZZ_OFF, BUZZ_SOLID, BUZZ_SIREN };
BuzzerMode buzzerMode = BUZZ_OFF;
bool manualBuzzerOn = false;

// Keep siren state variables but disable hardcoded beep patterns.
bool alarmBeepActive = false;
bool alarmBeepOn = false;
unsigned long alarmBeepNextToggle = 0;
int alarmBeepStep = 0;

void updateSiren(bool enableAlarmClockBeep) {
    (void)enableAlarmClockBeep;
    if (alarmBeepActive) noTone(3);
    alarmBeepActive = false;
    alarmBeepOn = false;
    alarmBeepNextToggle = 0;
    alarmBeepStep = 0;
}

// Applies the requested buzzer mode. We hijack BUZZ_SIREN to play the melody!
void applyBuzzerMode() {
    // Music playback has priority over manual buzzer so melody behavior is explicit.
    if (musicModeOn) {
        if (normalBeepOn) {
            noTone(3);
            normalBeepOn = false;
        }
        normalBeepNextAt = 0;

        if (songLength <= 0) {
            updateSiren(false);
            isPlaying = false;
            noTone(3);
        } else {
            updateSiren(false);
            if (!isPlaying) {
                isPlaying = true;
                currentNote = 0;
                lastNoteTime = millis();
                if (songMelody[0] > 0) {
                    tone(3, songMelody[0]);
                    noteIsSounding = true;
                } else {
                    noTone(3);
                    noteIsSounding = false;
                }
            }
        }
        return;
    }

    if (buzzerMode == BUZZ_OFF) {
        updateSiren(false);
        isPlaying = false; // Stop the melody
        noTone(3);
        digitalWrite(3, LOW);
        normalBeepNextAt = 0;
        normalBeepOn = false;
    } else if (buzzerMode == BUZZ_SOLID) {
        updateSiren(false);
        isPlaying = false; // Stop the melody

        // Clean periodic beep: no digitalWrite fights while tone is active.
        unsigned long now = millis();
        if (normalBeepNextAt == 0) {
            tone(3, 1000);
            normalBeepOn = true;
            normalBeepNextAt = now + normalBeepOnMs;
        } else if (now >= normalBeepNextAt) {
            if (normalBeepOn) {
                noTone(3);
                normalBeepOn = false;
                normalBeepNextAt = now + normalBeepOffMs;
            } else {
                tone(3, 1000);
                normalBeepOn = true;
                normalBeepNextAt = now + normalBeepOnMs;
            }
        }
    } else if (buzzerMode == BUZZ_SIREN) {
        // Siren pattern is currently disabled; keep buzzer audible in fallback mode.
        updateSiren(false);
        isPlaying = false;
        noTone(3);
        digitalWrite(3, LOW);
        normalBeepNextAt = 0;
        normalBeepOn = false;
    }
}

// ================= SETUP =================
void setup() {
    Serial.begin(9600);
    lcd.init();
    lcd.backlight();

    // Output Pins
    pinMode(5, OUTPUT);
    pinMode(13, OUTPUT);
    pinMode(7, OUTPUT);
    pinMode(6, OUTPUT);
    pinMode(12, OUTPUT);
    pinMode(3, OUTPUT);

    // Input Pins
    pinMode(4, INPUT);
    pinMode(8, INPUT);
    pinMode(2, INPUT);

    // Force everything OFF
    analogWrite(5, 0);
    digitalWrite(13, LOW);
    digitalWrite(7, LOW);
    digitalWrite(6, LOW);
    digitalWrite(12, LOW);
    digitalWrite(3, LOW);
    noTone(3);

    tempLine1 = "Welcome! Turning";
    tempLine2 = "the device on...";
    messageUntil = millis() + 99999999UL;
    forceShowTempMessageNow();
    playStartupMelody();

    startupDone = false;
    startupStep = 0;
    startupStepUntil = millis();
}

// ================= LOOP =================
void loop() {
    if (millis() - lastSensorLcdUpdate >= sensorLcdInterval) {
        lastSensorLcdUpdate = millis();
        lcdNeedsUpdate = true;
    }

    if (!startupDone) {
        if (millis() >= startupStepUntil) {
            if (startupStep == 0) {
                analogWrite(5, 0); digitalWrite(13, LOW); digitalWrite(7, LOW);
                digitalWrite(6, LOW); digitalWrite(12, LOW); digitalWrite(3, LOW);
                noTone(3);
                doorOpen = false; windowOpen = false; fan_ina_on = false; fan_inb_on = false;
                manualBuzzerOn = false; songPlayed = false;
                musicModeOn = false;
                gasSequenceActive = false; gasWasHigh = false; gasPlan = PLAN_NONE;
                gasPlanStage = 0; gasStageUntil = 0;
                buzzerMode = BUZZ_OFF; applyBuzzerMode();
                startupStep++; startupStepUntil = millis() + 400;
            } else if (startupStep == 1) {
                doorServo.attach(9); windowServo.attach(10);
                doorServo.write(0); windowServo.write(0);
                startupStep++; startupStepUntil = millis() + 600;
            } else if (startupStep == 2) {
                digitalWrite(13, HIGH); startupStep++; startupStepUntil = millis() + 300;
            } else if (startupStep == 3) {
                digitalWrite(13, LOW); startupStep++; startupStepUntil = millis() + 300;
            } else if (startupStep == 4) {
                digitalWrite(7, LOW); digitalWrite(6, LOW); startupStep++; startupStepUntil = millis() + 300;
            } else if (startupStep == 5) {
                digitalWrite(12, LOW); startupStep++; startupStepUntil = millis() + 300;
            } else if (startupStep == 6) {
                startupDone = true;
                showTempMessage("All ready", "");
                forceShowTempMessageNow();
            }
        }
        return;
    }

    // --- BLUETOOTH / SERIAL COMMANDS ---
    while (Serial.available()) {
        char c = Serial.read();
        if (c == '\r') continue;

        if (c == '\n') {
            if (songBuf.length() > 0) {
                playExternalSong(songBuf);
                songBuf = "";
            } else if (serialBuf.length() > 0) {
                if (serialBuf == "X") {
                    fan_ina_on = !fan_ina_on;
                    showTempMessage("Fan INA", fan_ina_on ? "ON" : "OFF");
                    forceShowTempMessageNow();
                }
                else if (serialBuf == "Y") {
                    fan_inb_on = !fan_inb_on;
                    showTempMessage("Fan INB", fan_inb_on ? "ON" : "OFF");
                    forceShowTempMessageNow();
                }
                else if (serialBuf == "D" || serialBuf == "D:1" || serialBuf == "D:0") {
                    if (serialBuf == "D:1") doorOpen = true;
                    else if (serialBuf == "D:0") doorOpen = false;
                    else doorOpen = !doorOpen;
                    showTempMessage("Door", doorOpen ? "OPEN" : "CLOSE");
                    forceShowTempMessageNow();
                }
                else if (serialBuf == "N" || serialBuf == "N:1" || serialBuf == "N:0") {
                    if (serialBuf == "N:1") windowOpen = true;
                    else if (serialBuf == "N:0") windowOpen = false;
                    else windowOpen = !windowOpen;
                    showTempMessage("Window", windowOpen ? "OPEN" : "CLOSE");
                    forceShowTempMessageNow();
                }
                else if (serialBuf == "B" || serialBuf == "B:1" || serialBuf == "B:0") {
                    if (serialBuf == "B:1") {
                        manualBuzzerOn = true; showTempMessage("Buzzer", "ON");
                    } else if (serialBuf == "B:0") {
                        manualBuzzerOn = false; showTempMessage("Buzzer", "OFF");
                    } else {
                        manualBuzzerOn = !manualBuzzerOn;
                        showTempMessage("Buzzer", manualBuzzerOn ? "ON" : "OFF");
                    }
                    if (!gasSequenceActive) {
                        buzzerMode = manualBuzzerOn ? BUZZ_SOLID : BUZZ_OFF;
                    }
                    forceShowTempMessageNow();
                }
                else if (serialBuf == "P:1" || serialBuf == "P:0") {
                    musicModeOn = (serialBuf == "P:1");
                    if (!musicModeOn) {
                        isPlaying = false;
                        currentNote = 0;
                        noteIsSounding = false;
                        noTone(3);
                    } else if (songLength > 0) {
                        beginPlaybackFromLoadedSong();
                    }
                }
                else if (serialBuf == "W") {
                    whiteLightOn = !whiteLightOn;
                    showTempMessage("White Light", whiteLightOn ? "ON" : "OFF");
                    forceShowTempMessageNow();
                }
                else if (serialBuf.startsWith("O:")) {
                    int brightness = serialBuf.substring(2).toInt();
                    orangeLightValue = constrain(brightness, 0, 255);
                    showTempMessage("Orange Light", String(orangeLightValue));
                    forceShowTempMessageNow();
                }
                else if (serialBuf == "O") {
                    orangeLightValue = (orangeLightValue > 0) ? 0 : 255;
                    showTempMessage("Orange Light", String(orangeLightValue));
                    forceShowTempMessageNow();
                }
                else if (serialBuf.startsWith("M")) {
                    String msg = serialBuf.substring(1);
                    String line1 = msg; String line2 = "";
                    int sep = msg.indexOf('|');
                    if (sep >= 0) {
                        line1 = msg.substring(0, sep); line2 = msg.substring(sep + 1);
                    }
                    if (line1.length() > 16) line1 = line1.substring(0, 16);
                    if (line2.length() > 16) line2 = line2.substring(0, 16);
                    showTempMessage(line1, line2);
                    forceShowTempMessageNow();
                }
                else if (serialBuf == "C") {
                    songLength = 0;
                    uploadActive = true;
                }
                else if (serialBuf.startsWith("A:")) {
                    int comma = serialBuf.indexOf(',');
                    if (uploadActive && comma > 2 && songLength < maxSongNotes) {
                        int note = serialBuf.substring(2, comma).toInt();
                        int duration = serialBuf.substring(comma + 1).toInt();
                        if (normalizeSongPair(note, duration)) {
                            songMelody[songLength] = note;
                            songDurations[songLength] = duration;
                            songLength++;
                        }
                    }
                }
                else if (serialBuf == "E") {
                    if (uploadActive) {
                        isPlaying = false;
                        currentNote = 0;
                        noteIsSounding = false;
                        noTone(3);

                        if (songLength > 0) {
                            Serial.print("MUSIC loaded=");
                            Serial.print(songLength);
                            Serial.print(" firstFreq=");
                            Serial.print(songMelody[0]);
                            Serial.print(" firstDelay=");
                            Serial.println(songDurations[0]);
                            if (musicModeOn) beginPlaybackFromLoadedSong();
                        } else {
                            Serial.println("MUSIC loaded=0");
                        }
                    }
                    uploadActive = false;
                }
            }
            serialBuf = "";
        } else {
            if (c == 'S' || songBuf.length() > 0) {
                if (songBuf.length() < 1200) songBuf += c;
            } else {
                if (serialBuf.length() < 80) serialBuf += c;
            }
        }
    }

    // Read Sensors
    int gas = analogRead(A0);
    int light = analogRead(A1);
    int soil = analogRead(A2);
    int steam = analogRead(A3);
    int motion = digitalRead(2);
    int btn1 = digitalRead(4);
    int btn2 = digitalRead(8);

    // --- GAS ALARM LOGIC ---
    bool gasHigh = (gas > gasThreshold);

    if (gasHigh && !gasWasHigh && !gasSequenceActive) {
        gasSequenceActive = true;
        gasPlanStage = 0;
        gasStageUntil = millis() + 3000;
        showTempMessage("!! GAS ALERT !!", "");
        forceShowTempMessageNow();
        buzzerMode = BUZZ_SOLID;
        gasPlan = PLAN_NONE;
    }

    if (gasSequenceActive) {
        if (!gasHigh) {
            gasSequenceActive = false; gasPlan = PLAN_NONE; gasPlanStage = 0; gasStageUntil = 0;
            messageUntil = 0; lcdNeedsUpdate = true;
            buzzerMode = manualBuzzerOn ? BUZZ_SOLID : BUZZ_OFF;
        } else {
            if (gasPlanStage == 0) {
                buzzerMode = BUZZ_SOLID;
                if (millis() >= gasStageUntil) {
                    bool fanOn = (fan_ina_on || fan_inb_on);
                    bool houseOpen = (doorOpen || windowOpen);
                    if (houseOpen && fanOn) { gasPlan = PLAN_ONLY_ALERT; gasPlanStage = 3; gasStageUntil = millis(); }
                    else if (houseOpen && !fanOn) { gasPlan = PLAN_VENT_ONLY; gasPlanStage = 2; gasStageUntil = millis(); }
                    else if (!houseOpen && !fanOn) { gasPlan = PLAN_OPEN_THEN_VENT; gasPlanStage = 1; gasStageUntil = millis(); }
                    else { gasPlan = PLAN_OPEN_ONLY; gasPlanStage = 1; gasStageUntil = millis(); }
                }
            }
            if (gasPlanStage == 1 && millis() >= gasStageUntil) {
                buzzerMode = BUZZ_SOLID;
                if (!doorOpen || !windowOpen) {
                    doorOpen = true; windowOpen = true;
                    doorServo.write(150); windowServo.write(150);
                }
                showTempMessage("Opening house", "for safety"); forceShowTempMessageNow();
                gasStageUntil = millis() + 3000;
                if (gasPlan == PLAN_OPEN_THEN_VENT) gasPlanStage = 2; else gasPlanStage = 3;
            }
            if (gasPlanStage == 2 && millis() >= gasStageUntil) {
                buzzerMode = BUZZ_SOLID;
                fan_ina_on = true; fan_inb_on = false;
                showTempMessage("Ventilator ON", "for safety"); forceShowTempMessageNow();
                gasStageUntil = millis() + 3000;
                gasPlanStage = 3;
            }
            if (gasPlanStage == 3 && millis() >= gasStageUntil) {
                buzzerMode = BUZZ_SOLID;
                tempLine1 = "!! GAS ALERT !!"; tempLine2 = "";
                messageUntil = millis() + 99999999UL; lcdNeedsUpdate = true; forceShowTempMessageNow();
                gasStageUntil = millis() + 1000;
            }
        }
    } else {
        buzzerMode = manualBuzzerOn ? BUZZ_SOLID : BUZZ_OFF;
    }

    applyBuzzerMode();
    gasWasHigh = gasHigh;

    // --- LCD DISPLAY SYSTEM ---
    if (lcdNeedsUpdate) {
        lcdNeedsUpdate = false;
        if (millis() < messageUntil) {
            lcd.setCursor(0, 0); lcd.print("                "); lcd.setCursor(0, 0); lcd.print(tempLine1);
            lcd.setCursor(0, 1); lcd.print("                "); lcd.setCursor(0, 1); lcd.print(tempLine2);
        } else {
            lcd.setCursor(0, 0); lcd.print("                "); lcd.setCursor(0, 0);
            lcd.print("G:"); lcd.print(gas); lcd.print(" L:"); lcd.print(light);
            lcd.setCursor(0, 1); lcd.print("                "); lcd.setCursor(0, 1);
            lcd.print("Stm:"); lcd.print(steam); lcd.print(" Sl:"); lcd.print(soil);
        }
    }

    // // --- STEAM SENSOR ---
    // if (steam > 100) {
    //     if (!whiteLightOn) whiteLightOn = true;
    //     if (!songPlayed) {
    //         showTempMessage("Rain alert!", ""); forceShowTempMessageNow();
    //         songPlayed = true;
    //         if (doorOpen || windowOpen) {
    //             doorOpen = false; windowOpen = false;
    //             showTempMessage("Closing house", "for safety"); forceShowTempMessageNow();
    //             doorServo.write(0); windowServo.write(0);
    //         }
    //     }
    // } else {
    //     songPlayed = false;
    // }

    // --- BUTTONS & MOTION ---
    if (btn1 == LOW && lastBtn1State == HIGH) {
        fan_ina_on = !fan_ina_on; showTempMessage("Fan INA", fan_ina_on ? "ON" : "OFF");
    }
    lastBtn1State = btn1;

    digitalWrite(7, fan_ina_on ? HIGH : LOW);
    digitalWrite(6, fan_inb_on ? HIGH : LOW);

    if (btn2 == LOW && lastBtn2State == HIGH) {
        bool houseOpen = (doorOpen || windowOpen);
        houseOpen = !houseOpen; doorOpen = houseOpen; windowOpen = houseOpen;
        showTempMessage("Door/Window", houseOpen ? "OPEN" : "CLOSE");
    }
    lastBtn2State = btn2;

    doorServo.write(doorOpen ? 150 : 0);
    windowServo.write(windowOpen ? 150 : 0);

    digitalWrite(13, whiteLightOn ? HIGH : LOW);
    analogWrite(5, orangeLightValue);

    // Call our newly hooked up MusicEngine
    MusicEngine();

    sendStateLine(gas, steam, motion, light, soil);
    delay(10);
}

// ================= MUSIC ENGINE IMPLEMENTATION =================
void MusicEngine() {
    // Note: We removed the physical button logic here to avoid conflict with Pin 8 
    // and instead let the buzzerMode (Serial commands) control it!

    if (isPlaying) {
        if (songLength <= 0) {
            isPlaying = false;
            noTone(3);
            return;
        }

        unsigned long currentMillis = millis();
        unsigned long totalNoteDuration = (unsigned long)songDurations[currentNote];
        unsigned long soundDuration = (totalNoteDuration * 9UL) / 10UL;

        if (noteIsSounding && (currentMillis - lastNoteTime >= soundDuration)) {
            noTone(3); // Pin 3 is the buzzer
            noteIsSounding = false;
        }

        if (currentMillis - lastNoteTime >= totalNoteDuration) {
            currentNote++;

            if (currentNote >= songLength) {
                // Keep looping while command state remains ON.
                if (musicModeOn) {
                    currentNote = 0;
                    lastNoteTime = currentMillis;
                    if (songMelody[0] > 0) {
                        tone(3, songMelody[0]);
                        noteIsSounding = true;
                    } else {
                        noTone(3);
                        noteIsSounding = false;
                    }
                } else {
                    isPlaying = false;
                    currentNote = 0;
                    noTone(3);
                }
            } else {
                tone(3, songMelody[currentNote]);
                lastNoteTime = currentMillis;
                noteIsSounding = true;
            }
        }
    }
}

// ================= EXTERNAL SONG =================
void playExternalSong(String data) {
    String songData = data.substring(1); 
    showTempMessage("Syncing Song...", "");
    forceShowTempMessageNow();

    int loaded = 0;
    while (songData.length() > 0 && loaded < maxSongNotes) {
        int comma1 = songData.indexOf(',');
        if (comma1 == -1) break;
        int note = songData.substring(0, comma1).toInt();
        songData = songData.substring(comma1 + 1);
        int comma2 = songData.indexOf(',');
        int duration;
        if (comma2 == -1) {
            duration = songData.toInt(); songData = "";
        } else {
            duration = songData.substring(0, comma2).toInt();
            songData = songData.substring(comma2 + 1);
        }

        if (!normalizeSongPair(note, duration)) continue;

        songMelody[loaded] = note;
        songDurations[loaded] = duration;
        loaded++;
    }

    songLength = loaded;
    isPlaying = false;
    currentNote = 0;
    noteIsSounding = false;
    noTone(3);

    if (songLength > 0) {
        Serial.print("MUSIC loaded=");
        Serial.print(songLength);
        Serial.print(" firstFreq=");
        Serial.print(songMelody[0]);
        Serial.print(" firstDelay=");
        Serial.println(songDurations[0]);
    } else {
        Serial.println("MUSIC loaded=0");
    }

    beginPlaybackFromLoadedSong();
}

bool normalizeSongPair(int &note, int &duration) {
    if (duration <= 0) return false;

    // Accept either millisecond delays or classic note-divider values.
    if (duration > 0 && duration < 20) {
        duration = 1000 / duration;
    }
    if (duration < 60) {
        duration = 60;
    }

    // Keep valid rest notes (0), sanitize out-of-range frequencies.
    if (note < 0) note = 0;
    if (note > 0 && (note < 31 || note > 5000)) {
        note = 1000;
    }
    return true;
}

void beginPlaybackFromLoadedSong() {
    if (songLength <= 0 || !musicModeOn) return;

    if (buzzerMode != BUZZ_OFF && !gasSequenceActive) {
        buzzerMode = BUZZ_OFF;
    }

    if (musicModeOn) {
        isPlaying = true;
        currentNote = 0;
        lastNoteTime = millis();
        if (songMelody[0] > 0) {
            tone(3, songMelody[0]);
            noteIsSounding = true;
        } else {
            noTone(3);
            noteIsSounding = false;
        }
    }
}