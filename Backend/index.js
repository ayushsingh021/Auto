const express = require("express");
const app = express();
const mysql = require("mysql");
const cors = require("cors");
var bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "1989",
  database: "auto_mate",
  multipleStatements: true,
});

app.post("/getUser", (req, res) => {
  try {
    var email = req.body.email;

    console.log(email);
    db.query("select * from user where email =?;", [email], (err, result) => {
      if (err) {
        console.log(err.sqlMessage);
        res.status(102).send(new Error(err.sqlMessage));
      } else {
        console.log(result);
        res.send(result);
      }
    });
  } catch (error) {
    console.log("wrong user");
    res.status(102).send(new Error("data should not be blank"));
  }
});

//this function is to create account
app.post("/createuser", (req, res) => {
  try {
    var name = req.body.name;
    var Email = req.body.Email;
    var Mobile_no = req.body.Mobile_no;
    var Password = req.body.Password;

    db.query(
      "insert into user (email,name,password,Mobile_no) values(?,?,?,?);",
      [Email, name, Password, Mobile_no],
      (err, result) => {
        if (err) {
          console.log(err.sqlMessage);
          res.status(102).send(new Error(err.sqlMessage));
        } else {
          res.send("success");
        }
      }
    );
  } catch (error) {
    console.log("wrong user");
    res.status(102).send(new Error("data should not be blank"));
  }
});

// CHAT CODE

const path = require('path');
// const express = require('express');
// const app = express();
const http = require('http');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {userJoin, getCurrentUser , userLeave, getRoomUsers} = require('./utils/users');
// const cors = require('cors');
// const dotenv = require('dotenv').config();
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb+srv://aeromodelling-signup:Shivam114@cluster0.skf6mst.mongodb.net/auto-mate?retryWrites=true&w=majority");

const botName = 'AutoMate ChatBot'
// app.use(cors());

var collection;




const server = http.createServer(app);
const io = socketio(server);

// const PORT = 3000 || process.env.port;


//Set static folder
app.use(express.static(path.join(__dirname, '../chat') , async (req, res) => {
    try{
        let result = await collection.findOne({"room_name": req.query.room_name});
        res.send(result)
    }
    catch (e) {
        res.status(500).send({ message: e.message });
    }
}));

//Run when client connect
io.on('connection', socket =>{

    //
    socket.on('joinRoom', async ({username, room}) =>{

        try{
            let result = await collection.findOne({"room_name" : room});

            if(!result){
                await collection.insertOne({"room_name" : room , messages : [] , username: username});
            }

            const user = userJoin(socket.id, username, room);

            socket.join(user.room);

            //Welcome connect user
            socket.emit('message', formatMessage(botName, 'Welcome to AutoMate-Chat'));

            //Broadcast when a user connects
            socket.broadcast
            .to(user.room)
            .emit(
                'message' , 
                formatMessage(botName, ` ${user.username} has joined the chat`)
            );

            socket.activeRoom = room;

            //Send users and room info 
            io.to(user.room).emit('roomUser', {
                room: user.room,
                users: getRoomUsers(user.room)
            })

            // Runs when clients dissconnects
    socket.on('disconnect', ()=>{
        const user = userLeave(socket.id);

        if(user){
            io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the chat`))

            //Send users and room info 
        io.to(user.room).emit('roomUser', {
            room: user.room,
            users: getRoomUsers(user.room)
        })
        }
        
    });
    

    //Listen for  chatMessage
    socket.on('chatMessage', msg =>{
        collection.updateOne({"room_name": socket.activeRoom} , {
            "$push" : {
                "message" : msg
            }
        })

        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });
        }
        catch(e){
            console.error(e);
        }

        

    })

    
    
})





server.listen(3001, async () => {

  try {
    await client.connect().then();
    collection = client.db("auto-mate").collection("chats");
    console.log("Listening on port :", server.address().port);
} catch (e) {
    console.error(e);
}
});


