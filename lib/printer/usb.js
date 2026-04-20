/**
 * The USB object
 * @type {Object}
 * @namespace Usb
 * @see [How to use USB devices from chrome apps]{@link https://developer.chrome.com/apps/app_usb}
 */
Usb = {};
/**
 * The vendor ID of the USB device
 * @memberOf Usb
 * @type {Number}
 */
Usb.vId = undefined;
/**
 * The product ID of the USB device
 * @memberOf Usb
 * @type {Number}
 */
Usb.pId = undefined;
/**
 * A connection handle used when calling functions of the [chrome.usb API]{@link http://developer.chrome.com/apps/usb}
 * @memberOf Usb
 * @type {Usb~handler}
 */
Usb.handler = 0;
/**
 * Array of [ConfigDescriptor]{@link Usb~configuration} objects containing the possible configurations of the device
 * @memberOf Usb
 * @type {Array}
 */
Usb.config = 0;
/**
 * Size of the packets when sending data.
 * @memberOf Usb
 * @type {Number}
 */
Usb.packetSize = 512;

//Intento abrir el dispositivo device y si se puede llamo a callback
//callback recibe un ConnectionHandle que tiene un id de handle, uno de vendorId y otro de productId
/**
 * Connects to a USB device
 * @param  {device}   device   The [device]{@link Usb~devices} to connect to.
 * @param  {Function} callback Called if the device was opened. Receives a [connection handler]{@link Usb~handler} as a parameter
 */
Usb.openDevice = function(device, callback){

    chrome.usb.openDevice(device, function(handle){
        callback(handle);
    });
};

//callback receives an array of Device with all the devices the app has permission for
/**
 * Retrieves an array of available devices
 * @param  {Function} callback Function called with an array of [devices]{@link Usb~devices}
 */
Usb.getDevices = function (callback){

    //Encuentro una lista de dispositivos que tengan el vendorId y productId que se especificó en la configuración
    chrome.usb.getDevices({"vendorId": Usb.vId, "productId": Usb.pId},function(devices){
        if(devices.length>0){
            //Si no tengo guardada la configuración específica
            //de un dispositivo guardo el array configurations en Usb.config
            if(Usb.config === 0){

                chrome.usb.getConfigurations(devices[0],function(configurations){
                    Usb.config = configurations;
                });
            }
        }

        //llamo a callback con la lista de dispositivos disponibles
        callback(devices);
    });
};

/**
 * Checks if a connection to a device is possible. If Usb.handler was undefined it is set to a device which can be connected to.
 * @param  {function} success Called if a connection is possible
 * @param  {function} error   Called if no connection is possible
 */
Usb.checkConnection=function (success,error){

    //Obtengo la lista de dispositivos
    Usb.getDevices(function(devices){

        if(devices.length === 0){
            Usb.handler=0;
            error("No devices available for connection");
        }
        else if(devices.length >= 1){
            //intento abrir el primer dispositivo de devices
            Usb.openDevice(devices[0],function(handle){

                if(handle !== undefined){
                    //Si ya existe un handler cierro este y sigo usado el existente
                    if(Usb.handler !== 0){
                        chrome.usb.closeDevice(handle,function(){});
                    }else{
                        //Si no existía un handler guardo el actual en Usb.handler
                        Usb.handler = handle;
                    }
                    success();
                }else{
                    Usb.handler = 0;
                    error("Failed to connect to devices");
                }
            });
        }
    });
};

//Se guarda en dest el packetSize y endpointAddress del endpoint que cumpla con el tipo y direccion establecidos
//Usb.configure busca en la configuración del dispositivo (Usb.config) cuál es la configuración activa
//y luego busca en todos sus endpoints cual satisface las condiciones requeridas
/**
 * Looks for the active configuration and fetches the endpoint with the required properties.
 * @param  {Usb~destConf}   dest     Saves the information of the endpoint with type 'type' and direction 'dir'
 * @param  {string}   type     Type of transfer to be used("bulk","control","isochronous","interrupt").
 * @param  {string}   dir      Direction of the transfer("out" or "in).
 * @param  {Function} callback Called when finishing to get the properties for 'dest'
 */
Usb.configure=function(dest,type,dir,callback){

    var configureInterface = function(interf){
        interf.endpoints.forEach(function(currEndpoint){

            //Si el endpoint en el que estoy "parado" es de dirección dir (si esta definida) y de
            //tipo type (si está definida) lo guardo en dest
            if( ( (currEndpoint.type === type) || (typeof(type) === undefined) ) && ( (currEndpoint.direction === dir) || (typeof(dir) === undefined) ) ){

                dest.maxPacketSize = Usb.packetSize;
                dest.endpointAddress = currEndpoint.address;
                dest.interface = interf.interfaceNumber;
            }
        });
    };

    for (var i = 0; i < Usb.config.length; i++) {
        //Chequeo cuál es la configuración activa
        if(Usb.config[i].active === true){
            //En esa configuración chequeo todas las interfaces para chequear, a su vez, todos sus endpoints
            Usb.config[i].interfaces.forEach(configureInterface);
        }
    }
    if (callback) callback();
};

Usb.readStatus=function(callback){
    var status={printerStatus:0, paperStatus:"unknown"};
    var resp=[];
    function sendStatus(status){
        callback(status);
    }
    function err(){
        if(status.printerStatus==="connected"){
            status.paperStatus="empty";
        }else{
            status.printerStatus="disconnected";
            status.paperStatus="unknown";
        }
        sendStatus(status);
    }
    Usb.checkConnection(function(){
        var i=0;
        var time=0;
        var conf = {maxPacketSize:0, endpointAddress:0, interface:0};

        var transferInfo = {};
        var failed = {is:false};

        var command=function(n){
            if((time===0)&&(n===2||n===4)&&(resp.length<n/2)){
                    i--;
                    n--;
                    time++;
            }else{
                time=0;
            }
            switch(n){
                case 0:
                    Usb.configure(conf,"bulk","out");
                    transferInfo = {
                        direction: "out",
                        endpoint: conf.endpointAddress,
                        timeout: 5000
                    };
                    transferInfo.data=new Uint8Array([16,4,3]).buffer;
                    transfer();
                break;
                case 1:
                case 3:
                    Usb.configure(conf,"bulk","in");
                    transferInfo = {
                        direction: "in",
                        length: 8,
                        endpoint: conf.endpointAddress,
                        timeout: 5000
                    };
                    transfer();
                break;
                case 2:
                    Usb.configure(conf,"bulk","out");
                    transferInfo = {
                        direction: "out",
                        endpoint: conf.endpointAddress,
                        timeout: 5000
                    };
                    transferInfo.data=new Uint8Array([16,4,4]).buffer;
                    transfer();
                break;
                case 4:
                    if(resp.length === 7){
                        if(resp[1] === 255 && resp[2] === 1 && resp[3] === 0 && resp[4] === 0 && resp[5] === 0){
                            if(resp[0]&(1<<2)){
                                status.paperStatus = "empty";
                            }else if(resp[0]&(1<<0)){
                                status.paperStatus = "low";
                            }else{
                                status.paperStatus = "ok";
                            }
                        }
                    }else if(resp.length>=2){
                        //Los bits 5 y 6 verifican que haya papel, los bits 3 y 2 si queda poco
                        var ind=resp.length-1;
                        //Chequeo si los últimos dos bytes son en respuesta al comando que pregunta por el estado
                        //Si lo son, los uso para averiguar el estado de la impresora
                        if( !( resp[ind]&(1<<0) ) && (resp[ind]&(1<<1)) && (resp[ind]&(1<<4)) ){
                            if( !( ( resp[ind]&(1<<6) ) && ( resp[ind]&(1<<5) ) ) ){
                                if( !( ( resp[ind]&(1<<3) ) && ( resp[ind]&(1<<2) ) ) ){
                                    status.paperStatus="ok";
                                }else{
                                    status.paperStatus="low";
                                }
                            }else{
                                status.paperStatus="empty";
                            }
                        }
                        //Si hubo un error con el autocutter, el papel se trabó
                        if( resp[ind-1]&(1<<3) && !( resp[ind-1]&(1<<0) ) && (resp[ind-1]&(1<<1)) && (resp[ind-1]&(1<<4))){
                            status.paperStatus="stuck";
                        }
                        //Si la respuesta corresponde al ASB entonces paperStatus seguirá siendo 0, y averiguo donde está
                        //el primer byte del ASB para extraer la información del estado de la impresora
                        //Se empieza desde el del arreglo porque si la impresora pasó por varios estados
                        //se obtiene el ASB de todos ellos, siendo el último el actual.
                        //Con el ASB (y la impresora SAM4S) no se puede averiguar si el papel se atascó, tampoco
                        //si queda poco.
                        if(status.paperStatus==="unknown"){
                            var j=resp.length-1;
                            while(j>=0){
                                if( !( resp[j]&(1<<0) ) && !(resp[j]&(1<<1)) && (resp[j]&(1<<4)) ){
                                    if( resp[j]&(1<<3) ){
                                        status.paperStatus="empty";
                                    }else{
                                        status.paperStatus="ok";
                                    }
                                    j=-1;
                                }
                                j--;
                            }
                        }
                    }else{
                        if(status.paperStatus==="unknown"){
                            status.paperStatus="unchanged";
                        }
                    }
                    sendStatus(status);
                break;
            }
        };
        var transfer=function(){
            chrome.usb.claimInterface(Usb.handler,conf.interface,function(){

                if(!chrome.runtime.lastError){
                    var connection={isDone:false,released:false};
                    status.printerStatus="connected";

                    chrome.usb.bulkTransfer(Usb.handler,transferInfo,function(event){

                        if((event && event.resultCode === 0)&&(!chrome.runtime.lastError)){

                            if(transferInfo.direction==="in"){

                                if(event.data!==undefined){

                                    if(resp.length !== 7){
                                        var info=new Uint8Array(event.data);

                                        for(var l=0;l<info.length;l++){
                                            resp.push(info[l]);
                                        }
                                    }
                                }

                            }
                        }else{
                            console.error(chrome.runtime.lastError.message ?
                                chrome.runtime.lastError.message : chrome.runtime.lastError);
                            failed.is=true;
                            err();
                        }
                        chrome.usb.releaseInterface(Usb.handler,conf.interface,function(event){
                            if(chrome.runtime.lastError){

                                console.error(chrome.runtime.lastError.message ?
                                    chrome.runtime.lastError.message : chrome.runtime.lastError);
                                failed.is=true;
                                err();

                            }else{
                                if(failed.is === false){
                                    i++;
                                    command(i);
                                }
                            }
                        });
                    });
                }else{
                    console.error(chrome.runtime.lastError.message ?
                        chrome.runtime.lastError.message : chrome.runtime.lastError);
                    err();
                }
            });
        };

        if(i===0) {
            command(i);
        } else {
            sendStatus(status);
        }
    },err);
};

/**
 * Prints a ticket using a USB printer
 * @param  {string} ticketData Text to print
 * @param  {function} success    Success callback
 * @param  {function} error      Error callback
 */
Usb.print=function(ticketData,success,error){

    Usb.checkConnection(function(){

        //Esta es la configuración según la impresora
        //maxPacketSize indica el tamaño en bytes que se le puede enviar
        //endpointAddress indica la dirección a la cual mandar los datos a imprimir
        var conf = {maxPacketSize:0, endpointAddress:0, interface:0};

        //Busco la configuración para usar en la impresión
        Usb.configure(conf,"bulk","out");

        //Seteo la dirección, endpoint, y timeout según la configuración
        //data queda vacío para ser completado al momento de imprimir
        var transferInfo =
        {
            direction: "out",
            endpoint: conf.endpointAddress,
            data: 0,
            timeout: 5000
        };

        //printable es todo el ArrayBuffer a imprimir
        var printable = str2ab(ticketData);

        //failed indica si hubo algún error al reclamar o liberar la interfaz o al hacer la transferencia
        var failed = {is:false};

        chrome.usb.claimInterface(Usb.handler,conf.interface,function(){

            if(chrome.runtime.lastError){

                error("Could not claim device's usb interface. " + chrome.runtime.lastError.message);
                failed.is = true;

            }else{
                //printing es true una vez que se enviaron todas las instrucciones de impresión necesarias
                var printing={isDone:false, released:false};
                var timeoutRetries = 0;

                var i=0;
                //divido printable en el tamaño máximo de paquete que acepta la impresora
                //las divisiones las guardo en transferInfo.data y las imprimo

                var transfer = function(){

                    transferInfo.data = printable.slice(i,i+conf.maxPacketSize);
                    chrome.usb.bulkTransfer(Usb.handler,transferInfo,function(event){
                        //si i ya es mayor a la longitud del array a imprimir es porque esta es la ultima
                        //secuencia de impresión, entonces se setea printing.isDone=true;
                        if (i+conf.maxPacketSize>=printable.byteLength) {printing.isDone=true;}

                        if((event && event.resultCode === 0)&&(!chrome.runtime.lastError)){
                            if(printing.isDone===false){
                                i+=conf.maxPacketSize;
                                transfer();
                            }
                        }else if(event.resultCode === 2){
                            // A timeout ocurred.
                            // Retry a couple of times if it failed just because of that.
                            timeoutRetries++;
                            if(timeoutRetries < 15){
                                transfer();
                            }else{
                                error("Too many timeouts ocurred when sending data to device " + chrome.runtime.lastError.message);
                                printing.isDone = true;
                                failed.is = true;
                            }
                        }else{
                            error("An error ocurred while sending the data to the device " + chrome.runtime.lastError.message);
                            printing.isDone = true;
                            failed.is = true;
                        }
                        //Una vez terminada la impresión libero la interfaz
                        //chequeando que no se haya ejecutado el releaseInterface previamente
                        if((printing.isDone===true)&&(printing.released===false)){

                            //Para evitar que se intente ejecutar chrome.usb.releaseInterface en sucesivos callbacks
                            //seteo printing.released como verdadero
                            printing.released=true;
                            chrome.usb.releaseInterface(Usb.handler,conf.interface,function(event){

                                if(chrome.runtime.lastError){
                                    error("Failed to release usb interface " + chrome.runtime.lastError);
                                }else{
                                    //Si no hubo ningún error llamo a success.
                                    if(failed.is === false){
                                        success("Ticket printed correctly");
                                    }
                                }
                            });
                        }
                    });
                };
                if(printing.isDone===false){
                    transfer();
                }
            }
        });
    },error);
};


/**
 * @typedef Usb~devices
 * @param {number} device ID for the USB device
 * @param {number} vendorId The device vendor ID
 * @param {number} productId The device's ID
 * @param {number} version The device version, if available
 * @param {string} productName The iProduct string of the device, if available
 * @param {string} manufacturerName The iManufacturer string of the device, if available
 * @param {string} serialNumber The iSerialNumber string of the device, if available
 */
/**
 * @typedef Usb~configuration
 * @param  {boolean}     active  Is this the active configuration?
 * @param  {integer}     configurationValue  The configuration number.
 * @param  {?string}     description  Description of the configuration.
 * @param  {boolean}     selfPowered The device is self-powered.
 * @param  {boolean}     remoteWakeup The device supports remote wakeup.
 * @param  {integer}     maxPower The maximum power needed by this device in milliamps (mA).
 * @param  {array}       interfaces Available [interfaces]{@link http://developer.chrome.com/apps/usb#type-InterfaceDescriptor}.
 * @param  {ArrayBuffer} extra_data Extra descriptor data associated with this configuration.
 */
/**
 * @typedef Usb~destConf
 * @property {number} maxPacketSize Maximum packet size
 * @property {number} endpointAddress Endpoint address
 * @property {number} interface The interface number
 */
/**
 * @typedef Usb~handler
 * @property {number} handle ID representing current connection to a [device]{@link Usb~devices}
 * @property {number} vendorId The device vendor ID
 * @property {number} productId The product ID
 */
