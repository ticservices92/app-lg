(function(window){
    'use strict';
    function define_lg_screen(){
        /**
         * @namespace LgScreen
         */
        var LgScreen = {};

        /**
         * Lg Power plugin object.
         * @type {Object}
         * @protected
         * @memberOf LgScreen
         */
        var power = new Power();

        /**
         * Lg Signage plugin object.
         * @type {Object}
         * @protected
         * @memberOf LgScreen
         */
        var signage = new Signage();

        /**
         * Lg Storage plugin object.
         * @type {Object}
         * @protected
         * @memberOf LgScreen
         */
        var storage = new Storage();

        /**
         * Lg Configuration plugin object.
         * @type {Object}
         * @protected
         * @memberOf LgScreen
         */
        var configuration = new Configuration();

        /**
         * Lg DeviceInfo plugin object.
         * @type {Object}
         * @protected
         * @memberOf LgScreen
         */
        var deviceInfo = new DeviceInfo();

        /**
         * Lg Video plugin object.
         * @type {Object}
         * @protected
         * @memberOf LgScreen
         */
        var video = new Video();

        window.AudioContext = window.AudioContext || window.webkitAudioContext;

        /**
         * Lg AudioContext plugin object.
         * @type {Object}
         * @protected
         * @memberOf LgScreen
         */
        var context = new AudioContext();

        /**
         * LG InputSource object
         * @type {Object}
         * @protected
         * @memberOf LgScreen
         */
        var inputSource = new InputSource();

        var count = -2;

        /**
         * Function that handles a key press event.
         * @memberOf LgScreen
         * @protected
         * @param  {Object} inEvent Object containing key code.
         */
        var readKey = function(inEvent) {
            var keycode;

            if(window.event) {
                keycode = inEvent.keyCode;
            } else if(inEvent.which) {
                keycode = inEvent.which;
            }
            if(location.toString().search("config.html") === -1 && keycode === 406){
                LgScreen.openWindow("views/config.html");
            } else {
                if(keycode === 40) {
                    count++;
                    inEvent.preventDefault();
                } else if(keycode === 38) {
                    count--;
                    inEvent.preventDefault();
                } else if(inEvent.keyCode===13 && getWebOSVersion() > 2){
                    // In webOS >2, the "OK" button doesn't click the buttons in config
                    inEvent.target.click();
                }

                if(count < 0) count = 0;
                if(count >= document.getElementsByTagName("input").length) {
                    count = document.getElementsByTagName("input").length - 1;
                }

                document.getElementsByTagName("input")[count].focus();
            }
        };

        /**
         * Lg screen type name
         * @type {string}
         * @memberOf LgScreen
         */
        LgScreen.type = "lg";

        LgScreen.ignoreKeypress = function () {
            return false;
        };

        /**
         * Reboots player screen.
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.reboot = function(success, error){
            var option = { powerCommand : Power.PowerCommand.REBOOT};
            power.executePowerCommand(success, error, option);
        };

        /**
         * Function to turn on player screen.
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.turnOn = function(success, error){
            var options = { displayMode : Power.DisplayMode.DISPLAY_ON };
            power.setDisplayMode(success, error, options);
        };

        /**
         * Function to turn off player screen.
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.turnOff = function(success, error){
            var options = { displayMode : Power.DisplayMode.DISPLAY_OFF };
            power.setDisplayMode(success, error, options);
        };

        /**
         * Function to turn on IR receiver.
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.irOn = function(success, error){
            var options = {
                policy: {
                    remoteKeyOperationMode: Signage.KeyOperationMode.ALLOW_ALL,
                    localKeyOperationMode: Signage.KeyOperationMode.ALLOW_ALL,
                }
            };
            signage.setUsagePermission(success, error, options);
        };

        /**
         * Function to turn off IR receiver.
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.irOff = function(success, error){
            var options = {
                policy: {
                    remoteKeyOperationMode: Signage.KeyOperationMode.BLOCK_ALL,
                    localKeyOperationMode: Signage.KeyOperationMode.BLOCK_ALL,
                }
            };
            signage.setUsagePermission(success, error, options);
        };

        /**
         * Function to enable debug mode.
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.debugOn = function(success, error) {
            var options = {
                enabled : true //enabling debug mode
            };
            configuration.debug(success, error, options);
        };

        /**
         * Function to disable debug mode.
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.debugOff = function(success, error) {
            var options = {
                enabled : false //enabling debug mode
            };
            configuration.debug(success, error, options);
        };

        /**
         * Makes a screenshot and returns base64 encoded image.
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.getCapture = function(success, error) {
            //Ejecuta una captura de pantalla y la devuelve en base64 a success()
            var options = {};
            options.save = false; //true: se guarda la imagen localmente
            options.thumbnail = false; //true: 128x72px false:1280x720px

            var signage =new Signage();
            signage.captureScreen(function(cbObject){
                var img = new Image();
                img.onload = function() {
                    var mainCanvas = document.createElement("canvas");
                    mainCanvas.width = 320;
                    mainCanvas.height = 180;
                    var ctx = mainCanvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);
                    var base64String = mainCanvas.toDataURL("image/jpeg");
                    base64String = base64String.substring(base64String.search("base64") + 7, base64String.length);
                    if(success) success(base64String);
                };
                img.src = "data:image/png;base64," + cbObject.data;
            }, error, options);
        };

        /**
         * Function to play an audio file.
         * @memberOf LgScreen
         * @param  {string} path Local path to audio file
         */
        LgScreen.playAudio = function(path, debug, error) {
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

            request.send();
        };

        /**
         * Function to register a callback for configuration command.
         * @memberOf LgScreen
         * @param  {function} callback Callback to be registered
         */
        LgScreen.onConfigurationCommand = function(callback) {
            document.addEventListener("keydown",readKey);
        };

        /**
         * Opens a new window in player screen.
         * @memberOf LgScreen
         * @param  {string} path Path to file to be opened in new window
         */
        LgScreen.openWindow = function(path) {
            var futureWindow = window.open("file:///mnt/lg/appstore/scap/procentric/scap/application/app/" + path);
        };

        /**
         * Closes current window.
         * @memberOf LgScreen
         */
        LgScreen.closeWindow = function(){
            window.open("file:///mnt/lg/appstore/scap/procentric/scap/application/app/index.html");
        };

        /**
         * Lock file to prevent being resurrected
         * @type {boolean}
         * @memberOf LgScreen
         */
        LgScreen.lockResurrection = function(_lock){
            // Currently only necesary for Webkit
        };

		/**
         * Updates player application.
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {string}   serverUrl Server's url where to find the new app's assets
         */
        LgScreen.updateApplication = function(success, error, serverUrl, useRemoteScript){
            var options = {
                to: Storage.AppMode.LOCAL,
                recovery: true
            };
            storage.upgradeApplication(success, error, options);
        };

        LgScreen.testUpdateApplication = function(successCb, errorCb, serverUrl, useRemoteScript, addResult) {
            errorCb("testUpdateApplication not supported in Lg");
        };

        /**
         * Restart player application
         * @memberOf LgScreen
         */
        LgScreen.restartApplication = function(){
            window.open("file:///mnt/lg/appstore/scap/procentric/scap/application/app/index.html");
        };

        /**
         * Function to clear cache files from screen.
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.clearCache = function(success, error) {
            configuration.clearCache(success, error);
        };

        var getWebOSVersion = function() {
            // See https://webossignage.developer.lge.com/discover/specifications/platform-spec/web-engine/
            if(navigator.userAgent === "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 WebAppManager")
                return 6;
            if(navigator.userAgent === "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.34 Safari/537.36 WebAppManager")
                return 4;
            if(navigator.userAgent === "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.2.1 Chrome/38.0.2125.122 Safari/537.36 WebAppManager")
                return 3;
            if(navigator.userAgent === "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/538.2 (KHTML, like Gecko) Large Screen WebAppManager Safari/538.2")
                return 2
            return 4;
        };

        /**
         * Function to get WebOS version. Also gets the video rotation
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.getFirmwareVersion = function(success, params, error){
            params.version = getWebOSVersion();
            if(params.version === 2)
                this.getVideoRotation(success, params, error);
            else
                success(params);
        };

        /**
         * Function to get video rotation
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {Object} params for Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.getVideoRotation = function(success, params, error){
            video.getContentRotation(function(rotation){
                params.rotation = rotation.degree;
                success(params);
            }, error);
        };

        /**
         * Gets screen status ('platform','network', 'storage', 'memory', 'cpu').
         * @memberOf LgScreen
         * @param  {function} success Success function callback returning status object
         * @param  {function} error   Error function callback
         */
        LgScreen.getStatus = function(success, error) {
            var screenStatus = {};

            //Obtengo la plataforma
            deviceInfo.getPlatformInfo(function(platformData){
                screenStatus.platform = platformData.manufacturer;
                screenStatus.platform += " " + platformData.modelName;
                screenStatus.platform += " " + platformData.serialNumber;
                screenStatus.platform += " " + platformData.firmwareVersion;
                //Obtengo la ip
                deviceInfo.getNetworkInfo(function(deviceData){
                    //Obtengo la mac
                    deviceInfo.getNetworkMacInfo(function(macData){
                        if(deviceData.wired.state === "connected"){
                            screenStatus.networkIp = deviceData.wired.ipAddress;
                            screenStatus.networkMac = macData.wiredInfo.macAddress;
                        }else{
                            screenStatus.networkIp = deviceData.wifi.ipAddress;
                            screenStatus.networkMac = macData.wifiInfo.macAddress;
                        }
                        //Obtengo los datos de storage
                        storage.getStorageInfo(function(storageData){
                            screenStatus.storageTotal = storageData.total * 1000;
                            screenStatus.storageFree = storageData.free * 1000;
                            //Obtengo los datos de cpu y memoria
                            deviceInfo.getSystemUsageInfo(function(systemData){
                                screenStatus.memoryTotal = systemData.memory.total;
                                screenStatus.memoryFree = systemData.memory.free;
                                screenStatus.cpuTotal = 0;
                                screenStatus.cpuFree = 0;
                                systemData.cpus.map(function(cpu){
                                    screenStatus.cpuTotal += cpu.times.user;
                                    screenStatus.cpuTotal += cpu.times.nice;
                                    screenStatus.cpuTotal += cpu.times.sys;
                                    screenStatus.cpuTotal += cpu.times.irq;
                                    screenStatus.cpuTotal += cpu.times.idle;
                                    screenStatus.cpuFree += cpu.times.idle;
                                });
                                success(screenStatus);
                            }, error, {cpus : true, memory : true});
                        }, error);
                    }, error);
                }, error);
            }, error);
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
         * @memberOf LgScreen
         */
        LgScreen.setPIP = function(divId,opt,success,error,loadedCb){
            //The opt.source is parsed to match what's required by the LG's inputSource api
            var source = "ext://" + opt.source.toLowerCase();
            var num = parseInt(source.charAt(source.length - 1));

            if(!!num){
                source = source.substring(0, source.length - 1);
                source = source + ':' + num;
            }else{
                source = source + ':1';
            }

            if(!!document.getElementById(divId)){

                var videoTag = document.getElementById("pipVid:" + divId);
                switch(opt.state){

                    case "ON":

                            inputSource.initialize(function(){
                                 //inialize success callback
                                 if(!!success) success();
                             },function(){
                                 //initialize error callback
                                 if(!!error) error();
                             },{
                                 divId: divId,
                                 videoId: 'pipVid:' + divId,
                                 callback: function(){
                                     if(!!loadedCb) loadedCb();
                                 },
                                 src: source
                             }
                            );

                    break;
                    case "OFF":

                        if(!!videoTag){
                            videoTag.remove();
                        }

                        if(!!success) success();
                    break;
                }
            }
        };

        /**
         * Function to transform videos (in 58:9 screens only)
         * @memberOf LgScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.transformVideoElement = function(options, success, error) {
            var newOptions = {
                x : options.x/2,
                y : options.y/2,
                width : options.width/2,
                height : options.height/2
            };
            video.setVideoViewTransform(success, error, newOptions);
        };

        /**
         * Function to rotate videos
         * @memberOf LgScreen
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {Object} params for Success function callback
         */
        LgScreen.rotate = function (success, error, deg) {
            if(deg === undefined) deg = "90";
            if(deg === 0) deg = "off";
            if(typeof deg === "number") deg = deg.toString();
            video.setContentRotation(success, error, {degree:deg, aspectRatio:"full"});
        };

        /**
         * Function to transform rotated video
         * @memberOf LgScreen
         * @param  {Object} options New position and size of video
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgScreen.transformRotatedVideo = function(options, success, error){
            video.setRotatedVideoTransform(success, error, options);
        };

        LgScreen.getDeviceName = function (cb) { cb(); };

        return LgScreen;
    }
    //define globally if it doesn't already exist
    if(typeof(PlayerScreen) === 'undefined' && navigator.userAgent.search("Web0S") !== -1){
        window.PlayerScreen = define_lg_screen();
    }

    /* test-code    //*/

})(window);

(function(debPlayerWeb){
    if(navigator.userAgent.search("Web0S") !== -1){
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

                var lgFileGet = function(url) {
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
                            return lgFileGet(arguments[0]);
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
