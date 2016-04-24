// require express module
var express = require('express'),
    // create app that bundles everything in express
    app = express(),

    // create an http server object
    server = require('http').createServer(app),

    // create the socket functionality and maake it listen our http object
    io = require('socket.io').listen(server),

    // include mongoose
    mongoose = require('mongoose'),

    // object of nicknames
    users = {};

// tell the server what port to listen on
server.listen(3000);

// connect to our mongoDB database passing in a mongoDb URI
// MongoDb default port is 27107
// We can add user authentication later here!!!
mongoose.connect('mongodb://localhost/chat', function(err) {

    // check if there is an error
    if(err) {
        console.log(err);
    } else {
        console.log('Connected to mongodb!');
    }
});

// create a schema. mongodb doesnt store data in tables but in collections of
// documents that have a certain type of structure. We define that stucture in a
// schema.
var chatSchema = mongoose.Schema({

    // whatever data we want to save from our app. define type for each of the
    // fields
    nick: String,
    msg: String,

    // create time of when message was sent
    created: {type: Date, default: Date.now}

});

// create a mongoose model. It creates a collection called Message (turned into a
// plural form when collecions are created) inside the database and use the schema
// we defined for that collection.
var Chat = mongoose.model('Message', chatSchema);

// create a route to access our pages. function takes in http request
// and response as parameters.
app.get('/', function(req, res) {

    // client will need to get the index.html file whenever he goes
    // to localhost:8080
    res.sendFile(__dirname + '/index.html');
});

// receive the event on the server side. Whenever a client connects to a socket.io
// application, they turn on a connection event and they have their own socket
io.sockets.on('connection', function(socket) {

    // retrieve messages as soon as a new user connects by querying in mongoose
    // first parameter for some limitations of what to find as in querying all
    // messages with 'nick: "Louis"' for instance. Adds a callback function
    // taking an error and docs.

    var query = Chat.find({});

    // limit the number of messages to retrieve and wait for execution later
    // by making the query execute manually
    // Also, sort the query by "created" field and descending to see the most
    // recent down with '-created'.
    // On client side make sure that latest message is displayed last on list.
    query.sort('-created').limit(8).exec(function(err, docs) {

        // if there's an error, throw it
        if(err) throw err;

        // if no error, emit the documents
        socket.emit('Load old messages', docs);
    });

    // receive event on nicknames. we also pass in callback because we're
    // sending data back to the client from this function.
    socket.on('new user', function (data, callback) {

        // check if user name entered in array
        if (data in users) {

            // send false back to the callback if index of whatever inputed
            // nickname not existant
            callback(false);

        } else {
            callback(true);
            // if not in the array, add nickname to the socket (each user has their
            // socket) basically storing the nickname of each user. Have it has a
            // property of the socket.
            socket.nickname = data;

            // save the socket
            users[socket.nickname] = socket;

            // update user list on the client side
            updateNicknames();
        }

    });

    function updateNicknames() {

      // emit nicknames array to all the users so that they can updates
      // their list when someone joins. Send the keys to the object to the client
      // side
      io.sockets.emit('usernames', Object.keys(users));

    }


    // do something with our sent data (in 'send message') by using a function
    socket.on('send message', function(data, callback) {

        // trim the message to take care of whitespace in message for private
        // messaging where you can whisper to somebody in the chat using
        // '/w' before the message.
        var msg = data.trim();
        if(msg.substr(0,3) === '/w ') {

            // use the message from the start of the user name onwards
            msg = msg.substr(3);

            // find the index of the first space which should come right after
            // the name.
            var ind = msg.indexOf(' ');

            // if the index not -1, whisper working
            if (ind !== -1) {

                // check to see usename is valid by finding the substring of the
                // message up until the index of the space
                var name = msg.substring(0, ind);

                // start of message is the character indexed right after the space
                // till the end
                var msg = msg.substring(ind + 1);

                // if the name is in the user object, then it's a whisper
                if(name in users) {

                    // emit using the socket of the user we're whispering to.
                    // since the socket is saved in the users object, we can
                    // access it (change event name to 'whisper')
                    users[name].emit('whisper', {msg: msg, nick: socket.nickname});

                    console.log('Whisper!');
                } else {

                    // if not in user object send an error callback.
                    callback('Error: Enter a valid user.');
                }

            } else {

                // if there is no space, then basically no message was put in
                // so we want to give them some sort of callback message (add
                // message we want to display in the callback)
                callback("Error! Please enter a message for your whisper.");
            }


        } else {

          // create a new document to save using the name of our model
          // we don't have to include the date ecause we already defined
          // the default in our schema.
          var newMsg = new Chat({msg: msg, nick: socket.nickname});

          // save the document to the database (the callback function
          // takes an error)
          newMsg.save(function(err) {

              // if there's an error, just throw it
              if(err) throw err;

              // if no error, emit the newMsg
              // send trimmed message ('msg' and not the entire 'data')to all the other users. Create a name ('new message')
              // for the events to broadcast to other users.
              io.sockets.emit('new message', {msg: msg, nick: socket.nickname});

          });


        }

    });

    // create a way to get rid of users when they disconnect
    socket.on('disconnect', function(data) {

        // check that they have a nickname set
        if(!socket.nickname) return;

        // if they do, delete user
        delete users[socket.nickname];

        // update user list on the client side
        updateNicknames();

    });
});
