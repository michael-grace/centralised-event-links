import { readFile, writeFile } from "fs";

import express from "express";
import WebSocket from "ws";

var dataStore;

readFile("data.json", (err, data) => {
    if (err) {
        throw err;
    }
    dataStore = JSON.parse(data);
});

// Logging with Date Time.
// Use this instead of console.log()
const logMessage = (message) => {
    console.log("[" + new Date().toUTCString() + "] " + message);
};

const app = express();

app.set("view engine", "pug");
app.set("views", "views");

app.use("/static", express.static("static"));

app.get("/", (_, res) => {
    // Index Page, where users can click to their individual page
    res.render("index", { people: dataStore.people });
});

app.route("/people")
    .get((_, res) => {
        // All people page, where you can add and delete people
        res.render("allPeople", { people: dataStore.people });
    })
    .post((req, res) => {
        // TODO
    });

app.get("/person/:id", (req, res) => {
    // Individual persons page - the important page.
    let personID = parseInt(req.params.id);
    let person;
    dataStore.people.forEach((element) => {
        if (element.id == personID) {
            person = element;
        }
    });
    if (person) {
        let events = [];
        dataStore.events.forEach((event) => {
            if (event.people.includes(person.id)) {
                events.push(event);
            }
        });
        res.render("person", { person: person, events: events });
    } else {
        res.sendStatus(404);
    }
});

app.get("/person/:id/delete", (req, res) => {
    // Deleting a person.
    let personID = parseInt(req.params.id);
    dataStore.people = dataStore.people.filter((item) => item.id !== personID);
    res.redirect("/people");
});

app.route("/events")
    .get((_, res) => {
        // All events page, for getting to and deleting events
        res.render("allEvents", { events: dataStore.events });
    })
    .post((req, res) => {
        // TODO
    });

app.route("/event/:id")
    .get((req, res) => {
        // Individual events page for editing, and assigning people
        let eventID = parseInt(req.params.id);
        let event;
        dataStore.events.forEach((element) => {
            if (element.id == eventID) {
                event = element;
            }
        });
        if (event) {
            let people = [];
            dataStore.people.forEach((person) => {
                // Creating the list of people
                // checkmarked if they're assigned to this event
                if (event.people.includes(person.id)) {
                    people.push({
                        person: person,
                        onEvent: true,
                    });
                } else {
                    people.push({
                        person: person,
                        onEvent: false,
                    });
                }
            });
            res.render("event", { event: event, people: people });
        } else {
            res.sendStatus(404);
        }
    })
    .post((req, res) => {
        // TODO
    });

app.listen(process.env.PORT || 3000, () => {
    logMessage(`Started`);
});

setInterval(() => {
    // Saving to the JSON file every 20 seconds
    logMessage("Updating JSON Store");
    writeFile("./data.json", JSON.stringify(dataStore, null, 4), (err) => {
        if (err) {
            logMessage("Errored: " + err);
        }
    });
}, 20000);

const wss = new WebSocket.Server({ port: process.env.WS_PORT || 3001 });

var wsConnections = [];

wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        logMessage("Received WS: " + message);
        let jsonMessage = JSON.parse(message);
        if (jsonMessage.type == "offer") {
            // New Connection, containing personID
            wsConnections.push({
                personID: jsonMessage.payload.personID,
                ws: ws,
            });
        } else if (jsonMessage.type == "callIn") {
            // Someone wants to put out a call
            let event;
            dataStore.events.forEach((e) => {
                if (e.id === jsonMessage.payload.id) {
                    event = e;
                    return;
                }
            });
            if (event) {
                let caller;
                dataStore.people.forEach((person) => {
                    if (person.id === jsonMessage.payload.caller) {
                        caller = person.name;
                        return;
                    }
                });
                logMessage(
                    "Ringing: " +
                    JSON.stringify({
                        event: event,
                        caller: caller,
                    })
                );
                wsConnections.forEach((ws) => {
                    // Sending a call messaage to everyone
                    if (event.people.includes(ws.personID)) {
                        ws.ws.send(
                            JSON.stringify({
                                type: "callOut",
                                payload: {
                                    event: event,
                                    caller: caller,
                                },
                            })
                        );
                    }
                });
            }
        }
    });
    ws.on("close", () => {
        wsConnections = wsConnections.filter((item) => item.ws !== ws);
    });

    ws.send(
        JSON.stringify({
            type: "message",
            payload: "hello",
        })
    );
});