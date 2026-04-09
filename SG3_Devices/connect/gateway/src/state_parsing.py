def norm(value):
    if value is None:
        return None
    return str(value).strip().lower()


def to_on_off(value):
    value = norm(value)
    if value in ("on", "1", "true", "yes", "enabled"):
        return "on"
    if value in ("off", "0", "false", "no", "disabled"):
        return "off"
    return None


def to_open_close(value):
    value = norm(value)
    if value in ("open", "opened", "1", "true", "yes", "on"):
        return "open"
    if value in ("close", "closed", "0", "false", "no", "off"):
        return "close"
    return None


def extract_field_value(field):
    if not isinstance(field, dict):
        return field

    candidates = ("state", "value", "status", "isOpen", "open", "isOn", "on", "enabled")
    for key in candidates:
        if key in field and field.get(key) is not None:
            return field.get(key)

    return None


def to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def get_state(data, key):
    return extract_field_value(data.get(key))


def parse_state_line(line):
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