/**
 * The AndroidBelltech object
 * @type {Object}
 * @namespace AndroidBelltech
 */
AndroidBelltech = {};

AndroidBelltech.status = {printerStatus: "connected", paperStatus: "ok"};

/**
 * Prints to test the printer
 * @param  {function} success Called if a connection is possible
 * @param  {function} error   Called if no connection is possible
 * @memberOf AndroidBelltech
 */
AndroidBelltech.checkConnection=function (success, error){
    success();
};

AndroidBelltech.readStatus=function(callback){
    callback(AndroidBelltech.status);
};

/**
 * Prints a ticket using Printer Plus app
 * @param  {HTMLCanvasElement} canvas Text to print
 * @param  {function()} success    Success callback
 * @param  {function()} error      Error callback
 * @memberOf AndroidBelltech
 */
AndroidBelltech.print=function(canvas,success,error){
    var b64img = canvas.toDataURL("image/jpeg");

    // Remove mimetype: "data:image/jpeg;base64,[data...]"
    b64img = b64img.slice(b64img.indexOf(',')+1);

    cordova.exec(success,
        error,
        "debPlayerPlugin",
        "printBelltech",
        [b64img]);
};

