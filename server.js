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
var words = ["bone", "dragon", "head", "snowflake", 
	"bed", "ring", "bus", "shoe", "cupcake", "branch", "bowl", 
	"balloon", "sunglasses", "dinosaur", "milk", "cherry", 
	"mountain", "snowman", "chicken", "mouth", "snail", "crab", 
	"leaf", "pizza", "alligator", "lamp", "pencil", "carrot", "lips", 
	"frog", "clock", "jar", "ant", "legs", "eyes", "spider", "eye", "doll", 
	"octopus", "light", "square", "book", "blocks", "ears", "broom", 
	"jellyfish", "banana", "table", "ear", "bunk bed", "pig", "elephant", 
	"feet", "finger", "mouse", "circle", "coat", "duck", "moon", "bread", 
	"lion", "face", "butterfly", "giraffe", "egg", "cookie", "seashell", 
	"pie", "ball", "bee", "motorcycle", "bike", "ice cream cone", 
	"bridge", "shirt", "inchworm", "bench", "lollipop", "cat", 
	"spider web", "car", "drum", "orange", "dog", "hat", "swing",
	"ocean", "apple", "socks", "airplane", "door", "grapes", "hamburger", 
	"lemon", "flower", "beach", "kite", "train", "person", "heart", 
	"cow", "robot", "bat", "grass", "chair", "tail", "smile", "desk", 
	"computer", "snake", "glasses", "worm", "bracelet", "water", 
	"candle", "slide", "spoon", "blanket", "horse", "monster", "pen", 
	"whale", "nose", "bug", "boy", "lizard", "bird", "wheel", "caterpillar", 
	"monkey", "cheese", "hand", "rocket", "basketball", "oval", "pants", 
	"Mickey Mouse", "purse", "cup", "turtle", "jacket", "hippo", "stairs", 
	"house", "boat", "tree", "helicopter", "truck", "bell", "star", "bear", 
	"corn", "girl", "bunny", "cloud", "football", "skateboard", "ghost", "sun", "baby"];

function refreshWordArray() {
	var http = require('https');
	var options = {
		host: 'www.thegamegal.com',
		path: '/wordgenerator/generator.php?game=2&category=6'
	};
	
	var req = http.get(options, function (res) {
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		
		// Buffer the body entirely for processing as a whole.
		var bodyChunks = [];
		res.on('data', function (chunk) {
			// You can process streamed parts here...
			bodyChunks.push(chunk);
		}).on('end', function () {
			var body = Buffer.concat(bodyChunks);
			console.log('BODY: ' + body);
			words = JSON.parse(body);
			console.log(words);
			// ...and/or process the entire body here.
		})
	});
	
	req.on('error', function (e) {
		console.log('ERROR: ' + e.message);
	});
}

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
		inProg = true;
		line_history = [];
		nextPlayer();
	}

	function nextPlayer(){
		newWord();
		if(drawer + 1 < connectedUsers.length){
			drawer++;
			line_history = [];
			console.log("Now drawing (" + word +"): " + connectedUsers[drawer].username);
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

	socket.on('message', function (data){
		// check if it is a command
		if (data.message.substr(0, 1) == "/") {
			// split command and parameters
			var options = data.message.split(" ");
			
			// get command
			var command = options[0];
			command = command.substr(1, command.length)
			
			// get params
			var params = options;			
			params.splice(0, 1);
			
			// pass to execute
			executeCommand(command, params);
		}
		else {
			if (inProg) {
				if (data.message == word) {
					console.log(username + " has guessed correctly!");
					turnWinner();
				}
				else {
					io.sockets.emit('message', { 'username' : username, 'message' : data.message })
				}
			}
			else {
				io.sockets.emit('message', { 'username' : username, 'message' : data.message })
			}
			console.log(username + ": " + data.message);
		}
	});
	
	function executeCommand(command, params){
		if (command == "start") {
			gameStart();
		}
		else if (command == "clear") {
			clearCanvas();
		}
		else if (command == "skip") {
			nextPlayer();
		}
	}
	
	function newWord(){
		// Get from here
		// https://www.thegamegal.com/wordgenerator/generator.php?game=2&category=6
		var randIndex = Math.floor(Math.random() * words.length);
		word = words[randIndex];
		console.log(word);
	}

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
		makeReq();
	});

	socket.on('gameStart', function(){
		gameStart();
	})

	socket.on('nextPlayer', function(){
		nextPlayer();
	})

	socket.on('debugClear', function(){
		clearCanvas();
	})
	
	function clearCanvas(){
		line_history = [];
		io.sockets.emit('clearCanvas', {});
	}
	
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