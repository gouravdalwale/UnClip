# UnClip

A real-time clipboard synchronization application that allows users to share clipboard content between connected devices.

## 🚀 Live Demo

https://unclip.onrender.com

## Features

- Real-time clipboard synchronization
- WebSocket-based communication
- Multiple devices can connect
- Clipboard history using localStorage
- Simple and responsive interface

## Features

- Temporary sessions
- 6-digit pairing code
- Join without login
- Connected device count
- WebSocket real-time communication
- Manual clipboard synchronization
- Text and link detection
- Clipboard history
- Copy history items
- Delete history items
- Clear all history
- Basic reconnection attempt
- Duplicate protection
- Clipboard permission error handling

## Technology

- HTML
- CSS
- JavaScript
- Node.js
- WebSocket (`ws`)
- Browser Clipboard API
- localStorage

## Run

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

For testing, open the app in two browser tabs.

1. Create a session in Tab A.
2. Copy the pairing code.
3. Enter it in Tab B.
4. Copy some text in Tab A.
5. Click Sync Clipboard.
6. Check Tab B.

The server keeps active sessions in memory.

Clipboard history is stored locally in each browser using localStorage.
