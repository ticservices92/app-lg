(function(window){
    'use strict';
    function define_tizen_screen(){

        /**
         * @namespace TizenScreen
         */
        var TizenScreen = {};

        var configurationCallback;

        tizen.tvinputdevice.registerKey('ColorF1Green');    // Reload
        tizen.tvinputdevice.registerKey('ColorF2Yellow');   // Console
        tizen.tvinputdevice.registerKey('ColorF3Blue');     // Config

        var count = -1;

        document.addEventListener('keydown', function(e){
            if(e.keyCode === 406 && typeof configurationCallback === "function"){
                configurationCallback();
            }else if(e.keyCode === 404){
                window.location.reload();
            } else {
                if(e.keyCode === 40) {
                    count++;
                    e.preventDefault();
                } else if(e.keyCode === 38) {
                    count--;
                    e.preventDefault();
                }

                if(count < 0)
                    count = document.getElementsByTagName("input").length - 1;

                if(count >= document.getElementsByTagName("input").length)
                    count = 0;

                if(e.keyCode === 40 || e.keyCode === 38 || e.keyCode === 13){
                    $('input').eq(count).blur();
                    $('input').eq(count).focus();
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
                longPressingTimeout = setTimeout(TizenScreen.restartApplication.bind(this), 5000);
            }
        });

        document.addEventListener('mouseup', function(e){
            if(e.clientX && e.clientX < 100 && e.clientY && e.clientY < 100){
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

        document.addEventListener('touchstart', function(e){
            if(e.touches[0] && e.touches[0].pageX && e.touches[0].pageX < 100 && e.touches[0].pageY && e.touches[0].pageY < 100){
                startPressing = true;
                longPressing = false;
                clearTimeout(longPressingTimeout);
                longPressingTimeout = setTimeout(TizenScreen.restartApplication.bind(this), 5000);
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
         * Tizen screen type name
         * @type {string}
         * @memberOf TizenScreen
         */
        TizenScreen.type = "tizen";
        TizenScreen.ready = true;

        TizenScreen.ignoreKeypress = function () {
            return false;
        };

        /**
         * Lock file to prevent being resurrected
         * @type {boolean}
         * @memberOf TizenScreen
         */
        TizenScreen.lockResurrection = function(_lock){
            // Currently only necesary for Webkit
        };

        /**
         * Updates player application. Not implemented on Tizen.
         * @memberOf TizenScreen
         * @param  {function} successCb Success function callback
         * @param  {function} errorCb   Error function callback
         * @param  {string} serverUrl Server's address where the request for the new app should be made
         */
        TizenScreen.updateApplication = function(successCb, errorCb, serverUrl, useRemoteScript){
            if (successCb) successCb("App will update after reboot");
        };

        TizenScreen.testUpdateApplication = function(successCb, errorCb, serverUrl, useRemoteScript, addResult) {
            errorCb("testUpdateApplication not supported in Tizen");
        };

        /**
         * Reboots player screen.
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.reboot = function(success, error){
            if(window.b2bapis && window.b2bapis.b2bcontrol && window.b2bapis.b2bcontrol.rebootDevice) {
                b2bapis.b2bcontrol.rebootDevice(function () {
                    if (success) success();
                }, function () {
                    if (error) error();
                });
            }else{
                //https://developer.samsung.com/signage/develop/guides/migrating-applications/migrating-sssp-to-tizen.html
                if(systemcontrol.rebootDevice) {
                    systemcontrol.rebootDevice(function () {
                        if (success) success();
                    }, function () {
                        if (error) error();
                    });
                }
            }
        };

        /**
         * Function to turn on player screen.
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.turnOn = function(success, error){
            var global = document.getElementById('global');
            global.setAttribute("style", "");
            if(success) success();
        };

        /**
         * Function to turn off player screen.
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.turnOff = function(success, error){
            var global = document.getElementById('global');
            global.setAttribute("style", "display:none;");
            if(success) success();
        };

        /**
         * Function to turn on IR receiver. *Not implemented in Tizen*
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.irOn = function(success, error){
            if(success) success();
        };

        /**
         * Function to turn off IR receiver. *Not implemented in Tizen*
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.irOff = function(success, error){
            if(success) success();
        };

        /**
         * Function to enable debug mode. *Not implemented in Tizen*
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.debugOn = function(success, error) {
            if(success) success();
        };

        /**
         * Function to disable debug mode. *Not implemented in Tizen*
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.debugOff = function(success, error) {
            if(success) success();
        };


        TizenScreen.createBlackCapture = function(success, error) {
            var mainCanvas = document.createElement("canvas");
            mainCanvas.width = 1280;
            mainCanvas.height = 720;
            var ctx = mainCanvas.getContext("2d");
            var currentdate = new Date();
            var datetime = "[" + currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/"
                + currentdate.getFullYear() + " | "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes() + "] ";
            ctx.fillStyle="white";
            ctx.font = "70px calibri red";
            ctx.fillText("CAPTURA NO DISPONIBLE", 10, 200);
            ctx.fillText(datetime, 10, 300);
            var base64String = mainCanvas.toDataURL("image/jpeg");
            base64String = base64String.substring(base64String.search("base64") + 7, base64String.length);
            if (success) success(base64String);
            console.error("No se pudo crear imagen vacia para reemplazar screenshot", e);
            if (error) error("No se pudo crear imagen vacia para reemplazar screenshot");
        }

        /**
         * Makes a screenshot and returns base64 encoded image.
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.getCapture = function(success, error) {

            var onError = onScreenshotError.bind(this, null, "", success, error);

            if(tizen.filesystem && window.b2bapis && window.b2bapis.b2bcontrol && window.b2bapis.b2bcontrol.captureScreen) {
                window.b2bapis.b2bcontrol.captureScreen(
                    // onSuccess
                    function(path) {
                        console.debug("screenshot savedPath:", path);
                        tizen.filesystem.resolve(path, function(file) {
                            file.openStream("r",
                                function (fileStream) {
                                    try {
                                        var contents = fileStream.readBase64(fileStream.bytesAvailable);
                                        fileStream.close();
                                        if (success) {
                                            success(contents);
                                        }
                                    } catch (e){
                                        onError(e,"tizen filesystem readBase64 error");
                                    }
                                },
                                function(e) {
                                    onError(e, "tizen filesystem openStream error");
                                }
                            );
                            },
                            function(e) {
                                onError(e, "tizen filesystem resolve error");
                            }
                        );
                    },
                    // onError
                    function(e) {
                        onError(e, "b2bapis.b2bcontrol.captureScreen error");
                    }
                );
            } else {
                onError(null, "tizen.filesystem or window.b2bapis or window.b2bapis.b2bcontrol or window.b2bapis.b2bcontrol.captureScreen not available")
            }
        };

        var onScreenshotError = function (e, msg, success, error) {
            console.debug("[captureScreen] " + msg, e || "Sin exception");
            TizenScreen.createBlackCapture(success, error);
        }

        /**
         * Function to play an audio file.
         * @memberOf TizenScreen
         * @param  {string} path Local path to audio file
         * @see https://developer.tizen.org/community/tip-tech/working-web-audio-api
         */
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        var context = new AudioContext();

        TizenScreen.playAudio = function(path, debug, error) {
            var request = new XMLHttpRequest();
            request.open('GET', path, true);
            request.responseType = 'arraybuffer';

            request.onreadystatechange = function() {
                if (request.readyState === 4) {
                    if(debug) debug("[playAudio] request.status " + request.status + " (path " + path +")");
                    context.decodeAudioData(request.response, function(buffer) {
                        try{
                            // creates a sound source
                            var source = context.createBufferSource();
                            // tell the source which sound to play
                            source.buffer = buffer;
                            // connect the source to the context's destination (the speakers)
                            source.connect(context.destination);

                            // Should be 5 secs. We don't wanna make it 5 secs
                            setTimeout(function () {
                                source.start(0);
                            }, 2000);
                        } catch (e) {
                            if(!error) return;
                            var message = e.message || ((typeof e) == "string" ? e : JSON.stringify(e));
                            error("[AudioBufferSourceNode error] " + message);
                        }
                    }, function (e) {
                        if(!error) return;
                        var message = e.message || ((typeof e) == "string" ? e : JSON.stringify(e));
                        error("[decodeAudioData] " + message);
                    });
                }
            };

            request.onload = function () {
                console.debug("request.onload");
            };
            request.onerror = function () {
                console.debug("request.onerror");
            };

            request.send();
        };

        /**
         * Function to register a callback for configuration command.
         * @memberOf TizenScreen
         * @param  {function} callback Callback to be registered
         */
        TizenScreen.onConfigurationCommand = function(callback){
            configurationCallback = callback;
        };

        /**
         * Opens a new window in player screen.
         * @memberOf TizenScreen
         * @param  {string} path Path to file to be opened in new window
         */
        TizenScreen.openWindow = function(path){
            window.open(path, "_self");
        };

        /**
         * Closes current window.
         * @memberOf TizenScreen
         */
        TizenScreen.closeWindow = function(){
            window.open("index.html", "_self");
        };

        /**
         * Restart player application.
         * @memberOf TizenScreen
         */
        TizenScreen.restartApplication = function(){
            if(location.pathname.search("index.html") !== -1)
                location.reload();
            else
                TizenScreen.closeWindow();
        };

        /**
         * Function to clear cache files from screen. *Not implemented in Tizen*
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.clearCache = function(success, error) {
            if(success) success();
        };

        /**
         * Function to get WebOS version. Also gets the video rotation. *Not implemented in Tizen*
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.getFirmwareVersion = function(success, params, error){
            if(error) error("getFirmwareVersion not implemented on TizenScreen");
        };

        /**
         * Function to get video rotation. *Not implemented in Tizen*
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.getVideoRotation = function(success, params, error){
            if(error) error("getVideoRotation not implemented on TizenScreen");
        };

        /**
         * Gets screen status ('platform','network', 'storage', 'memory', 'cpu').
         * @memberOf TizenScreen
         * @param  {function} success Success function callback returning status object
         * @param  {function} error   Error function callback
         */
        TizenScreen.getStatus = function(success, error) {
            var screenStatus = {};
            var drive = { capacity : 0 };

            try {
                screenStatus.platform = "Tizen " + webapis.productinfo.getFirmware() + " - " + webapis.productinfo.getRealModel();
                screenStatus.networkIp = webapis.network.getIp();
                screenStatus.networkMac = webapis.network.getMac();

                tizen.systeminfo.getPropertyValue("CPU", function(cpu) {
                    screenStatus.cpuTotal = 100;
                    screenStatus.cpuFree = (1 - cpu.load) * 100;
                    tizen.systeminfo.getPropertyValue("STORAGE", function (storage) {
                        screenStatus.storageTotal = storage.units[0].capacity;
                        screenStatus.storageFree = storage.units[0].availableCapacity;
                        try{
                            screenStatus.memoryTotal = tizen.systeminfo.getTotalMemory();
                            screenStatus.memoryFree = tizen.systeminfo.getAvailableMemory();
                            success(screenStatus);
                        } catch (e) {
                            if(error) error();
                        }
                    }, error);
                }, error);
            } catch(e) {
                if(error) error(e);
            }
        };

        /**
         * Function to transform videos (in 58:9 screens only). *Not implemented in Tizen*
         * @memberOf TizenScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.transformVideoElement = function(options, success, error) {
            if(error) error("transformVideoElement not implemented on TizenScreen");
        };

        /**
         * Function to rotate videos. *Not implemented in Tizen*
         * @memberOf TizenScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {Object} params for Success function callback
         */
        TizenScreen.rotate = function (success, error, deg) {
            if(error) error("rotate not implemented on TizenScreen");
        };

        /**
         * Function to transform rotated video. *Not implemented in Tizen*
         * @memberOf TizenScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        TizenScreen.transformRotatedVideo = function(options, success, error){
            if(error) error("transformRotatedVideo not implemented on TizenScreen");
        };

        TizenScreen.getDeviceName = function (cb) { cb(); };

        return TizenScreen;
    }

    //define globally if it doesn't already exist
    if(typeof(PlayerScreen) === 'undefined' && (navigator.userAgent.search("Tizen") !== -1)){
        window.PlayerScreen = define_tizen_screen();
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_tizen_screen = define_tizen_screen;
    /* end-test-code
    <!-- /build -->
    //*/

})(window);
