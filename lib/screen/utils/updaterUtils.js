var updaterPlugin = require("node-webkit-updater");
var os = require("os");
var path = require("path");
var childProcess = require("child_process");

function buildPackages(serverUrl) {
    return {
        linux64: { url: serverUrl + "/v2/api/player/download/.zip?screenId=1&build=webkitlinux" },
        linux32: { url: serverUrl + "/v2/api/player/download/.zip?screenId=1&build=webkitlinux" },
        win:     { url: serverUrl + "/v2/api/player/download/.zip?screenId=1&build=webkitwindows" }
    };
}

function logDownloadError(error) {
    var msg = "Updater TEST: descarga fallida";
    if (error.type)       msg += " (" + error.type + ")";
    if (error.statusCode) msg += " — statusCode: " + error.statusCode;
    if (error.message)    msg += " — mensaje: " + error.message;

    console.error(msg);

    if (error.details) {
        try { console.error("Detalles:", JSON.stringify(error.details)); }
        catch (e) { console.error("Detalles no serializables.", e); }
    }
}

function buildUpdateCommand(updater, appPath, file) {
    var command = updater.getAppPath() + "/resources/scripts/updater.sh --test /tmp";
    if (os.platform() === "linux") {
        return {
            comm: command,
            pwd: "/tmp"
        };
    }

    var exePath = appPath.replace(".exe", "");

    var commandWin = 'start "debPlayerWeb app update" call "' +
        updater.getAppPath() + '\\resources\\scripts\\updater.bat" --test "' +
        updater.options.temporaryDirectory + '"';

    return {
        comm: commandWin,
        pwd: updater.options.temporaryDirectory
    };
}

function execUpdateScript(command, successCb) {
    console.debug("Updater TEST: Ejecutando script:", command.comm);

    childProcess.exec(command.comm, { cwd: command.pwd, windowsHide: false }, function (err, stdout, stderr) {
        if (err) console.error("Updater TEST: exec error:", err);
        if (stdout) console.debug("Updater TEST: exec stdout:", stdout);
        if (stderr) console.log("Updater TEST: exec stderr:", stderr);

        if (typeof successCb === "function")
            successCb("Test update OK (download + unpack + script)");
    });
}

function copyRemoteScripts(updater, appPath, callback) {
    console.debug("Updater TEST: Using remote script");

    var cp = os.platform().indexOf("win") >= 0 ? "copy /Y" : "\\cp -f";

    var updaterShSrc  = path.join(appPath, "resources", "scripts", "updater.sh");
    var updaterBatSrc = path.join(appPath, "resources", "scripts", "updater.bat");

    var updaterShDest  = path.join(updater.getAppPath(), "resources", "scripts", "updater.sh");
    var updaterBatDest = path.join(updater.getAppPath(), "resources", "scripts", "updater.bat");

    var command = [
        cp + ' "' + updaterShSrc + '" "' + updaterShDest + '"',
        cp + ' "' + updaterBatSrc + '" "' + updaterBatDest + '"'
    ].join(' && ');

    console.debug("Updater TEST: Remote script copy command:", command);

    childProcess.exec(command, function (error, stdout, stderr) {
        if (error) console.error("Updater TEST: copy script error:", error);
        if (stdout) console.debug("Updater TEST: copy stdout:", stdout);
        if (stderr) console.debug("Updater TEST: copy stderr:", stderr);
        callback();
    });
}

module.exports = {
    updaterPlugin: updaterPlugin,
    buildPackages: buildPackages,
    logDownloadError: logDownloadError,
    buildUpdateCommand: buildUpdateCommand,
    execUpdateScript: execUpdateScript,
    copyRemoteScripts: copyRemoteScripts
};