// OVERLAY WEBSOCKET CONNECTION HANDLER

function connectPHNTM(){

var wsP = new WebSocket('ws://localhost:25025/');
	
wsP.onopen = function () {
	$(".phantombot-status a span").replaceWith('<span class="label label-success">OK</span>');
}

wsP.onclose = function () {
	$(".phantombot-status a span").replaceWith('<span class="label label-danger">DC</span>');
	setTimeout(function(){
		connectPHNTM()
	}, 1000)
}

}

function connectOVL(){

var ws = new WebSocket('ws://localhost:25025/');

ws.onopen = function () {
	$(".overlay-status a span").replaceWith('<span class="label label-success">OK</span>');
}

ws.onclose = function () {
	$(".overlay-status a span").replaceWith('<span class="label label-danger">DC</span>');
	setTimeout(function(){
		connectOVL()
	}, 1000)
}

}


// RTMP CONNECTION HANDLER

var RTMPResults = [];

function getRTMPstreams() {
    $.ajax({
        type: "GET",
        url: "http://localhost:8080/stats",
        dataType: "xml",
        success: function(xml) {
            $(xml).find('stream').each(function() {
                $(this).find('name').each(function() {
                    var strname = $(this).text();
                    RTMPResults.push("#RTMP" + strname);
                    if( $("#RTMP" + strname).length == 0) {
                        $("#rtmpStreams").append('<a class="btn btn-app " id="RTMP'+ strname + '"><i class="fa fa-play"></i>' + strname + '</a>');
                    }
                });
            });
        }
    }); 
}

function listRTMPstreams() {
    getRTMPstreams();
    var strStreams = RTMPResults.join();
    $("#rtmpStreams a").not(strStreams).remove();
    RTMPResults = []
}

$(document).ready(function() {
	connectOVL();
    setInterval(listRTMPstreams, 1000);
    loadSettings();
    
    $("#settingSave").click( function() {
        var serverIP = $("#serverIP").val();
        var clientIP = $("#clientIP").val();
        var clientAuth = $("#clientAuth").val();
        var botIP = $("#botIP").val();
        setCookie("serverIP", serverIP, 500);
        setCookie("clientIP", clientIP, 500);
        setCookie("clientAuth", clientAuth, 500);
        setCookie("botIP", botIP, 500);
        $("#settingSave").removeClass("btn-info");
        $("#settingSave").addClass("btn-success");
        $("#settingSave").text("Saved");
        setTimeout(function(){
	        $("#settingSave").removeClass("btn-success");
	        $("#settingSave").addClass("btn-info");
	        $("#settingSave").text("Save");
        }, 1000);
    });
})

function saveSettings() {
    $("#settingSave").click( function() {
        alert("clicked");
        var serverIP = $("#serverIP").val();
        var clientIP = $("#clientIP").val();
        var clientAuth = $("#clientAuth").val();
        var botIP = $("#botIP").val();
        setCookie("serverIP", serverIP, 500);
        setCookie("clientIP", clientIP, 500);
        setCookie("clientAuth", clientAuth, 500);
        setCookie("botIP", botIP, 500);
        $("#settingSave").removeClass("btn-info");
        $("#settingSave").addClass("btn-success");
    });
}

function loadSettings() {
    var server = getCookie("serverIP");
        $("#serverIP").val(server);
        $("#clientIP").val(getCookie("clientIP"));
        $("#clientAuth").val(getCookie("clientAuth"));
        $("#botIP").val(getCookie("botIP"));
        console.log(server);
   
}

// Cookie Monster Would Love this section

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}