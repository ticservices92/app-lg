/**
 * The serial object. 
 * @namespace Serial
 * @type {Object}
 */
Serial = {};
/**
 * @type {Integer}
 * @memberOf Serial
 * @description Stores the size of the serial connection buffer
 */
Serial.bufferSize = 0;

/**
 * Encapsulates an active serial device connection.
 * @constructor
 * @namespace DeviceConnection
 * @param {Integer} connectionId ID of the serial connection obtained via the chrome.serial.connect
 */
var DeviceConnection = function(connectionId) {

    /**
     * Event fired when a message is received through the serial interface
     * @event
     * @type {chrome.Event()}
     */
    var onReceive = new chrome.Event();
    /**
     * Event fired when a message fails to be received through the serial interface
     * @event
     * @type {chrome.Event()}
     */
    var onError = new chrome.Event();
    /**
     * Event fired when the connection is closed
     * @event
     * @type {chrome.Event()}
     */
    var onClose = new chrome.Event();

    /**
     * Sends a string to a device via a serial connection
     * @memberOf DeviceConnection
     * @method send
     * @param  {string}   data     String to be sent
     * @param  {Function} callback Called after data has been sent 
     */
    var send = function(data, callback) {
        var i = 0;
        var printable = str2ab(data);

        var sendData = function(){
            var limit = i + Serial.bufferSize;
            if (limit > data.length) limit = data.length;
            chrome.serial.send(connectionId, printable.slice(i,limit), function(){
                i+= Serial.bufferSize;
                if (i >= data.length){
                    callback();    
                }else{
                    setTimeout(sendData,500);
                } 
            });
        };

        sendData();

    };

    /**
     * Wipes the serial bufer
     * @method flush
     * @memberOf DeviceConnection
     * @private 
     */
    var flush = function() {
        chrome.serial.flush(connectionId, function(){});
    };

    /**
     * Closes the serial connection
     * @method close
     * @memberOf DeviceConnection
     */
    var close = function() {
        chrome.serial.disconnect(connectionId, function(success) {
            if (success) {
                onClose.dispatch();
            }
        });
    };

    chrome.serial.onReceive.addListener(function(receiveInfo) {
        if (receiveInfo.connectionId === connectionId) {
            onReceive.dispatch(ab2str(receiveInfo.data));
        }
    });

    chrome.serial.onReceiveError.addListener(function(errorInfo) {
        if (errorInfo.connectionId === connectionId) {
            onError.dispatch(errorInfo.error);
        }
    });

    return {
        "onReceive": onReceive,
        "onError": onError,
        "onClose": onClose,
        "send": send,
        "close": close
    };
};

/**
 * Connects to a serial device
 * @param  {string}   path     Path to the serial device
 * @param  {Integer}   baudrate Maximum baudrate
 * @param  {Function} callback Called after attempting to connect to a device. Receives the device as a parameter.
 * @memberOf Serial
 */
Serial.openDevice = function(path, baudrate, callback) {
    var device = null;
    //Cierro las conexiones activas
    chrome.serial.connect(path, { bitrate: baudrate }, function(connectionInfo) {            
        if(chrome.runtime.lastError) {
            // Something went wrong
            callback(device);
        } else {
            if(connectionInfo) device = new DeviceConnection(connectionInfo.connectionId);
            Serial.bufferSize = connectionInfo.bufferSize;
            callback(device);
        }
    }); 
};

/**
 * Returns information about the available serial devices
 * @param  {Function} callback Called with an object containing information of the serial devices.
 * @memberOf Serial
 */
Serial.getDevices = function(callback) {
    chrome.serial.getDevices(callback);
};
/**
 * Returns the current status of a printer connected via serial as an object containing both the status of the printer and of the paper in it.
 * @param  {Function} callback Called with the status of the printer as a parameter.
 * @memberOf Serial
 */ 
Serial.getStatus = function(callback){
    var status={ printerStatus:0, paperStatus:"unknown" };
    //Me fijo los puertos disponibles 
    Serial.getDevices(function(ports) {
        
        if(ports.length === 0) {
            status.printerStatus="disconnected";
            status.paperStatus="unknown";
            callback(status);
            return;
        } 
        //Si hay uno solo me conecto a ese
        else if(ports.length === 1) {
            printerPath = ports[0].path;
        } 
        //Si hay mas de uno, me fijo si alguno coincide con la configuración
        else if(ports.length > 1) {
            var isValidPort = false;
            ports.map(function(port) {
                if(port.path === printerPath) isValidPort = true;
            });
            //Si no coincide ninguno, me conecto al primero
            if(!isValidPort) {
                printerPath = ports[0].path;
            }
        }

        Serial.openDevice(printerPath, printerBaudrate, function(connection){
            if (connection !== null) {
                //En arr se guardan los bytes de estados
                var arr=[];
                connection.onReceive.addListener(function(resp){
                    if((resp)&&(typeof(resp)==="string")){
                        var bytes = new Uint8Array(resp.length);

                        for (var i = 0; i < resp.length; i++) {
                            bytes[i] = resp.charCodeAt(i);
                        }
                        for(var j=0;j<bytes.length;j++){
                            arr.push(bytes[j]);
                        }
                    }
                    if(arr.length===2){
                        //Los bits 5 y 6 verifican que haya papel, los bits 3 y 2 si queda poco
                        if( !( ( arr[1]&(1<<6) ) && ( arr[1]&(1<<5) ) ) ){
                            if( !( ( arr[1]&(1<<3) ) && ( arr[1]&(1<<2) ) ) ){
                                status.paperStatus="ok";
                            }else{
                                status.paperStatus="low";                            
                            }
                        }else{
                            status.paperStatus="empty";
                        }
                        //Si hubo un error con el autocutter, el papel se trabó
                        if( arr[0]&(1<<3) ){
                            status.paperStatus="stuck";
                        }                         
                    }                    
                });
                //Consulto por errores y el estado del papel
                connection.send(String.fromCharCode(16,4,3)+String.fromCharCode(16,4,4),function(){
                        status.printerStatus="connected";
                    });
                //Espero 50ms antes de preguntar si hubo una respuesta, si no la hubo vuelvo a preguntar,
                //si la hubo se cierra la conexión y se llama al callback con el estado
                var closer = setInterval(function(){
                    if(status.printerStatus!==0){
                        connection.close();
                        clearInterval(closer);
                        callback(status);
                    }
                },50);
            }else{
                status.printerStatus="disconnected";
                status.paperStatus="unknown";
                callback(status);
            }
        });
    });
};

/**
 * Closes all serial connections
 * @param  {Function()} callback Called after being disconnected from all devices.      
 * @memberOf Serial
 */
Serial.closeConnections = function(callback) {
    //Cierro las conexiones activas
    chrome.serial.getConnections(function(connectionInfos){
        connectionInfos.forEach(function(connectionInfo){
            var device = new DeviceConnection(connectionInfo.connectionId);
            device.close();
        }); 
        callback();
    });
};