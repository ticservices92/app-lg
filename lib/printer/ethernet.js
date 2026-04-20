/**
* The ethernet object
* @type {Object}
* @namespace Ethernet
*/
Ethernet = {};

/**
* Path to the ethernet device in use
* @type {string}
* @memberOf Ethernet
*/
Ethernet.path = undefined;

/**
* @type {integer} Port to use when sending data to a device connected via ethernet
* @memberOf Ethernet
*/
Ethernet.port = undefined;

/**
* Socket ID used by chrome.sockets.tcp
* @type {integer}
* @memberOf Ethernet
*/
Ethernet.sockets = (function(){
    var socketList = [];
    return {
        add: function(s){
            socketList.push(s);
        },
        remove: function(s){
            var i = socketList.indexOf(s);
            if(i >= 0){
                socketList.splice(i, 1);
            }
        },
        includes: function(s){
            var i = socketList.indexOf(s);
            return i >= 0;
        }
    };
})();

/**
* Function called when data is received over tcp and is meant for this socket
* @type {Function}
* @memberOf Ethernet
*/
Ethernet.onReceiveListener = undefined;

/**
* Function called when data fails to be received over tcp and was meant for this socket
* @type {Function}
* @memberOf Ethernet
*/
Ethernet.onReceiveErrorListener = undefined;

/**
* Current status of ethernet device
* @type {Object}
* @memberOf Ethernet
*/
Ethernet.status = {printerStatus: "disconnected", paperStatus: "unknown"};

/**
* Closes current connection and socket
* @param  {Function} callback Callback function
* @memberOf Ethernet
*/
Ethernet.disconnect = function(socket, callback){
    console.debug("Disconnecting from device " + Ethernet.path + ":" + Ethernet.port);
    chrome.sockets.tcp.disconnect(socket, function(){
        chrome.sockets.tcp.close(socket);
        if(typeof callback === "function") callback();
    });
};

/**
* Tries establishing a connection with the configured path and port
* @param  {Function} success Called if connected
* @param  {Function} error   Called if failed to connect
* @memberOf Ethernet
*/
Ethernet.connect = function(success, error){
    if(typeof Ethernet.path === "undefined" || typeof Ethernet.port === "undefined"){
        error("Ethernet not configured");
        return;
    }
    var onSocket = function(createInfo) {
        //se intenta conectar al IP y puerto establecidos en la configuración
        chrome.sockets.tcp.connect(createInfo.socketId, Ethernet.path, Ethernet.port, function(resultCode){

            //se chequea que no haya ocurrido un error
            if((!chrome.runtime.lastError)||(resultCode >= 0)){
                Ethernet.sockets.add(createInfo.socketId);
                if(!chrome.sockets.tcp.onReceive.hasListeners()){
                    chrome.sockets.tcp.onReceive.addListener(function(ev){
                        if(Ethernet.sockets.includes(ev.socketId)){
                            var data = new Uint8Array(ev.data);
                            if(data.length === 4){
                                if( (data[0]&147) === 16 && (data[1]&144) === 0 &&
                                (data[2]&144) === 0 && (data[3]&144) === 0){

                                    Ethernet.status.printerStatus = "connected";
                                    if((data[2]&15) === 0){
                                        Ethernet.status.paperStatus = "ok";
                                    }else{
                                        Ethernet.status.paperStatus = "low";
                                    }

                                    if((data[2]&12) === 12 || (data[0]&8) === 8){
                                        Ethernet.status.paperStatus = "empty";
                                    }

                                    if((data[1]&12) !== 0){
                                        Ethernet.status.paperStatus = "stuck";
                                    }
                                }
                            }else if(data.length === 1 && (data[0]&146) === 18){
                                Ethernet.status.printerStatus = "connected";
                                if((data[0]&104) === 0){
                                    Ethernet.status.paperStatus = "ok";
                                }else if((data[0]&96) === 96){
                                    Ethernet.status.paperStatus = "empty";
                                }else{
                                    Ethernet.status.paperStatus = "low";
                                }
                            }
                            if(typeof Ethernet.onReceiveListener === "function") Ethernet.onReceiveListener(ev.data);
                        }
                    });

                    chrome.sockets.tcp.onReceiveError.addListener(function(ev){
                        if(Ethernet.sockets.includes(ev.socketId)){
                            if(typeof Ethernet.onReceiveErrorListener === "function") Ethernet.onReceiveErrorListener(ev.data);
                        }
                    });
                }

                console.debug("Connected to ethernet device " + Ethernet.path + ":" + Ethernet.port);
                success(createInfo.socketId);
            }else{
                //cierra el socket que se abrió al principio de la función
                chrome.sockets.tcp.close(createInfo.socketId);
                error("Cannot connect to device");
            }

        });
    };
    chrome.sockets.tcp.create({}, onSocket);
};

/**
* Checks to see if a connection to the specified path and port is possible
* @param  {function()} success Called if connection is possible
* @param  {function()} error   Called if connection is not possible
* @memberOf Ethernet
*/
Ethernet.checkConnection = function (success,error){
    Ethernet.connect(function(sock){
        Ethernet.disconnect(sock, success,error);
        Ethernet.sockets.remove(sock);
    }, error);
};

/**
* Prints using a printer connected via ethernet
* @param  {string} ticketData String to be printed
* @param  {function()} success    Called if printing was successful
* @param  {function()} error      Called if printing failed
* @memberOf Ethernet
*/
Ethernet.send = function(ticketData,success,error,release){

    Ethernet.connect(function(socket){
        ticketData = str2ab(ticketData);

        //Se envía el ticket a la impresora
        console.debug("Sending data to ethernet device");
        if(typeof release === "function") release();
        chrome.sockets.tcp.send(socket, ticketData, function(sendInfo){
            if ((!chrome.runtime.lastError)&&(sendInfo.resultCode >= 0)){
                success("Data successfully sent to device");
            }else{
                error("Failed to send data to device. "+ chrome.runtime.lastError.message);
            }
            Ethernet.disconnect(socket);
        });
    }, error);
};

/**
* Gets current status of the ethernet device
* @param  {Function} callback Called with the status of the device, after it's obtained
* @memberOf Ethernet
*/
Ethernet.readStatus = function(callback, release){
    Ethernet.connect(function(socket){
        Ethernet.status.printerStatus = "disconnected";
        var noResponse = false;

        // If there's a received message or if it fails to receive a status message
        // the timeout won't be necessary and neither will be to continue listening for received messages.
        var eventListener = function(){
            clearTimeout(noResponseTimeout);
            if(noResponse){
                setTimeout(function(){
                    Ethernet.checkConnection(function(){
                        Ethernet.status = {printerStatus: "connected", paperStatus: "empty"};
                        callback(Ethernet.status);
                    },function(){
                        Ethernet.status = {printerStatus: "disconnected", paperStatus: "unknown"};
                        callback(Ethernet.status);
                    });
                }, 500);
            }else{
                Ethernet.status.printerStatus = "connected";
                callback(Ethernet.status);
                Ethernet.disconnect(socket);
            }
            Ethernet.onReceiveListener = undefined;
            Ethernet.onReceiveErrorListener = undefined;
        };

        // If there's no answer in 1.5s disconnect from device. There's probably an error.
        var noResponseTimeout = setTimeout(function(){
            noResponse = true;
            Ethernet.disconnect(socket);
            setTimeout(eventListener, 500);
        }, 1500);
        setTimeout(function(){
            Ethernet.sockets.remove(socket);
        }, 2000);

        Ethernet.onReceiveListener = eventListener;
        Ethernet.onReceiveErrorListener = eventListener;

        console.debug("Sending status message to ethernet printer");
        if(typeof release === "function") release();
        chrome.sockets.tcp.send(socket, str2ab(String.fromCharCode(16, 4, 4)), function(sendInfo){
            if ((chrome.runtime.lastError)||(sendInfo.resultCode > 0)){
                Ethernet.status = {printerStatus: "disconnected", paperStatus: "unknown"};
                callback(Ethernet.status);
            }
        });
    }, function(){
        Ethernet.status = {printerStatus: "disconnected", paperStatus: "unknown"};
        callback(Ethernet.status);
    });
};
