import time
import serial
from threading import Lock


class SerialClient:
    def __init__(self, port: str, baud: int):
        self.ser = serial.Serial(port, baud, timeout=1)
        self._write_lock = Lock()
        time.sleep(2)

    def send_line(self, line: str):
        with self._write_lock:
            self.ser.write((line + "\n").encode("utf-8"))
            self.ser.flush()

    def read_line(self) -> str:
        raw = self.ser.readline()
        if not raw:
            return ""
        return raw.decode("utf-8", errors="ignore").strip()