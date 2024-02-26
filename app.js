require('dotenv').config();
var mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
const app = require('express')();
const path = require("path");
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');
const http = require('http').Server(app);
const userRoute = require('./routes/userRoutes');

const User = require('./models/userModel');
const Chat = require('./models/chatModel');

app.use('/',userRoute);

const io = require('socket.io')(http);

var usp = io.of('/user-namespace');

usp.on('connection',async function(socket){
    console.log('User Connected');
    var userId = socket.handshake.auth.token;
    await User.findByIdAndUpdate({_id: userId }, { $set:{ is_online:'1'}});
    console.log(socket.handshake.auth.token);

    socket.broadcast.emit('getOnlineUser', {user_id: userId});
    socket.on('disconnect',async function(){
        console.log('User Disconnected');
        var userId = socket.handshake.auth.token;
        await User.findByIdAndUpdate({_id: userId }, { $set:{ is_online:'0'}});

    socket.broadcast.emit('getOfflineUser', {user_id: userId});

    });

    socket.on('newChat', function(data){
        socket.broadcast.emit('loadNewChat',data);
    })

    socket.on('existsChat',async function(data){
      var chats = await Chat.find({ $or:[
            { sender_id: data.sender_id, receiver_id: data.receiver_id },
            { sender_id: data.receiver_id, receiver_id: data.sender_id },
        ] });
        socket.emit('loadChats',{chats: chats});
    });

    socket.on('chatDeleted', function(id){
        socket.broadcast.emit('chatMessageDeleted',id);
    })
});

const port = process.env.PORT || 3000;
http.listen(port, function(){
    console.log(`Server is running on port ${port}`);
});
