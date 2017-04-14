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

// array of all users
var connectedUsers = [];

// event-handler for new incoming connections 
io.on('connection', function (socket) {
	console.log("New connection");

	// Variables
	var clientID = socket.id;
	var username = "NULL";

	// Send ID to the user
	socket.emit('updateID', { 'id' : clientID });

	// User wants to connect (has username and clientID)
	socket.on('initName', function(data){
		// Log to console
		console.log("+" + data.username + " has connected.");

		// Make user object
		var newUser = {
			'username':data.username,
			'id': clientID
		}
		username = data.username;

		// See if user already exists
		var index = -1;
		connectedUsers.find(function(item, i){
			if(item.id === clientID){
				index = i;
				return i;
			} 
		});

		// Add item to our array
		if(index == -1){
			connectedUsers.push(newUser);
		}

		// Send list of all connected users
		for (var i in connectedUsers) {
			socket.emit('newUser', { 
				'username': connectedUsers[i].username,
				'id' : connectedUsers[i].id 
				});
		}

		// Tell everyone else about this user
		socket.broadcast.emit('newUser', newUser)
	})

	// User updated their username
	socket.on('newUsername', function(data){


		// Make user object
		var newUser = {
			'username':data.username,
			'id': clientID
		}

		// See if user already exists
		var index = -1;
		connectedUsers.find(function(item, i){
			if(item.id === clientID){
				index = i;
				return i;
			} 
		});

		// Update our array
		if(index > -1){
			// Log to console
			console.log(connectedUsers[index].username + " has changed their name to " + newUser.username);
			connectedUsers[index] = newUser;
		}
		else{
			connectedUsers.push(newUser);
		}

		// Broadcast to all other users
		socket.broadcast.emit('newUser', newUser)
	})

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

	socket.on('disconnect', function(){
		// Log to console
		console.log("Closed connection");
		
		// See if this person has an entry in connectedUsers
		var index = -1;
		connectedUsers.find(function(item, i){
			if(item.id === clientID){
				index = i;
				return i;
			} 
		});

		// delet dis
		if(index > -1){
			console.log("-" + connectedUsers[index].username + " has disconnected.");
			socket.broadcast.emit('delUser', connectedUsers[index])
			connectedUsers.splice(index, 1);
		}
	});

	socket.on('debug', function(){
		console.log(connectedUsers);
	})
});