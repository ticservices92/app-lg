(function(window){
    'use strict';
    function define_chrome_screen(){
        /**
         * @namespace ChromeScreen
         */
        var ChromeScreen = {};

        var configurationCallback;

        // Due to the Colombian ids having special chars like ctrl+Q and ctrl+R, I have
        // to disable these commands when I detect multiple inputs in a short time
        // Thanks Colombia
        var last5Keypresses = [0,0,0,0,0];
        var addNewLastKeypress = function () {
            last5Keypresses.shift();
            last5Keypresses.push(new Date());
        };

        document.addEventListener('keydown', function(e){
            var firstLastKeypress = last5Keypresses[0];
            addNewLastKeypress();
            if(new Date()-firstLastKeypress < 1000)
                return;

            if(e.ctrlKey){
                if(e.keyCode === 81 && typeof configurationCallback === "function"){
                    configurationCallback();
                }else if(e.keyCode === 82){
                    chrome.runtime.reload();
                }
            }
        });

        var startPressing = false;
        var longPressing = false;
        var longPressingTimeout;

        document.addEventListener('mousedown', function(e){
            if(e.clientX && e.clientX < 100 && e.clientY && e.clientY < 100){
                startPressing = true;
                longPressing = false;
                clearTimeout(longPressingTimeout);
                longPressingTimeout = setTimeout(ChromeScreen.restartApplication.bind(this), 5000);
            }
        });

        document.addEventListener('mouseup', function(e){
            if (startPressing && longPressing) {
                startPressing = false;
                e.preventDefault();
                return;
            }

            if (startPressing) {
                clearTimeout(longPressingTimeout);
                startPressing = false;
            }
        });

        document.addEventListener('touchstart', function(e){
            if(e.touches[0] && e.touches[0].pageX && e.touches[0].pageX < 100 && e.touches[0].pageY && e.touches[0].pageY < 100){
                startPressing = true;
                longPressing = false;
                clearTimeout(longPressingTimeout);
                longPressingTimeout = setTimeout(ChromeScreen.restartApplication.bind(this), 5000);
            }
        });

        document.addEventListener('touchend', function(e){
            if(e.changedTouches[0] && e.changedTouches[0].pageX && e.changedTouches[0].pageX < 100 && e.changedTouches[0].pageY && e.changedTouches[0].pageY < 100){
                if (startPressing && longPressing) {
                    startPressing = false;
                    e.preventDefault();
                    return;
                }

                if (startPressing) {
                    clearTimeout(longPressingTimeout);
                    startPressing = false;
                }
            }
        });

        /**
         * Chrome screen type name
         * @type {string}
         * @memberOf ChromeScreen
         */
        ChromeScreen.type = "chrome";
        ChromeScreen.ready = true;

        ChromeScreen.ignoreKeypress = function () {
            return false;
        };

        /**
         * Lock file to prevent being resurrected
         * @type {boolean}
         * @memberOf ChromeScreen
         */
        ChromeScreen.lockResurrection = function(_lock){
            // Currently only necesary for Webkit
        };

        /**
         * Updates player application. Not implemented on Chrome.
         * @memberOf ChromeScreen
         * @param  {function} successCb Success function callback
         * @param  {function} errorCb   Error function callback
         * @param  {string} serverUrl Server's address where the request for the new app should be made
         */
        ChromeScreen.updateApplication = function(successCb, errorCb, serverUrl, useRemoteScript){
            if(!!errorCb && typeof(errorCb) == "function") errorCb("Chrome app updating not implemented.");
        };

        ChromeScreen.testUpdateApplication = function(successCb, errorCb, serverUrl, useRemoteScript, addResult) {
            errorCb("testUpdateApplication not supported in Chrome");
        };

        /**
         * Reboots player screen.
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.reboot = function(success, error){
            var currentId;
            var windowsToClose = [];
            chrome.app.window.getAll().forEach(function(chromeWindow){
                if(chromeWindow.id.indexOf("mainWindow") !== -1){
                    currentId = chromeWindow.id;
                }
                windowsToClose.push(chromeWindow);
            });
            chrome.app.window.create
            (
                'index.html',
                {
                    id: currentId == "mainWindow" ? "mainWindow2" : "mainWindow",
                    state: "maximized"
                },function(createdWindow){
                    createdWindow.fullscreen();
                    windowsToClose.forEach(function(chromeWindow){
                        chromeWindow.close();
                    });
                    if(success) success();
                }
            );

        };

        /**
         * Function to turn on player screen.
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.turnOn = function(success, error){
            var global = document.getElementById('global');
            global.setAttribute("style", "");
            if(success) success();
        };

        /**
         * Function to turn off player screen.
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.turnOff = function(success, error){
            var global = document.getElementById('global');
            global.setAttribute("style", "display:none;");
            if(success) success();
        };

        /**
         * Function to turn on IR receiver. *Not implemented in Chrome*
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.irOn = function(success, error){
            if(success) success();
        };

        /**
         * Function to turn off IR receiver. *Not implemented in Chrome*
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.irOff = function(success, error){
            if(success) success();
        };

        /**
         * Function to enable debug mode. *Not implemented in Chrome*
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.debugOn = function(success, error) {
            if(success) success();
        };

        /**
         * Function to disable debug mode. *Not implemented in Chrome*
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.debugOff = function(success, error) {
            if(success) success();
        };

        /**
         * Makes a screenshot and returns base64 encoded image.
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.getCapture = function(success, error) {
            if(error) error();
        };

        /**
         * Function to play an audio file.
         * @memberOf ChromeScreen
         * @param  {string} path Local path to audio file
         */
        ChromeScreen.playAudio = function(path) {
            var bell = new Audio(path);
            bell.play();
        };

        /**
         * Function to register a callback for configuration command.
         * @memberOf ChromeScreen
         * @param  {function} callback Callback to be registered
         */
        ChromeScreen.onConfigurationCommand = function(callback){
            configurationCallback = callback;
        };

        /**
         * Opens a new window in player screen.
         * @memberOf ChromeScreen
         * @param  {string} path Path to file to be opened in new window
         */
        ChromeScreen.openWindow = function(path){
            chrome.app.window.create(
                path,
                {
                    id: path,
                    innerBounds: { minWidth: 700, minHeight: 560 }
                }
            );
        };

        /**
         * Closes current window.
         * @memberOf ChromeScreen
         */
        ChromeScreen.closeWindow = function(){
            window.close();
        };

        /**
         * Restart player application.
         * @memberOf ChromeScreen
         */
        ChromeScreen.restartApplication = function(){
            ChromeScreen.reboot();
        };

        /**
         * Function to clear cache files from screen. *Not implemented in Chrome*
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.clearCache = function(success, error) {
            if(success) success();
        };

        /**
         * Function to get WebOS version. Also gets the video rotation. *Not implemented in Chrome*
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.getFirmwareVersion = function(success, params, error){
            if(error) error("getFirmwareVersion not implemented on ChromeScreen");
        };

        /**
         * Function to get video rotation. *Not implemented in Chrome*
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.getVideoRotation = function(success, params, error){
            if(error) error("getVideoRotation not implemented on ChromeScreen");
        };

        /**
         * Gets screen status ('platform','network', 'storage', 'memory', 'cpu').
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback returning status object
         * @param  {function} error   Error function callback
         */
        ChromeScreen.getStatus = function(success, error) {
            var screenStatus = {};
            var drive = { capacity : 0 };

            try {
                screenStatus.platform = navigator.userAgent.match(/\(([^)]+)\)/)[1];
                screenStatus.platform += navigator.userAgent.match(/ Chrom(e|ium)\/([0-9]+)/)[0];
                //Obtengo la ip
                chrome.system.network.getNetworkInterfaces(function(interfaces){
                    interfaces.some(function(elem){
                        screenStatus.networkIp = elem.address;
                        if(elem.address.indexOf("::") === -1) {
                            return true;
                        }
                    });
                    screenStatus.networkMac = "";
                    //Obtengo datos del storage
                    chrome.system.storage.getInfo(function(drives){
                        for (var i = 0; i < drives.length; i++) {
                            if(drive.capacity < drives[i].capacity) drive = drives[i];
                        }
                        screenStatus.storageTotal = drive.capacity;
                        //Obtengo datos de memoria
                        chrome.system.memory.getInfo(function(memory){
                            screenStatus.memoryTotal = memory.capacity;
                            screenStatus.memoryFree = memory.availableCapacity;
                            //Obtengo datos de cpu
                            chrome.system.cpu.getInfo(function(cpus){
                                screenStatus.cpuTotal = 0;
                                screenStatus.cpuFree = 0;
                                cpus.processors.map(function(cpu){
                                    screenStatus.cpuTotal += cpu.usage.total;
                                    screenStatus.cpuFree += cpu.usage.idle;
                                });

                                if(typeof(chrome.system.storage.getAvailableCapacity) === 'undefined') {
                                    success(screenStatus);
                                } else if(drive.id) {
                                    chrome.system.storage.getAvailableCapacity(drive.id, function(storageData){
                                        if(storageData) screenStatus.storageFree = storageData.availableCapacity;
                                        success(screenStatus);
                                    });
                                }
                            });
                        });
                    });
                });
            } catch(e) {
                if(error) error(e);
            }
        };

        /**
         * Function to transform videos (in 58:9 screens only). *Not implemented in Chrome*
         * @memberOf ChromeScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.transformVideoElement = function(options, success, error) {
            if(error) error("transformVideoElement not implemented on ChromeScreen");
        };

        /**
         * Function to rotate videos. *Not implemented in Chrome*
         * @memberOf ChromeScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {Object} params for Success function callback
         */
        ChromeScreen.rotate = function (success, error, deg) {
            if(error) error("rotate not implemented on ChromeScreen");
        };

        /**
         * Function to transform rotated video. *Not implemented in Chrome*
         * @memberOf ChromeScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeScreen.transformRotatedVideo = function(options, success, error){
            if(error) error("transformRotatedVideo not implemented on ChromeScreen");
        };

        ChromeScreen.getDeviceName = function (cb) { cb(); };

        return ChromeScreen;
    }

    //define globally if it doesn't already exist
    if(typeof(PlayerScreen) === 'undefined' &&
        (navigator.userAgent.search("X11") !== -1 ||
            navigator.userAgent.search("Windows") !== -1 ||
            navigator.userAgent.search("Mac") !== -1)){
        window.PlayerScreen = define_chrome_screen();
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_chrome_screen = define_chrome_screen;
    /* end-test-code
    <!-- /build -->
    //*/

})(window);
