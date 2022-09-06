const videoEl = document.querySelector(".stream");
const container = document.querySelector(".received");
const socket = io("/");

socket.on("connection", () => console.log("Connected to server"));

const addVideo = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
        video.play();
    });
    video.classList.add("peers");
    container.appendChild(video);
};

const peers = {};

navigator.getUserMedia(
    {
        video: true,
        audio: true,
    },
    function (stream) {
        videoEl.srcObject = stream;
        videoEl.addEventListener("loadedmetadata", () => {
            videoEl.play();
        });

        socket.on("user-connected", (userId) => {
            console.log("New user", userId);
            console.log("Call made");
            const call = peer.call(userId, stream);
            const video = document.createElement("video");
            call.on("stream", (userStream) => {
                console.log("Call answered");
                addVideo(video, userStream);
            });

            call.on("close", () => {
                console.log("Video removed");
                video.remove();
            });

            socket.on("user-disconnected", (userId) => {
                manualClose(userId);
                console.log("Disconnected", userId);
                if (peers[userId]) {
                    peers[userId].close();
                    peer[userId] = undefined;
                }
            });

            peers[userId] = call;
        });
    }
);

const peer = new Peer(undefined, {
    host: "p2p-video-call-mern.herokuapp.com",
    port: 8000,
    path: "/peerjs",
});

let callList = {};

peer.on("open", (id) => {
    console.log("Peer ID", id);
    socket.emit("join-room", { roomId: ROOM_ID, userId: id });
});

socket.on("user-add", (id) => {
    let conn = peer.connect(id);

    conn.on("close", () => {
        console.log("Connection removed");
        manualClose(id);
    });
});

peer.on("call", (call) => {
    // console.log(call)
    console.log("Call answered");
    let newVid = document.createElement("video");
    navigator.getUserMedia(
        {
            video: true,
            audio: true,
        },
        function (stream) {
            call.answer(stream);
            call.on("stream", (stream) => {
                if (!callList[call.peer]) {
                    console.log("Received stream from", stream.id);
                    let parent = document.querySelector(".received");
                    parent.appendChild(newVid);
                    newVid.srcObject = stream;
                    newVid.addEventListener("loadedmetadata", () => {
                        newVid.play();
                    });
                    newVid.classList.add("peers");
                    newVid.id = call.peer;
                    newVid.dataset.peerId = call.peer;
                    callList[call.peer] = call;
                    peer[call.peer] = call;
                }
            });
        }
    );
});

socket.on("user-disconnected", (userId) => {
    manualClose(userId);
    console.log("Disconnected from", userId);
    if (peers[userId]) {
        peers[userId].close();
        peers[userId] = undefined;
    }
    // newVid.remove();
    const target = document.querySelector(`[data-peer-id='${userId}']`);
    target.remove();
});

function manualClose(TARGET_ID) {
    // close the peer connections
    for (let conns in peer.connections) {
        peer.connections[conns].forEach((conn, index, array) => {
            // Manually close the peerConnections b/c peerJs MediaConnect close not called bug: https://github.com/peers/peerjs/issues/636
            if (conn.peer === TARGET_ID) {
                console.log(
                    `closing ${conn.connectionId} peerConnection (${
                        index + 1
                    }/${array.length})`,
                    conn.peerConnection
                );
                conn.peerConnection.close();

                // close it using peerjs methods
                if (conn.close) {
                    conn.close();
                }
            }
        });
    }
}
