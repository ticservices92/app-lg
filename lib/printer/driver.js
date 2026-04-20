/**
 * The Driver object.
 * @namespace Driver
 * @type {Object}
 */
Driver = {};

Driver.config = {
    vendorId: 0,
    productId: 0,
    interface: 1,
    printerName: "",
    protocol: "POS"
};

Driver.driver = undefined;

var ticket = [
{ key:"separator", data: "-----------------------------------", type: 0, font: "Arial", size: "22", centered: true },
{ key:"header1", data: "Header 1", type: 0, font: "Arial", size: "14", centered: true },
{ key:"header2", data: "Header 2", type: 0, font: "Arial", size: "14", centered: true },
{ key:"subheader1", data: "SubHeader 1", type: 0, font: "Arial", size: "11", centered: true, alignment: "right" },
{ key:"subheader2", data: "SubHeader 2", type: 0, font: "Arial", isBold:true, alignment: "right", space:"24" },
{ key:"turn", data: "A1", type: 0, font: "Arial", size: "48", centered: true },
{ key:"waitingroom", data: "waitingroom", type: 0, font: "Arial", size: "11", centered: true },
{ key:"personasespera", data: "Personas espera", type: 0, font: "Arial", size: "14", alignment: "left" },
{ key:"waitingTime", data: "Tiempo espera", type: 0, font: "Arial", size: "11", alignment: "right" },
{ key:"customerExtraFields", data: "", type: 0, font: "Arial", size: "11", centered: true },
{ key:"customername", data: "", type: 0, font: "Arial", size: "11", centered: true },
{ key:"extraFields", data: "", type: 0, font: "Arial", size: "11", centered: true },
{ key:"dni", data: "", type: 0, font: "Arial", size: "11", centered: true },
{ key:"logo", data: "", type: 1, width: "200", height: "100",  left: "0", centered: true },
{ key:"separator", data: "-----------------------------------", type: 0, font: "Arial", size: "22", centered: true },
{ key:"footer", data: "Footer", type: 0, font: "Arial", size: "10", centered: true },
{ key:"firmasistema", data: "Firma sistema", type: 0, font: "Arial", size: "10", centered: true },
{ key:"separator", data: "-----------------------------------", type: 0, font: "Arial", space:"10", size: "22", centered: true }];

/**
 * Sends a string to a device via a Driver connection
 * @memberOf Driver
 * @method print
 * @param  {string}   data     String to be sent
 * @param  {function} success Called after data has been sent
 * @param  {function} error   Called if an error ocurred
 */
Driver.print = function(data, success, error){
    if(this._init(error)) {
        // Print using the printer named config.printerName
        if(this.config.printerName) this.driver.selectPrinter(this.config.printerName);
        var key;
        var i;
        var data_arr = [];
        if(data.length){
            for(i = 0; i < data.length; i++){
                if(!!data[i].data) data_arr.push(data[i]);
            }
        }else{
            for(i = 0; i < ticket.length; i++){
                key = ticket[i].key;
                var line = Object.assign({}, ticket[i]);
                if( typeof data[key] !== "undefined" ){
                    line.data = data[key];
                }
                // If line.data is "" or undefined it shouldn't be printed
                if(!!line.data){
                    if(typeof line.data !== "string"){
                        // If line.data is an array there should be a line for each element of the array
                        var obj;
                        for(var j = 0; j < line.data.length; j++){
                            obj = Object.assign({}, line);
                            obj.data = line.data[j];
                            if(!!obj.data) data_arr.push(obj);
                        }
                    }else{
                        data_arr.push(line);
                    }
                }
            }
        }

        var that = this;
        var tags = new Set();
        data_arr = Printer.parseDataStrings(data_arr, tags);
        Printer.replaceTags(tags, data_arr, function (data_arr) {
            data_arr.forEach(function (line) {
                return that.driver.send(line);
            });

            that.driver.print(success, error);
        }, error);
    }
};

/**
 * Returns the current status of a printer connected via Driver as an object containing both the status of the printer and of the paper in it.
 * @param  {Function} callback Called with the status of the printer as a parameter.
 * @memberOf Driver
 */
Driver.readStatus = function(callback){
    if(this._init()){
        if(this.config.interface === 3){
            callback({printerStatus:"connected", paperStatus:"unknown"});
            return;
        }
        this.driver.connect(this.config, function(){
            Driver.driver.getStatus(function(status){
                Driver.driver.getStatus(function(status){
                    Driver.driver.getStatus(function(status){
                        if(typeof status !== "undefined" && typeof callback === "function") callback(status);
                        Driver.driver.disconnect();
                    });
                });
            });
        },function(err){
            callback({printerStatus:"disconnected", paperStatus:"unknown"});
        });
    }else{
        // Couldn't initialise driver.
        callback({printerStatus:"disconnected", paperStatus:"unknown"});
    }
};

/**
 * Checks if a connection to a device is possible.
 * @param  {function} success Called if a connection is possible
 * @param  {function} error   Called if no connection is possible
 * @memberOf Driver
 */
Driver.checkConnection = function (success, error){
    if(this._init(error)) {
        if(this.driver && this.config.interface === 2){
            chrome.serial.getDevices(function(devices) {
                for (var i = 0; i < devices.length; i++) {
                    if(devices[i].vendorId === Driver.config.vendorId &&
                        devices[i].productId === Driver.config.productId) {
                        Driver.config.serialPort = devices[i].path;
                    }
                }

                if(success) success();
            });
        } else if(this.driver && success) {
            success();
        }
    }
};

/**
 * Initialises the driver object if it wasn't initialised. Loads the printer module and instantiates it.
 * @memberOf Driver
 * @param  {Function} error Called when an error ocurs with the details as a string parameter.
 * @return {boolean}       True if success and false if failed.
 */
Driver._init = function(error){
    if(typeof(require) === "function") {
        try {
            if(window.PrinterDriver === undefined) window.PrinterDriver = require("printer");
            if(this.driver === undefined) this.driver = new PrinterDriver();
            return true;
        } catch (e) {
            if(error) error("Driver printer can not be initialized. " + e.message);
            return false;
        }
    } else if(error) {
        if(error) error("Driver printer is not supported in " + PlayerScreen.type + " platform.");
        return false;
    }
};

/**
 * Returns the printers available to use via the OS
 * @memberOf Driver
 * @return {Array} Names of the printers available.
 */
Driver.getPrinters = function(){
    if(this._init()) {
        return this.driver.getAvailablePrinters();
    }
    return [];
};

/**
 * Sets the printing direction.
 * @param  {string} dir Direction in which to print: "inverted" or "normal";
 * @memberOf Driver
 */
Driver.setPrintingDirection = function(dir){
    if(this._init()) {
        return this.driver.setPrintingDirection(dir);
    }
};
