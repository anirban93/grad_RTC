var selfEasyrtcid = "";
var easyrtcid = "";
var haveSelfVideo = false;
var app_data={};

function disable(domId) {
    document.getElementById(domId).disabled = "disabled";
}


function enable(domId) {
    document.getElementById(domId).disabled = false;
}

function connect() {
  easyrtc.enableAudio(true); //document.getElementById("shareAudio").checked
  easyrtc.enableVideo(true);
   //document.getElementById("shareVideo").checked
  easyrtc.enableDataChannels(true);
  easyrtc.setPeerListener(addToConversation);

      app_data = data;
      console.log(app_data);
      easyrtc.setUsername(app_data.user);


  easyrtc.setRoomOccupantListener( convertListToButtons);
  easyrtc.initMediaSource(
		  function(){        // success callback
			  var selfVideo = document.getElementById("selfVideo");
			  easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
			  easyrtc.connect("easyrtc.audioVideo", loginSuccess(app_data,easyrtcid), loginFailure);
		  },
		  loginFailure
	);
}


function hangup() {
    easyrtc.hangupAll();
    disable('hangupButton');
}


function clearConnectList() {
    var otherClientDiv = document.getElementById('otherClients');
    while (otherClientDiv.hasChildNodes()) {
        otherClientDiv.removeChild(otherClientDiv.lastChild);
    }
}

var list_of_occupants;

function convertListToButtons (roomName, occupants, isPrimary) {
    clearConnectList();
    var otherClientDiv = document.getElementById('otherClients');
    list_of_occupants = occupants;
    for(var easyrtcid in occupants) {
        console.log("id"+ easyrtcid);
            console.log("id"+ selfEasyrtcid);
        var button = document.createElement('button');
        button.className = "btn btn-default";
        button.onclick = function(easyrtcid) {
            return function() {
                performCall(easyrtcid);
            };
        }(easyrtcid);

        var label = document.createTextNode("Call " + easyrtc.idToName(easyrtcid));
        button.appendChild(label);
        otherClientDiv.appendChild(button);



    }
}


function setUpMirror() {
    if( !haveSelfVideo) {
        var selfVideo = document.getElementById("selfVideo");
        easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
        selfVideo.muted = true;
        haveSelfVideo = true;
    }
}

function performCall(otherEasyrtcid) {


  console.log("id : "+ selfEasyrtcid);

    easyrtc.hangupAll();
    var acceptedCB = function(accepted, easyrtcid) {
        if( !accepted ) {
            easyrtc.showError("CALL-REJECTEd", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
            enable('otherClients');
        }
    };

    var successCB = function() {
        setUpMirror();
        enable('hangupButton');
    };
    var failureCB = function() {
        enable('otherClients');
    };
    easyrtc.call(otherEasyrtcid, successCB, failureCB, acceptedCB);

     // easyrtc.getPeerStatistics(otherEasyrtcid,
     //            function( peerId, results ) {
     //                   for(var  key in results ) {
     //                         console.log( key + "=" + results[key]);
     //                   }
     //            },
     //            easyrtc.standardStatsFilter);

    //enable here
    enable('hangupButton');
}


function loginSuccess(app_data,easyrtcid) {
    console.log(app_data);
    disable("connectButton");
  //  enable("disconnectButton");
    enable('otherClients');
    selfEasyrtcid = easyrtcid;
    console.log("I am "+selfEasyrtcid);
    document.getElementById("iam").innerHTML = "<b>User : "+ app_data.user + easyrtc.cleanId(easyrtcid) +"</b>"; //  + app_data.name easyrtc.cleanId(easyrtcid);
    easyrtc.showError("noerror", "logged in");
}


function loginFailure(errorCode, message) {
    easyrtc.showError(errorCode, message);
}


function disconnect() {
  easyrtc.disconnect();
  document.getElementById("iam").innerHTML = "logged out";
  enable("connectButton");
  // disable("disconnectButton");
  easyrtc.clearMediaStream( document.getElementById('selfVideo'));
  easyrtc.setVideoObjectSrc(document.getElementById("selfVideo"),"");
  easyrtc.closeLocalMediaStream();
  easyrtc.setRoomOccupantListener( function(){});
  clearConnectList();
}


easyrtc.setStreamAcceptor( function(easyrtcid, stream) {
    setUpMirror();
    var video = document.getElementById('callerVideo');
    easyrtc.setVideoObjectSrc(video,stream);
    enable("hangupButton");
});



easyrtc.setOnStreamClosed( function (easyrtcid) {
    easyrtc.setVideoObjectSrc(document.getElementById('callerVideo'), "");
    disable("hangupButton");
});


var callerPending = null;

easyrtc.setCallCancelled( function(easyrtcid){
    if( easyrtcid === callerPending) {
        document.getElementById('acceptCallBox').style.display = "none";
        callerPending = false;
    }
});


//textPart
function addToConversation(who, msgType, content) {
    who = easyrtc.idToName(who);
    // Escape html special characters, then add linefeeds.
    content = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    content = content.replace(/\n/g, '<br />');
    document.getElementById('conversation').innerHTML +=
    "<b>" + who + ":</b>&nbsp;" + content + "<br />";
}


function sendText(e) {
    var stringToSend = document.getElementById('textBlock').value; //textentryField
    if( stringToSend && stringToSend != "") {
        for(var easyrtcid in list_of_occupants) {
            // var easyrtcid = easyrtc.getIthCaller(i);
            if( easyrtcid && easyrtcid != "") {
                easyrtc.sendPeerMessage(easyrtcid, "im",  stringToSend);
            }
        }
        addToConversation(data.user, "message", stringToSend);

        document.getElementById('textBlock').value = "";
    }
    return false;
}




function sendmsg() {
  // body...
      console.log('HIT!!!');
  for(var easyrtcid in list_of_occupants) {
      var buttontext = document.getElementById('textButton');
      //easyrtc.setUsername(app_data.name);
            buttontext.onclick = function(easyrtcid) {
            return function() {
                console.log('HIT TOO');
                sendStuffWS(easyrtcid);
            };
        }(easyrtcid);
    }
}


function sendStuffWS(otherEasyrtcid) {
    var text = document.getElementById('textBlock').value;
    if(text.replace(/\s/g, "").length === 0) { // Don't send just whitespace
        return;
    }
                console.log('HIT Three');
    easyrtc.sendDataWS(otherEasyrtcid, "message",  text);
    addToConversation(easyrtcid, "message", text); //app_data.name
    document.getElementById('textBlock').value = "";
}
//textPart Ended



easyrtc.setAcceptChecker(function(easyrtcid, callback) {
    document.getElementById('acceptCallBox').style.display = "block";
    //var Modal = document.getElementById('myModal');
    //$('#Mymodal').modal('show');
    callerPending = easyrtcid;
    if( easyrtc.getConnectionCount() > 0 ) {
        document.getElementById('acceptCallLabel').innerHTML = "Drop current call and accept new from " + easyrtc.idToName(easyrtcid) + " ?";
    }
    else {
        document.getElementById('acceptCallLabel').innerHTML = "Accept incoming call from " + easyrtc.idToName(easyrtcid) + " ?";
        console.log('got it ?');
    }
    var acceptTheCall = function(wasAccepted) {
         document.getElementById('acceptCallBox').style.display = "none";
         document.getElementById('acceptCallLabel').innerHTML = "";
         // disable("acceptCallBox");
        if( wasAccepted && easyrtc.getConnectionCount() > 0 ) {
            easyrtc.hangupAll();
              // enable('textBlock');
              // enable('textButton');
        }
        // else if(!wasAccepted){
        //       disable('textBlock');
        //       disable('textButton');
        // }
        callback(wasAccepted);
        callerPending = null;
    };
    document.getElementById("callAcceptButton").onclick = function() {
        acceptTheCall(true);
    };
    document.getElementById("callRejectButton").onclick =function() {
        acceptTheCall(false);
    };
} );
