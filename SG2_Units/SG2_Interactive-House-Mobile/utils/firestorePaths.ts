import { doc, collection, type Firestore } from 'firebase/firestore';

export const DEVICES_COLLECTION = 'devices';
export const MUSIC_COLLECTION = 'music';
export const ARDUINO_DOC_ID = 'arduino';

export const getArduinoDevicesDocRef = (db: Firestore) => doc(db, DEVICES_COLLECTION, ARDUINO_DOC_ID);
export const getMusicCollectionRef = (db: Firestore) => collection(db, MUSIC_COLLECTION);