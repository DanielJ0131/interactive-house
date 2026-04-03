import threading

from desired_house_state import DesiredHouseState
from current_house_state import CurrentHouseState
from state_parsing import parse_state_line


class HouseSyncService:
    def __init__(self, firestore_repository, serial_client):
        self.firestore_repository = firestore_repository
        self.serial_client = serial_client

        self.desired_state = DesiredHouseState()
        self.current_state = CurrentHouseState()

        self.state_lock = threading.Lock()
        self.last_synced_state = {}

        self.last_msg = None

    def on_desired_state_changed(self, doc_snapshot, changes, read_time):
        with self.state_lock:
            for doc in doc_snapshot:
                data = doc.to_dict() or {}
                new_desired_state = DesiredHouseState.from_firestore(data)

                self.dispatch_commands(new_desired_state)
                self.desired_state = new_desired_state

    def on_physical_state_reported(self, line: str):
        state = parse_state_line(line)
        if not state:
            return

        with self.state_lock:
            self.current_state.apply_actuator_update(state)
            self.current_state.apply_telemetry_update(state)

            if self._should_save_to_firestore(state):
                self.firestore_repository.save_current_state(self.current_state)
                self._update_last_synced_state(state)

    def dispatch_commands(self, desired_state: DesiredHouseState):
        # Door
        if desired_state.door_state in ("open", "close"):
            if self.current_state.door_state is None:
                self.current_state.door_state = desired_state.door_state
            elif desired_state.door_state != self.current_state.door_state:
                self.serial_client.send_line("D:1" if desired_state.door_state == "open" else "D:0")

        # Window
        if desired_state.window_state in ("open", "close"):
            if self.current_state.window_state is None:
                self.current_state.window_state = desired_state.window_state
            elif desired_state.window_state != self.current_state.window_state:
                self.serial_client.send_line("N:1" if desired_state.window_state == "open" else "N:0")

        # Buzzer
        if desired_state.buzzer_state in ("on", "off"):
            if self.current_state.buzzer_state is None:
                self.current_state.buzzer_state = desired_state.buzzer_state
            elif desired_state.buzzer_state != self.current_state.buzzer_state:
                self.serial_client.send_line("B:1" if desired_state.buzzer_state == "on" else "B:0")

        # Fan INA (toggle-based in current Arduino implementation)
        if desired_state.fan_ina_state in ("on", "off"):
            if self.current_state.fan_ina_state is None:
                self.current_state.fan_ina_state = desired_state.fan_ina_state
            elif desired_state.fan_ina_state != self.current_state.fan_ina_state:
                self.serial_client.send_line("X")

        # Fan INB (toggle-based)
        if desired_state.fan_inb_state in ("on", "off"):
            if self.current_state.fan_inb_state is None:
                self.current_state.fan_inb_state = desired_state.fan_inb_state
            elif desired_state.fan_inb_state != self.current_state.fan_inb_state:
                self.serial_client.send_line("Y")

        # White light (toggle-based)
        if desired_state.white_light_state in ("on", "off"):
            if self.current_state.white_light_state is None:
                self.current_state.white_light_state = desired_state.white_light_state
            elif desired_state.white_light_state != self.current_state.white_light_state:
                self.serial_client.send_line("W")

        # Orange light (toggle-based)
        if desired_state.orange_light_state in ("on", "off"):
            if self.current_state.orange_light_state is None:
                self.current_state.orange_light_state = desired_state.orange_light_state
            elif desired_state.orange_light_state != self.current_state.orange_light_state:
                self.serial_client.send_line("O")

        # LCD
        if isinstance(desired_state.lcd_message, str):
            if self.last_msg is None:
                self.last_msg = desired_state.lcd_message
            elif desired_state.lcd_message != self.last_msg:
                self.serial_client.send_line(f"M{desired_state.lcd_message[:16]}|")
                self.last_msg = desired_state.lcd_message

    def _should_save_to_firestore(self, state: dict) -> bool:
        for key, value in state.items():
            if self.last_synced_state.get(key) != value:
                return True
        return False

    def _update_last_synced_state(self, state: dict):
        for key, value in state.items():
            self.last_synced_state[key] = value