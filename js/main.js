(function (win, doc) {
    'use strict';


    var api_key = 'ri24c8vjfvpfogvi';

    var peer = new Peer({key: api_key}); 

    // PeerJSに接続したらpeer IDが発行される
    peer.on('open', function(id) {
        doc.getElementById('myID').innerHTML = 'My peer ID is: ' + id;
    });

    // 接続確立
    var conn;
    peer.on('connection', function(_conn) {
        conn = _conn;
        _conn.on('data', function(data){
            doc.getElementById('receive-message').value = data;
        });
    });

    var myStream;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    navigator.getUserMedia({video: true, audio: true}, function(stream) {
        myStream = stream;

        var myVideo = doc.getElementById('myVideo');
        myVideo.src = URL.createObjectURL(stream);
    }, function(err) {
        console.log('Failed to get local stream' ,err);
    });

    peer.on('call', function(call) {
        // console.log(call);
        call.answer(myStream);
        call.on('stream', function (yourStream) {
            var remoteVideo = doc.getElementById('remoteVideo');
            remoteVideo.src = URL.createObjectURL(yourStream);
        });

        //conn = peer.connect(call.peer);
    });

    ////////////////////////////////////////////////////////////////////////////////////

    // IDにコールを送る
    var btn = document.getElementById('send');
    btn.addEventListener('click', function () {
        var inp = document.getElementById('yourID');
        var id = inp.value;

        var call = peer.call(id, myStream);
        call.on('stream', function (yourStream) {
            var remoteVideo = doc.getElementById('remoteVideo');
            remoteVideo.src = URL.createObjectURL(yourStream);
        });

        // データコネクションを開始
        //conn = peer.connect(id);
    });

    ////////////////////////////////////////////////////////////////////////////////////

    var sendBtn = doc.getElementById('chat');
    sendBtn.addEventListener('click', function () {
        var message = doc.getElementById('message').value;
        conn.send(message);
    });

}(window, document));
