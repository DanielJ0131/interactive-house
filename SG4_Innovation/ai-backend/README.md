AI Backend – SG4 Innovation

This backend provides a proxy server for AI chat functionality in the Interactive House mobile application. It connects the mobile app to the Gemini API securely by keeping the API key server-side.

Purpose
- Prevent exposing API keys in the mobile app
- Handle AI requests securely
- Provide a simple /api/ai-chat endpoint
- Enable future AI-based automation features

📂 Location - SG4_Innovation/ai-backend

⚙️ Setup Instructions

1️⃣ Install Dependencies
Navigate to the backend folder:
cd SG4_Innovation/ai-backend
npm install

2️⃣ Create Environment File
Create a .env file in the ai-backend folder:
GEMINI_API_KEY=your_api_key_here
PORT=3000

3️⃣ Start Backend Server
node server.js


If successful, you should see: AI backend running on http://localhost:3000

🔗 API Endpoint
POST /api/ai-chat

📱 Mobile App Integration
The mobile app calls: http://YOUR_LOCAL_IP:3000/api/ai-chat


🔐 Security
API key is stored in .env
.env is ignored via .gitignore
Only .env.example is committed

