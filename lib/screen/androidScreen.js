(function(window){
    'use strict';
    function define_android_screen(){
        /**
         * @namespace AndroidScreen
         */
        var AndroidScreen = {};
        var notif = {};
        var appFolder = location.href.substring(0, location.href.lastIndexOf('/www/') + 5);
        var androidVersion;
        var configurationCallback;

        document.addEventListener('keydown', function(e){
            if(e.ctrlKey && (e.keyCode === 81 || e.key.toLowerCase() === "q")){
                if(typeof configurationCallback === "function"){
                    configurationCallback();
                }
            } else if(e.ctrlKey && (e.keyCode === 82 || e.key.toLowerCase() === "r")){
                window.location.reload();
            }
        });

        var startPressing = false;
        var longPressingTimeout;
        var HiddenButtons = {RESET: {}, CONFIG: {}, NONE: {}};

        var getHiddenButtonActive = function (loc) {
            var resetButtonBounds =  {X: 100, Y: 100};
            var configButtonBounds = {X: window.innerWidth - 100, Y: window.innerHeight - 100};
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
            }
            return HiddenButtons.NONE;
        };

        var handleHiddenButtonPressed = function (button) {
            if(button !== HiddenButtons.NONE){
                startPressing = true;
                clearTimeout(longPressingTimeout);
                if (button === HiddenButtons.RESET) {
                    longPressingTimeout = setTimeout(AndroidScreen.restartApplication.bind(this), 5000);
                } else if (button === HiddenButtons.CONFIG) {
                    if (typeof configurationCallback === "function") {
                        longPressingTimeout = setTimeout(configurationCallback.bind(this), 5000);
                    }
                }
            }
        };

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

        document.addEventListener("deviceready",function() {
            if (typeof(device) == "undefined" || typeof(device.version) == "undefined") {
                if (typeof(window.device) == "undefined" || typeof(window.device.version) == "undefined") {
                    console.debug("No se puede acceder a la versión");
                }else{
                    androidVersion = parseInt(window.device.version.split(".")[0]);
                }
            }else {
                androidVersion = parseInt(device.version.split(".")[0]);
            }
            window.plugins.insomnia.keepAwake();
            cordova.plugins.autoStart.enable();
            notif.openConfigNotification = function (callback) {
                try {
                    cordova.plugins.notification.local.schedule({
                        id: 0,
                        title: "debPlayerWeb",
                        text: "Aplicación corriendo. Toque para configurar",
                        icon: "res/icon.png",
                        sound: null
                    }, function () {
                        if (typeof (callback) === "function") {
                            callback();
                        }
                    });
                }catch(e){
                    console.error("No se puede acceder a cordova.plugins.notification.local.schedule");
                }
            };

        },false);

        /**
         * Android screen type name
         * @type {string}
         * @memberOf AndroidScreen
         */
        AndroidScreen.type = "android";

        AndroidScreen.ignoreKeypress = function () {
            return false;
        };

        /**
         * Reboots player screen. *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.reboot = function(success, error){
            document.location.reload(true);
        };

        /**
         * Lock file to prevent being resurrected
         * @type {boolean}
         * @memberOf AndroidScreen
         */
        AndroidScreen.lockResurrection = function(_lock){
            // Currently only necesary for Webkit
        };

        /**
         * Updates player application.
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {string}   serverUrl Server's url where to find the new app's assets
         */
        AndroidScreen.updateApplication = function(success, error, serverUrl, useRemoteScript){
            var url = serverUrl;
            if(serverUrl[serverUrl.length - 1] === "/") url = serverUrl.substr(0, serverUrl.length - 1);

            url += "/v2/api/player/download/.zip?screenId=1&build=android&file=/";
            var config = { "content_url": url, "release": new Date().getTime().toString()};
            var options = {};

            PlayerStorage.createFile(JSON.stringify(config), "/update/chcp.json",function(){
                PlayerStorage.getFileUrl("/update/chcp.json",function(path){
                    options["config-file"] = path;

                    chcp.fetchUpdate(function(err, data){
                        if (!!err) {
                            if(!!error) error('Failed to load the update with error code: ' + err.code + ': ' + err.description);
                            return;
                        }

                        chcp.installUpdate(function(err){
                            if(!!err){
                                if(!!error) error('Failed to install update with error code: ' + err.code);
                            }else{
                                if(!!success) success();
                            }
                        });
                    }, options);
                },function(e){
                    if(!!error) error("Couldn't find updater configuration file. " + e);
                });
            },function(e){
                if(!!error) error("Couldn't create updater configuration file. " + e);
            });
        };

        AndroidScreen.testUpdateApplication = function(successCb, errorCb, serverUrl, useRemoteScript, addResult) {
            errorCb("testUpdateApplication not supported in Android");
        };

        /**
         * Function to turn on player screen.
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.turnOn = function(success, error){
            var global = document.getElementById('global');
            global.setAttribute("style", "");
            if(success) success();
        };

        /**
         * Function to turn off player screen.
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.turnOff = function(success, error){
            var global = document.getElementById('global');
            global.setAttribute("style", "display:none;");
            if(success) success();
        };

        /**
         * Function to turn on IR receiver. *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.irOn = function(success, error){
            if(success) success();
        };

        /**
         * Function to turn off IR receiver. *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.irOff = function(success, error){
            if(success) success();
        };

        /**
         * Function to enable debug mode. *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.debugOn = function(success, error) {
            if(success) success();
        };

        /**
         * Function to disable debug mode. *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.debugOff = function(success, error) {
            if(success) success();
        };

        /**
         * Makes a screenshot and returns base64 encoded image.
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.getCapture = function(success, error) {
            var img=0;

            navigator.screenshot.URI(function(err,res){
                if(err){
                    console.error(err);
                    if(error) error(err);
                }else{
                    img=res.URI;
                    if(typeof(img)==="string" && img.search("base64")!==-1){
                        img=img.substring(img.search("base64")+7,img.length);
                        success(img);
                    }else{
                        if(error) error();
                    }
                }
            },30);

        };

        /**
         * Function to play an audio file.
         * @memberOf AndroidScreen
         * @param  {string} path Local path to audio file
         */
        AndroidScreen.playAudio = function(path) {
            var bell = new Audio(path);
            bell.play();
        };

        /**
         * Function to register a callback for configuration command.
         * @memberOf AndroidScreen
         * @param  {function} callback Callback to be registered
         */
        AndroidScreen.onConfigurationCommand = function(callback) {
            configurationCallback = callback;
            notif.openConfigNotification(function(){
                cordova.plugins.notification.local.on("click", callback, this);
                cordova.plugins.notification.local.on("clear", function(){
                    notif.openConfigNotification();
                }, this);
            });
        };

        /**
         * Opens a new window in player screen.
         * @memberOf AndroidScreen
         * @param  {string} path Path to file to be opened in new window
         */
        AndroidScreen.openWindow = function(path) {
            window.open(appFolder + path);
        };

        /**
         * Closes current window.
         * @memberOf AndroidScreen
         */
        AndroidScreen.closeWindow = function(){
            window.open(appFolder + "index.html");
        };

        /**
         * Restart player application.
         * @memberOf AndroidScreen
         */
        AndroidScreen.restartApplication = function(){
            window.open(appFolder + "index.html");
        };

        /**
         * Function to clear cache files from screen. *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.clearCache = function(success, error) {
            if(success) success();
        };

        /**
         * Function to get WebOS version. Also gets the video rotation. *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.getFirmwareVersion = function(success, params, error){
            if(error) error("getFirmwareVersion not implemented on AndroidScreen");
        };

        /**
         * Function to get video rotation. *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.getVideoRotation = function(success, params, error){
            if(error) error("getVideoRotation not implemented on AndroidScreen");
        };

        /**
         * Gets screen status ('platform','network', 'storage', 'memory', 'cpu').
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback returning status object
         * @param  {function} error   Error function callback
         */
        AndroidScreen.getStatus = function(success, error) {
            var screenStatus = {};

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
                        screenStatus.storageTotal = drives[0].capacity;
                        chrome.system.storage.getAvailableCapacity(drives[0].id, function(storageData){
                            screenStatus.storageFree = storageData.availableCapacity;
                            //Obtengo datos de memoria
                            chrome.system.memory.getInfo(function(memory){
                                screenStatus.memoryTotal = memory.capacity;
                                screenStatus.memoryFree = memory.availableCapacity;
                                //Obtengo datos de cpu
                                chrome.system.cpu.getInfo(function(cpus){
                                    screenStatus.cpuTotal = 0;
                                    screenStatus.cpuFree = 0;
                                    if(cpus.processors) {
                                        cpus.processors.map(function (cpu) {
                                            screenStatus.cpuTotal += cpu.usage.total;
                                            screenStatus.cpuFree += cpu.usage.idle;
                                        });
                                    }
                                    success(screenStatus);
                                });
                            });
                        });
                    });
                });
            } catch(e) {
                if(error) error(e);
            }
        };

        /**
         * Function to transform videos (in 58:9 screens only). *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.transformVideoElement = function(options, success, error) {
            if(error) error("transformVideoElement not implemented on AndroidScreen");
        };

        /**
         * Function to rotate videos. *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {Object} params for Success function callback
         */
        AndroidScreen.rotate = function (success, error, deg) {
            if(error) error("rotate not implemented on AndroidScreen");
        };

        /**
         * Function to transform rotated video. *Not implemented in Android*
         * @memberOf AndroidScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidScreen.transformRotatedVideo = function(options, success, error){
            if(error) error("transformRotatedVideo not implemented on AndroidScreen");
        };

        /**
         * Function that returns the Android version. Obviously, it is Android specific.
         * @memberOf AndroidScreen
         * @returns first number of android version
         */
        AndroidScreen.getAndroidVersion = function(){
            return androidVersion;
        };

        AndroidScreen.getDeviceName = function (cb) {
            cordova.exec(
                function(name) {
                    cb(name);
                },
                console.error.bind(console, "Error getting device name:"),
                "deviceInfo",
                "name",
                []
            );
        };

        return AndroidScreen;
    }

    //define globally if it doesn't already exist
    if(typeof(PlayerScreen) === 'undefined' && navigator.userAgent.search("Android") !== -1){
        window.PlayerScreen = define_android_screen();

        if (typeof Object.assign != 'function') {
            Object.assign = function (target, varArgs) {
                if (target === null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var to = Object(target);
                for (var index = 1; index < arguments.length; index++) {
                    var nextSource = arguments[index];

                    if (nextSource !== null) {
                        for (var nextKey in nextSource) {
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }
                return to;
            };
        }
    }


    /* test-code
    <!-- build:remove -->
    */
    window.define_android_screen = define_android_screen;
    /* end-test-code
    <!-- /build -->
    //*/
    /* test-code    //*/


})(window);
