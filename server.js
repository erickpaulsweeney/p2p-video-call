const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const { ExpressPeerServer } = require("peer");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
    res.render("index", { roomId: req.params.room });
});

const httpServer = app.listen(process.env.PORT || 8000, () => {
    console.log("Server connected");
});

const peerServer = ExpressPeerServer(httpServer, {
    debug: true,
});

app.use("/peerjs", peerServer);

const connections = {};

peerServer.on("connection", (peer) => {
    console.log("Peer connected", peer.id);
});

peerServer.on("disconnect", (peer) => {
    console.log("Peer disconnected", peer.id);
    
});

const io = require("socket.io")(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    let room, user;
    socket.on("join-room", (data) => {
        console.log(data)
        socket.join(data.roomId);
        connections[data.roomId] = connections[data.roomId] === undefined ? [data.userId] : connections[data.roomId].concat([data.userId]);
        room = data.roomId;
        user = data.userId;
        console.log(connections)
        io.to(data.roomId).emit("user-connected", data.userId);
    });

    socket.on("disconnect", () => {
        io.to(room).emit("user-disconnected", user);
    });
});
