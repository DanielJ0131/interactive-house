#include <Arduino.h>
#include <Wire.h> 
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

//GLOBALS

// Initialize LCD and Servos based on YOUR corrected pins
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo doorServo;   // Pin 9
Servo windowServo; // Pin 10

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
  
  doorServo.attach(9);  //
  windowServo.attach(10); //
  
  lcd.print("Testing All...");
  delay(1500);
}

void loop() {
  // Request a normal LCD refresh only 2 times per second (reduces flicker)
if (millis() - lastSensorLcdUpdate >= sensorLcdInterval) {
  lastSensorLcdUpdate = millis();
  lcdNeedsUpdate = true;
}


    //bluetooth instructions
  if (Serial.available()) {
    char c = Serial.read();

    //prevents the extra ^M / newline from being treated as a command
    if (c == '\n' || c == '\r') {
      // ignore newline characters but DO NOT exit loop
    }
    else if (c == 'F') {
      fanOn = !fanOn;

      if (fanOn) showTempMessage("Ventilator ", "ON");
      else       showTempMessage("Ventilator ", "OFF");

      forceShowTempMessageNow(); // show immediately (no waiting for loop timing)
    }
    else if (c == 'D') {
      windowOpen = !windowOpen;

      if (windowOpen) showTempMessage("Door/Window", "OPEN");
      else            showTempMessage("Door/Window", "CLOSE");

      forceShowTempMessageNow(); // show immediately
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

    // Simple melody
    tone(3, 262, 200); delay(250); // C
    tone(3, 294, 200); delay(250); // D
    tone(3, 330, 200); delay(250); // E
    tone(3, 349, 200); delay(250); // F
    noTone(3);

    songPlayed = true;

  }

} else {
  digitalWrite(13, LOW);
  songPlayed = false;
}


  // --- 2. GAS ALARM TEST ---
  // If gas (A0) is detected, beep the buzzer
  if (gas > gasThreshold) {
    digitalWrite(3, HIGH); // Beep ON
    showTempMessage("!! GAS ALERT !!", "");
    forceShowTempMessageNow();
    digitalWrite(3, LOW);  // Beep OFF
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