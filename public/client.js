$(document).ready(function(){
	var mouse = {
		click: false,
		move: false,
		pos: {x:0, y:0},
		pos_prev: false
	};
	// get canvas element and create context
	var canvas  = document.getElementById('drawing');
	var context = canvas.getContext('2d');
	var width   = window.innerWidth;
	var height  = window.innerHeight;
	var socket  = io.connect();

	var players = [];

	// set canvas to full browser width/height
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

	// draw line received from server
	socket.on('draw_line', function (data) {
		var line = data.line;
		context.beginPath();
		context.moveTo(line[0].x * width, line[0].y * height);
		context.lineTo(line[1].x * width, line[1].y * height);
		context.stroke();
	});

	// Add new user to our array
	socket.on('newUser', function(data){
		console.log("New client id=" + data.id);
	})

	// Someone disconnected
	socket.on('delUser', function(data){
		console.log("Client disconnected id=" + data.id);
		var userIndex = players.indexOf(data.id);
		if(userIndex > -1){
			players.splice(userIndex, 1);
		}
	})

	// main loop, running every 25ms
	function mainLoop() {
		// check if the user is drawing
		if (mouse.click && mouse.move && mouse.pos_prev) {
			// send line to to the server
			socket.emit('draw_line', { line: [ mouse.pos, mouse.pos_prev ] });
			mouse.move = false;
		}
		mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y};
		setTimeout(mainLoop, 25);
	}

	mainLoop();
});
