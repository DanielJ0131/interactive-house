import dotenv from 'dotenv';
dotenv.config();

import { https } from 'firebase-functions';
import admin  from 'firebase-admin';
import express, { json } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(json());

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not defined in environment variables");
}

const REGISTRATION_API_KEY = process.env.REGISTRATION_API_KEY;

if (!REGISTRATION_API_KEY) {
  throw new Error("REGISTRATION_API_KEY not defined in environment variables");
}

const DEFAULT_DEVICES = {
  white_light: {
    state: "off",
    value: null,
    pin: "13"
  },
  orange_light: {
    state: "off",
    value: "0",
    pin: "5"
  },
  door: {
    state: "closed",
    value: null,
    pin: "9"
  },
  window: {
    state: "closed",
    value: null,
    pin: "10"
  },
  fan_INA: {
    state: "off",
    value: null,
    pin: "7"
  },
  fan_INB: {
    state: "off",
    value: null,
    pin: "6"
  },
  buzzer:{
    state: "off",
    value: "0",
    pin: "3"
  },
};

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.username) {
      return res.status(401).json({ error: "Invalid token payload" });
    }
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// -------- REGISTER USER --------
app.post('/users/register', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(403).json({ error: "Missing API key in header" });
    }

    if (apiKey !== REGISTRATION_API_KEY) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const userRef = db.collection('users').doc(username);
    const existingUser = await userRef.get();

    if (existingUser.exists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserData = {
      password: hashedPassword,
      ...DEFAULT_DEVICES
    };

    await userRef.set(newUserData);

    res.status(201).json({
      message: "User created successfully",
      devices: DEFAULT_DEVICES
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------- LOGIN USER --------
app.post('/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const userRef = db.collection('users').doc(username);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(400).json({ error: "User not found" });
    }

    const userData = userDoc.data();

    const validPassword = await bcrypt.compare(password, userData.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "2h" });

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// -------- UPDATE PASSWORD --------
app.patch('/users/update-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Missing current or new password" });
    }

    // fetch stored password to compare
    const userRef = db.collection('users').doc(req.username);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const validCurrent = await bcrypt.compare(currentPassword, userData.password);
    if (!validCurrent) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRef.update({ password: hashedPassword });

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------- ADD OR UPDATE DEVICE FIELD --------
app.patch('/users/device', authenticate, async (req, res) => {
  try {
    const { deviceName, value } = req.body;

    if (!deviceName || value === undefined) {
      return res.status(400).json({ error: "Missing deviceName or value" });
    }

    await db.collection('users')
      .doc(req.username)
      .update({
        [deviceName]: value
      });

    res.json({ message: "Device updated", deviceName, value });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// -------- DELETE DEVICE FIELD --------
app.delete('/users/device', authenticate, async (req, res) => {
  try {
    const { deviceName } = req.body;

    if (!deviceName) {
      return res.status(400).json({ error: "Missing deviceName" });
    }

    // Prevent deleting password
    if (deviceName === "password") {
      return res.status(403).json({ error: "Cannot delete password field" });
    }

    await db.collection('users')
      .doc(req.username)
      .update({
        [deviceName]: admin.firestore.FieldValue.delete()
      });

    res.json({ message: "Device removed", deviceName });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// -------- GET CURRENT USER DATA --------
app.get('/users/me', authenticate, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.username).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    delete userData.password;

    res.json(userData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/', (req, res) => {
  res.json({
    message: "Smart House API running",
    endpoints: {
      "POST /users/register": "Register new user",
      "POST /users/login": "Login user",
      "PATCH /users/update-password": "Update password (auth required)",
      "PATCH /users/device": "Add/update device field (auth required)",
      "DELETE /users/device": "Delete device field (auth required)",
      "GET /users/me": "Get user data (auth required)"
    }
  });
});


export const api = https.onRequest(app);
