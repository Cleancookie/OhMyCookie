$(document).ready(function(){
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

	// Calculate canvas size so it's always 4:3
	if(width > height){
		width = height * (4/3);
	}
	else{
		height = width * (3/4);
		
	}
	canvas.width = width;
	canvas.height = height;

	// register mouse event handlers
	canvas.onmousedown = function(e){ 
		mouse.click = true; 
	};
	canvas.onmouseup = function(e){ 
		mouse.click = false; 
	};

	// normalize mouse position to range 0.0 - 1.0
	canvas.onmousemove = function(e) {
		mouse.pos.x = e.clientX / width;
		mouse.pos.y = e.clientY / height;
		mouse.move = true;
	};

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
				console.log(">> true")
				index = i;
				return i;
			} 
		});

		if(index == -1){
			console.log(data.username + " has connected.")
			players.push(data);
		}
		else{
			console.log(players[index].username + " changed their name to " + data.username + ".")
			players[index] = data;
		}
	})

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
	})

	/*****************/
	/* MAIN GAMEPLAY */
	/*****************/

	// clear screen
	socket.on('clearCanvas', clearCanvas());
	function clearCanvas(){
		canvas.width = width;
		canvas.height = height;
	}

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
		// check if the user is drawing
		if (mouse.click && mouse.move && mouse.pos_prev) {
			// send line to to the server
			socket.emit('draw_line', { line: [ mouse.pos, mouse.pos_prev ] });
			mouse.move = false;
		}
		mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y};
		setTimeout(mainLoop, (1/60));
	}

	mainLoop();
});

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

// send new username
function initName(username){
	socket.emit('initName', {'username' : username});
}

// debug
function debug(){
	socket.emit('debug', {});
}