// require express module
var express = require('express'),
    // create app that bundles everything in express
    app = express(),

    // create an http server object
    server = require('http').createServer(app),

    // create the socket functionality and maake it listen our http object
    io = require('socket.io').listen(server),

    // array of nicknames
    nicknames = [];

// tell the server what port to listen on
server.listen(3000);

// create a route to access our pages. function takes in http request
// and response as parameters.
app.get('/', function(req, res) {

    // client will need to get the index.html file whenever he goes
    // to localhost:8080
    res.sendFile(__dirname + '/index.html');
});

// receive the event on the server side. Whenever a client connects to a socket.io
// application, they turn on a connection event
io.sockets.on('connection', function(socket) {

    // receive event on nicknames. we also pass in callback because we're
    // sending data back to the client from this function
    socket.on('new user', function (data, callback) {

        // check if user name entered in array
        if (nicknames.indexOf(data) != -1) {

            // send false back to the callback if index of whatever inputed
            // nickname not existant
            callback(false);

        } else {
            callback(true);
            // if not in the array, add nickname to the socket (each user has their
            // socket) basically storing the nickname of each user. Have it has a
            // property of the socket.
            socket.nickname = data;

            // push this value onto the array
            nicknames.push(socket.nickname);

            // update user list on the client side
            updateNicknames();
        }

    });

    function updateNicknames() {

      // emit nicknames array to all the users so that they can updates
      // their list when someone joins
      io.sockets.emit('usernames', nicknames);

    }


    // do something with our sent data (in 'send message') by using a function
    socket.on('send message', function(data) {

        // send message to all the other users. Create a name ('new message')
        // for the events to broadcast to other users.
        io.sockets.emit('new message', {msg: data, nick: socket.nickname});

    });

    // create a way to get rid of users when they disconnect
    socket.on('disconnect', function(data) {

        // check that they have a nickname set
        if(!socket.nicknames) return;

        // if they do, remove them from the nicknames array
        nicknames.splice(nicknames.indexOf(socket.nicknames), 1);

        // update user list on the client side
        updateNicknames();

    });
});
