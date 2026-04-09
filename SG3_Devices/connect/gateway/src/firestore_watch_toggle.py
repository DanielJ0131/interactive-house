import os
import threading
import time
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, firestore

from serial_client import SerialClient

# Get the directory containing this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # smarthouse-gateway directory

load_dotenv(os.path.join(PROJECT_ROOT, "config/.env"))

SERVICE_ACCOUNT_PATH = os.getenv("SERVICE_ACCOUNT_PATH", "config/serviceAccountKey.json")
# Make the path absolute if it's relative
if not os.path.isabs(SERVICE_ACCOUNT_PATH):
    SERVICE_ACCOUNT_PATH = os.path.join(PROJECT_ROOT, SERVICE_ACCOUNT_PATH)

WATCH_DOC = os.getenv("WATCH_DOC")

cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

sc = SerialClient()
doc_ref = db.document(WATCH_DOC)
state_lock = threading.Lock()
last_synced_state = {}  # Prevents write loops

last_fan = None
last_door = None
last_window = None
last_msg = None
last_buzzer = None
last_fan_ina = None
last_fan_inb = None
last_white_light = None
last_orange_light = None


def norm(v):
    if v is None: return None
    return str(v).strip().lower()


def to_on_off(v):
    v = norm(v)
    if v in ("on", "1", "true", "yes", "enabled"):
        return "on"
    if v in ("off", "0", "false", "no", "disabled"):
        return "off"
    return None


def to_open_close(v):
    v = norm(v)
    if v in ("open", "opened", "1", "true", "yes", "on"):
        return "open"
    if v in ("close", "closed", "0", "false", "no", "off"):
        return "close"
    return None


def extract_field_value(field):
    if not isinstance(field, dict):
        return field

    # Accept a few common app payload styles for actuator fields.
    candidates = ("state", "value", "status", "isOpen", "open", "isOn", "on", "enabled")
    for key in candidates:
        if key in field and field.get(key) is not None:
            return field.get(key)
    return None


def to_int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def get_state(data, key):
    return extract_field_value(data.get(key))


def parse_state_line(line):
    """Parse STATE telemetry from Arduino: 'STATE door=open window=close ...'"""
    if not line.startswith("STATE "):
        return {}
    state = {}
    payload = line[len("STATE "):]
    for token in payload.split():
        if "=" not in token:
            continue
        key, value = token.split("=", 1)
        state[key.strip().lower()] = value.strip().lower()
    return state


def sync_arduino_to_firestore(state):
    """Write Arduino physical state to Firestore (button presses, sensors)."""
    global last_door, last_window, last_buzzer
    global last_fan_ina, last_fan_inb, last_white_light, last_orange_light

    updates = {}

    # Only write if value actually changed from last sync
    def should_update(key, value):
        if value is None:
            return False
        if last_synced_state.get(key) == value:
            return False
        return True

    door = state.get("door")
    window = state.get("window")
    buzzer = state.get("buzzer")
    fan_ina = state.get("fan_ina")
    fan_inb = state.get("fan_inb")
    white_light = state.get("white_light")
    orange_light = state.get("orange_light")

    if door in ("open", "close") and should_update("door", door):
        updates["door.state"] = door
        last_synced_state["door"] = door
    if window in ("open", "close") and should_update("window", window):
        updates["window.state"] = window
        last_synced_state["window"] = window
    if buzzer in ("on", "off") and should_update("buzzer", buzzer):
        updates["buzzer.state"] = buzzer
        last_synced_state["buzzer"] = buzzer
    if fan_ina in ("on", "off") and should_update("fan_ina", fan_ina):
        updates["fan_INA.state"] = fan_ina
        last_synced_state["fan_ina"] = fan_ina
    if fan_inb in ("on", "off") and should_update("fan_inb", fan_inb):
        updates["fan_INB.state"] = fan_inb
        last_synced_state["fan_inb"] = fan_inb
    if white_light in ("on", "off") and should_update("white_light", white_light):
        updates["white_light.state"] = white_light
        last_synced_state["white_light"] = white_light
    if orange_light in ("on", "off") and should_update("orange_light", orange_light):
        updates["orange_light.state"] = orange_light
        last_synced_state["orange_light"] = orange_light

    # Sensor telemetry
    gas = to_int(state.get("gas"))
    steam = to_int(state.get("steam"))
    motion = to_int(state.get("motion"))

    if gas is not None and should_update("gas", gas):
        updates["telemetry.gas"] = gas
        last_synced_state["gas"] = gas
    if steam is not None and should_update("steam", steam):
        updates["telemetry.steam"] = steam
        last_synced_state["steam"] = steam
    if motion is not None and should_update("motion", motion):
        updates["telemetry.motion"] = motion
        last_synced_state["motion"] = motion

    if not updates:
        return

    updates["sync.lastSource"] = "arduino"
    updates["sync.lastUpdatedAt"] = firestore.SERVER_TIMESTAMP

    try:
        doc_ref.update(updates)
        # Update last_* variables to match synced state
        with state_lock:
            if door in ("open", "close"):
                last_door = door
            if window in ("open", "close"):
                last_window = window
            if buzzer in ("on", "off"):
                last_buzzer = buzzer
            if fan_ina in ("on", "off"):
                last_fan_ina = fan_ina
            if fan_inb in ("on", "off"):
                last_fan_inb = fan_inb
            if white_light in ("on", "off"):
                last_white_light = white_light
            if orange_light in ("on", "off"):
                last_orange_light = orange_light
        print("Arduino -> Firebase:", updates)
    except Exception as exc:
        print("Failed to sync Arduino state to Firebase:", exc)


def arduino_listener():
    """Background thread: read STATE lines from Arduino and update Firestore."""
    while True:
        try:
            line = sc.read_line()
        except Exception as exc:
            print("Serial read error:", exc)
            time.sleep(1)
            continue

        if not line:
            continue

        state = parse_state_line(line)
        if state:
            sync_arduino_to_firestore(state)


def on_snapshot(doc_snapshot, changes, read_time):
    global last_fan, last_door, last_window, last_msg, last_buzzer, last_fan_ina, last_fan_inb, last_white_light, last_orange_light

    with state_lock:
        for doc in doc_snapshot:
            data = doc.to_dict() or {}

            fan = to_on_off(data.get("fan"))  # "on"/"off" (legacy, may not be used)

            raw_door = get_state(data, "door")
            raw_window = get_state(data, "window")
            door = to_open_close(raw_door)  # "open"/"close"
            window = to_open_close(raw_window)  # "open"/"close"

            msg = data.get("ledTextDisplay")  # string
            buzzer = to_on_off(get_state(data, "buzzer"))

            # Get fan INA and INB states separately
            fan_ina = to_on_off(get_state(data, "fan_INA"))
            fan_inb = to_on_off(get_state(data, "fan_INB"))

            # Get light states from nested objects
            white_light = to_on_off(get_state(data, "white_light"))
            orange_light = to_on_off(get_state(data, "orange_light"))

            if raw_door is not None and door is None:
                print("Ignored unsupported door value:", raw_door)
            if raw_window is not None and window is None:
                print("Ignored unsupported window value:", raw_window)

            # FAN (legacy - for backward compatibility)
            if fan in ("on", "off"):
                if last_fan is None:
                    last_fan = fan
                elif fan != last_fan:
                    sc.send_line("F")
                    last_fan = fan
                    print("Toggled FAN ->", fan)

            # FAN INA: toggle only when it CHANGES (ignore first snapshot)
            if fan_ina in ("on", "off"):
                if last_fan_ina is None:
                    last_fan_ina = fan_ina
                elif fan_ina != last_fan_ina:
                    sc.send_line("X")
                    last_fan_ina = fan_ina
                    print("Toggled FAN INA ->", fan_ina)

            # FAN INB: toggle only when it CHANGES (ignore first snapshot)
            if fan_inb in ("on", "off"):
                if last_fan_inb is None:
                    last_fan_inb = fan_inb
                elif fan_inb != last_fan_inb:
                    sc.send_line("Y")
                    last_fan_inb = fan_inb
                    print("Toggled FAN INB ->", fan_inb)

            # DOOR: set explicit state only when it CHANGES (ignore first snapshot)
            if door in ("open", "close"):
                if last_door is None:
                    last_door = door
                elif door != last_door:
                    sc.send_line("D:1" if door == "open" else "D:0")
                    last_door = door
                    print("Set DOOR ->", door)

            # WINDOW: set explicit state only when it CHANGES (ignore first snapshot)
            if window in ("open", "close"):
                if last_window is None:
                    last_window = window
                elif window != last_window:
                    sc.send_line("N:1" if window == "open" else "N:0")
                    last_window = window
                    print("Set WINDOW ->", window)

            # BUZZER: set explicit state only when it CHANGES (ignore first snapshot)
            if buzzer in ("on", "off"):
                if last_buzzer is None:
                    last_buzzer = buzzer
                elif buzzer != last_buzzer:
                    sc.send_line("B:1" if buzzer == "on" else "B:0")
                    last_buzzer = buzzer
                    print("Set BUZZER ->", buzzer)

            # WHITE LIGHT: toggle only when it CHANGES (ignore first snapshot)
            if white_light in ("on", "off"):
                if last_white_light is None:
                    last_white_light = white_light
                elif white_light != last_white_light:
                    sc.send_line("W")
                    last_white_light = white_light
                    print("Toggled WHITE LIGHT ->", white_light)

            # ORANGE LIGHT: toggle only when it CHANGES (ignore first snapshot)
            if orange_light in ("on", "off"):
                if last_orange_light is None:
                    last_orange_light = orange_light
                elif orange_light != last_orange_light:
                    sc.send_line("O")
                    last_orange_light = orange_light
                    print("Toggled ORANGE LIGHT ->", orange_light)

            # LCD demo (optional)
            if isinstance(msg, str):
                if last_msg is None:
                    last_msg = msg
                elif msg != last_msg:
                    sc.send_line(f"M{msg[:16]}|")
                    last_msg = msg
                    print("LCD updated")


watch = doc_ref.on_snapshot(on_snapshot)
listener_thread = threading.Thread(target=arduino_listener, daemon=True)
listener_thread.start()


def send_song(note_list, duration_list):
    # Zip notes and durations together
    combined = []
    for n, d in zip(note_list, duration_list):
        combined.extend([str(n), str(d)])

    # Prefix with 'S' so Arduino routes it to the second variable
    payload = "S" + ",".join(combined) + "\n"

    # Use your serial client (sc) to send it
    sc.send_line(payload)
    print(f"Sent song to separate variable: {payload[:50]}...")


print("Watching:", WATCH_DOC, "(bidirectional sync active)")
while True:
    time.sleep(10)
