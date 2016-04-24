// require express module
var express = require('express'),
    // create app that bundles everything in express
    app = express(),

    // create an http server object
    server = require('http').createServer(app),

    // create the socket functionality and maake it listen our http object
    io = require('socket.io').listen(server);

// tell the server what port to listen on
server.listen(3000);

// create a route to access our pages. function takes in http request
// and response as parameters.
app.get('/', function(req, res) {

    // client will need to get the index.html file whenever he goes
    // to localhost:8080
    res.sendfile(__dirname + '/index.html');
});

// receive the event on the server side. Whenever a client connects to a socket.io
// application, they turn on a connection event
io.sockets.on('connection', function(socket) {

    // do something with our sent data (in 'send message') by using a function
    socket.on('send message', function(data) {

        // send message to all the other users. Create a name ('new message')
        // for the events to broadcast to other users.
        io.sockets.emit('new message', data);

    });
});
