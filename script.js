
const createSessionButton = document.querySelector("#create-session");
const joinSessionButton = document.querySelector("#join-session");

const pairingCodeInput = document.querySelector("#pairing-code");
const sessionCode = document.querySelector("#session-code");
const connectionStatus = document.querySelector("#connection-status");

const deviceList = document.querySelector("#device-list");

const syncClipboardButton = document.querySelector("#sync-clipboard");
const clipboardMessage = document.querySelector("#clipboard-message");

const receivedContent = document.querySelector("#received-content");
const receivedText = document.querySelector("#received-text");

const historyList = document.querySelector("#history-list");
const clearHistoryButton = document.querySelector("#clear-history");



let currentSessionCode = null;

let socket = null;

let reconnectTimer = null;
let reconnectDelay = 1000;

let history = loadHistory();



connectSocket();


function connectSocket() {

    socket = new WebSocket("ws://" + window.location.host);


    socket.addEventListener("open", function () {

        console.log("WebSocket connected.");

        if (currentSessionCode) {
            connectionStatus.textContent =
                "Reconnected. Rejoin the session if necessary.";
        } else {
            connectionStatus.textContent = "Ready";
        }

        reconnectDelay = 1000;
    });


    socket.addEventListener("message", function (event) {

        let data;

        try {
            data = JSON.parse(event.data);
        } catch (error) {
            console.log("Invalid message from server.");
            return;
        }

        console.log("Message from server:", data);


        // Session created
        if (data.type === "session-created") {

            currentSessionCode = data.code;

            sessionCode.textContent = data.code;

            connectionStatus.textContent = "Session created";

            updateDeviceCount(data.deviceCount);
        }


        // Session joined
        if (data.type === "session-joined") {

            currentSessionCode = data.code;

            sessionCode.textContent = data.code;

            connectionStatus.textContent =
                "Connected to session";

            updateDeviceCount(data.deviceCount);
        }


        // Join failed
        if (data.type === "join-error") {

            connectionStatus.textContent = data.message;
        }


        // Device count changed
        if (data.type === "device-count") {

            updateDeviceCount(data.deviceCount);
        }


        // Clipboard received
        if (data.type === "clipboard") {

            showReceivedClipboard(
                data.text,
                data.contentType
            );

            addHistoryItem(
                data.text,
                data.contentType,
                "Connected device"
            );
        }


        // Clipboard error
        if (data.type === "clipboard-error") {

            clipboardMessage.textContent =
                data.message;
        }
    });


    socket.addEventListener("close", function () {

        console.log("WebSocket connection closed.");

        connectionStatus.textContent =
            "Connection lost. Reconnecting...";

        clearTimeout(reconnectTimer);

        reconnectTimer = setTimeout(
            connectSocket,
            reconnectDelay
        );

        reconnectDelay = Math.min(
            reconnectDelay * 2,
            10000
        );
    });


    socket.addEventListener("error", function (error) {

        console.log("WebSocket error:", error);

        connectionStatus.textContent =
            "Connection error";
    });
}



createSessionButton.addEventListener("click", function () {

    if (!isSocketConnected()) {

        connectionStatus.textContent =
            "Not connected to server";

        return;
    }

    socket.send(JSON.stringify({
        type: "create-session"
    }));
});



joinSessionButton.addEventListener("click", function () {

    const enteredCode =
        pairingCodeInput.value.trim();


    // Check pairing code
    if (!/^\d{6}$/.test(enteredCode)) {

        connectionStatus.textContent =
            "Pairing code must be 6 digits.";

        return;
    }


    if (!isSocketConnected()) {

        connectionStatus.textContent =
            "Not connected to server";

        return;
    }


    socket.send(JSON.stringify({
        type: "join-session",
        code: enteredCode
    }));
});



syncClipboardButton.addEventListener(
    "click",
    async function () {

        if (!currentSessionCode) {

            clipboardMessage.textContent =
                "Create or join a session first.";

            return;
        }


        if (!isSocketConnected()) {

            clipboardMessage.textContent =
                "Not connected to server.";

            return;
        }


        try {

            const text =
                await navigator.clipboard.readText();


            if (!text.trim()) {

                clipboardMessage.textContent =
                    "Clipboard is empty.";

                return;
            }


            const contentType =
                detectContentType(text);


            socket.send(JSON.stringify({
                type: "clipboard",
                text: text,
                contentType: contentType
            }));


            clipboardMessage.textContent =
                "Clipboard synced!";


            // Save our own clipboard action
            addHistoryItem(
                text,
                contentType,
                "This device"
            );

        } catch (error) {

            console.log(
                "Clipboard error:",
                error
            );

            clipboardMessage.textContent =
                "Clipboard permission was denied. " +
                "Allow access and try again.";
        }
    }
);


clearHistoryButton.addEventListener(
    "click",
    function () {

        history = [];

        saveHistory();

        renderHistory();
    }
);



function isSocketConnected() {

    return (
        socket &&
        socket.readyState === WebSocket.OPEN
    );
}



function updateDeviceCount(count) {

    deviceList.innerHTML = "";


    const deviceItem =
        document.createElement("li");


    if (count === 1) {

        deviceItem.textContent =
            "1 device connected";

    } else {

        deviceItem.textContent =
            count + " devices connected";
    }


    deviceList.appendChild(deviceItem);
}



function detectContentType(text) {

    try {

        const url =
            new URL(text.trim());


        if (
            url.protocol === "http:" ||
            url.protocol === "https:"
        ) {

            return "link";
        }

    } catch (error) {

        // Text is not a URL.
    }


    return "text";
}



function showReceivedClipboard(
    text,
    contentType
) {

    receivedContent.classList.remove("hidden");

    receivedText.innerHTML = "";


    if (contentType === "link") {

        const link =
            document.createElement("a");

        link.href = text;

        link.textContent = text;

        link.target = "_blank";

        link.rel = "noopener noreferrer";

        receivedText.appendChild(link);

    } else {

        receivedText.textContent = text;
    }


    clipboardMessage.textContent =
        "New clipboard received!";
}



function addHistoryItem(
    text,
    contentType,
    device
) {

    const item = {

        id:
            Date.now() +
            "-" +
            Math.random(),

        text: text,

        contentType: contentType,

        device: device,

        time: new Date().toISOString()
    };


    // Prevent immediate duplicate entries
    const duplicate =
        history.some(function (oldItem) {

            const sameText =
                oldItem.text === item.text;

            const timeDifference =
                Math.abs(
                    new Date(oldItem.time) -
                    new Date(item.time)
                );

            return (
                sameText &&
                timeDifference < 3000
            );
        });


    if (duplicate) {
        return;
    }


    history.unshift(item);


    // Keep only the latest 50 items
    history = history.slice(0, 50);


    saveHistory();

    renderHistory();
}



function saveHistory() {

    localStorage.setItem(
        "uniclip-history",
        JSON.stringify(history)
    );
}



function loadHistory() {

    const savedHistory =
        localStorage.getItem(
            "uniclip-history"
        );


    if (!savedHistory) {
        return [];
    }


    try {

        return JSON.parse(savedHistory);

    } catch (error) {

        return [];
    }
}



function renderHistory() {

    historyList.innerHTML = "";


    if (history.length === 0) {

        const emptyMessage =
            document.createElement("p");

        emptyMessage.className = "muted";

        emptyMessage.textContent =
            "No clipboard history yet.";

        historyList.appendChild(
            emptyMessage
        );

        return;
    }


    history.forEach(function (item) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "history-item";


        // Content
        const content =
            document.createElement("div");

        content.className =
            "history-content";


        if (item.contentType === "link") {

            const link =
                document.createElement("a");

            link.href = item.text;

            link.textContent = item.text;

            link.target = "_blank";

            link.rel = "noopener noreferrer";

            content.appendChild(link);

        } else {

            content.textContent =
                item.text;
        }


        // Metadata
        const meta =
            document.createElement("div");

        meta.className =
            "history-meta";

        meta.textContent =
            item.device +
            " • " +
            new Date(item.time)
                .toLocaleString();


        // Buttons
        const actions =
            document.createElement("div");

        actions.className =
            "history-actions";


        // Copy button
        const copyButton =
            document.createElement("button");

        copyButton.textContent =
            "Copy";


        copyButton.addEventListener(
            "click",
            async function () {

                try {

                    await navigator.clipboard
                        .writeText(item.text);

                    clipboardMessage.textContent =
                        "Copied from history!";

                } catch (error) {

                    clipboardMessage.textContent =
                        "Could not copy this item.";
                }
            }
        );


        // Delete button
        const deleteButton =
            document.createElement("button");

        deleteButton.textContent =
            "Delete";

        deleteButton.className =
            "danger";


        deleteButton.addEventListener(
            "click",
            function () {

                history =
                    history.filter(function (oldItem) {

                        return oldItem.id !== item.id;
                    });


                saveHistory();

                renderHistory();
            }
        );


        actions.appendChild(copyButton);

        actions.appendChild(deleteButton);


        wrapper.appendChild(content);

        wrapper.appendChild(meta);

        wrapper.appendChild(actions);


        historyList.appendChild(wrapper);
    });
}



renderHistory();
