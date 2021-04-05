const url = window.location.pathname.split("/");
const personID = parseInt(url[url.length - 1]);

var ws;
var allowedNotifs = false;

if (Notification.permission === "granted") {
    allowedNotifs = true;
} else if (Notification.permission !== "denied") {
    // Ask for Notification Permission
    Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
            allowedNotifs = true;
        }
    });
}

function connectToWS() {
    ws = new WebSocket("ws://192.168.0.8:3001");

    ws.onmessage = function incoming(data) {
        message = JSON.parse(data.data);
        if (message.type == "message" && message.payload == "hello") {
            ws.send(
                JSON.stringify({
                    type: "offer",
                    payload: {
                        personID: personID,
                    },
                })
            );
            document.getElementById("connection").style.display = "none";
        } else if (message.type == "callOut") {
            let notif =
                message.payload.caller +
                " is calling you on " +
                message.payload.event.name;
            if (allowedNotifs) {
                new Notification("Ring Ring", {
                    body: notif,
                });
            }
        }
    };

    ws.onclose = () => {
        document.getElementById("connection").style.display = "block";
        connectToWS(); // Try to Reconnect
    };
}

const call = (eventID) => {
    ws.send(
        JSON.stringify({
            type: "callIn",
            payload: {
                id: eventID,
                caller: personID,
            },
        })
    );
};