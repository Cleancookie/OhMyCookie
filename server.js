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
console.log('Node app is running');

// array of all lines drawn
var line_history = [];

// array of all users
var connectedUsers = [];

// Game variables
// Current client drawing
var drawer = -1;
var inProg = false;
var word = "yerd";

// event-handler for new incoming connections 
io.on('connection', function (socket){
	/**************/
	/* SETTING UP */
	/**************/
	socket.emit('clearCanvas', {});

	sendCanvas();
	
	// Variables
	var clientID = socket.id;
	var username = "NULL";

	console.log("New connection [id : " + clientID + "]");

	// Send ID to the user
	socket.emit('updateID', { 'id' : clientID });

	/*********************/
	/* CLIENT MANAGEMENT */
	/*********************/

	// User wants to connect (has username and clientID)
	socket.on('initName', function(data){
		// Log to console
		console.log("+" + data.username + " has connected. [id : " + clientID + "]");

		// Make user object
		var newUser = {
			'username': data.username,
			'id': clientID,
			'score': 0
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
				'id': connectedUsers[i].id,
				'score': connectedUsers[i].score
				});
		}
		
		// Tell everyone else about this user
		socket.broadcast.emit('newUser', newUser);
	})

	// User updated their username
	socket.on('newUsername', function(data){
		// Make user object
		var newUser = {
			'username':data.username,
			'id': clientID,
			'score': 0
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
			console.log(connectedUsers[index].username + 
				" has changed their name to " + newUser.username);
			connectedUsers[index].username = newUser.username;
		}
		else{
			connectedUsers.push(newUser);
		}

		// Broadcast to all other users
		socket.broadcast.emit('newUser', newUser)
	})

	socket.on('disconnect', function(){
		// Log to console
		console.log("Closed connection [id : " + clientID + "]");

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
			console.log("-" + connectedUsers[index].username + " has disconnected. [id : " + clientID + "]");
			socket.broadcast.emit('delUser', connectedUsers[index])
			connectedUsers.splice(index, 1);
		}
	});
	/************/
	/* GAMEPLAY */
	/************/

	function gameStart(){
		console.log("Game Start");
		drawer = -1;
		gameProg = true;
		line_history = [];
		nextPlayer();
	}

	function nextPlayer(){
		if(drawer + 1 < connectedUsers.length){
			drawer++;
			line_history = [];
			console.log("Now drawing: " + connectedUsers[drawer].username);
			io.sockets.emit('newTurn', connectedUsers[drawer]);
			console.log(connectedUsers[drawer].id);
			io.to(connectedUsers[drawer].id).emit('newWord', {'word' : word});
			gameProg = true;
		}
		else{
			console.log("Game end");
			console.log("Total drawers: " + drawer);
			io.sockets.emit('gameEnd', {})
			gameProg = false;
		}
	}

	function turnWinner(){
		io.sockets.emit('turnWinner', { 'username' : username, 'word' : word})
		gameProg = false;
		nextPlayer();
	}

	socket.on('message', function(data){
		if(inProg){
			if(data.message == word){
				console.log(username + " has guessed correctly!");
				turnWinner();
			}
			else{
				io.sockets.emit('message', { 'username' : username, 'message' : data.message})
			}
		}
		else {
			io.sockets.emit('message', { 'username' : username, 'message' : data.message})
		}
		console.log(username + ": " + data.message);
	});

	/***********/
	/* DRAWING */
	/***********/

	// Drawer has drawn a line
	socket.on('draw_line', function (data) {
		// add received line to history
		line_history.push(data.line);
		// send line to all clients
		io.emit('draw_line', { line: data.line });
	});


	/* DEBUGGING MESSAGES */
	socket.on('debug', function(){
		console.log(connectedUsers);
	});

	socket.on('gameStart', function(){
		gameStart();
	})

	socket.on('nextPlayer', function(){
		nextPlayer();
	})

	socket.on('debugClear', function(){
		line_history = [];
		io.sockets.emit('clearCanvas', {});
	})
	
	/*********/
	/* OTHER */
	/*********/
	
	socket.on('reloadCanvas', function (){
		sendCanvas();
	})

	function sendCanvas(){
		// first send the history to the new client
		for (var i in line_history) {
			socket.emit('draw_line', { line: line_history[i] });
		}
	}
});