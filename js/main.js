(function (win, doc) {
    'use strict';


    var api_key = 'ri24c8vjfvpfogvi';

    var peer = new Peer({key: api_key}); 

    // PeerJSに接続したらpeer IDが発行される
    peer.on('open', function(id) {
        doc.getElementById('myID').innerHTML = 'My peer ID is: ' + id;
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
        call.answer(myStream);
        call.on('stream', function (yourStream) {
            var remoteVideo = doc.getElementById('remoteVideo');
            remoteVideo.src = URL.createObjectURL(yourStream);
        });

        //conn = peer.connect(call.peer);
    });

    ////////////////////////////////////////////////////////////////////////////////////

    function showMessage(mes) {
        doc.getElementById('receive-message').value = mes;
    }

    ////////////////////////////////////////////////////////////////////////////////////
    
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
    });

    ////////////////////////////////////////////////////////////////////////////////////

    // IDにコールを送る
    var btn = document.getElementById('send');
    btn.addEventListener('click', function () {
        var inp = doc.getElementById('yourID');
        var id = inp.value;

        var call = peer.call(id, myStream);
        call.on('stream', function (yourStream) {
            var remoteVideo = doc.getElementById('remoteVideo');
            remoteVideo.src = URL.createObjectURL(yourStream);
        });

        // データコネクションを開始
        conn = peer.connect(id);
        conn.on('open', function () {
            console.log('[2] on open data connection.');
            conn.on('data', onDataHandler);
        });
    });

    ////////////////////////////////////////////////////////////////////////////////////

    var sendBtn = doc.getElementById('chat');
    sendBtn.addEventListener('click', function () {
        var message = doc.getElementById('message').value;
        conn.send({
            type: 'message',
            message: message,
            object: {
                hoge: 'foo',
                fuga: [1, 2, 3]
            }
        });
    });

    ////////////////////////////////////////////////////////////////////////////////////

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

        // Leap.loopController.onFrame(frame);

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
            // this.addMesh(hand);

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
            // this.removeMesh(hand);
            
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
