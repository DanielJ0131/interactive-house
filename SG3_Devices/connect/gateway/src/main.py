import threading
import time

from config import load_config
from serial_client import SerialClient
from firestore_repository import FirestoreRepository
from house_sync import HouseSyncService


def arduino_listener(sync_service, serial_client):
    while True:
        try:
            line = serial_client.read_line()
        except Exception as exc:
            print("Serial read error:", exc)
            time.sleep(1)
            continue

        if not line:
            continue

        sync_service.on_physical_state_reported(line)


def main():
    config = load_config()

    firestore_repository = FirestoreRepository(
        service_account_path=config.service_account_path,
        firestore_doc_path=config.firestore_doc_path,
    )

    serial_client = SerialClient(
        port=config.serial_port,
        baud=config.serial_baud,
    )

    sync_service = HouseSyncService(
        firestore_repository=firestore_repository,
        serial_client=serial_client,
    )

    watch = firestore_repository.watch_desired_state_changes(
        sync_service.on_desired_state_changed
    )

    listener_thread = threading.Thread(
        target=arduino_listener,
        args=(sync_service, serial_client),
        daemon=True,
    )
    listener_thread.start()

    print(f"Watching: {config.firestore_doc_path} (bidirectional sync active)")

    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        print("Shutting down...")
        watch.unsubscribe()


if __name__ == "__main__":
    main()