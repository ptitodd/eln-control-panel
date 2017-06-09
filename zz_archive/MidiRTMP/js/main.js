
// === MIDI RTMP JS ===
// This JS requires an NGINX server with ARUT RTMP module installed on the localhost
// Also Remote Control needs to be enabled with the RTMP module in Single Worker mode
// This also requires GOOGLE CHROME to work. NO POLYFILL

//configurables

//HOME IPS
var RTMPServerIP          = "10.0.13.58";
var RTMPClientIP          = "10.0.13.29";

//BENS IPs
//var RTMPServerIP 			= "192.168.1.61";
//var RTMPClientIP 			= "192.168.1.62";

var RTMPServerControlPort 	= "8080";
var RTMPAppName 			= "live";


// Some global Vars
var log = console.log.bind(console),
    keyData = document.getElementById('key_data'),
    timeData = document.getElementById('time_info'),
    midi;

var btnBox = document.getElementById('content'),
    btn = document.getElementsByClassName('button');
    
var data, cmd, channel, type, note, velocity;

var currentStream = 1; //the first stream is stream 1

var streamAvailable = []; //yea... it's an array... index is the stream ID



//TIME SYSTEM
var timeout = null;
var time = null;
var GOtime = 120;

function startCountdown(timen, pause) {
        time = timen;
        $('#timerdiv').html(timen);
        if(timen == 0){
			
			nextStream(); //When our timer hits 0 go to the next available stream
            startCountdown(GOtime,1000);
			
		}else
        {
            clearTimeout(timeout);
            timeout = setTimeout(function(){
                startCountdown(timen-1, pause)
            }, pause);
        }
    }
    
function stopCountdown(){
	clearTimeout(timeout);
}

//MIDI

// request MIDI access
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({
        sysex: false
    }).then(onMIDISuccess, onMIDIFailure);
} else {
    alert("No MIDI support in your browser.");
}


//MIDI to display Mappings
var sampleMap = {
	key1: 1,
	key2: 2,
	key3: 3,
	key4: 4,
	key5: 5,
	key6: 6,
	key7: 7,
	key8: 8
};

// midi functions
function onMIDISuccess(midiAccess) {
    midi = midiAccess;
    var inputs = midi.inputs.values();
    // loop through all inputs
    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        // listen for midi messages
        input.value.onmidimessage = onMIDIMessage;
        // this just lists our inputs in the console
        listInputs(input);
    }
    // listen for connect/disconnect message
    midi.onstatechange = onStateChange;
}


// do shit when a midi message is received
function onMIDIMessage(event) {
    data = event.data,
    cmd = data[0] >> 4,
    channel = data[0] & 0xf,
    type = data[0] & 0xf0, // channel agnostic message type.
    note = data[1],
    velocity = data[2];

    switch (type) {
        case 144: // noteOn message 
             noteOn(note, velocity, channel);
             break;
        case 128: // noteOff message
            noteOff(note, velocity);
            break;
        case 176: // knob messages
        	notetotime(note, velocity);
        	break;
    }

    //console.log('data', data, 'cmd', cmd, 'channel', channel);
    logger(keyData, 'key data', data);
}


// Logging to read MIDI events as controller notes vary from device to device
function onStateChange(event) {
    var port = event.port,
        state = port.state,
        name = port.name,
        type = port.type;
    if (type == "input") console.log("name", name, "port", port, "state", state);
}


// Logging to get controller hardware information from device
function listInputs(inputs) {
    var input = inputs.value;
    log("Input port : [ type:'" + input.type + "' id: '" + input.id +
        "' manufacturer: '" + input.manufacturer + "' name: '" + input.name +
        "' version: '" + input.version + "']");
}


// this takes the input from a standard midi knob on our interface and converts it to a time
function notetotime(midiNote, velocity) {
	var sample = midiNote;
	//make sure we only accept data from knob on note # 8
	if(sample == 8){
		
	//multiply velocity by 2 to create 2 second leaps which increase max time between intervals 
	var interval = velocity * 2;
	
	//user friendly minutes and seconds
	minutes = Math.floor((interval + 30) / 60);
	seconds = (interval + 30) - ( minutes * 60 );
	
	time = minutes + "m " + seconds +"s";
	
	//show interval in UI
	timeData.textContent = time;
	
	//Set the timer
	GOtime = interval+30; // Minimum time is 30 seconds (sending RTMP redirects every 0 seconds will kill nginx, switching scenes every les than 30 seconds will be straight up annoying to watch)
	startCountdown(GOtime, 1000);
	}
	
}


function noteOn(midiNote, velocity, midiChannel) {
	
	if (midiChannel == 1){
		
		if (midiNote > 0 && midiNote < 9){
			
			if( velocity == 127){
				let streamID = currentStream + 1;
				let oldElementID = "Str" + streamID ;
				let nextStream = midiNote;
				let newElementID = "Str" + nextStream;
			
				if (streamAvailable[nextStream] == true){
					$(".btn-danger").removeClass("btn-danger");
					playStream(nextStream);
					document.getElementById(newElementID).classList.add('btn-danger');
					currentStream = nextStream;
				} else{
					console.error("Stream is not available")
				}
			}
			
		}
		
	} 

	if (midiChannel == 0){
	
		// Play Pause Countdown
		if(midiNote == 11){
			if( velocity == 127){
				startCountdown(GOtime,1000);
			}else{
				stopCountdown();
			}
		}	
	
		// Next Stream
		if(midiNote == 9){
			if(velocity == 0){  //make sure to trigger when the button is released
				nextStream();
			}
		}
	
		// Previous Stream
		if(midiNote == 10){
			if(velocity == 0){  //make sure to trigger when the button is released
				prevStream();
			}
		}
	
		//Else the buttons are pads
		activate(midiNote);
	
	}
}


function noteOff(midiNote, velocity) {
	
		// none of our pads or buttons are noteOff but I am keeping this in for 
		//activate(midiNote);

	
}


// show that a stream has been selected in UI and add that stream to the array (or remove it)
function activate(note) {
    var sample = sampleMap['key' + note];
	 let elementID = "Str" + note;
    if (sample) {
        if (type == (0x80 & 0xf0) || velocity == 0) { //QuNexus always returns 144
            //remove style button
			btn[sample - 1].classList.remove('active');
			//remove style queue cursor
			document.getElementById(elementID).classList.remove('btn-info');
			//set stream availability array to none
			streamAvailable[parseInt(note)] = null;
            return;
        }	    
        
		//style button
        btn[sample - 1].classList.add('active');
		//style queue cursor
		document.getElementById(elementID).classList.add('btn-info');
		//set stream availability
		streamAvailable[parseInt(note)] = true;
    }
}


// Handle a browser that doesn't support web midi API
function onMIDIFailure(e) {
    log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + e);
}


//RTMP Controls
function nextStream(){
	let nextStream = currentStream;
	do {
		nextStream++; //increase the currentStream value
		if (nextStream === 8) {
			nextStream = 0;
		}
		
		streamID = parseInt(nextStream) + 1; //this adds 1 because midi interface doesn't start a 0
		
	} while (!streamAvailable[streamID] && nextStream!==currentStream );
	
	if (nextStream === currentStream) {
		console.error("No midi streams available.")
	} else {
		$(".btn-danger").removeClass("btn-danger");
		currentStream = nextStream;
		playStream(streamID);
		newElementID = 'Str' + streamID;
		document.getElementById(newElementID).classList.add('btn-danger');
		
	}
}


function prevStream(){
	let prevStream = currentStream;
	do {
		prevStream--; //decrement the currentStream value
		if (prevStream === -1) {
			prevStream = 7;
		}
		
		streamID = parseInt(prevStream) + 1; //this adds 1 because midi interface doesn't start a 0
		
	} while (!streamAvailable[streamID] && prevStream!==currentStream );
	
	if (nextStream === currentStream) {
		
		console.error("No midi streams available.")
		
	} else {
		$(".btn-danger").removeClass("btn-danger");
		currentStream = prevStream;
		playStream(streamID);
		newElementID = 'Str' + streamID;
		document.getElementById(newElementID).classList.add('btn-danger');
		
	}
}



// Tell the RTMP server to redirect - This and Bootstrap are the only reasons for JQuery
function playStream(ID){
	let stream = ID;
	
	$.ajax({
		url: 'http://' + RTMPServerIP + ':' + RTMPServerControlPort + '/control/redirect/subscriber?app=' + RTMPAppName + '&addr=' + RTMPClientIP + '&newname=system' + stream,
		type:'POST',
		dataType: 'json',
		contentType: 'application/json',
		success:function(){
			console.info("Stream switched to" + stream);
		},
		error:function(){
			console.error("Nginx is not available");
		}
	});
};



// utility functions
function randomRange(min, max) {
    return Math.random() * (max + min) + min;
}

function rangeMap(x, a1, a2, b1, b2) {
    return ((x - a1) / (a2 - a1)) * (b2 - b1) + b1;
}

function frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function logger(container, label, data) {
    messages = label + " [channel: " + (data[0] & 0xf) + ", cmd: " + (data[0] >> 4) + ", type: " + (data[0] & 0xf0) + " , note: " + data[1] + " , velocity: " + data[2] + "]";
    container.textContent = messages;
}