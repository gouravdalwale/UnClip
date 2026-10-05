
// UniClip - Node.js Server

const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// 1. SESSION STORAGE
// Each session is stored as:
//
// pairing code -> connected sockets
//
// Example:
//
// "123456" -> [socketA, socketB]

const sessions = new Map();

// 2. HTTP SERVER

const server = http.createServer(
    function (req, res) {

        let fileName;


        if (req.url === "/") {

            fileName = "index.html";

        } else if (req.url === "/style.css") {

            fileName = "style.css";

        } else if (req.url === "/script.js") {

            fileName = "script.js";

        } else {

            res.writeHead(404, {
                "Content-Type": "text/plain"
            });

            res.end("Not Found");

            return;
        }


        try {

            const filePath =
                path.join(
                    __dirname,
                    fileName
                );


            const file =
                fs.readFileSync(filePath);


            const contentTypes = {

                "index.html": "text/html",

                "style.css": "text/css",

                "script.js":
                    "text/javascript"
            };


            res.writeHead(200, {

                "Content-Type":
                    contentTypes[fileName]
            });


            res.end(file);

        } catch (error) {

            console.log(
                "File error:",
                error
            );


            res.writeHead(500, {
                "Content-Type": "text/plain"
            });


            res.end("Server error");
        }
    }
);

// 3. WEBSOCKET SERVER

const wss =
    new WebSocket.Server({
        server: server
    });

// 4. SEND DEVICE COUNT

function sendDeviceCount(session) {

    session.forEach(
        function (client) {

            if (
                client.readyState ===
                WebSocket.OPEN
            ) {

                client.send(
                    JSON.stringify({

                        type:
                            "device-count",

                        deviceCount:
                            session.length
                    })
                );
            }
        }
    );
}


// 5. REMOVE DISCONNECTED DEVICE


function removeSocket(
    socket,
    sessionCode
) {

    const session =
        sessions.get(sessionCode);


    if (!session) {
        return;
    }


    const index =
        session.indexOf(socket);


    if (index !== -1) {

        session.splice(
            index,
            1
        );
    }


    // Delete empty temporary session
    if (session.length === 0) {

        sessions.delete(
            sessionCode
        );

        console.log(
            "Session deleted:",
            sessionCode
        );

    } else {

        sendDeviceCount(session);
    }
}

// 6. NEW WEBSOCKET CONNECTION

wss.on(
    "connection",
    function (socket) {

        console.log(
            "A device connected!"
        );


        let currentSession = null;

        // 7. RECEIVE MESSAGE

        socket.on(
            "message",
            function (message) {

                let data;


                // Convert JSON string into object
                try {

                    data =
                        JSON.parse(
                            message.toString()
                        );

                } catch (error) {

                    console.log(
                        "Invalid message."
                    );

                    return;
                }


                // CREATE SESSION

                if (
                    data.type ===
                    "create-session"
                ) {

                    let code;


                    // Generate unique 6-digit code
                    do {

                        code =
                            Math.floor(
                                100000 +
                                Math.random() *
                                900000
                            ).toString();

                    } while (
                        sessions.has(code)
                    );


                    currentSession =
                        code;


                    sessions.set(
                        code,
                        [socket]
                    );


                    console.log(
                        "Session created:",
                        code
                    );


                    socket.send(
                        JSON.stringify({

                            type:
                                "session-created",

                            code:
                                code,

                            deviceCount:
                                1
                        })
                    );


                    return;
                }


                // =================================================
                // JOIN SESSION
                // =================================================

                if (
                    data.type ===
                    "join-session"
                ) {

                    const session =
                        sessions.get(
                            data.code
                        );


                    // Invalid pairing code
                    if (!session) {

                        socket.send(
                            JSON.stringify({

                                type:
                                    "join-error",

                                message:
                                    "Session not found"
                            })
                        );

                        return;
                    }


                    // Add device if it is not already there
                    if (
                        !session.includes(
                            socket
                        )
                    ) {

                        session.push(
                            socket
                        );
                    }


                    currentSession =
                        data.code;


                    console.log(
                        "Device joined session:",
                        currentSession
                    );


                    socket.send(
                        JSON.stringify({

                            type:
                                "session-joined",

                            code:
                                currentSession,

                            deviceCount:
                                session.length
                        })
                    );


                    sendDeviceCount(
                        session
                    );


                    return;
                }


                // CLIPBOARD SYNC

                if (
                    data.type ===
                    "clipboard"
                ) {

                    if (!currentSession) {

                        socket.send(
                            JSON.stringify({

                                type:
                                    "clipboard-error",

                                message:
                                    "Create or join a session first."
                            })
                        );

                        return;
                    }


                    const session =
                        sessions.get(
                            currentSession
                        );


                    if (!session) {

                        socket.send(
                            JSON.stringify({

                                type:
                                    "clipboard-error",

                                message:
                                    "Session no longer exists."
                            })
                        );

                        return;
                    }


                    console.log(
                        "Clipboard received for session:",
                        currentSession
                    );


                    // Send clipboard only to other devices
                    session.forEach(
                        function (client) {

                            if (
                                client !== socket &&
                                client.readyState ===
                                WebSocket.OPEN
                            ) {

                                client.send(
                                    JSON.stringify({

                                        type:
                                            "clipboard",

                                        text:
                                            data.text,

                                        contentType:
                                            data.contentType
                                    })
                                );
                            }
                        }
                    );


                    return;
                }
            }
        );


        // 8. DEVICE DISCONNECTED

        socket.on(
            "close",
            function () {

                console.log(
                    "A device disconnected."
                );


                if (currentSession) {

                    removeSocket(
                        socket,
                        currentSession
                    );
                }
            }
        );
    }
);


// 9. START SERVER

server.listen(
    3000,
    function () {

        console.log(
            "Server running on http://localhost:3000"
        );
    }
);
