(function (win, doc) {

    'use strict';

    var riggedHandPlugin;
    Leap.loop({
        hand: function(hand){
            var label = hand.data('label');

            if (!label){

                label = document.createElement('label');
                document.body.appendChild(label);

                /**
                 * Here we set the label to show the hand type
                 */
                label.innerHTML = hand.type + " hand";
                hand.data('label', label);
            }


            var handMesh = hand.data('riggedHand.mesh');

            var screenPosition = handMesh.screenPosition(
                hand.palmPosition,
                riggedHandPlugin.camera
            );

            label.style.left = screenPosition.x + 'px';
            label.style.bottom = screenPosition.y + 'px';
        }
    })
    .use('riggedHand')
        .use('handEntry')
        .on('handFound', function(hand) {
            this.addMesh(hand);
        })
        .on('handLost', function(hand){
            this.removeMesh(hand);

            var label = hand.data('label');
            if (label){
                document.body.removeChild(label);
                hand.data({label: undefined});
            }
        });

    riggedHandPlugin = Leap.loopController.plugins.riggedHand;

}(window, document));
