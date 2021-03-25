const url = window.location.pathname.split("/");
const personID = parseInt(url[url.length - 1]);

const ws = new WebSocket("ws://192.168.1.123:3001");

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
        window.alert(notif);
        new Notification("Ring Ring", {
            body: notif,
        });
    }
};

ws.onclose = () => {
    document.getElementById("connection").style.display = "block";
};

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