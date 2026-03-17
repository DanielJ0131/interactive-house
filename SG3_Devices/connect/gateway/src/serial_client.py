import os, time, serial
from threading import Lock
from dotenv import load_dotenv

# Get the directory containing this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # smarthouse-gateway directory

load_dotenv(os.path.join(PROJECT_ROOT, "config/.env"))

PORT = os.getenv("SERIAL_PORT", "COM3")
BAUD = int(os.getenv("SERIAL_BAUD","9600"))



class SerialClient:
    def __init__(self):
        self.ser = serial.Serial(PORT,BAUD, timeout= 1)
        self._write_lock = Lock()
        time.sleep(2)

    def send_line(self, line: str):
        with self._write_lock:
            self.ser.write((line + "\n").encode("utf-8"))
            self.ser.flush()

    def read_line(self):
        """Non-blocking read of one line from Arduino."""
        raw = self.ser.readline()
        if not raw:
            return ""
        return raw.decode("utf-8", errors="ignore").strip()
