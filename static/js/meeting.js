console.log("Meeting")

var mapPeers = {};

var labelUsername = document.querySelector('#label-username');
var inputUsername = document.querySelector('#username');
var btnJoin = document.querySelector('#btn-join');

var username;
var webSocket;

function webSocketOnMessage(event) {
    var parsedData = JSON.parse(event.data)['receive_dict'];
    var peerUsername = parsedData["peer"];
    var action = parsedData["action"];

    var receiver_channel_name = parsedData['message']['receiver_channel_name'];
    

    if(username == peerUsername){
        return;
    }


    if (action == 'new-peer'){
        createOfferer(peerUsername, receiver_channel_name);
        return;
    };

    if (action == 'new-offer') {
        var offer = parsedData['message']['sdp'];
        createAnswer(offer, peerUsername, receiver_channel_name);
    };

    if (action == 'new-answer'){
        var answer = parsedData['message']['sdp'];

        var peer = mapPeers[peerUsername][0];

        peer.setRemoteDescription(answer);

        return;
    }
}



btnJoin.addEventListener('click', () => {
    username = inputUsername.value;

    if (username == ''){
        return
    }

    inputUsername.value = '';
    inputUsername.disabled = true;
    inputUsername.style.visibility = 'hidden';

    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    labelUsername.innerHTML = username;
    console.log(username);

    const websocketProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsEndpoint = `${websocketProtocol}://${window.location.host}/`;

    console.log(wsEndpoint);

    webSocket = new WebSocket(wsEndpoint);

    webSocket.onopen = (event) => {
        console.log("WebSocket connection opened!");

        sendSignal('new-peer', {})

    };

    webSocket.onclose = (event) => {
        console.log("WebSocket connection closed!");
    };

    webSocket.onerror = (e) => {
        console.log("Error Occurred");
    }

    webSocket.addEventListener('message', webSocketOnMessage);

});

var localStream = new MediaStream();

var constraints = {
    'video':true,
    'audio':true,
}

var localVideo = document.querySelector('#local-video');

var btnToggleAudio = document.querySelector('#btn-toggle-audio');
var btnToggleVideo = document.querySelector('#btn-toggle-video');

var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        var audioTrack = stream.getAudioTracks();
        var videoTrack = stream.getVideoTracks();

        audioTrack[0].enabled = true;
        videoTrack[0].enabled = true;

        btnToggleAudio.addEventListener('click', () => {
            audioTrack[0].enabled = !audioTrack[0].enabled;

            if (audioTrack[0].enabled) {
                btnToggleAudio.innerHTML = 'Audio Mute';
                return;
            }

            btnToggleAudio.innerHTML = 'Audio Unmute';
        });

        btnToggleVideo.addEventListener('click', () => {
            videoTrack[0].enabled = !videoTrack[0].enabled;
            if (videoTrack[0].enabled) {
                btnToggleVideo.innerHTML = 'Video Off';
                return;
            }

            btnToggleVideo.innerHTML = 'Video On';
        });
    })
    .catch(error => {
        console.log('Error accessing media device', error)
    });

function sendSignal(action, message) {
    var jsonStr = JSON.stringify({
        'peer': username,
        'action': action,
        'message': message
    })

    webSocket.send(jsonStr);
}

function createOfferer(peerUsername, receiver_channel_name){
    console.log('Create offer')
    var peer = new RTCPeerConnection(null);

    addLocalTracks(peer);

    var dc = peer.createDataChannel('channel');
    dc.addEventListener('open', () => {
        console.log('Connection open')
    });

    dc.addEventListener('message', dcOnMessage);

    var remoteVideo = createVideo(peerUsername);
    setOntrack(peer, remoteVideo);

    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;

        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername];

            if (iceConnectionState === 'closed'){
                peer.close();
            };
            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate){
            console.log('New ice candidate: ', JSON.stringify(peer.localDescription));
            return;
        };

        sendSignal('new-offer', {
            'sdp': peer.localDescription,
            'receiver_channel_name' : receiver_channel_name
        });

    });

    peer.createOffer().then(o => peer.setLocalDescription(o))
        .then(() => {
            console.log('Local description set successfully')
        });
}

function createAnswer(offer, peerUsername, receiver_channel_name){
    var peer = new RTCPeerConnection(null);

    addLocalTracks(peer);


    var remoteVideo = createVideo(peerUsername);
    setOntrack(peer, remoteVideo);

    peer.addEventListener('datachannel', e => {
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => {
            console.log('Connection open')
        });
    
        peer.dc.addEventListener('message', dcOnMessage);

        mapPeers[peerUsername] = [peer, peer.dc];
    });

    

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;

        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername];

            if (iceConnectionState === 'closed'){
                peer.close();
            };
            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (envent) => {
        if (envent.candidate){
            console.log('New ice candidate: ', JSON.stringify(peer.localDescription));
            return;
        };

        sendSignal('new-answer', {
            'sdp': peer.localDescription,
            'receiver_channel_name' : receiver_channel_name
        });

    });

    peer.setRemoteDescription(offer)
        .then(() => {
            console.log('Remote description for %s.', peerUsername);

            return peer.createAnswer();
        })
        .then(a => {
            console.log('answer created');
            peer.setLocalDescription(a);
        })
}

function addLocalTracks(peer){
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    });

    return;
}


function createVideo(peerUsername){
    var videoContainer = document.querySelector('#video-container');
    var remoteVideo = document.createElement('video');

    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    

    var videoWrapper = document.createElement('div');

    videoContainer.appendChild(videoWrapper);

    videoWrapper.appendChild(remoteVideo);

    return remoteVideo;

}

function setOntrack(peer, remoteVideo){
    var remoteStream = new MediaStream();

    remoteVideo.srcObject = remoteStream;

    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remoteStream);
    });
}
function removeVideo(video) { 
    var videoWrapper = video.parentNode;

    videoWrapper.parentNode.removeChild(videoWrapper);
}

var btnSendMsg = document.querySelector('#btn-send-msg');
var messageList = document.querySelector('#message-list');
var messageInput = document.querySelector('#msg');

function dcOnMessage(event){
    var message = event.data;

    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li);

};


btnSendMsg.addEventListener('click', sendMsgOnClick);

function sendMsgOnClick(){
    console.log('aa')
    var message = messageInput.value;

    var li = document.createElement('li');
    li.appendChild(document.createTextNode('Me: ' + message));
    messageList.appendChild(li);

    var dataChannels = getDataChannels();

    message = username + ': '+message;

    for(index in dataChannels){
        dataChannels[index].send(message);
    };

    messageInput.value = '';

}

function getDataChannels(){
    var dataChannels = [];

    for(username in mapPeers){
        var dataChannel = mapPeers[username][1];

        dataChannels.push(dataChannel);
    }

    return dataChannels;
}