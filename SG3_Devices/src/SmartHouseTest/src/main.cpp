#include <Arduino.h>
#include <Wire.h> 
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

// Initialize LCD and Servos based on YOUR corrected pins
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo doorServo;   // Pin 9
Servo windowServo; // Pin 10

// Threshold for Gas Alarm (Adjust this number if it's too sensitive)
const int gasThreshold = 5; 

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
  // Read all sensors
  int gas = analogRead(A0);
  int light = analogRead(A1);
  int soil = analogRead(A2);
  int steam = analogRead(A3);
  int motion = digitalRead(2);
  int btn1 = digitalRead(4);
  int btn2 = digitalRead(8);

  // --- Display Data on LCD ---
  lcd.clear();
  lcd.setCursor(0, 0);
  // Display Gas and Light
  lcd.print("G:"); lcd.print(gas);
  lcd.print(" L:"); lcd.print(light);
  
  lcd.setCursor(0, 1);
  // Display Steam and Soil
  lcd.print("Stm:"); lcd.print(steam);
  lcd.print(" Sl:"); lcd.print(soil);

  // --- 1. STEAM SENSOR TEST ---
  // If water is detected on the steam sensor (A3), light up the White LED
  if (steam > 100) { 
    digitalWrite(13, HIGH); 
  } else {
    digitalWrite(13, LOW);
  }

  // --- 2. GAS ALARM TEST ---
  // If gas (A0) is detected, beep the buzzer
  if (gas > gasThreshold) {
    digitalWrite(3, HIGH); // Beep ON
    lcd.clear();
    lcd.print("!! GAS ALERT !!");
    delay(100);
    digitalWrite(3, LOW);  // Beep OFF
  }

  // --- 3. BUTTON 1: LED & FAN TEST ---
  if (btn1 == LOW) { // Button 1 Pressed
    digitalWrite(7, HIGH); digitalWrite(6, LOW); // Fan ON
  } else {
    digitalWrite(7, LOW); digitalWrite(6, LOW); // Fan OFF
  }

  // --- 4. BUTTON 2: SERVO TEST ---
  if (btn2 == LOW) { // Button 2 Pressed
    doorServo.write(90);   //
    windowServo.write(90); //
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