$(document).ready(function (){
	// get txtArea ready

	mouse = {
		click: false,
		move: false,
		pos: {x:0, y:0},
		pos_prev: false
	};
	// get canvas element and create context
	canvas  = document.getElementById('drawing');
	context = canvas.getContext('2d');
	width   = window.innerWidth;
	height  = window.innerHeight;
	socket  = io.connect();
	myID	= -1;
	canDraw	= true;
	players = [];
	word 	= "";
	hasName = false;

	// Calculate canvas size so it's always 4:3
	clearCanvas();

	// register mouse event handlers
	$('*')[0].onmousedown = function(e){ 
		mouse.click = true; 
	};
	$('*')[0].onmouseup = function(e){ 
		mouse.click = false; 
	};

	// normalize mouse position to range 0.0 - 1.0
	$('*')[0].onmousemove = function (e) {
		// Make sure it's relative to the canvas
		mouse.pos.x = (e.clientX - $('#drawing').offset().left) / width;
		mouse.pos.y = (e.clientY - $('#drawing').offset().top) / height;
		mouse.move = true;
	};
    
	// Get username from user
	var usernameModal = function (){
		vex.dialog.open({
			message: 'Please enter a username',
			showCloseButton: false,
			escapeButtonCloses: false,
			overlayClosesOnClick: false,
			input: [
				'<style>',
				'.vex-custom-field-wrapper {',
				'margin: 1em 0;',
				'}',
				'.vex-custom-field-wrapper > label {',
				'display: inline-block;',
				'margin-bottom: .2em;',
				'}',
				'</style>',
				'<div class="vex-custom-field-wrapper">',
				'<div class="vex-custom-input-wrapper">',
				'<input name="username" type="text" value=""/>',
				'</div>',
				'</div>'
			].join(''),
			callback: function (value) {
				if (typeof value.username == 'undefined') {
					usernameModal();
				}
				else {
					initName(value.username);
					hasName = true;
				}
			}
		});
	}
	usernameModal();

	/*********************/
	/* PLAYER MANAGEMENT */
	/*********************/

	// Get my ID
	socket.on('updateID', function(data){
		myID = data.id;
	})

	// Add new user to our array
	socket.on('newUser', function(data){

		// Check if user already exists
		var index = -1;
		players.find(function(item, i){
			if(item.id === data.id){
				index = i;
				return i;
			} 
		});

		if(index == -1){
			console.log(data.username + " has connected.")
			players.push(data);
			
			
		}
		else {
			console.log(players[index].username + " changed their name to " + data.username + ".")
			players[index] = data;
		}

		refreshUsers();
	})
	
	// Refresh txtUsers
	function refreshUsers(){
		// Clear txtUsers
		$('#txtUsers').val('');

		// Append all users
		players.forEach(function (item, index){
			$('#txtUsers').val($('#txtUsers').val() + item.username + "\n")
		})
	}

	// Someone disconnected
	socket.on('delUser', function(data){
		console.log(data.username + " has disconnected.");

		var index = -1;

		// look for ID in players[]
		players.find(function(item, i){
			if(item.id === data.id){
				index = i;
			} 
		});

		// delete if exists
		if(index > -1){
			players.splice(index, 1);
		}

		refreshUsers();
	})

	/************/
	/* GAMEPLAY */
	/************/

	// New player's turn to draw
	socket.on('newTurn', function(data){
		clearCanvas();
		if (myID == data.id) {
			appendMsg("It is now your turn to start drawing.");
			console.log("It is now your turn to start drawing.")
			canDraw = true;
		}
		else {
			appendMsg("New player drawing: " + data.username);
			console.log("New player drawing: " + data.username);
			canDraw = false;
		}
	})

	// Get word from server
	socket.on('newWord', function(data){
		word = data.word;
		appendMsg("Your word to draw: " + word);
		console.log("Your word to draw: " + word);
		// make modal
	})

	// Receive a message from the server
	socket.on('message', function (data){
		appendMsg(data.username + ": " + data.message);
		console.log(data.username + ": " + data.message)
	})

	// Server announce that someone guessed the word
	socket.on('turnWinner', function (data){
		appendMsg(data.username + " has guessed the word!");
		console.log(data.username + " has guessed the word!");
		appendMsg("The word was " + data.word + ".");
		console.log("The word was " + data.word + ".");
		// Might need to do some stuff here about the timer and such
	})

	// Game end
	socket.on('gameEnd', function (data){
		appendMsg("The game is now over.");
		console.log("The game is now over.");
		canDraw = true;
	})

	/*****************/
	/* DRAWING TOOLS */
	/*****************/
	// clear screen
	socket.on('clearCanvas', function(){
		clearCanvas();
	});

	// draw line received from server
	socket.on('draw_line', function (data) {
		var line = data.line;
		context.beginPath();
		context.moveTo(line[0].x * width, line[0].y * height);
		context.lineTo(line[1].x * width, line[1].y * height);
		context.stroke();
	});

	// main loop, running every 25ms
	function mainLoop() {
		// scroll the txtArea

		// check if the user is drawing
		if (mouse.click && mouse.move && mouse.pos_prev && canDraw) {
			// send line to to the server
			socket.emit('draw_line', { line: [ mouse.pos, mouse.pos_prev ] });
			mouse.move = false;
		}
		mouse.pos_prev = { x: mouse.pos.x, y: mouse.pos.y };
		
		if (hasName) {
			$('#txtMsg').focus();
		}
		setTimeout(mainLoop, (1/60));
	}

	mainLoop();
	
	/*********/
	/* OTHER */
	/*********/

	// Auto resize canvas
	$(window).resize(function (){
		clearCanvas();
		socket.emit('reloadCanvas', {});
	});
	
	// check if the person is pressing enter
	$('#txtMsg').keypress(function (e) {
		var keyCode = (e.keyCode ? e.keyCode : e.which);
		if (keyCode == '13') {
			sendMsg($('#txtMsg').val());
			$('#txtMsg').val("");
		}
	});

});

var msgCount = 0;
function appendMsg(message) {
	// Append msg
	$('#txtArea').val($('#txtArea').val() + message + "\n");
	
	// Scroll down
	$('#txtArea').scrollTop($('#txtArea')[0].scrollHeight);
}

// send new username
function newName(username){
	var tempUser = {
		'username' : username,
		'id' : myID }
	// Update our username in our own array
	// See if user already exists
	var index = -1;
	players.find(function(item, i){
		if(item.id === myID){
			index = i;
		}
	});

	// Update our array
	if(index > -1){
		players[index].username = username;
	}
	else{
		players.push(tempUser);
	}
	socket.emit('newUsername', {'username' : username});
}

// reset the canvas
function clearCanvas(){
	// Get size of the window (mobile first meta tag)
	width = $(window).width() - 2;
	height = $(window).height() - 2;

	//// Change sizes to 16:9
	//if (width / (16/9) > height) {
	//	width = height * (16/9);
	//}
	//else{
	//	height = width * (9/16);
	//}

	// Set canvas size
	canvas.width = width;
	canvas.height = height;
	
	// Log to console
	console.log("Canvas cleared");
}

// send new username
function initName(username){
	socket.emit('initName', {'username' : username});
}

// Send a message to the server
function sendMsg(message){
	socket.emit('message', { 'message' : message})
}

// debug
function debug(){
	socket.emit('debug', {});
}

/* SOCKETS CHEAT SHEET


 // sending to sender-client only
 socket.emit('message', "this is a test");

 // sending to all clients, include sender
 io.emit('message', "this is a test");

 // sending to all clients except sender
 socket.broadcast.emit('message', "this is a test");

 // sending to all clients in 'game' room(channel) except sender
 socket.broadcast.to('game').emit('message', 'nice game');

 // sending to all clients in 'game' room(channel), include sender
 io.in('game').emit('message', 'cool game');

 // sending to sender client, only if they are in 'game' room(channel)
 socket.to('game').emit('message', 'enjoy the game');

 // sending to all clients in namespace 'myNamespace', include sender
 io.of('myNamespace').emit('message', 'gg');

 // sending to individual socketid
 socket.broadcast.to(socketid).emit('message', 'for your eyes only');


*/