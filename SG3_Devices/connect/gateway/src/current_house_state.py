from dataclasses import dataclass
from state_parsing import to_int


@dataclass
class CurrentHouseState:
    door_state: str | None = None
    window_state: str | None = None
    buzzer_state: str | None = None
    fan_ina_state: str | None = None
    fan_inb_state: str | None = None
    white_light_state: str | None = None
    orange_light_state: str | None = None
    gas: int | None = None
    steam: int | None = None
    motion: int | None = None

    def apply_actuator_update(self, state: dict):
        if state.get("door") in ("open", "close"):
            self.door_state = state.get("door")

        if state.get("window") in ("open", "close"):
            self.window_state = state.get("window")

        if state.get("buzzer") in ("on", "off"):
            self.buzzer_state = state.get("buzzer")

        if state.get("fan_ina") in ("on", "off"):
            self.fan_ina_state = state.get("fan_ina")

        if state.get("fan_inb") in ("on", "off"):
            self.fan_inb_state = state.get("fan_inb")

        if state.get("white_light") in ("on", "off"):
            self.white_light_state = state.get("white_light")

        if state.get("orange_light") in ("on", "off"):
            self.orange_light_state = state.get("orange_light")

    def apply_telemetry_update(self, state: dict):
        gas = to_int(state.get("gas"))
        steam = to_int(state.get("steam"))
        motion = to_int(state.get("motion"))

        if gas is not None:
            self.gas = gas

        if steam is not None:
            self.steam = steam

        if motion is not None:
            self.motion = motion

    def to_firestore_updates(self) -> dict:
        updates = {}

        if self.door_state is not None:
            updates["door.state"] = self.door_state

        if self.window_state is not None:
            updates["window.state"] = self.window_state

        if self.buzzer_state is not None:
            updates["buzzer.state"] = self.buzzer_state

        if self.fan_ina_state is not None:
            updates["fan_INA.state"] = self.fan_ina_state

        if self.fan_inb_state is not None:
            updates["fan_INB.state"] = self.fan_inb_state

        if self.white_light_state is not None:
            updates["white_light.state"] = self.white_light_state

        if self.orange_light_state is not None:
            updates["orange_light.state"] = self.orange_light_state

        if self.gas is not None:
            updates["telemetry.gas"] = self.gas

        if self.steam is not None:
            updates["telemetry.steam"] = self.steam

        if self.motion is not None:
            updates["telemetry.motion"] = self.motion

        return updates