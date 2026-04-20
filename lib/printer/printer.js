/**
 * The printer object
 * @namespace
 * @type {Object}
 */
Printer = {};

/**
 * The scale to which to print the ticket to.
 * @type {Number}
 * @memberOf Printer
 */
Printer.ticketScale = 1;

/**
 * The time (in seconds) elapsed before the ticket is retracted by the presenter.
 * Setting it to 0 means there will be no modification to the presenter time.
 * @type {Integer}
 * @memberOf Printer
 */
Printer.presenterTime = 0;

/**
 * If ejectTicket is true the presenter will eject the ticket. Otherwise, it wil retract it.
 * @type {Boolean}
 * @memberOf Printer
 */
Printer.ejectTicket = false;

/**
 * Number representing the type of printer.
 * @type {integer}
 * @memberOf Printer
 */
Printer.type = undefined;

var PTYPE = {
    Serial: 0,
    USB: 1,
    Ethernet: 2,
    DriverUSB: 3,
    Bluetooth: 4,
    DriverSerial: 5,
    Driver: 6,
    AndroidPrinterPlus: 7,
    Web: 8,
    AndroidBelltech: 9,
    AndroidUSB: 10,
};

/**
 * When inverted is true the ticket is printed upside down
 * @type {Boolean}
 * @memberOf Printer
 */
Printer.invertPrintingDirection = false;

/**
* Object containing the status of the printer
* @type {Object}
* @memberOf Printer
* @property {string} printerStatus Holds the status of the printer ('connected', 'disconnected')
* @property {string} paperStatus Holds the status of the paper ('ok','low', 'empty', 'stuck', 'unknown')
*/
Printer.status = {printerStatus:"disconnected", paperStatus:"unknown"};

/**
 * The callback executed when the printer's status changes.
 * @type {Function}
 * @function
 * @memberOf Printer
 */
Printer.defaultCb = undefined;

 /**
  * Option for doing a full cut of the ticket or a default one.
  * @type {Boolean}
  * @memberOf Printer
  */
Printer.fullCut = false;

 /**
  * Defines whether to use deprecated commands (like GS_V_0) or not (like ESC_i)
  * @type {Boolean}
  * @memberOf Printer
  */
Printer.useDeprecatedCommands = false;

Printer.queue = (function(){
    q = [];
    var STATUS = {PRINTING:{}, IDLE:{}};
    var lockOpenInterval;

    q._push = q.push.bind(q);
    q._status = STATUS.IDLE;

    q.status = function(s){

        if(s === STATUS.PRINTING){
            q._status = s;
            if(Printer.lock.get()){
                lockOpenInterval = setInterval(function(){
                    if(!Printer.lock.extend()){
                        // oops... something went wrong
                        clearInterval(lockOpenInterval);
                    }
                }, 8000);
                printJobs();
            }else{
                setTimeout(q.status, 1000, s);
            }
        }else if(s === STATUS.IDLE){
            q._status = s;
            clearInterval(lockOpenInterval);
        }
        return q._status;
    };

    // Takes jobs from queue and sends them to printer
    // Calls itself upon finishing (either successfully or not)
    var printJobs = function(){
        var job = q.shift();
        var finishedPrinting = false;
        if(q.status() !== STATUS.PRINTING){
            // Can't print with this status
            // It means we don't have the lock and it will probably fail
            return;
        }
        Printer.sendToPrinter(job.data, function(){
            finishedPrinting = true;
            if(q.length > 0){
                setTimeout(printJobs, 100);
            }else{
                q.status(STATUS.IDLE);
            }
            clearTimeout(fallbackTimeout);
        }, function(err){
            finishedPrinting = true;
            if(!job.attempts){
                job.attempts = 1;
            }else{
                job.attempts += 1;
            }

            if(job.attempts < 5){
                q.unshift(job);
                console.debug("Failed to send job to printer, retrying...");
            }else{
                job.error("Failed to send job to printer", err ? err : "");
            }

            if(q.length > 0){
                setTimeout(printJobs, 1200);
            }else{
                q.status(STATUS.IDLE);
            }
            clearTimeout(fallbackTimeout);
        });

        // If no callback (error or success) was called in 5 seconds
        // it probably won't happen. So just keep going.
        var fallbackTimeout = setTimeout(function(){
            if(!finishedPrinting){
                if(q.length > 0){
                    setTimeout(printJobs, 100);
                }else{
                    q.status(STATUS.IDLE);
                }
            }
        }, 5000);
    };

    // Adds a job to the queue
    // Sets the queue to a printing status (if it wasn't printing already)
    q.push = function(job){
        q._push(job);
        if(q.status() !== STATUS.PRINTING){
            q.status(STATUS.PRINTING);
        }
    };
    return q;
})();

/**
 * This object gives and takes permission to communicate with
 * a printer, so that concurrent calls to Printer functions
 * don't step over one another.
 * @type {Object}
 * @memberOf Printer
 */
Printer.lock = (function(){
    var locked = false;

    // If printer is successfully locked returns true
    // sets the timeout on the dead man switch
    var set = function(){
        if(!locked){
            locked = true;
            clearLockTimeout = setTimeout(clear, 10000);
            return true;
        }
        return false;
    };

    var clear = function(){
        clearTimeout(clearLockTimeout);
        locked = false;
        return true;
    };

    var renew = function(){
        if(locked){
            clearTimeout(clearLockTimeout);
            clearLockTimeout = setTimeout(clear, 10000);
        }
    };

    // dead man switch, in case an exception was raised,
    // or something happened that left the printer locked, this unlocks it
    var clearLockTimeout = null;

    return {
        /**
         * Claims lock. If printer wasn't busy
         * it will return true. This claim lasts up to 10 seconds.
         * @type {Function}
         * @return {boolean}    True if printer was locked. False otherwise
         * @memberOf Printer.lock
         */
        get: set,
        /**
         * Releases lock, so that another caller can take action.
         * If not called for 10 seconds after lock was claimed, it is automatically called.
         * It doesn't validate that the caller is the same as the one that
         * locked the printer in the first place.
         * @type {Function}
         * @return {boolean}    True if released properly
         * @memberOf Printer.lock
         */
        release: clear,
        /**
         * Extends time period before the lock automatically releases itself
         * @type {Function}
         * @return {boolean}
         * @memberOf Printer.lock
         */
        extend: renew
    };
})();

/**
 * Interprets an ArrayBuffer as UTF-8 encoded string data
 * @function
 * @param  {ArrayBuffer} buf The buffer to transform into a string
 * @return {String}     The encoded string
 */
ab2str = function(buf) {
    var bufView = new Uint8Array(buf);
    var encodedString = String.fromCharCode.apply(null, bufView);
    return decodeURIComponent(escape(encodedString));
};

/**
 * Converts a string to UTF-8 encoding in a Uint8Array; returns the array buffer.
 * @function
 * @param  {String} str The string that is converted to a typed array buffer
 * @return {ArrayBuffer}     The array buffer of the string str
 */
str2ab = function(str) {
    var bytes = new Uint8Array(str.length);

    for (var i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }

    return bytes.buffer;
};

var serverUrl;

/**
 * Sets the necessary configuration for the printer.
 * @function
 * @memberOf Printer
 * @param  {Object} printerConfig Object with the data used for the configuration.
 */
Printer.config = function(printerConfig, serverURL) {

    if (serverURL !== undefined) {
        serverUrl = serverURL;
    }

    switch(parseInt(printerConfig.type)){

        case PTYPE.Serial:

            printerPath = printerConfig.path;
            printerBaudrate = parseInt(printerConfig.baudrate);

        break;

        case PTYPE.USB:

            Usb.vId = parseInt(printerConfig.vendorId,16);
            Usb.pId = parseInt(printerConfig.productId,16);

        break;

        case PTYPE.Ethernet:

            Ethernet.path = printerConfig.ethernetUrl;
            Ethernet.port = parseInt(printerConfig.ethernetPort);

        break;

        case PTYPE.DriverUSB:

            Driver.config.vendorId = parseInt(printerConfig.usbDriver.vendorId, 16);
            Driver.config.productId = parseInt(printerConfig.usbDriver.productId, 16);
            Driver.config.interface = 1;
            Driver.config.protocol = printerConfig.usbDriver.protocol;
            Driver.config.printerName = printerConfig.printerName;

        break;

        case PTYPE.Bluetooth:

            Bluetooth.device = printerConfig.bluetoothDevice;

        break;

        case PTYPE.DriverSerial:

            Driver.config.vendorId = parseInt(printerConfig.usbDriver.vendorId, 16);
            Driver.config.productId = parseInt(printerConfig.usbDriver.productId, 16);
            Driver.config.interface = 2;
            Driver.config.protocol = printerConfig.usbDriver.protocol;
            Driver.config.printerName = printerConfig.printerName;

        break;

        case PTYPE.Driver:

            Driver.config.interface = 3;

        break;

        case PTYPE.AndroidUSB:
            AndroidUSB.vId = parseInt(printerConfig.vendorId, 16);
            AndroidUSB.pId = parseInt(printerConfig.productId, 16);
        break;

    }
    Printer.type = parseInt(printerConfig.type);
    Printer.ticketScale = parseFloat(printerConfig.ticketScale) / 100;
    Printer.presenterTime = parseInt(printerConfig.presenterTime);
    Printer.fullCut = printerConfig.fullCut === true ? true : false;
    Printer.ejectTicket = printerConfig.ejectTicket === true ? true : false;
    Printer.invertPrintingDirection = printerConfig.rotatePrint === true ? true : false;
    Printer.useDeprecatedCommands = printerConfig.useDeprecatedCommands === true;
};

var GS_V_0 = String.fromCharCode(0x1D, 0x56, 0);
var GS_V_1 = String.fromCharCode(0x1D, 0x56, 1);
var ESC_i = String.fromCharCode(0x1B, 0x69);
var ESC_m = String.fromCharCode(0x1B, 0x6D);

var buildTicket = function(data, yPos, i, canvas, context, callback){
    // ESC-POS commands to be used
    var SET_PRESENTER_TIME = "";
    var SET_LINE_SPACE_24 = String.fromCharCode(0x1B, 0x33, 24);
    var SET_LINE_SPACE_30 = String.fromCharCode(0x1B, 0x33, 30);
    var CUT_PAPER = Printer.useDeprecatedCommands ? GS_V_1 : ESC_m;
    if(Printer.fullCut){
        CUT_PAPER = Printer.useDeprecatedCommands ? GS_V_0 : ESC_i;
    }
    var SELECT_BIT_IMAGE_MODE = String.fromCharCode(0x1B, 0x2A, 33);
    if(Printer.presenterTime){
        SET_PRESENTER_TIME = String.fromCharCode(0x1B, 0x72, 0x31, Printer.presenterTime);
        if(Printer.ejectTicket){
            SET_PRESENTER_TIME += String.fromCharCode(0x1B, 0x68, 0x01);
        }else{
            SET_PRESENTER_TIME += String.fromCharCode(0x1B, 0x68, 0x00);
        }
    }

    var xPos = 0;
    var ticketData = "";

    function onImgLoaded(){
        if(typeof data[id].size === "number") imgWidth *= data[id].size / 100;
        imgHeight = imgWidth * img.naturalHeight / img.naturalWidth;

        if(context.textAlign === "right"){
            xPos = canvas.width * 0.95 - imgWidth;
        }else if(context.textAlign === "center"){
            xPos = (canvas.width - imgWidth) / 2;
        }else{
            xPos = canvas.width * 0.05;
        }

        context.drawImage(img, xPos, yPos, imgWidth, imgHeight);
        yPos += imgHeight;

        if(typeof data[id].space === "number") yPos += data[id].space * 1.25;
        buildTicket(data, yPos, i + 1 , canvas, context, callback);
    }

    while( i < data.length ){

        if( !!data[i].alignment ) context.textAlign = data[i].alignment;
        else context.textAlign = !!data[i].centered ? "center" : "left";

        if(data[i].type === 0){
            if(!data[i].size) data[i].size = 10;
            context.font = (data[i].isBold ? "bold " : "normal ") + data[i].size * 2 + "px "+ data[i].font;

            if(context.textAlign === "right"){
                xPos = canvas.width * 0.95;
            }else if(context.textAlign === "center"){
                xPos = canvas.width / 2;
            }else{
                xPos = canvas.width * 0.05;
            }
            data[i].data = data[i].data.toString();
            if(context.measureText(data[i].data.trim()).width > canvas.width * 0.9){
                // The text is too long
                var words = data[i].data.split(" ");
                var shortened = words;
                var j = words.length;
                while(j > 1){
                    j--;
                    shortened = words.slice(0, j);
                    if(context.measureText(shortened.join(" ")).width <= canvas.width * 0.9){
                        break;
                    }
                }
                if(shortened.length < words.length){
                    data[i].data = shortened.join(" ");
                    shortened = words.slice(j).join(" ");
                    // Insert new line that is just like data[i]
                    data.splice(i + 1, 0, {});
                    data[i + 1] = Object.assign({}, data[i]);
                    delete data[i].space;
                    // but with the data it was stripped
                    data[i + 1].data = shortened;
                }
            }
            context.fillText(data[i].data, xPos, yPos, canvas.width);
            yPos += data[i].size * 2 * 1.25;

            if(typeof data[i].space === "number") yPos += data[i].space * 2 * 1.25;
            i++;
        }else{
            var img = document.createElement("img");
            var imgWidth = canvas.width * 0.9;
            var imgHeight = 0;
            if(!data[i].data){
                i++;
                continue;
            }
            var mimeType = data[i].data.indexOf('/9j/') === 0 ? 'image/jpeg' : 'image/png';
            img.src = "data:" + mimeType + ";base64," + data[i].data;
            var id = i;
            img.onload = onImgLoaded;
            img.onerror = function() {
                buildTicket(data, yPos, id + 1, canvas, context, callback);
            };

            break;
        }
    }

    if( i >= data.length ){
        yPos += 24 - yPos % 24;
        var imgData;
        if(Printer.invertPrintingDirection){
            imgData = context.getImageData(0, canvas.height-yPos, canvas.width, yPos);
        }else{
            imgData = context.getImageData(0, 0, canvas.width, yPos);
        }

        if (Printer.type === PTYPE.Web || Printer.type === PTYPE.AndroidBelltech ||  Printer.type === PTYPE.AndroidUSB){
            // correct canvas' height
            var canvas2 = document.createElement("canvas");
            canvas2.width = canvas.width;
            canvas2.height = yPos;
            canvas2.getContext("2d").putImageData(imgData, 0, 0);;
            return callback(canvas2);
        }

        var nLines = imgData.data.length / canvas.width;
        var lineLength = canvas.width * 4;

        for( i = 0; i < imgData.data.length; i += 4){
            // Apply luminance-corrected grayscale
            var gray = (imgData.data[i] * 0.299 + imgData.data[i+1] * 0.587 + imgData.data[i+2] * 0.114);

            // Adjust gray with the pixel's alpha channel
            gray = gray * imgData.data[i + 3] / 255;
            imgData.data[i] = gray;

            if(gray > 127){
                gray = 255;
            }else{
                gray = 0;
            }

            // error resulting from assuming a pixel which is not black nor white is indeed black or white
            var error = (imgData.data[i] - gray)/16;

            // Invert the colours so they are printed correctly
            imgData.data[i] = 255 - gray;
            imgData.data[i+1] = 255 - gray;
            imgData.data[i+2] = 255 - gray;

            // Spread error according to Floyd-Steinberg dithering algorithm
            if((i / 4) % canvas.width !== 0){
                if(typeof imgData.data[i + canvas.width * 4 + 4] !== "undefined") imgData.data[i + canvas.width * 4 + 4] += error * 1;
                if(typeof imgData.data[i + canvas.width * 4 + 5] !== "undefined") imgData.data[i + canvas.width * 4 + 5] += error * 1;
                if(typeof imgData.data[i + canvas.width * 4 + 6] !== "undefined") imgData.data[i + canvas.width * 4 + 6] += error * 1;
                if(typeof imgData.data[i + 4] !== "undefined") imgData.data[i + 4] += error * 7;
                if(typeof imgData.data[i + 5] !== "undefined") imgData.data[i + 5] += error * 7;
                if(typeof imgData.data[i + 6] !== "undefined") imgData.data[i + 6] += error * 7;
            }
            if(typeof imgData.data[i + canvas.width * 4 - 4] !== "undefined") imgData.data[i + canvas.width * 4 - 4] += error * 3;
            if(typeof imgData.data[i + canvas.width * 4 - 3] !== "undefined") imgData.data[i + canvas.width * 4 - 3] += error * 3;
            if(typeof imgData.data[i + canvas.width * 4 - 2] !== "undefined") imgData.data[i + canvas.width * 4 - 2] += error * 3;
            if(typeof imgData.data[i + canvas.width * 4] !== "undefined") imgData.data[i + canvas.width * 4] += error * 5;
            if(typeof imgData.data[i + canvas.width * 4 + 1] !== "undefined") imgData.data[i + canvas.width * 4 + 1] += error * 5;
            if(typeof imgData.data[i + canvas.width * 4 + 2] !== "undefined") imgData.data[i + canvas.width * 4 + 2] += error * 5;

        }

        ticketData += SET_LINE_SPACE_24;
        for(var y = 0; y < imgData.data.length; y += canvas.width * 4 * 24){
            ticketData += SELECT_BIT_IMAGE_MODE;
            ticketData += String.fromCharCode( canvas.width & 0x00ff , (canvas.width & 0xff00)>>8 );
            for(var x = 0; x < canvas.width * 4; x += 4){
                var n = 0;
                var k = 7;
                for(i = 0; i < 24; i++){
                    n |= (imgData.data[y + x + canvas.width * 4 * i] >> 7) << k;
                    if(k === 0){
                        ticketData += String.fromCharCode(n);
                        k = 7;
                        n = 0;
                    }else{
                        k --;
                    }
                }
            }
            ticketData += "\n";
        }

        ticketData += SET_LINE_SPACE_30 + "\n\n\n\n" + SET_PRESENTER_TIME + CUT_PAPER;

        callback(ticketData);
    }
};

var processLines = function(ticketData, callback, error){
    var canvas = document.createElement("canvas");
    var yPos = 0;
    canvas.width = 284 * 2 * Printer.ticketScale;
    canvas.height = 2340 * 2;
    var context = canvas.getContext("2d");
    if(Printer.invertPrintingDirection){
        context.transform(-1, 0, 0, -1, canvas.width, canvas.height);
    }
    context.fillStyle = "#FFFFFF";
    // Draw white background in canvas
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#000000";
    context.textBaseline = "top";

    var data = [];
    var key;

    if(ticketData.length){
        data = ticketData;
    }else{
        //Solo remplazo el data que venga en ticketData. El alignment, isbold y demás lo tomo de ticket.
        for (var i = 0; i < ticket.length; i++) {
            key = ticket[i].key;
            var line = Object.assign({}, ticket[i]);
            if( typeof ticketData[key] !== "undefined" ){
                line.data = ticketData[key];
            }
            // If line.data is "" or undefined it shouldn't be printed
            if(!!line.data){
                if(typeof line.data !== "string"){
                    // If line.data is an array there should be a line for each element of the array
                    var obj;
                    for(var j = 0; j < line.data.length; j++){
                        obj = Object.assign({}, line);
                        obj.data = line.data[j];
                        if(!!obj.data) data.push(obj);
                    }
                }else{
                    data.push(line);
                }
            }
        }
    }

    var tags = new Set();
    data = Printer.parseDataStrings(data, tags);
    Printer.replaceTags(tags, data, function (data) {
        addFonts(data);

        buildTicket(data, yPos, 0, canvas, context, callback);
    }, error);
};

 var processLinesForAndroidPrinterPlus = function(ticketData, callback){
     var newTicketData = "[";
     var key = "";

     var fontSize = 3;
     for (var i = 0; i < ticket.length; i++) {
         var validLine = true;
         if ("Logo" === ticket[i]["name"]) validLine = false;

         if(validLine) {
             var fontAlign = ticket[i]["alignment"];
             var rawfontSize = ticket[i]["size"];
             var fontBold = ticket[i]["isBold"];
             var textData = ticket[i]["data"];
             var textSpace = ticket[i]["space"];

             key = ticket[i].key;
             if( typeof ticketData[key] !== "undefined" ){
                 textData = ticketData[key];
             }

             fontSize = 1;
             if (rawfontSize > 10) fontSize = 2;
             if (rawfontSize > 12) fontSize = 3;
             if (rawfontSize > 16) fontSize = 5;
             if (rawfontSize > 19) fontSize = 7;
             if (rawfontSize > 22) fontSize = 8;
             if ("Separador (----)" === ticket[i]["name"]) fontSize = 2;
             if ("Separador (____)" === ticket[i]["name"]) fontSize = 2;
             // TODO cordova se banca que le mandes un JSON, no hace falta armar un string así a mano
             newTicketData += "{\"align\":\"" + fontAlign +
                 "\", \"size\":\"" + fontSize.toString() +
                 "\", \"bold\":\"" + fontBold +
                 "\", \"text\":\"" + textData +
                 "\"},";
             if ("0" !== textSpace) {
                 var sizeSpace = parseInt(textSpace);
                 for (var j = 0; j < sizeSpace; j+=10) {
                     newTicketData += "{\"align\":\"center\", \"size\":\"2\", \"bold\":\"TRUE\"},";
                 }
             }
         }
     }
     newTicketData += "{\"align\":\"center\", \"size\":\"1\", \"bold\":\"FALSE\", \"text\":\" \", \"cut\":\"TRUE\"}";
     newTicketData += "]";


     var ticketData = newTicketData;

     callback(ticketData);
     return;
};

/**
 * Prints a ticket. If Printer is locked it will retry up to 5 times.
 * @function
 * @memberOf Printer
 * @param  {string|object} ticketData  Data to be printed
 * @param  {function} success   Callback if the printing was successful
 * @param  {function} error     Called if the printing failed
 * @param  {integer} retry     Number of attempt at printing
 */
Printer.printTicket = function(ticketData, success, error, retry) {

    if(Printer.type === PTYPE.AndroidPrinterPlus && typeof ticketData !== "string"){
        processLinesForAndroidPrinterPlus(ticketData, function(newTicketData){
            Printer.printTicket(newTicketData, success, error);
        });
        return;
    }

    // All Driver types receive an object/array to be parsed at Driver.print (driver.js)
    if (![PTYPE.DriverUSB, PTYPE.DriverSerial, PTYPE.Driver].includes(Printer.type) &&
        typeof ticketData !== "string" && !(ticketData instanceof HTMLElement)) {
        processLines(ticketData, function(newTicketData){
            Printer.printTicket(newTicketData, success, error);
        }, error);
        return;
    }

    if(!Printer.lock.get()){
        if(!retry){
            retry = 1;
        }else if(retry >= 10){
            error("Cannot print, printer busy. ");
            return;
        }else{
            retry++;
        }
        console.debug("Printer busy, retrying...");
        setTimeout(Printer.printTicket, 250 * retry + Math.random() * 200 + 100, ticketData, success, error, retry);
        return;
    }

    var callbackCalled = false;

    var successCb = function(message){
        if(!callbackCalled){
            callbackCalled = true;
            Printer.lock.release();
            Printer.onStatusChange(function(){}, true);

            success((!!message) ? message : undefined);
        }
    };

    var errorCb = function(message){
        if(!callbackCalled){
            callbackCalled = true;
            Printer.lock.release();
            Printer.onStatusChange(function(){}, true);

            if (!message) message = "";
            error("An error ocurred while printing. "+ message);
        }
    };

    Printer.sendToPrinter(ticketData, successCb, errorCb);
};

Printer.printThroughQueue = function(ticketData, success, error){
    var job = {data: ticketData, success: success, error: error};
    if (![PTYPE.DriverUSB, PTYPE.DriverSerial, PTYPE.Driver, PTYPE.Web].includes(Printer.type) &&
        typeof ticketData !== "string") {
        processLines(job.data, function(processedData){
            job.data = processedData;
            Printer.queue.push(job);
        });
        return;
    }
    Printer.queue.push(job);
};

/**
 * Sends ticketData to printer. It bypasses Printer.lock.
 * @function
 * @memberOf Printer
 * @param  {String} ticketData Data to send
 * @param  {function} successCb  Called on success
 * @param  {function} errorCb    Called on error
 */
Printer.sendToPrinter = function(ticketData, successCb, errorCb){
    switch(Printer.type){

        case PTYPE.Serial:
            Serial.getDevices(function(ports) {
                //Si no hay puertos disponibles ejecuto el callback de error
                if(ports.length === 0) {
                    errorCb("No ports available for connection");
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

                Serial.closeConnections(function() {
                    Serial.openDevice(printerPath, printerBaudrate, function(connection){
                        if (connection === null) {
                            // Something went wrong
                            errorCb("Failed to connect to the device");
                        } else {
                            connection.send(ticketData, function() {
                                connection.close();
                                successCb();
                            });
                        }
                    });
                });
            });
        break;

        case PTYPE.USB:
            Usb.print(ticketData,successCb,errorCb);
        break;

        case PTYPE.Ethernet:
            Ethernet.send(ticketData,successCb,errorCb,Printer.lock.release);
        break;

        case PTYPE.DriverUSB:
        case PTYPE.DriverSerial:
        case PTYPE.Driver:
            if(Printer.invertPrintingDirection){
                Driver.setPrintingDirection("inverted");
            }else{
                Driver.setPrintingDirection("normal");
            }
            Driver.print(ticketData, successCb, errorCb);
        break;

        case PTYPE.Bluetooth:
            Bluetooth.send(ticketData, successCb, errorCb);
        break;

        case PTYPE.AndroidPrinterPlus:
            AndroidPrinterPlus.print(ticketData, successCb, errorCb);

        break;

        case PTYPE.Web:
             WebPrinter.print(ticketData, successCb, errorCb);
        break;

        case PTYPE.AndroidBelltech:
             AndroidBelltech.print(ticketData, successCb, errorCb);
        break;

        case PTYPE.AndroidUSB:
            AndroidUSB.print(ticketData, Printer.fullCut, successCb, errorCb);
        break;

        default:
        break;
    }
};

/**
 * Sets ticket format
 * @function
 * @memberOf Printer
 * @param  {string} ticketFormat  ticket format json
 */
Printer.setTicketFormat = function(ticketFormat) {
    ticket = ticketFormat;
};

/**
 * Checks whether there is a possible connection to a printer or not
 * @function
 * @memberOf Printer
 * @param  {function()} success Called if connections are available
 * @param  {function()} error   Called if no connections are available
 */
var checkConnection = function(success, error) {

    var successCb=function(message){
        success((!!message) ? message : undefined);
    };
    var errorCb=function(message){
        if (!message) message = "";
        error("An error ocurred while checking for connections to the printer. "+ message);
    };

    switch(Printer.type){

        case PTYPE.Serial:
            //Me fijo los puertos disponibles
            Serial.getDevices(function(ports) {
                //Si no hay puertos disponibles ejecuto el callback de error
                if(ports.length === 0) {
                    errorCb("No ports available for connection");
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
                    if (connection === null) {
                        errorCb("Failed to connect to the device");
                    } else {
                        connection.close();
                        successCb();
                    }
                });
            });
            break;

        case PTYPE.USB:
            Usb.checkConnection(successCb,errorCb);
        break;

        case PTYPE.Ethernet:
            Ethernet.checkConnection(successCb, errorCb);
        break;

        case PTYPE.DriverUSB:
        case PTYPE.DriverSerial:
        case PTYPE.Driver:
            Driver.checkConnection(successCb,errorCb);
        break;

        case PTYPE.Bluetooth:
            Bluetooth.checkConnection(successCb, errorCb);
        break;

        case PTYPE.AndroidPrinterPlus:
            AndroidPrinterPlus.checkConnection(successCb, errorCb);
            break;

        case PTYPE.Web:
            WebPrinter.checkConnection(successCb, errorCb);
        break;

        case PTYPE.AndroidBelltech:
            AndroidBelltech.checkConnection(successCb, errorCb);
        break;


        case PTYPE.AndroidUSB:
            AndroidUSB.checkConnection(successCb, errorCb);
        break;


        default:
        break;
    }

};

Printer.checkConnection = function (success, error) {
    try {
        checkConnection(success, error);
    } catch (e) {
        error("Unexpected error checking connection" + e);
    }
};

/**
 * Receives a new printer status and compares it to the current. Changes Printer.status if appropriate. Calls Printer.defaultCb if newStatus is different from Printer.status
 * @param  {object} newStatus An object with the newly read printer and paper status.
 */
Printer.compareStatus = function(newStatus){
    //Me fijo si el nuevo estado es igual al anterior, y si es distinto lo guardo.
    if ((Printer.status.printerStatus === newStatus.printerStatus || newStatus.printerStatus === "unchanged") &&
    (Printer.status.paperStatus === newStatus.paperStatus || newStatus.paperStatus === "unchanged")){
        return;
    }else{
        if(newStatus.printerStatus !== "unchanged") Printer.status.printerStatus = newStatus.printerStatus;
        if(newStatus.paperStatus !== "unchanged") Printer.status.paperStatus = newStatus.paperStatus;
        if(typeof Printer.defaultCb === "function") Printer.defaultCb(Printer.status);
        console.debug("Printer status changed. paperStatus:", Printer.status.paperStatus,
            "printerStatus:", Printer.status.printerStatus);
    }
};

/**
 * Sets the Printer.defaultCb and calls Printer.compareStatus to check for changes in the printer's status.
 * @function
 * @memberOf Printer
 * @param  {Function} callback  Function stored as Printer.defaultCb, if force is falsey. After being stored it is called with the current printer status.
 * @param  {?Boolean}   force      If truthy the status of the printer is checked right away and callback is called. If falsey an interval is set to check for the status of the printer. Calls Printer.compareStatus after reading the status from the printer.
 */
Printer.onStatusChange = function(callback, force){
    //Si force es true se obtiene el estado de la impresora en ese instante
    if(!force){
        Printer.defaultCb = callback;
        callback(Printer.status);
    }
    if(!force){
        switch(Printer.type){
            case PTYPE.Serial:
                clearInterval(Printer.checkStatusInterval);
                Printer.checkStatusInterval = setInterval(function(){
                    if(Printer.lock.get()){
                        Serial.getStatus(function(newStatus){
                            Printer.lock.release();
                            Printer.compareStatus(newStatus);
                        });
                    }
                }, 30000);
            break;
            case PTYPE.USB:
                clearInterval(Printer.checkStatusInterval);
                Printer.checkStatusInterval = setInterval(function(){
                    if(Printer.lock.get()){
                        Usb.readStatus(function(newStatus){
                            Printer.lock.release();
                            Printer.compareStatus(newStatus);
                        });
                    }
                }, 30000);
            break;
            case PTYPE.Ethernet:
                clearInterval(Printer.checkStatusInterval);
                Printer.checkStatusInterval = setInterval(function(){
                    if(Printer.lock.get()){
                        Ethernet.readStatus(function(newStatus){
                            Printer.compareStatus(newStatus);
                        }, Printer.lock.release);
                    }
                }, 30000);
            break;
            case PTYPE.DriverUSB:
            case PTYPE.DriverSerial:
            case PTYPE.Driver:
                clearInterval(Printer.checkStatusInterval);
                Printer.checkStatusInterval = setInterval(function(){
                    if(Printer.lock.get()){
                        Driver.readStatus(function(newStatus){
                            Printer.lock.release();
                            Printer.compareStatus(newStatus);
                        });
                    }
                }, 30000);
            break;
            case PTYPE.Bluetooth:
                clearInterval(Printer.checkStatusInterval);
                Printer.checkStatusInterval = setInterval(function(){
                    if(Printer.lock.get()){
                        Bluetooth.readStatus(function(newStatus){
                            Printer.lock.release();
                            Printer.compareStatus(newStatus);
                        });
                    }
                }, 30000);
            break;
            case PTYPE.AndroidPrinterPlus:
                clearInterval(Printer.checkStatusInterval);
                Printer.checkStatusInterval = setInterval(function(){
                    if(Printer.lock.get()){
                        AndroidPrinterPlus.readStatus(function(newStatus){
                            Printer.lock.release();
                            Printer.compareStatus(newStatus);
                        });
                    }
                }, 30000);
            break;
            case PTYPE.Web:
                clearInterval(Printer.checkStatusInterval);
                Printer.checkStatusInterval = setInterval(function(){
                    if(Printer.lock.get()){
                        WebPrinter.readStatus(function(newStatus){
                            Printer.lock.release();
                            Printer.compareStatus(newStatus);
                        });
                    }
                }, 30000);
            break;
            case PTYPE.AndroidBelltech:
                clearInterval(Printer.checkStatusInterval);
                Printer.checkStatusInterval = setInterval(function(){
                    if(Printer.lock.get()){
                        AndroidBelltech.readStatus(function(newStatus){
                            Printer.lock.release();
                            Printer.compareStatus(newStatus);
                        });
                    }
                }, 30000);
            break;

            case PTYPE.AndroidUSB:
                clearInterval(Printer.checkStatusInterval);
                Printer.checkStatusInterval = setInterval(function(){
                    if(Printer.lock.get()){
                        AndroidUSB.readStatus(function(newStatus){
                            Printer.lock.release();
                            Printer.compareStatus(newStatus);
                        });
                    }
                }, 30000);
            break;
        }
    }else{
        if(!Printer.lock.get()){
            // If Printer can't be locked it's because either printing
            // or status checking is underway.
            // No need to do it again
            callback();
            return;
        }
        switch(Printer.type){
            case PTYPE.Serial:
                Serial.getStatus(function(status){
                    Printer.lock.release();
                    Printer.compareStatus(status);
                    callback();
                });
            break;
            case PTYPE.USB:
                Usb.readStatus(function(status){
                    Printer.lock.release();
                    Printer.compareStatus(status);
                    callback();
                });
            break;
            case PTYPE.Ethernet:
                Ethernet.readStatus(function(status){
                    Printer.lock.release();
                    Printer.compareStatus(status);
                    callback();
                }, Printer.lock.release);
            break;
            case PTYPE.DriverUSB:
            case PTYPE.DriverSerial:
            case PTYPE.Driver:
                Driver.readStatus(function(status){
                    Printer.lock.release();
                    Printer.compareStatus(status);
                    callback();
                });
            break;
            case PTYPE.Bluetooth:
                Bluetooth.readStatus(function(status){
                    Printer.lock.release();
                    Printer.compareStatus(status);
                    callback();
                });
            break;
            case PTYPE.AndroidPrinterPlus:
                AndroidPrinterPlus.readStatus(function(status){
                    Printer.lock.release();
                    Printer.compareStatus(status);
                    callback();
                });

                break;
            case PTYPE.Web:
                WebPrinter.readStatus(function(status){
                    Printer.lock.release();
                    Printer.compareStatus(status);
                    callback();
                });
            break;
            case PTYPE.AndroidBelltech:
                AndroidBelltech.readStatus(function(status){
                    Printer.lock.release();
                    Printer.compareStatus(status);
                    callback();
                });
            break;

            case PTYPE.AndroidUSB:
                AndroidUSB.readStatus(function(status){
                    Printer.lock.release();
                    Printer.compareStatus(status);
                    callback();
                });
            break;


        }
    }
};

function addFonts(data) {
    data.forEach(function(line) {
        if (line.type === 0 && typeof line.font !== "undefined") {
            // See if the required fonts exist. Create them if they don't
            if ($("head").find("#" + line.font.replace(/\s/g, "-")).length === 0) {
                $("head").append("<style id=\"" + line.font.replace(/\s/g, "-") + "\" type=\"text/css\">\n" +
                    "\n@font-face {\n" +
                    "\tfont-family: \"" + line.font + "\";\n" +
                    "\tsrc: local(\"" + line.font + "\")\n" +
                    "}\n" +
                    "</style>");
            }
        }
    });
}

Printer.parseDataStrings = function (data, tags) {
    return flatMap(function(line) {
        if (typeof line.data !== "string" || line.name === "Logo") return [line];
        var str = line.data;

        // Find tags to replace later
        var tagsInStr = str.match(/##[a-z0-9_-]+/gi)
        if (tagsInStr) {
            tagsInStr.forEach(function(match) {
                tags.add(match.slice(2));
            });
        }

        var strs = str.replace(/\\(.)/g, function(_match, escapedChar) {
            switch (escapedChar) {
                case '\\':
                    return '\\';
                case 'n':
                    return '\n';
                default:
                    throw "Cannot escape \\" + escapedChar;
            }
        }).split('\n');

        // Return one line object per line in text
        return strs.map(function(str) {
            return Object.assign({}, line, { data: str });
        })
    }, data);
}

Printer.replaceTags = function(tags, data, cb, error) {
    if (!tags.size)
        return cb(data);

    fetchTags(tags, function (tags) {
        data.forEach(function (line) {
            if (typeof line.data !== "string" || line.name === "Logo") return;
            line.data = line.data.replace(/##([a-z0-9_-]+)/gi, function (_match, tag) {
                return tags[tag];
            });
        });
        cb(data);
    }, error);
}

function fetchTags(tags, cb, error) {
    if (!tags.size)
        return cb({});

    var res = {}, fetched = 0;
    tags.forEach(function(tag) {
        getTag(tag, function (tagVal) {
            res[tag] = tagVal;
            if (++fetched === tags.size)
                cb(res);
        }, error);
    });
}

var cachedTags = {}
var invalidateTimers = {}

function getTag(tag, cb, error) {
    if (cachedTags[tag]) return cachedTags[tag];

    var xhr = new XMLHttpRequest();
    xhr.responseType = "json";
    xhr.open("GET", serverUrl + "/v2/api/dynamicText/name/" + tag, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var res = xhr.response.text;
                cachedTags[tag] = res;
                clearTimeout(invalidateTimers[tag]);
                invalidateTimers[tag] = setTimeout(function() {
                    delete cachedTags[tag];
                    delete invalidateTimers[tag];
                }, 10 * 60 * 1000);
                cb(res);
            } else {
                error("Failed to fetch tag " + tag, xhr.status);
            }
        }
    };
    xhr.onerror = error;
    xhr.send();
}

// Array.prototype.flatMap isn't supported by some platforms
function flatMap(f, arr) {
    return arr.reduce(function(r, x) {
        return r.concat(f(x));
    }, []);
}
