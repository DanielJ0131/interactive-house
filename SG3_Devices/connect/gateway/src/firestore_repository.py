import firebase_admin
from firebase_admin import credentials, firestore

from desired_house_state import DesiredHouseState


class FirestoreRepository:
    def __init__(self, service_account_path: str, firestore_doc_path: str):
        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)

        self.db = firestore.client()
        self.doc_ref = self.db.document(firestore_doc_path)

    def load_desired_state(self) -> DesiredHouseState | None:
        snapshot = self.doc_ref.get()
        if not snapshot.exists:
            return None

        data = snapshot.to_dict() or {}
        return DesiredHouseState.from_firestore(data)

    def save_current_state(self, current_state):
        updates = current_state.to_firestore_updates()
        if not updates:
            return

        updates["sync.lastSource"] = "arduino"
        updates["sync.lastUpdatedAt"] = firestore.SERVER_TIMESTAMP

        self.doc_ref.set(updates, merge=True)

    def watch_desired_state_changes(self, callback):
        return self.doc_ref.on_snapshot(callback)