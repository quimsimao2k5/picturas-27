const http = require("http");
const socketIo = require('socket.io');
const jwt = require("jsonwebtoken");

const { read_rabbit_msg } = require("./utils/rabbit_mq.js");
const httpServer = http.createServer();
httpServer.listen(4000);

const io = socketIo(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
    // options
});

io.on("connection", (socket) => {
    console.log("a user connected");

    const token = socket.handshake.auth.token;
    if (token != null) {
        jwt.verify(token, process.env.JWT_SECRET_KEY, (e, payload) => {
            if (e) {
                socket.emit('authError', e);
                return;
            }

            console.log("Connecting to room:", payload.id)
            socket.join(payload.id);
        });
    }

    socket.on("join-project", (projectId) => {
        if (typeof projectId === "string" && projectId.length > 0) {
            socket.join(`project:${projectId}`);
        }
        });


    socket.on("leave-project", (projectId) => {
        if (typeof projectId === "string" && projectId.length > 0) {
            socket.leave(`project:${projectId}`);
        }
        });
        
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });

});

// id do user como room id

function process_msg() {
    read_rabbit_msg('ws_queue', (msg) => {
        const msg_content = JSON.parse(msg.content.toString());
        const msg_id = msg_content.messageId;
        const timestamp = msg_content.timestamp
        const status = msg_content.status;
        const user = msg_content.user;

        console.log('Received msg:', JSON.stringify(msg_content));

        if (/update-client-preview/.test(msg_id)) {
            if (status == "error") {
                const error_code = msg_content.errorCode;
                const error_msg = msg_content.errorMsg;

                io.to(user).emit("preview-error", { error_code, error_msg }); 

                return;
            }

            const img_url = msg_content.img_url;

            io.to(user).emit("preview-ready", img_url);
        }

        else if (/update-client-process/.test(msg_id)) {

            if (status == "error") {
                const error_code = msg_content.errorCode;
                const error_msg = msg_content.errorMsg;

                io.to(user).emit("process-error", { error_code, error_msg }); 

                return;
            }

            io.to(user).emit("process-update", msg_id);
        }

        else if (msg_content.type === "project-op") {
            const projectId = msg_content.projectId;
            const op = msg_content.op;

            if (projectId && op) {
                io.to(`project:${projectId}`).emit("project-op", { projectId, op });
            }
            }

        //  project updated
        else if (/project-updated/.test(msg_id) || msg_content.type === "project-updated") {
            const projectId = msg_content.projectId;
            const version = msg_content.version;

            if (projectId) {
                io.to(`project:${projectId}`).emit("project-updated", { projectId, version });
            }
        }
    })
}

process_msg();
