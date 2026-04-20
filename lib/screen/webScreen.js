(function(window){
    'use strict';
    function define_web_screen(){
        /**
         * @namespace WebScreen
         */
        var WebScreen = {};

        var configurationCallback;

        document.addEventListener('keydown', function(e){
            if(e.ctrlKey){
                // You can also use ctrl+a now, since ctrl+q in some
                // browsers means "Close every tab without confirmation yes I'm very sure"
                if((e.keyCode === 81 || e.keyCode === 65) && typeof configurationCallback === "function"){
                    configurationCallback();
                }
            }
        });

        var startPressing = false;
        var longPressingTimeout;
        var HiddenButtons = {RESET: {}, CONFIG: {}, FULLSCREEN: {}, NONE: {}};

        var getHiddenButtonActive = function (loc) {
            var resetButtonBounds =  {X: 100, Y: 100};
            var configButtonBounds = {X: window.innerWidth - 100, Y: window.innerHeight - 100};
            var fullScreenButtonBounds = {X: window.innerWidth - 100, Y: 100};
            var clientInteraction = {};
            if (loc.pageX && loc.pageY) {
                clientInteraction.X = loc.pageX;
                clientInteraction.Y = loc.pageY;
            } else if (loc.clientX && loc.clientY) {
                clientInteraction.X = loc.clientX;
                clientInteraction.Y = loc.clientY;
            }
            if (clientInteraction.X < resetButtonBounds.X && clientInteraction.Y < resetButtonBounds.Y){
                return HiddenButtons.RESET;
            } else if (clientInteraction.X > configButtonBounds.X && clientInteraction.Y > configButtonBounds.Y) {
                return HiddenButtons.CONFIG;
            } else if (clientInteraction.X > fullScreenButtonBounds.X && clientInteraction.Y < fullScreenButtonBounds.Y) {
                return HiddenButtons.FULLSCREEN;
            }
            return HiddenButtons.NONE;
        };

        function fullScreen() {
            var elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
              } else if (elem.webkitRequestFullscreen) { /* Safari */
                elem.webkitRequestFullscreen();
              } else if (elem.msRequestFullscreen) { /* IE11 */
                elem.msRequestFullscreen();
              }
        }

        var handleHiddenButtonPressed = function (button) {
            if(button !== HiddenButtons.NONE){
                startPressing = true;
                clearTimeout(longPressingTimeout);
                if (button === HiddenButtons.RESET) {
                    longPressingTimeout = setTimeout(WebScreen.reboot.bind(this), 5000);
                } else if (button === HiddenButtons.CONFIG) {
                    if (typeof configurationCallback === "function") {
                        longPressingTimeout = setTimeout(configurationCallback.bind(this), 5000);
                    }
                }
            }
        };


        document.addEventListener("dblclick", function(e){
            var button = getHiddenButtonActive(e);
            if (button == HiddenButtons.FULLSCREEN) fullScreen();
        });


        document.addEventListener('mousedown', function(e){
            handleHiddenButtonPressed(getHiddenButtonActive(e));
        });

        document.addEventListener('mouseup', function(e){
            if (startPressing) {
                clearTimeout(longPressingTimeout);
                startPressing = false;
            }
        });

        document.addEventListener('touchstart', function(e){
            handleHiddenButtonPressed(getHiddenButtonActive(e.touches[0]));
        });

        document.addEventListener('touchend', function(e){
            if (startPressing) {
                clearTimeout(longPressingTimeout);
                startPressing = false;
            }
        });

        /**
         * Chrome screen type name
         * @type {string}
         * @memberOf WebScreen
         */
        WebScreen.type = "web";
        WebScreen.ready = true;

        WebScreen.ignoreKeypress = function () {
            return false;
        };

        /**
         * Lock file to prevent being resurrected
         * @type {boolean}
         * @memberOf WebScreen
         */
        WebScreen.lockResurrection = function(_lock){
            // Currently only necesary for Webkit
        };

        /**
         * Updates player application. Not implemented on Chrome.
         * @memberOf WebScreen
         * @param  {function} successCb Success function callback
         * @param  {function} errorCb   Error function callback
         * @param  {string} serverUrl Server's address where the request for the new app should be made
         */
        WebScreen.updateApplication = function(successCb, errorCb, serverUrl, useRemoteScript){
            if(!!errorCb && typeof(errorCb) == "function") errorCb("Web app updating not implemented.");
        };

        WebScreen.testUpdateApplication = function(successCb, errorCb, serverUrl, useRemoteScript, addResult) {
            errorCb("testUpdateApplication not supported in Web");
        };

        /**
         * Reboots player screen.
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.reboot = function(success, error){
            location.href = playerBasePath + 'index.html';
        };

        /**
         * Function to turn on player screen.
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.turnOn = function(success, error){
            var global = document.getElementById('global');
            global.setAttribute("style", "");
            if(success) success();
        };

        /**
         * Function to turn off player screen.
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.turnOff = function(success, error){
            var global = document.getElementById('global');
            global.setAttribute("style", "display:none;");
            if(success) success();
        };

        /**
         * Function to turn on IR receiver. *Not implemented in Chrome*
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.irOn = function(success, error){
            if(success) success();
        };

        /**
         * Function to turn off IR receiver. *Not implemented in Chrome*
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.irOff = function(success, error){
            if(success) success();
        };

        /**
         * Function to enable debug mode. *Not implemented in Chrome*
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.debugOn = function(success, error) {
            if(success) success();
        };

        /**
         * Function to disable debug mode. *Not implemented in Chrome*
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.debugOff = function(success, error) {
            if(success) success();
        };

        /**
         * Makes a screenshot and returns base64 encoded image.
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.getCapture = function(success, error) {
            if(error) error();
        };

        /**
         * Function to play an audio file.
         * @memberOf WebScreen
         * @param  {string} path Local path to audio file
         */
        WebScreen.playAudio = function(path) {
            var bell = new Audio(path);
            bell.play().catch(function (reason) {
                // The browser is blocking the audio
            });
        };

        /**
         * Function to register a callback for configuration command.
         * @memberOf WebScreen
         * @param  {function} callback Callback to be registered
         */
        WebScreen.onConfigurationCommand = function(callback){
            configurationCallback = callback;
        };

        /**
         * Opens a new window in player screen.
         * @memberOf WebScreen
         * @param  {string} path Path to file to be opened in new window
         */
        WebScreen.openWindow = function(path){
            location.href = path;
        };

        /**
         * Closes current window.
         * @memberOf WebScreen
         */
        WebScreen.closeWindow = function(){
            location.href = playerBasePath + 'index.html';
        };

        /**
         * Restart player application.
         * @memberOf WebScreen
         */
        WebScreen.restartApplication = function(){
            WebScreen.reboot();
        };

        /**
         * Function to clear cache files from screen. *Not implemented in Chrome*
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.clearCache = function(success, error) {
            if(success) success();
        };

        /**
         * Function to get WebOS version. Also gets the video rotation. *Not implemented in Chrome*
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.getFirmwareVersion = function(success, params, error){
            if(error) error("getFirmwareVersion not implemented on WebScreen");
        };

        /**
         * Function to get video rotation. *Not implemented in Chrome*
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.getVideoRotation = function(success, params, error){
            if(error) error("getVideoRotation not implemented on WebScreen");
        };

        /**
         * Gets screen status ('platform','network', 'storage', 'memory', 'cpu').
         * @memberOf WebScreen
         * @param  {function} success Success function callback returning status object
         * @param  {function} error   Error function callback
         */
        WebScreen.getStatus = function(success, error) {
            var screenStatus = {};
            var drive = { capacity : 0 };

            try {
                var regexTry = navigator.userAgent.match(/ Chrom(e|ium)\/([0-9]+)/);

                screenStatus.platform = navigator.userAgent.match(/\(([^)]+)\)/)[1];
                if (regexTry) {
                    screenStatus.platform += regexTry[0];
                }
                screenStatus.networkIp = '';
                screenStatus.networkMac = '';
                screenStatus.memoryTotal = 0;
                screenStatus.memoryFree = 0;
                screenStatus.storageTotal = 0;
                screenStatus.storageFree = 0;
                screenStatus.cpuTotal = 0;
                screenStatus.cpuFree = 0;
                success(screenStatus);
            } catch(e) {
                if(error) error(e);
            }
        };

        /**
         * Function to transform videos (in 58:9 screens only). *Not implemented in Chrome*
         * @memberOf WebScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.transformVideoElement = function(options, success, error) {
            if(error) error("transformVideoElement not implemented on WebScreen");
        };

        /**
         * Function to rotate videos. *Not implemented in Chrome*
         * @memberOf WebScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {Object} params for Success function callback
         */
        WebScreen.rotate = function (success, error, deg) {
            if(error) error("rotate not implemented on WebScreen");
        };

        /**
         * Function to transform rotated video. *Not implemented in Chrome*
         * @memberOf WebScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebScreen.transformRotatedVideo = function(options, success, error){
            if(error) error("transformRotatedVideo not implemented on WebScreen");
        };

        WebScreen.getDeviceName = function (cb) { cb(); };

        return WebScreen;
    }

    //define globally if it doesn't already exist
    if(typeof(PlayerScreen) === 'undefined'){        // I trust that if it is not defined already, it should use the web API, since it is made to run in multiple browsers
        window.PlayerScreen = define_web_screen();
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_web_screen = define_web_screen;
    /* end-test-code
    <!-- /build -->
    //*/

})(window);
