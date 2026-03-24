from dataclasses import dataclass
from state_parsing import get_state, to_on_off, to_open_close


@dataclass
class DesiredHouseState:
    door_state: str | None = None
    window_state: str | None = None
    buzzer_state: str | None = None
    fan_ina_state: str | None = None
    fan_inb_state: str | None = None
    white_light_state: str | None = None
    orange_light_state: str | None = None
    lcd_message: str | None = None

    @classmethod
    def from_firestore(cls, data: dict):
        raw_door = get_state(data, "door")
        raw_window = get_state(data, "window")

        return cls(
            door_state=to_open_close(raw_door),
            window_state=to_open_close(raw_window),
            buzzer_state=to_on_off(get_state(data, "buzzer")),
            fan_ina_state=to_on_off(get_state(data, "fan_INA")),
            fan_inb_state=to_on_off(get_state(data, "fan_INB")),
            white_light_state=to_on_off(get_state(data, "white_light")),
            orange_light_state=to_on_off(get_state(data, "orange_light")),
            lcd_message=data.get("ledTextDisplay"),
        )