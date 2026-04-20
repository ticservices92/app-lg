/**
* The WebPrinter object
* @type {Object}
* @namespace WebPrinter
*/
WebPrinter = {};

/**
* Current status of printer device
* @type {Object}
* @memberOf WebPrinter
*/
WebPrinter.status = {printerStatus: "connected", paperStatus: "unknown"};


/**
* Cannot check connection on web printer
* @param  {function()} success Called if connection is possible
* @param  {function()} error   Called if connection is not possible
* @memberOf WebPrinter
*/
WebPrinter.checkConnection = function (success, _error){
    success()
};

/**
* Prints using browser's default printer
* @param  {HTMLCanvasElement}   canvas     Canvas to be printed
* @param  {function()}          success    Called if printing was successful
* @param  {function()}          error      Called if printing failed
* @memberOf WebPrinter
*/
WebPrinter.print = function (canvas, success, _error) {
    var dataUrl = canvas.toDataURL();

    var windowContent = '<!DOCTYPE html>';
    windowContent += '<html>';
    windowContent += '<head><style type="text/css" media="print">'
    windowContent += '@page { margin: 0mm; /* remove header/footer */ }'
    windowContent += 'html{ background-color: #FFFFFF; margin: 0px; width: fit-content; height: fit-content; }';
    windowContent += '</style><title></title></head>';
    windowContent += '<body style="margin: 0;">';
    windowContent += '<img src="' + dataUrl + '">';
    windowContent += '</body>';
    windowContent += '</html>';

    var printWin = window.open('', '', 'width=' + canvas.width + ',height=' + canvas.height + ',scrollbars=no,resizable=no,status=no,location=no,toolbar=no');
    printWin.document.open();
    printWin.document.write(windowContent);

    window.blur();
    setTimeout(window.focus, 500);
    printWin.document.addEventListener('load', function() {
        printWin.document.close();
        printWin.print();
        printWin.close();
        success();
    }, true);
};

/**
* Gets current status of the printer device (always successful)
* @param  {Function} callback Called with the status of the device, after it's obtained
* @memberOf WebPrinter
*/
WebPrinter.readStatus = function(callback){
    callback(WebPrinter.status);
};

