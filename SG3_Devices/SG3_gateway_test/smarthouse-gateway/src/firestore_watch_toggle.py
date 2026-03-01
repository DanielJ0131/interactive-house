import os, time
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, firestore

from src.serial_client import SerialClient

load_dotenv("config/.env")

SERVICE_ACCOUNT_PATH = os.getenv("SERVICE_ACCOUNT_PATH", "config/serviceAccountKey.json")
WATCH_DOC = os.getenv("WATCH_DOC")

cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

sc = SerialClient()

last_fan = None
last_door = None
last_msg = None

def norm(v):
    if v is None: return None
    return str(v).strip().lower()

def on_snapshot(doc_snapshot, changes, read_time):
    global last_fan, last_door, last_msg

    for doc in doc_snapshot:
        data = doc.to_dict() or {}

        fan = norm(data.get("fan"))          # "on"/"off"
        door = norm(data.get("door"))        # "open"/"close"
        msg = data.get("ledTextDisplay")     # string

        # FAN: toggle only when it CHANGES (ignore first snapshot)
        if fan in ("on", "off"):
            if last_fan is None:
                last_fan = fan
            elif fan != last_fan:
                sc.send_line("F")
                last_fan = fan
                print("Toggled FAN ->", fan)

        # DOOR: toggle only when it CHANGES (ignore first snapshot)
        if door in ("open", "close"):
            if last_door is None:
                last_door = door
            elif door != last_door:
                sc.send_line("D")
                last_door = door
                print("Toggled DOOR ->", door)

        # LCD demo (optional)
        if isinstance(msg, str):
            if last_msg is None:
                last_msg = msg
            elif msg != last_msg:
                sc.send_line(f"M{msg[:16]}|")
                last_msg = msg
                print("LCD updated")

doc_ref = db.document(WATCH_DOC)
watch = doc_ref.on_snapshot(on_snapshot)

print("Watching:", WATCH_DOC, "(toggle mode: fan+door)")
while True:
    time.sleep(10)