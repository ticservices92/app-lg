/**
 * @namespace debPlayerWeb
 */
var debPlayerWeb = angular.module('debPlayerWeb', ['patternParser', 'tmh.dynamicLocale']);

var playerBasePath = "/debsign/assets/debPlayerWeb/";
/* test-code
<!-- build:remove:web,webDebug -->
*/
playerBasePath = "/";
/* end-test-code
<!-- /build -->
 */


debPlayerWeb.config( ['$compileProvider', function( $compileProvider ) {
    $compileProvider.debugInfoEnabled(false);
}]);

debPlayerWeb.constant('basePath', (function () {
    // Si el protocolo es 'file' devuelvo ruta relativa
    if(location.protocol === "file:") return "";
    // Si el protocolo es 'chrome-extension' o 'http/s' devuelvo ruta absoluta
    else return playerBasePath;
})());

window.onerror = function (msg, file, line, col, err) {
    console.error("Uncaught exception: " + msg + ". " + file + " " + line + ":" + col, err);
};

debPlayerWeb.config(["tmhDynamicLocaleProvider", function(tmhDynamicLocaleProvider) {
    tmhDynamicLocaleProvider.localeLocationPattern('lib/angular/locale/angular-locale_{{locale}}.js');
  }]);

debPlayerWeb.run(["tmhDynamicLocale", function(tmhDynamicLocale) {
    var available_langs = ["es-ar", "pt", "en", "fr"];
    var DEFAULT_LANG = "es-ar";
    var navLang = window.navigator.language || DEFAULT_LANG;
    var matchLang = null

    for (var i = 0; i < available_langs.length; i++) {
        var lang = available_langs[i];
        if (lang.slice(0, 2).toLowerCase() === navLang.slice(0, 2).toLowerCase()) {
            matchLang = lang;
            break;
        }
    }

    matchLang = matchLang || DEFAULT_LANG;
    tmhDynamicLocale.set(matchLang);
}]);
