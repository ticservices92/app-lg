(function () {

    var scapVersion = "1.7";

    var error = function () {
        console.error("problemita", arguments);
    };

    var loadScript = function (url) {
        $.ajax({
            type: "GET",
            url: url,
            dataType: "script",
            async: false,
            error: error
        });
    };

    if(navigator.userAgent === "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 WebAppManager") {
        // webOS 6.x
        scapVersion = "1.8.1"
    } else if(navigator.userAgent === "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.34 Safari/537.36 WebAppManager"){
        // webOS 4.x
        scapVersion = "1.7";
    } else if(navigator.userAgent === "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.2.1 Chrome/38.0.2125.122 Safari/537.36 WebAppManager"){
        // webOS 3.x
        scapVersion = "1.5";
    } else if(navigator.userAgent === "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/538.2 (KHTML, like Gecko) Large Screen WebAppManager Safari/538.2"){
        // webOS 2.x
        scapVersion = "1.3";
    }

    loadScript("lib/lg/js/cordova-cd/" + scapVersion + "/signage.js");
    loadScript("lib/lg/js/cordova-cd/" + scapVersion + "/storage.js");
    loadScript("lib/lg/js/cordova-cd/" + scapVersion + "/configuration.js");
    loadScript("lib/lg/js/cordova-cd/" + scapVersion + "/deviceInfo.js");
    loadScript("lib/lg/js/cordova-cd/" + scapVersion + "/inputSource.js");
    loadScript("lib/lg/js/cordova-cd/" + scapVersion + "/power.js");
    loadScript("lib/lg/js/cordova-cd/" + scapVersion + "/sound.js");
    loadScript("lib/lg/js/cordova-cd/" + scapVersion + "/video.js");
    loadScript("lib/screen/lgScreen.js");
    loadScript("lib/storage/lgStorage.js");

})();
