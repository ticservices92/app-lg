/**
 * The AndroidPrinterPlus object
 * @type {Object}
 * @namespace AndroidPrinterPlus
 * @see [How to use Printer Plus]{@link https://github.com/rcties/PrinterPlusCOMM}
 */
AndroidPrinterPlus = {};

AndroidPrinterPlus.resetPrinter = true;


/**
 * Prints to test the printer
 * @param  {function} success Called if a connection is possible
 * @param  {function} error   Called if no connection is possible
 */
AndroidPrinterPlus.checkConnection=function (success, error){

    if(AndroidPrinterPlus.resetPrinter) {
        AndroidPrinterPlus.print("[{\"align\":\"center\", \"size\":\"3\", \"bold\":\"TRUE\", \"text\":\"Ya puede operar\", \"cut\":\"TRUE\"}]", function () {
            success();
        }, function () {
            error();
        });
        AndroidPrinterPlus.resetPrinter = false;
    }else{
        success();
    }
};


AndroidPrinterPlus.readStatus=function(callback){
    AndroidPrinterPlus.status = {printerStatus: "connected", paperStatus: "ok"};
    callback(AndroidPrinterPlus.status);
};

/**
 * Prints a ticket using Printer Plus app
 * @param  {string} ticketData Text to print
 * @param  {function} success    Success callback
 * @param  {function} error      Error callback
 */
AndroidPrinterPlus.print=function(ticketData,success,error){
    cordova.exec(success,
        error,
        "debPlayerPlugin",
        "printPrinterPlus",
        [ticketData]);
};

