(function(window){
    'use strict';
    function define_samsung_screen(){
        /**
         * @namespace SamsungScreen
         */
        var SamsungScreen = {};
        var count = -2;
        var configCallback;

        /**
         * Samsung SEF plugin.
         * @type {Object}
         * @protected
         * @memberOf SamsungScreen
         */
        var sefPlugin = document.createElement('object');
        sefPlugin.setAttribute('classid', 'clsid:SAMSUNG-INFOLINK-SEF');

        /**
         * Samsung File System plugin.
         * @type {Object}
         * @protected
         * @memberOf SamsungScreen
         */
        var fileSystemPlugin = document.createElement('object');
        fileSystemPlugin.setAttribute('classid', 'clsid:SAMSUNG-INFOLINK-FILESYSTEM');

        /**
         * Samsung Player plugin.
         * @type {Object}
         * @protected
         * @memberOf SamsungScreen
         */
        var playerPlugin = document.createElement('object');
        playerPlugin.setAttribute('classid', 'clsid:SAMSUNG-INFOLINK-PLAYER');

        /**
         * Samsung Widget API plugin.
         * @type {Object}
         * @protected
         * @memberOf SamsungScreen
         */
        var widgetAPI = new Common.API.Widget();

        /**
         * Samsung TV Key Value plugin.
         * @type {Object}
         * @protected
         * @memberOf SamsungScreen
         */
        var tvKey = new Common.API.TVKeyValue();

        /**
         * Samsung Plugin API.
         * @type {Object}
         * @protected
         * @memberOf SamsungScreen
         */
        var pluginAPI = new Common.API.Plugin();

        /**
         * Samsung IME Shell plugin.
         * @type {Object}
         * @protected
         * @memberOf SamsungScreen
         */
        var imeBox = {};
        imeBox.element = new IMEShell_Common();

        $(document).ready(function() {
            document.body.appendChild(sefPlugin);
            document.body.appendChild(fileSystemPlugin);
            document.body.appendChild(playerPlugin);

            widgetAPI.sendReadyEvent();
        });

        /**
         * Function that handles a key press event.
         * @memberOf SamsungScreen
         * @protected
         * @param  {Object} inEvent Object containing key code.
         */
        var readKey = function(inEvent) {
            var keycode;

            if(window.event) {
                keycode = inEvent.keyCode;
            } else if(e.which) {
                keycode = inEvent.which;
            }
            if(location.toString().search("config.html")===-1 && keycode === tvKey.KEY_BLUE){
                configCallback();
            }else if(keycode === tvKey.KEY_YELLOW){
                var ev = new Event("keydown");
                ev.ctrlKey = true;
                ev.keyCode = 69;
                ev.key = "e";
                document.dispatchEvent(ev);
            } else if(keycode === tvKey.KEY_ENTER){
                if(document.activeElement.type === "checkbox"){
                    document.activeElement.checked ^= 1;
                } else if(document.activeElement.type === "submit"){
                    document.activeElement.click();
                } else {
                    if (document.getElementsByTagName("input")[count].id === ""){
                        document.getElementsByTagName("input")[count].id = count.toString();
                    }
                    imeBox.element.inputboxID = document.getElementsByTagName("input")[count].id;
                    imeBox.element.onShow();
                }
            } else {
                if(keycode === tvKey.KEY_RIGHT) count++;
                else if(keycode === tvKey.KEY_LEFT) count--;
                else if(keycode === tvKey.KEY_DOWN) count += 2;
                else if(keycode === tvKey.KEY_UP) count -= 2;

                if(count < 0) count = 0;
                if(count >= document.getElementsByTagName("input").length){
                    count = document.getElementsByTagName("input").length - 1;
                }

                document.getElementsByTagName("input")[count].focus();
            }
        };

        /**
         * Callback Function that handles a remote key press event and generates an html event.
         * @memberOf SamsungScreen
         * @protected
         */
        var onKeyCallback = function(key, str ,id) {
            var event = document.createEvent('HTMLEvents');
            event.initEvent('change', true, false);
            document.getElementById(imeBox.element.inputboxID).dispatchEvent(event);
        };

        /**
         * Samsung screen type name
         * @type {string}
         * @memberOf SamsungScreen
         */
        SamsungScreen.type = "samsung";

        SamsungScreen.ignoreKeypress = function () {
            return false;
        };

        /**
         * Reboots player screen.
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.reboot = function(success, error){
            sefPlugin.Open('LFD', '1.000', 'LFD');
            sefPlugin.Execute("rebootSystemCmd", "");
            sefPlugin.Close();
            if(success) success();
        };

        /**
         * Function to turn on player screen.
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.turnOn = function(success, error){
            sefPlugin.Open('LFD', '1.000', 'LFD');
            sefPlugin.Execute('SendLFDMsg', 'F9000100');
            sefPlugin.Close();
            if(success) success();
        };

        /**
         * Function to turn off player screen.
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.turnOff = function(success, error){
            sefPlugin.Open('LFD', '1.000', 'LFD');
            sefPlugin.Execute('SendLFDMsg', 'F9000101');
            sefPlugin.Close();
            if(success) success();
        };

        /**
         * Function to turn on IR receiver.
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.irOn = function(success, error){
            sefPlugin.Open('LFD', '1.000', 'LFD');
            sefPlugin.Execute('SendLFDMsg', '36000101');
            sefPlugin.Close();
            if(success) success();
        };

        /**
         * Function to turn off IR receiver.
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.irOff = function(success, error){
            sefPlugin.Open('LFD', '1.000', 'LFD');
            sefPlugin.Execute('SendLFDMsg', '36000100');
            sefPlugin.Close();
            if(success) success();
        };

        /**
         * Function to enable debug mode.
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.debugOn = function(success, error) {
            if(success) success();
        };

        /**
         * Function to disable debug mode.
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.debugOff = function(success, error) {
            if(success) success();
        };

        /**
         * Makes a screenshot and returns base64 encoded image.
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.getCapture = function(success, error) {
            sefPlugin.Open('LFD', '1.000', 'LFD');
            var path = sefPlugin.Execute('GetScreenCapture');
            sefPlugin.Close();

            sefPlugin.Open('FileSystem', '1.000', 'FileSystem');
            sefPlugin.Execute('SetWidgetInfo', 2, "/mtd_down/common/" + curWidget.id);
            sefPlugin.Execute('SetWidgetInfo', 2, '/tmp/');
            var ret = sefPlugin.Execute('Move', path,  '/mtd_down/common/' + curWidget.id);
            sefPlugin.Close();

            if(ret === 1) {
                var img = new Image();
                img.onload = function() {
                    var mainCanvas = document.createElement("canvas");
                    mainCanvas.width = 1280;
                    mainCanvas.height = 720;
                    var ctx = mainCanvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);
                    var base64String = mainCanvas.toDataURL("image/jpeg");
                    base64String = base64String.substring(base64String.search("base64") + 7, base64String.length);
                    if(success) success(base64String);
                };
                img.src = '/mtd_down/common/' + curWidget.id + '/capture_screen.jpg?rand=' + new Date().getTime();
            } else if(error) {
                error();
            }
        };

        /**
         * Function to play an audio file.
         * @memberOf SamsungScreen
         * @param  {string} path Local path to audio file
         */
        SamsungScreen.playAudio = function(path) {
            playerPlugin.Stop();
            playerPlugin.Play('/mtd_down/widgets/user/' + curWidget.id + '/' + path);
        };

        /**
         * Function to register a callback for configuration command.
         * @memberOf SamsungScreen
         * @param  {function} callback Callback to be registered
         */
        SamsungScreen.onConfigurationCommand = function(callback) {
            document.addEventListener("keydown",readKey);
            imeBox.element.onKeyPressFunc = onKeyCallback;
            configCallback = callback;

        };

        /**
         * Opens a new window in player screen.
         * @memberOf SamsungScreen
         * @param  {string} path Path to file to be opened in new window
         */
        SamsungScreen.openWindow = function(path) {
            location.replace(location.toString().replace("index.html",path));
        };

        /**
         * Closes current window.
         * @memberOf SamsungScreen
         */
        SamsungScreen.closeWindow = function(){
            location.replace(location.toString().replace("views/config.html","index.html"));
        };

        /**
         * Lock file to prevent being resurrected
         * @type {boolean}
         * @memberOf SamsungScreen
         */
        SamsungScreen.lockResurrection = function(_lock){
            // Currently only necesary for Webkit
        };

        /**
         * Updates player application. *Not implemented in Samsung*
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.updateApplication = function(success, error, useRemoteScript){
            if(success) success();
        };

        SamsungScreen.testUpdateApplication = function(successCb, errorCb, serverUrl, useRemoteScript, addResult) {
            errorCb("testUpdateApplication not supported in Samsung");
        };

        /**
         * Restart player application.
         * @memberOf SamsungScreen
         */
        SamsungScreen.restartApplication = function(){
            location.replace(location.toString().replace("views/config.html","index.html"));
        };

        /**
         * Function to clear cache files from screen. *Not implemented in Samsung*
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.clearCache = function(success, error) {
            if(success) success();
        };

        /**
         * Function to get WebOS version. Also gets the video rotation. *Not implemented in Samsung*
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.getFirmwareVersion = function(success, params, error){
            if(error) error("getFirmwareVersion not implemented on SamsungScreen");
        };

        /**
         * Function to get video rotation. *Not implemented in Samsung*
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.getVideoRotation = function(success, params, error){
            if(error) error("getVideoRotation not implemented on SamsungScreen");
        };

        /**
         * Gets screen status ('platform','network', 'storage', 'memory', 'cpu').
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback returning status object
         * @param  {function} error   Error function callback
         */
        SamsungScreen.getStatus = function(success, error) {
            var screenStatus = {};

            try {
                if (navigator.userAgent.indexOf('Linux/SmartTV+2015') > 0) {
                    screenStatus.platform = "Samsung SSSP v3 ";
                } else if (navigator.userAgent.indexOf('Linux/SmartTV+2014') > 0) {
                    screenStatus.platform = "Samsung SSSP v2 ";
                } else if (navigator.userAgent.indexOf('Linux/SmartTV') > 0) {
                    screenStatus.platform = "Samsung SSSP v1 ";
                } else {
                    screenStatus.platform = "Samsung ";
                }

                sefPlugin.Open('NNavi', '1.000', 'NNavi');
                screenStatus.platform += sefPlugin.Execute("GetFirmware");
                sefPlugin.Close();

                sefPlugin.Open('Network', '1.000', 'Network');
                screenStatus.networkIp = sefPlugin.Execute("GetIP", "1");
                screenStatus.networkMac = sefPlugin.Execute("GetMAC" ,"1");
                sefPlugin.Close();

                screenStatus.storageTotal = fileSystemPlugin.GetTotalSize();
                screenStatus.storageFree = fileSystemPlugin.GetFreeSize();

                screenStatus.memoryTotal = 100;
                screenStatus.memoryFree = 0;
                screenStatus.cpuTotal = 100;
                screenStatus.cpuFree = 0;

                var firstMessage = true;
                sefPlugin.Open('LFD', '1.000', 'LFD');
                sefPlugin.OnEvent = function(data){
                    if(firstMessage) {
                        screenStatus.cpuFree = 100 - data;
                        firstMessage = false;
                    }
                    else {
                        screenStatus.memoryFree = 100 - data;
                        success(screenStatus);
                    }
                };
                sefPlugin.Execute("getCPUUsage", "");
                sefPlugin.Execute("getRamUsage", "");
                sefPlugin.Close();
            } catch(e) {
                if(error) error(e);
            }
        };

        /**
         * @typedef PIPopt
         * @property {string} source Source to use for the PIP
         * @property {string} state State to which the PIP should be set. One of ("ON", "OFF")
         */
        /**
         * Sets the screen's Picture In Picture
         * @param {string} divId    ID of the HTML DIV element where to load the PIP
         * @param {PIPopt} opt      Contains the source to use for the PIP and the state it should be set to
         * @param {function} success  Success callback
         * @param {function} error    Error callback
         * @param {function} loadedCb Function called once the PIP has loaded
         * @memberOf SamsungScreen
         */
        SamsungScreen.setPIP = function(divId,opt,success,error,loadedCb){

            //If the source's number is 1 (as in 'HDMI1'), then it is removed
            //because it is required by the SefPlugin API
            var num = parseInt(opt.source.charAt(opt.source.length-1));
            if(num === 1){
                opt.source = opt.source.substring(0,opt.source.length-1);
            }
            if(opt.source === "TV"){
                opt.source = "DTV";
            }

            var result=0;
            var div=document.getElementById(divId);
            if(!!div){
                div.style.opacity = "0";
                var rect = div.getBoundingClientRect();
                switch(opt.state){
                    case "ON":

                        sefPlugin.style.width = rect.width + 'px';
                        sefPlugin.style.height = rect.height + 'px';
                        sefPlugin.style.left = rect.left + 'px';
                        sefPlugin.style.top = rect.top + 'px';
                        sefPlugin.style.display = "block";
                        sefPlugin.style.position = "absolute";

                        sefPlugin.Open('LFDControl','1.000','LFDControl');
                        var state = sefPlugin.Execute("StatusNetPIP");
                        if(state === "ON"){
                            sefPlugin.Execute("SetNetPIP","OFF",opt.source,rect.left.toString()+'.'+rect.top.toString()+'.'+rect.width.toString()+'.'+rect.height.toString());
                        }
                        result = sefPlugin.Execute("SetNetPIP",opt.state,opt.source,rect.left.toString()+'.'+rect.top.toString()+'.'+rect.width.toString()+'.'+rect.height.toString());
                        sefPlugin.Close();

                    break;
                    case "OFF":
                        sefPlugin.style.display = "none";
                        result = "OK";
                    break;
                }
            }

            if(result === "OK"){
                if(success) success();
                if(typeof(loadedCb) === "function"){
                    loadedCb();
                }
            }else{
                if(error) error();
            }
        };

        /**
         * Function to transform videos (in 58:9 screens only). *Not implemented in Samsung*
         * @memberOf SamsungScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.transformVideoElement = function(options, success, error) {
            if(error) error("transformVideoElement not implemented on SamsungScreen");
        };

        /**
         * Function to rotate videos. *Not implemented in Samsung*
         * @memberOf SamsungScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {Object} params for Success function callback
         */
        SamsungScreen.rotate = function (success, error, deg) {
            if(error) error("rotate not implemented on SamsungScreen");
        };

        /**
         * Function to transform rotated video. *Not implemented in Samsung*
         * @memberOf SamsungScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungScreen.transformRotatedVideo = function(options, success, error){
            if(error) error("transformRotatedVideo not implemented on SamsungScreen");
        };

        SamsungScreen.getDeviceName = function (cb) { cb(); };

        return SamsungScreen;
    }

    //define globally if it doesn't already exist
    if(typeof(PlayerScreen) === 'undefined' && navigator.userAgent.search("SMART-TV") !== -1  && navigator.userAgent.search("Tizen") === -1){
        window.PlayerScreen = define_samsung_screen();
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_samsung_screen = define_samsung_screen;
    /* end-test-code
    <!-- /build -->
    //*/

})(window);

(function(debPlayerWeb){
    if(navigator.userAgent.search("SMART-TV") !== -1){
        var provide;

        // module.config() allows injection of providers but not instances.
        debPlayerWeb.config(['$provide', function ($provide) {
            provide = $provide;
        }]);

        debPlayerWeb.run(function () {
            provide.decorator('$http', function ($delegate, $q) {
                var $http = $delegate;

                var wrapper = function() {
                    return $http.apply($http, arguments);
                };

                var samsungFileGet = function(url) {
                    var defered = $q.defer();
                    var promise = defered.promise;
                    var xmlhttp = new XMLHttpRequest();

                    xmlhttp.onreadystatechange = function() {
                        if (xmlhttp.readyState === 4) {
                            if(xmlhttp.status === 200 || xmlhttp.status === 0) {
                                defered.resolve({
                                    data : xmlhttp.responseText,
                                    status : xmlhttp.status,
                                    headers : '',
                                    config : '',
                                    statusText : xmlhttp.statusText
                                });
                            } else {
                                defered.reject(xmlhttp.status);
                            }
                        }
                    };

                    xmlhttp.open("GET", url + "?rand=" + new Date().getTime(), true);
                    xmlhttp.setRequestHeader('Accept', 'application/json, text/javascript');
                    xmlhttp.send();

                    return promise;
                };

                Object.keys($http).filter(function (key) {
                    return (typeof $http[key] === 'function');
                }).forEach(function (key) {
                    wrapper[key] = function () {
                        if(arguments[0].indexOf("http") === -1) {
                            return samsungFileGet(arguments[0]);
                        } else {
                            return $http[key].apply($http, arguments);
                        }
                    };
                });

                return wrapper;
            });
        });
    }
})(debPlayerWeb);
