import os
from dataclasses import dataclass
from dotenv import load_dotenv


@dataclass
class Config:
    serial_port: str
    serial_baud: int
    firestore_doc_path: str
    service_account_path: str


def load_config():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    load_dotenv(os.path.join(project_root, "config/.env"))

    service_account_path = os.getenv("SERVICE_ACCOUNT_PATH", "config/serviceAccountKey.json")
    if not os.path.isabs(service_account_path):
        service_account_path = os.path.join(project_root, service_account_path)

    firestore_doc_path = (
        os.getenv("WATCH_DOC")
        or os.getenv("FIRESTORE_DOC_PATH")
        or "devices/arduino"
    )

    serial_port = os.getenv("SERIAL_PORT", "COM3")
    serial_baud = int(os.getenv("SERIAL_BAUD", "9600"))

    return Config(
        serial_port=serial_port,
        serial_baud=serial_baud,
        firestore_doc_path=firestore_doc_path,
        service_account_path=service_account_path,
    )