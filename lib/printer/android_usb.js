/**
 * The AndroidUSB object
 * @type {Object}
 * @namespace AndroidUSB
 */
AndroidUSB = {};

AndroidUSB.status = { printerStatus: "connected", paperStatus: "ok" };

/**
 * Prints to test the printer
 * @param  {function} success Called if a connection is possible
 * @param  {function} error   Called if no connection is possible
 * @memberOf AndroidUSB
 */
AndroidUSB.checkConnection = function(success, error) {
    cordova.exec(success,
        error,
        "PrinterPlugin",
        "checkConnection",
        []);
};

AndroidUSB.readStatus = function(callback) {
    callback(AndroidUSB.status);
};

/**
 * Prints a ticket using Printer Plus app
 * @param  {HTMLCanvasElement} canvas Text to print
 * @param  {boolean} fullCut        To fullCut or not to fullCut
 * @param  {function()} success     Success callback
 * @param  {function()} error       Error callback
 * @memberOf AndroidUSB
 */
AndroidUSB.print = function(canvas, fullCut, success, error) {
    var b64img = canvas.toDataURL("image/png");

    // Remove mimetype: "data:image/png;base64,[data...]"
    b64img = b64img.slice(b64img.indexOf(',') + 1);

    cordova.exec(success,
        error,
        "PrinterPlugin",
        "print",
        [b64img, fullCut]);
};

