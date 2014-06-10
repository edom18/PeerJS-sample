(function (win, doc) {
    'use strict';

    var DEBUG = true;

    var api_key = 'ri24c8vjfvpfogvi';

    var peer = new Peer({
        key: api_key,
        config: {
            'iceServers': [
                { url: 'stun:stun.l.google.com:19302' },
                { url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' }
            ]
        }
    });

    // PeerJSに接続したらpeer IDが発行される
    peer.on('open', function(id) {
        showMessage('My peer ID is: <strong>' + id + '</strong>', 'system');
    });

    // 動画ストリームを取得
    var myStream;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    navigator.getUserMedia({video: true, audio: true}, function(stream) {
        myStream = stream;

        var myVideo = doc.getElementById('myVideo');
        myVideo.src = URL.createObjectURL(stream);
        adjustVideo();
    }, function(err) {
        console.log('Failed to get local stream' ,err);
    });

    peer.on('call', function(call) {
        call.answer(myStream);
        call.on('stream', function (yourStream) {
            var remoteVideo = doc.getElementById('remoteVideo');
            remoteVideo.src = URL.createObjectURL(yourStream);
            hideCallBox();
        });
    });

    ////////////////////////////////////////////////////////////////////////////////////

    var receiveMessage     = doc.getElementById('receive-message');
    var receiveMessageArea = doc.getElementById('receive-message-area');
    var myVideo            = doc.getElementById('myVideo');
    function showMessage(mes, type) {

        if (mes === '') {
            return;
        }

        var chat = doc.createElement('p');
        chat.innerHTML = mes;
        if (type === 'system') {
            chat.innerHTML = '---- ' + chat.innerHTML + ' ----';
            chat.className = 'system';
        }
        receiveMessage.appendChild(chat);
        scrollToBottom();
        adjustVideo();
    }

    function scrollToBottom() {
        receiveMessage.scrollTop = 1000000;
    }

    function adjustVideo() {
        var rect = receiveMessageArea.getBoundingClientRect();
        var videoRect = myVideo.getBoundingClientRect();
        var bottom = window.innerHeight - rect.top + 10;
        myVideo.style.bottom = bottom + 'px';
    }

    function hideCallBox() {
        doc.getElementById('callTo').style.display = 'none';
    }

    ////////////////////////////////////////////////////////////////////////////////////
    
    /**
     * データチャネルハンドラ
     *
     * @param {Object} data 受信データ
     */
    function onDataHandler(data) {

        console.log('onDataHandler: ', data);

        var hand, frame;
        if (data.type === 'message') {
            showMessage(data.message);
        }
        else if (data.type === 'leap-add') {
            hand = JSON.parse(data.object.hand);
            hand.data = function(hashOrKey, value) {
                return window.dataFn.call(this, 'h', hashOrKey, value);
            };
            Leap.loopController.addMesh(hand);
        }
        else if (data.type === 'leap-remove') {
            hand = JSON.parse(data.object.hand);
            hand.data = function(hashOrKey, value) {
                return window.dataFn.call(this, 'h', hashOrKey, value);
            };
            Leap.loopController.removeMesh(hand);
        }
        else if (data.type === 'leap-frame') {
            frame = JSON.parse(data.object.frame);
            frame.hands.forEach(function (hand, i) {
                hand.data = function(hashOrKey, value) {
                    return window.dataFn.call(this, 'h', hashOrKey, value);
                };
            });
            Leap.loopController.onFrame(frame);
        }
    }

    // 接続確立
    var conn;
    peer.on('connection', function(_conn) {
        console.log('Connected data connection.', _conn);

        conn = _conn;
        _conn.on('data', onDataHandler);
        hideCallBox();
    });

    ////////////////////////////////////////////////////////////////////////////////////

    // IDにコールを送る
    var btn = document.getElementById('send');
    btn.addEventListener('click', function () {
        var inp = doc.getElementById('yourID');
        var id = inp.value;
        var call;

        // カメラが接続されている場合はそれを使ってcallする
        if (myStream) {
            call = peer.call(id, myStream);
            call.on('stream', function (yourStream) {
                var remoteVideo = doc.getElementById('remoteVideo');
                remoteVideo.src = URL.createObjectURL(yourStream);
                hideCallBox();
            });
        }

        // データコネクションを開始
        conn = peer.connect(id);
        conn.on('open', function () {
            console.log('[2] on open data connection.');
            conn.on('data', onDataHandler);
            hideCallBox();
        });
    });

    ////////////////////////////////////////////////////////////////////////////////////

    var ele = doc.getElementById('message');
    function sendMessage() {
        var message = ele.value;
        showMessage(message);
        ele.value = '';
        conn.send({
            type: 'message',
            message: message,
            object: null
        });
    }

    var sendBtn = doc.getElementById('chat');
    sendBtn.addEventListener('click', sendMessage);

    var mesBox = doc.getElementById('message');
    mesBox.addEventListener('keydown', function (e) {
        if (e.keyCode === 13) {
            sendMessage();
        }
    });

    ////////////////////////////////////////////////////////////////////////////////////
    // For Leap motion.

    function filterPropertiesForHand(hand) {
        var result = {};
        ['id', 'type', 'data', 'fingers'].forEach(function (key, i) {
            result[key] = hand[key];
        });
        result.fingers.forEach(function (finger, i) {
            delete finger.frame;

            finger.bones.forEach(function (bone, i) {
                delete bone.finger;
            });
        });
        return result;
    }

    function filterPropertiesForFrame(frame) {
        var result = {};
        ['hands'].forEach(function (key, i) {
            result[key] = frame[key];
        });
        result.hands.forEach(function (hand, i) {
            delete hand.frame;
            filterPropertiesForHand(hand);
        });
        return result;
    }

    var cnt = 0;
    var riggedHandPlugin;
    Leap.loop({
        hand: function(hand){
        }
    }, function (frame) {
        if (frame.hands.length === 0) {
            return;
        }

        if ((cnt++) % 3 === 0) {
            return;
        }

        DEBUG && Leap.loopController.onFrame(frame);

        // if ((cnt++) % 2 === 0) {
           if (conn) {
               var result    = filterPropertiesForFrame(frame);
               var jsonFrame = JSON.stringify(result);
               conn.send({
                   type: 'leap-frame',
                   object: {
                       frame: jsonFrame
                   }
               });
           }
        // }
    })
    .use('riggedHand')
        .use('handHold')
        .use('handEntry')
        .on('handFound', function(hand) {

            DEBUG && this.addMesh(hand);

            if (conn) {
                var result   = filterPropertiesForHand(hand);
                var jsonHand = JSON.stringify(result);
                conn.send({
                    type: 'leap-add',
                    object: {
                        hand: jsonHand
                    }
                });
            }
        })
        .on('handLost', function(hand){
            DEBUG && this.removeMesh(hand);
            
            if (conn) {
                var result   = filterPropertiesForHand(hand);
                var jsonHand = JSON.stringify(result);
                conn.send({
                    type: 'leap-remove',
                    object: {
                        hand: jsonHand
                    }
                });
            }
        });
    riggedHandPlugin = Leap.loopController.plugins.riggedHand;

}(window, document));
