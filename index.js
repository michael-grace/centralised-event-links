import { readFile, writeFile } from "fs";

import express, { urlencoded } from "express";
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

app.use(urlencoded({ extended: true }));

// Index Page
app.get("/", (_, res) => {
	// Index Page, where users can click to their individual page
	res.render("index", {
		people: dataStore.people,
		superEvents: dataStore.superEvents,
	});
});

// All People Page
app.route("/people")
	.get((_, res) => {
		// All people page, where you can add and delete people
		res.render("allPeople", { people: dataStore.people });
	})
	.post((req, res) => {
		// Adding a new person to the system
		let newPerson = {
			id:
				dataStore.people.reduce((max, current) => {
					return Math.max(max, current.id);
				}, 0) + 1,
			name: req.body.name,
		};
		dataStore.people.push(newPerson);
		logMessage("Added Person: " + JSON.stringify(newPerson));

		res.redirect("/people");
	});

// Individual persons page - the important page.
app.get("/person/:id", (req, res) => {
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

// Deleting a person.
app.get("/person/:id/delete", (req, res) => {
	let personID = parseInt(req.params.id);
	logMessage("Deleting Person " + personID);
	dataStore.people = dataStore.people.filter((item) => item.id !== personID);
	res.redirect("/people");
});

// All Superevents Page
app.route("/superevents")
	.get((_, res) => {
		res.render("allSuperEvents", { superEvents: dataStore.superEvents });
	})
	.post((req, res) => {
		let newSuperEvent = {
			id:
				dataStore.superEvents.reduce((max, current) => {
					return Math.max(max, current.id);
				}, 0) + 1,
			name: req.body.name,
		};
		dataStore.superEvents.push(newSuperEvent);
		logMessage("Added Superevent: " + JSON.stringify(newSuperEvent));

		res.redirect("/superevents");
	});

// Individual superevent page for getting links
app.route("/superevent/:id").get((req, res) => {
	let superID = parseInt(req.params.id);
	let superEvent;
	dataStore.superEvents.forEach((element) => {
		if (element.id == superID) {
			superEvent = element;
		}
	});
	if (superEvent) {
		let events = [];
		dataStore.events.forEach((element) => {
			if (element.superEvent == superID) {
				events.push(element);
			}
		});
		res.render("superEvent", {
			superEvent: superEvent,
			events: events,
		});
	} else {
		res.sendStatus(404);
	}
});

// Deleting a Superevent
app.get("/superevent/:id/delete", (req, res) => {
	let superID = parseInt(req.params.id);
	logMessage("Deleting Superevent " + superID);
	dataStore.superEvents = dataStore.superEvents.filter(
		(item) => item.id !== superID
	);
	res.redirect("/superevents");
});

// Individual events page for editing, and assigning people
app.route("/event/:id?")
	.get((req, res) => {
		let eventID = parseInt(req.params.id);
		if (eventID) {
			// Already existing event
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
				res.render("event", {
					event: event,
					people: people,
					superEvents: dataStore.superEvents,
				});
			} else {
				res.sendStatus(404);
			}
		} else {
			// New Event
			res.render("event", {
				event: {},
				people: dataStore.people.map((elem) => {
					return {
						person: elem,
						onEvent: false,
					};
				}),
				superEvents: dataStore.superEvents,
			});
		}
	})
	.post((req, res) => {
		if (req.body.id == "") {
			// New Event
			let newEvent = {
				id:
					dataStore.events.reduce((max, current) => {
						return Math.max(max, current.id);
					}, 0) + 1,
				name: req.body.name,
				link: req.body.link,
				people: Object.keys(req.body)
					.map((key) => {
						if (key.match(/person\d+/) && req.body[key] == "on") {
							return parseInt(key.split("person")[1]);
						}
					})
					.filter((elem) => elem),
				superEvent: parseInt(req.body.superEvent),
			};
			dataStore.events.push(newEvent);
			logMessage("Created new event: " + JSON.stringify(newEvent));
			res.redirect("/event/" + newEvent.id);
		} else {
			// Editing Event
			let eventID = parseInt(req.params.id);
			let event;
			dataStore.events.forEach((elem) => {
				if (elem.id == eventID) {
					event = elem;
					return;
				}
			});
			dataStore.events = dataStore.events.filter((event) => {
				event.id != eventID;
			});
			event = {
				id: eventID,
				name: req.body.name,
				link: req.body.link,
				people: Object.keys(req.body)
					.map((key) => {
						if (key.match(/person\d+/) && req.body[key] == "on") {
							return parseInt(key.split("person")[1]);
						}
					})
					.filter((elem) => elem),
				superEvent: parseInt(req.body.superEvent),
			};
			dataStore.events.push(event);
			logMessage("Edited event: " + JSON.stringify(event));
			res.redirect("/event/" + eventID);
		}
	});

// Deleting an event.
app.get("/event/:id/delete", (req, res) => {
	let eventID = parseInt(req.params.id);
	logMessage("Deleting Event " + eventID);
	dataStore.events = dataStore.events.filter((item) => item.id !== eventID);
	res.redirect("/events");
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
