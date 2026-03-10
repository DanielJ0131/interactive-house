import os, time, serial
from dotenv import load_dotenv

load_dotenv("config/.env")

PORT = os.getenv("SERIAL_PORT", "COM3")
BAUD = int(os.getenv("SERIAL_BAUD","9600"))



class SerialClient:
    def __init__(self):
        self.ser = serial.Serial(PORT,BAUD, timeout= 1)
        time.sleep(2)

    def send_line(self, line: str):
        self.ser.write((line + "\n").encode("utf-8"))
        self.ser.flush()
