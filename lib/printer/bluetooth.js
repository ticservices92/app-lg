/**
 * The Bluetooth object.
 * @namespace Bluetooth
 * @type {Object}
 */
Bluetooth = {};

/**
 * Current status of ethernet device
 * @type {Object}
 * @memberOf Bluetooth
 */
Bluetooth.status = {printerStatus: "disconnected", paperStatus: "unknown"};

/**
 * If there's an active bluetooth connection this is true
 * @type {Boolean}
 * @memberOf Bluetooth
 */
Bluetooth.connected = false;

/**
 * Stores the address or name of the device to which a connection should be established
 * @type {String}
 * @memberOf Bluetooth
 */
Bluetooth.device = undefined;

/**
 * Lists all paired bluetooth devices
 * @param  {function} success Called with a list of unpaired devices found
 * @param  {function} error   Called if an error ocurred
 * @memberOf Bluetooth
 */
Bluetooth.getPairedDevices = function(success, error){
    if(typeof bluetoothSerial === "undefined"){
        error("bluetoothSerial not available. ");
        return;
    }
    //Make sure bluetooth is enabled. Prompt user to turn it on if it isn't
    bluetoothSerial.enable(function(){
        // List paired devices
        bluetoothSerial.list(function (list) {
            // No need to wait for the unpaired to execute the callback
            success(list);
        }, function (err) {
            error("Couldn't list bluetooth devices", err);
        });
    },function(){
        error("Bluetooth wasn't enabled. ");
    });
};

/**
 * Looks for available unpaired bluetooth devices nearby
 * Takes very long
 * @param  {function} success Called with a list of unpaired devices found
 * @param  {function} error   Called if an error ocurred
 * @memberOf Bluetooth
 */
Bluetooth.getAvailableDevices = function(success, error){
    if(typeof bluetoothSerial === "undefined"){
        error("bluetoothSerial not available. ");
        return;
    }
    //Make sure bluetooth is enabled. Prompt user to turn it on if it isn't
    bluetoothSerial.enable(function(){
        //Look for available devices
        bluetoothSerial.discoverUnpaired(function(list){
            success(list);
        }, function(){
            error("Couldn't find bluetooth devices. ");
        });
    },function(){
        error("Bluetooth wasn't enabled. ");
    });
};

/**
 * Connects to the device with name or address equal to Bluetooth.device
 * @param  {function} success Called if a connection was made
 * @param  {function} error   Called if an error ocurred
 * @memberOf Bluetooth
 */
Bluetooth.connect = function(success, error){
    if(typeof bluetoothSerial === "undefined"){
        error("bluetoothSerial not available. ");
        return;
    }

    var actuallyConnect = function(list, err){
        var callbackCalled = false;

        var onConnection = function(){
            Bluetooth.connected = true;
            //About to call success callback so no need
            //to call error callback if later on the connection
            //to the device is lost
            callbackCalled = true;

            bluetoothSerial.subscribeRawData(function (bytes) {
                var data = new Uint8Array(bytes);
                if(data.length === 1 && (data[0]&146) === 18){
                    console.debug("Received printer status message over bluetooth");
                    Bluetooth.status.printerStatus = "connected";
                    if((data[0]&104) === 0){
                        Bluetooth.status.paperStatus = "ok";
                    }else if((data[0]&96) === 96){
                        Bluetooth.status.paperStatus = "empty";
                    }else{
                        Bluetooth.status.paperStatus = "low";
                    }
                    if(typeof Bluetooth.onMessageReceived === "function") Bluetooth.onMessageReceived();
                }
            }, function(){
                console.debug("Couldn't subscribe to raw data input from bluetooth device");
            });

            success();
        };
        //Called if connection to bluetooth device is lost
        var onDisconnection = function(){
            //Store current connection state
            Bluetooth.connected = false;
            bluetoothSerial.unsubscribeRawData();
            Bluetooth.status = {printerStatus:"disconnected", paperStatus:"unknown"};
            if(typeof Bluetooth.onMessageReceived === "function") Bluetooth.onMessageReceived();
            //Only calls error callback if success wasn't called initially
            if(!callbackCalled) err("Couldn't connect to specified device", true);
        };

        //Look within the object array lists for one with a name
        // or address equal to the one saved in Bluetooth.device
        for(var i in list){
            if( !!(Bluetooth.device) && (list[i].name === Bluetooth.device || list[i].address === Bluetooth.device)){
                //Connect to desired device
                bluetoothSerial.connect(list[i].address, onConnection, onDisconnection);
                return;
            }
        }
        err("Couldn't find specified device ");
    };

    bluetoothSerial.enable(function(){
        Bluetooth.getPairedDevices(function (list1) {
            // No need to wait for the unpaired to check if connection is possible
            actuallyConnect(list1, function (msg, printerFoundButNotConnected) {
                if(printerFoundButNotConnected){
                    error(msg);
                    return;
                }
                Bluetooth.getAvailableDevices(function(list2){
                    actuallyConnect(list2, error);
                }, error);
            });
            },function (err) {
            error("Couldn't list bluetooth devices", err);
        });

    },function(){
        error("Bluetooth wasn't enabled. ");
    });
};

/**
 * Sends data to Bluetooth.device
 * @param  {String} data    Data to send to bluetooth device
 * @param  {function} success Callback if information was sent succesfully
 * @param  {function} error   Callback if an error ocurred when sending data to device
 * @memberOf Bluetooth
 */
Bluetooth.send = function(data, success, error){
    //See if there is a paired device and connect if there isn't
    if(!Bluetooth.connected){
        Bluetooth.connect(function(){
            //If a connection was made the function calls itself
            // so that it can send the data
            Bluetooth.send(data, success, error);
        }, function(msg){
            msg = msg || " ";
            error("Cannot connect to bluetooth device. "+ msg);
        });
    }else{
        //If already connected just send data
        bluetoothSerial.write(data, success,function(msg){
            msg = msg || " ";
            error("Failed to write to bluetooth device. "+ msg);
        });
    }
};

/**
 * Checks to see if a connection to Bluetooth.device is possible
 * @param  {function} success Called if connection to device is active or if it was established
 * @param  {function} error   Called if connection to device is inactive and it couldn't be established
 * @memberOf Bluetooth
 */
Bluetooth.checkConnection = function(success, error){
    if(!Bluetooth.connected){
        Bluetooth.connect(success, error);
    }else{
        success();
    }
};

/**
* Returns the current status of a printer connected via Bluetooth as an object containing both the status of the printer and of the paper in it.
* @param  {Function} callback Called with the status of the printer as a parameter.
* @memberOf Bluetooth
*/
Bluetooth.readStatus = function(callback){
    if(!Bluetooth.connected){
        Bluetooth.connect(function(){
            Bluetooth.readStatus(callback);
        }, function(){
            Bluetooth.status = {printerStatus: "disconnected", paperStatus: "unknown"};
            callback(Bluetooth.status);
        });
        return;
    }

    Bluetooth.onMessageReceived = function(){
        callback(Bluetooth.status);
        Bluetooth.onMessageReceived = undefined;
    };

    Bluetooth.send(String.fromCharCode(16, 4, 4), function(){}, function(){
        Bluetooth.onMessageReceived = undefined;
        Bluetooth.status = {printerStatus: "disconnected", paperStatus: "unknown"};
        callback(Bluetooth.status);
    });
};
