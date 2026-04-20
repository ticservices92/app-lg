(function(window){
    'use strict';
    function define_webkit_screen(){
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        var configurationCallback;

        var disableZoom = function () {
            document.body.addEventListener("touchmove", function (e) {
                e.preventDefault();
            }, {passive: false});
        };

        if (document.readyState === "complete"){
            disableZoom();
        } else {
            document.addEventListener('DOMContentLoaded', function(){
                disableZoom();
            });
        }

        // disable context menu
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });

        // Due to the Colombian ids having special chars like ctrl+Q and ctrl+R, I have
        // to disable these commands when I detect multiple inputs in a short time
        // Thanks Colombia
        var last5Keypresses = [0,0,0,0,0];
        var addNewLastKeypress = function () {
            last5Keypresses.shift();
            last5Keypresses.push(new Date());
        };

        var keyListener = function(e){
            addNewLastKeypress();
            if(WebkitScreen.ignoreKeypress())
                return;

            if(e.key === "Escape"){
                console.debug('Escape detected');
                console.debug('windowModeEnabled: ' + windowModeEnabled);
                if(windowModeEnabled === true || windowModeEnabled === undefined)     // Checks whether window mode is enabled or not
                    nw.Window.get().leaveFullscreen();
            }else if(e.ctrlKey && e.keyCode === 81){
                if(typeof configurationCallback === "function"){
                    configurationCallback();
                }
            }
            /* test-code
            <!-- build:remove:webkit -->
            */
            else if(e.ctrlKey && e.keyCode === 82){
                document.removeEventListener('keydown', keyListener);
                document.body.innerHTML = "<p style='text-align:center; font-size: 80px; color: white; position: relative; top: 20vh;'> Recargando aplicacion... </p>";

                var exec = require('child_process').exec;
                var child = exec("grunt reload-webkit-debug", function (error, stdout, stderr) {
                    if (error !== null) {
                        console.error('exec error: ' + error);
                    }
                    window.location.reload();
                });
            }
            /* end-test-code
            <!-- /build -->
             */

            /* test-code
            <!-- build:remove:webkitDebug -->
            */
            else if(e.ctrlKey && e.keyCode === 82){
                window.location.reload();
            }
            /* end-test-code
            <!-- /build -->
            */
        };

        // Configure shortcuts
        document.addEventListener('keydown', keyListener);

        var startPressing = false;
        var longPressing = false;
        var longPressingTimeout;

        document.addEventListener('mousedown', function(e){
            if(e.clientX && e.clientX < 100 && e.clientY && e.clientY < 100){
                startPressing = true;
                longPressing = false;
                clearTimeout(longPressingTimeout);
                longPressingTimeout = setTimeout(WebkitScreen.restartApplication.bind(this), 5000);
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
                longPressingTimeout = setTimeout(WebkitScreen.restartApplication.bind(this), 5000);
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
        * @namespace WebkitScreen
        */
        var WebkitScreen = {};

        /**
        * Webkit screen type name
        * @type {string}
        * @memberOf WebkitScreen
        */
        WebkitScreen.type = "chrome";

        WebkitScreen.ignoreKeypress = function () {
            var firstLastKeypress = last5Keypresses[0];
            return (new Date()-firstLastKeypress < 1000);
        };

        /**
         * Lock file to prevent being resurrected
         * @type {boolean}
         * @memberOf WebkitScreen
         */
        WebkitScreen.lockResurrection = function(lock){
            var fs = require('fs');
            var RESURRECT_LOCK_NAME = "res.lock";
            if(lock)
                fs.writeFileSync(RESURRECT_LOCK_NAME, "");
            else if(fs.existsSync(RESURRECT_LOCK_NAME))
                fs.unlinkSync(RESURRECT_LOCK_NAME);
        };

        /**
        * Updates player application.
        * @memberOf WebkitScreen
        * @param  {function} successCb Success function callback. *Never called*.
        * @param  {function} errorCb   Error function callback
        * @param {string} serverUrl Server's address where the request for the new app should be made
        */
        WebkitScreen.updateApplication = function(successCb, errorCb, serverUrl, useRemoteScript) {
            console.debug("Updater: Starting update...");

            var updaterPlugin = require("node-webkit-updater");
            var pkg = require("./manifest.json");

            pkg.packages = {
                linux64: { url: serverUrl + "/v2/api/player/download/.zip?screenId=1&build=webkitlinux" },
                linux32: { url: serverUrl + "/v2/api/player/download/.zip?screenId=1&build=webkitlinux" },
                win:     { url: serverUrl + "/v2/api/player/download/.zip?screenId=1&build=webkitwindows" }
            };

            var updater = new updaterPlugin(pkg);

            updater.download(function(error, file) {
                if (error) {
                    console.error("Updater: download failed", error);
                    if (errorCb) errorCb(error);
                    return;
                }

                console.debug("Updater: Downloaded file:", file);

                updater.unpack(file, function(error, appPath) {
                    if (error) {
                        console.error("Updater: unpack failed", error);
                        if (errorCb) errorCb(error);
                        return;
                    }

                    console.debug("Updater: Unpacked to:", appPath);

                    var os = require("os");
                    var comm = "";
                    var nodeChildProcess = require('child_process');
                    var pwd = "";
                    WebkitScreen.lockResurrection(true);

                    var execUpdate = function () {
                        if (os.platform() === "linux") {
                            comm = updater.getAppPath() + "/resources/scripts/updater.sh -n " +
                                appPath + " -o " + updater.getAppPath() + " -a " + updater.getAppExec() +
                                " -p " + process.pid;
                            pwd = "/tmp";
                        } else {
                            comm = 'start "debPlayerWeb app update" call "' + updater.getAppPath() + '\\resources\\scripts\\updater.bat" "' +
                                appPath.replace('.exe', '') + '" "' + updater.getAppPath() + '" "' +
                                updater.getAppExec() + '" "' + file + '" "' + appPath + '\\.."';
                            pwd = updater.options.temporaryDirectory;
                        }

                        console.debug("Updater: Executing update command:", comm);

                        nodeChildProcess.exec(comm, { cwd: pwd, windowsHide: false }, function(err, stdout, stderr) {
                            if (err) console.error("Updater: exec error:", err);
                            if (stdout) console.debug("Updater: exec stdout:", stdout);
                            if (stderr) console.log("Updater: exec stderr:", stderr);
                            if (typeof successCb === "function") successCb();
                        });
                    };

                    if (useRemoteScript) {
                        console.debug("Updater: Using remote script");

                        var path = require('path');
                        var cp = os.platform().indexOf("win") >= 0 ? "copy /Y" : "\\cp -f";
                        var updaterShSrc = path.join(appPath, "resources", "scripts", "updater.sh");
                        var updaterBatSrc = path.join(appPath, "resources", "scripts", "updater.bat");
                        var updaterShDest = path.join(updater.getAppPath(), "resources", "scripts", "updater.sh");
                        var updaterBatDest = path.join(updater.getAppPath(), "resources", "scripts", "updater.bat");

                        var command = cp + " \"" + updaterShSrc + "\" \"" + updaterShDest + "\" && " +
                                      cp + " \"" + updaterBatSrc + "\" \"" + updaterBatDest + "\"";

                        console.debug("Updater: Remote script copy command:", command);

                        nodeChildProcess.exec(command, function (error, stdout, stderr) {
                            if (error) console.error("Updater: copy script error:", error);
                            if (stdout) console.debug("Updater: copy stdout:", stdout);
                            if (stderr) console.debug("Updater: copy stderr:", stderr);
                            execUpdate();
                        });
                    } else {
                        console.debug("Updater: Using local script");
                        execUpdate();
                    }
                }, pkg);
            }, pkg);
        };

        WebkitScreen.testUpdateApplication = function(successCb, errorCb, serverUrl, useRemoteScript, addResult) {
             try {
                var updaterUtils = require("./lib/screen/utils/updaterUtils.js");

                 addResult(true, "Starting test update...");

                 var pkg = require("./manifest.json");
                 pkg.packages = updaterUtils.buildPackages(serverUrl);
                 var updaterPlugin = updaterUtils.updaterPlugin;
                 var updater = new updaterPlugin(pkg);

                 addResult(true, "Create Updater plugin OK. Updater plugin creado correctamente");

                 updater.download(function (error, file) {
                     if (error) {
                         updaterUtils.logDownloadError(error);
                         if (errorCb) errorCb(error);
                         return;
                     }

                     addResult(true, "Download OK. File recibido: " + file)

                     updater.unpack(file, function (error, appPath) {
                         if (error) {
                             console.error("unpack failed", error);
                             if (errorCb) errorCb(error);
                             return;
                         }

                         addResult(true, "Unpacked OK. File en " + appPath);

                         WebkitScreen.lockResurrection(true);

                         var runUpdate = function() {
                             var command = updaterUtils.buildUpdateCommand(updater, appPath, file);
                             updaterUtils.execUpdateScript(command, successCb);
                         };

                         if (useRemoteScript) {
                             updaterUtils.copyRemoteScripts(updater, appPath, runUpdate);
                         } else {
                             console.debug("Using local script");
                             runUpdate();
                         }

                     }, pkg);
                 }, pkg);

             } catch (ex) {
                 console.error("exception", ex);
                 if (errorCb) errorCb(ex);
             }
         }

        /**
        * Reboots player screen.
        * @memberOf WebkitScreen
        * @param  {function} success Success function callback
        * @param  {function} error   Error function callback
        */
        WebkitScreen.reboot = function(success, error){
            document.location.reload(true);
        };

        /**
        * Function to turn on player screen.
        * @memberOf WebkitScreen
        * @param  {function} success Success function callback
        * @param  {function} error   Error function callback
        */
        WebkitScreen.turnOn = function(success, error){
            var global = document.getElementById('global');
            global.setAttribute("style", "");
            if(success) success();
        };

        /**
        * Function to turn off player screen.
        * @memberOf WebkitScreen
        * @param  {function} success Success function callback
        * @param  {function} error   Error function callback
        */
        WebkitScreen.turnOff = function(success, error){
            var global = document.getElementById('global');
            global.setAttribute("style", "display:none;");
            if(success) success();
        };

        /**
        * Function to turn on IR receiver. *Not implemented in Webkit*
        * @memberOf WebkitScreen
        * @param  {function} success Success function callback
        * @param  {function} error   Error function callback
        */
        WebkitScreen.irOn = function(success, error){
            if(success) success();
        };

        /**
        * Function to turn off IR receiver. *Not implemented in Webkit*
        * @memberOf WebkitScreen
        * @param  {function} success Success function callback
        * @param  {function} error   Error function callback
        */
        WebkitScreen.irOff = function(success, error){
            if(success) success();
        };

        /**
        * Function to enable debug mode. *Not implemented in Webkit*
        * @memberOf WebkitScreen
        * @param  {function} success Success function callback
        * @param  {function} error   Error function callback
        */
        WebkitScreen.debugOn = function(success, error) {
            if(success) success();
        };

        /**
        * Function to disable debug mode. *Not implemented in Webkit*
        * @memberOf WebkitScreen
        * @param  {function} success Success function callback
        * @param  {function} error   Error function callback
        */
        WebkitScreen.debugOff = function(success, error) {
            if(success) success();
        };

        /**
        * Makes a screenshot and returns base64 encoded image.
        * @memberOf WebkitScreen
        * @param  {function} success Success function callback
        * @param  {function} error   Error function callback
        */
        WebkitScreen.getCapture = function(success, error) {
            var win = nw.Window.get();
            win.capturePage(function(data) {
                if (chrome.runtime.lastError) {
                    if (error) error(chrome.runtime.lastError.message);
                } else {
                    var img = new Image();
                    img.onload = function() {
                        var mainCanvas = document.createElement("canvas");
                        mainCanvas.width = 640;
                        mainCanvas.height = 360;
                        var ctx = mainCanvas.getContext("2d");
                        ctx.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);
                        var base64String = mainCanvas.toDataURL("image/jpeg");
                        base64String = base64String.substring(base64String.search("base64") + 7, base64String.length);
                        if(success) success(base64String);
                    };
                    img.src = data;
                }
            }, { format : 'jpeg', datatype : 'datauri'} );
        };

        /**
        * Function to play an audio file.
        * @memberOf WebkitScreen
        * @param  {string} path Local path to audio file
        */
        WebkitScreen.playAudio = function(path,debug, error) {
            var bell = new Audio(path);
            bell.play().catch(function (e) {
                if(!error) return;
                var message = e.message || ((typeof e) == "string" ? e : JSON.stringify(e));
                error("[WebkitScreen.playAudio error] " + message);
            });
        };

        /**
        * Function to register a callback for configuration command.
        * @memberOf WebkitScreen
        * @param  {function} callback Callback to be registered
        */

        var windowModeEnabled;
        WebkitScreen.onConfigurationCommand = function(callback, _windowModeEnabled){
            configurationCallback = callback;
            windowModeEnabled = _windowModeEnabled;
        };

        /**
        * Opens a new window in player screen.
        * @memberOf WebkitScreen
        * @param  {string} path Path to file to be opened in new window
        */
        WebkitScreen.openWindow = function(path){
            window.open(path, "_self");
        };

        /**
        * Closes current window.
        * @memberOf WebkitScreen
        */
        WebkitScreen.closeWindow = function(){
            window.open("index.html", "_self");
        };

        /**
        * Restart player application.
        * @memberOf WebkitScreen
        */
        WebkitScreen.restartApplication = function(){
            window.open("index.html", "_self");
            nw.Window.get().enterFullscreen();
        };

        /**
        * Function to clear cache files from screen. *Not implemented in Chrome*
        * @memberOf WebkitScreen
        * @param  {function} success Success function callback
        * @param  {function} error   Error function callback
        */
        WebkitScreen.clearCache = function(success, error) {
            nw.App.clearCache();
            if(success) success();
        };

        /**
         * Function to get WebOS version. Also gets the video rotation. *Not implemented in Webkit*
         * @memberOf WebkitScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        WebkitScreen.getFirmwareVersion = function(success, params, error){
            if(error) error("getFirmwareVersion not implemented on WebkitScreen");
        };

        /**
         * Function to get video rotation. *Not implemented in Webkit*
         * @memberOf WebkitScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        WebkitScreen.getVideoRotation = function(success, params, error){
            if(error) error("getVideoRotation not implemented on WebkitScreen");
        };

        /**
        * Gets screen status ('platform','network', 'storage', 'memory', 'cpu').
        * @memberOf WebkitScreen
        * @param  {function} success Success function callback returning status object
        * @param  {function} error   Error function callback
        */
        WebkitScreen.getStatus = function(success, error) {
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
         * Function to transform videos (in 58:9 screens only). *Not implemented in Webkit*
         * @memberOf WebkitScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebkitScreen.transformVideoElement = function(options, success, error) {
            if(error) error("transformVideoElement not implemented on WebkitScreen");
        };

        /**
         * Function to rotate videos. *Not implemented in Webkit*
         * @memberOf WebkitScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {Object} params for Success function callback
         */
        WebkitScreen.rotate = function (success, error, deg) {
            if(error) error("rotate not implemented on WebkitScreen");
        };

        /**
         * Function to transform rotated video. *Not implemented in Webkit*
         * @memberOf WebkitScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        WebkitScreen.transformRotatedVideo = function(options, success, error){
            if(error) error("transformRotatedVideo not implemented on WebkitScreen");
        };

        WebkitScreen.getDeviceName = function (cb) {
            // Either `undefined`, or the first environment variable that's defined
            var name = window.process && window.process.env && (
                window.process.env.COMPUTERNAME ||
                window.process.env.USERDOMAIN ||
                window.process.env.DEVICENAME ||
                window.process.env.HOST
            );
            cb(name);
        };

        return WebkitScreen;
    }

    //define globally if it doesn't already exist
    if(typeof(PlayerScreen) === 'undefined' &&
        (navigator.userAgent.search("X11") !== -1 ||
            navigator.userAgent.search("Windows") !== -1 ||
            navigator.userAgent.search("Mac") !== -1)){
        window.PlayerScreen = define_webkit_screen();
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_webkit_screen = define_webkit_screen;
    /* end-test-code
    <!-- /build -->
    //*/

})(window);
