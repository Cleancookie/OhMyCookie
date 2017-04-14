var express = require('express'),
app = express(),
http = require('http'),
socketIo = require('socket.io');

// start webserver
var server =  http.createServer(app);
var io = socketIo.listen(server);
server.listen(process.env.PORT || 13337);
	
// add directory with our static files
app.use(express.static(__dirname + '/public'));
console.log('Node app is running on port', app.get('port'));

// array of all lines drawn
var line_history = [];

// event-handler for new incoming connections
io.on('connection', function (socket) {
	// Variables
	var clientID = socket.id;

	// Tell everyone the new user's ID
	socket.emit('newUser', { id: clientID });

	// Tell everyone who disconnected
	io.on('disconnect', function(){
		socket.emit('delUser', { id: clientID });
	}

	// first send the history to the new client
	for (var i in line_history) {
		socket.emit('draw_line', { line: line_history[i] } );
	}

	// add handler for message type "draw_line".
	socket.on('draw_line', function (data) {
		// add received line to history
		line_history.push(data.line);
		// send line to all clients
		io.emit('draw_line', { line: data.line });
	});


});
