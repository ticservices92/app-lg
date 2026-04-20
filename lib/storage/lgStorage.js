(function(window){
    'use strict';
    function define_lg_storage(){
        /**
         * @namespace LgStorage
         */
        var LgStorage = {};

        var storage = new Storage();

        /**
         * Function to be iterated when a large file is created.
         * @memberOf LgStorage
         * @protected
         * @param  {string[]} chunks Data to be appended in file
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {boolean} isCreated   If true data is appended. If false file is created with given data.
         */
        var createLargeFile = function(chunks, path, success, error, isCreated) {
            function errorCb(msg){
                if (!!error) {
                    msg = msg && !!msg.errorText ? msg.errorText : "";
                    error("Failed to create large file at "+ path + " " + msg);
                }
            }
            // Si el array tiene tamaño distinto de 0 es porque existen archivos por guardar
            if(chunks.length !== 0){
                var chunk = chunks.pop();
                LgStorage.createFile(chunk, path, function() {
                    // Descargo el siguiente archivo
                    createLargeFile(chunks, path, success, errorCb, true);
                }, errorCb, isCreated);
            }
            // Si el array esta vacio emito el success
            else{
                success();
            }
        };

        var removeSpaces = function(file) {
            return file.replace(/\s/g, '_-_');
        };

        var addSpaces = function(file) {
            return file.replace(/_-_/g, ' ');
        };

        /**
         * Lg storage type name.
         * @type {string}
         * @memberOf LgStorage
         */
        LgStorage.type = "lg";

        /**
         * Indicates whether the device has loaded or not
         * @type {Boolean}
         * @memberOf LgStorage
         */
        LgStorage.ready = true;

        /**
         * Downloads a file from url and return file data.
         * @memberOf LgStorage
         * @param  {string} url Remote url where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgStorage.downloadFile = function(url, success, error) {
            // For LG TVs, we'll use a temporary file approach since direct blob download isn't supported
            var tempPath = '/temp/download_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            LgStorage.saveFile(url, tempPath, function() {
                // File saved successfully, now we need to return it as data
                // Since LG doesn't support blob responses like Chrome, we return the file path
                if (success) success(tempPath);
            }, function(message) {
                if (error) error(message);
            });
        };

        LgStorage.createDirectory = function(path) {
            var options = {
                'path' : 'file://internal' + removeSpaces(path)
            };

            storage.mkdir(function(){}, function(){}, options);
        };

        var getWebOSVersion = function() {
            // See https://webossignage.developer.lge.com/discover/specifications/platform-spec/web-engine/
            if(navigator.userAgent === "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.34 Safari/537.36 WebAppManager"){
                return 4;
            }
            if(navigator.userAgent === "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.2.1 Chrome/38.0.2125.122 Safari/537.36 WebAppManager"){
                return 3;
            }
            return 2;
        };

        /**
         * Saves a file from url in given path.
         * @memberOf LgStorage
         * @param  {string} url Remote url where file is located
         * @param  {string} path Storage path where file has to be saved
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgStorage.saveFile = function(url, path, success, error) {
            var directory = path.substring(0, path.lastIndexOf('/'));

            LgStorage.createDirectory(directory);

            var options = {
                'source' : url,
                'destination' : 'file://internal' + removeSpaces(path),
                'action': 'start'
            };

            function successCb(msg){
                if (!!success) success(msg);
            }

            function errorCb(msg){
                if (typeof addDebugInfo === 'function') {
                    addDebugInfo("Download last error", path);
                }
                if (!!error) {
                    msg = msg && !!msg.errorText ? msg.errorText : "";
                    error("Cannot save file " + url + " at "+ path + " " + msg);
                }
            }

            var downloadFn;
            if(getWebOSVersion() === 2)
                downloadFn = storage.copyFile.bind(storage);
            else
                downloadFn = storage.downloadFile.bind(storage);

            downloadFn(function(){
                storage.fsync(successCb, errorCb, {});
            }, errorCb, options);
        };

        /**
         * Deletes a file from storage.
         * @memberOf LgStorage
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgStorage.deleteFile = function(path, success, error){
            var options = {
                'file' : 'file://internal' + removeSpaces(path),
                'path' : 'file://internal' + removeSpaces(path)
            };
            function successCb(msg){
                if (!!success) success(msg);
            }
            function errorRemoving(msg){
                if (!!error) {
                    msg = msg && !!msg.errorText ? msg.errorText : "";
                    error("Couldn't delete file "+ path + " " + msg);
                }
            }
            function errorExists(msg){
                if (!!error) {
                    msg = msg && !!msg.errorText ? msg.errorText : "";
                    error("Couldn't find file "+ path + " " + msg);
                }
            }
            storage.exists(function(cbObject){
                var exists = cbObject.exists;
                if (exists) {
                    storage.removeFile(successCb, errorRemoving, options);
                } else if(success) {
                    success();
                }
            }, errorExists, options);
        };

        /**
         * Gets a list of files in a given directory.
         * @memberOf LgStorage
         * @param  {string} path Folder path
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgStorage.getFileList = function(path, success, error) {
            var directory = path.substring(0, path.lastIndexOf('/'));

            LgStorage.createDirectory(directory);

            var files = [];
            var listOption = {
                'path': 'file://internal' + removeSpaces(path)
            };
            function errorCb(msg){
                if (!!error) {
                    msg = msg && !!msg.errorText ? msg.errorText : "";
                    error("Cannot retrieve file list at "+ path + " " + msg);
                }
            }
            storage.listFiles(function(cbObject) {
                $(cbObject.files).each(function(index, fileEntry) {
                    files.push(addSpaces(fileEntry.name));
                });

                if (success) {
                    success(files);
                }
            }, errorCb, listOption);
        };

        /**
         * Gets an url of a file in storage.
         * @memberOf LgStorage
         * @param  {string} path File path in local storage
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgStorage.getFileUrl = function(path, success, error) {
            var options = {
                'path': 'file://internal' + removeSpaces(path)
            };
            function errorExists(msg){
                if (!!error) {
                    msg = msg && !!msg.errorText ? msg.errorText : "";
                    console.error("Media not found in local storage: "+path+" | If not expired, will download",msg);
                    error("Media not found in local storage: "+ path +" | If not expired, will download");
                }
            }
            storage.exists(function(cbObject){
                var exists = cbObject.exists;
                if (exists && success) {
                    success("content" + removeSpaces(path));
                } else if(error) {
                    console.error("Media not found in local storage: "+path+" | If not expired, will download");
                    error("Media not found in local storage: "+ path +" | If not expired, will download");
                }
            }, errorExists, options);
        };

        LgStorage.revokeURL = function (_url) {
            // no-op
        };

        /**
         * Creates a file in local storage with given data.
         * @memberOf LgStorage
         * @param  {string} data Data to be saved in created file
         * @param  {string} path Storage path where file has to be created
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         * @param  {boolean} isCreated If true data is appended. If false file is created with given data
         */
        LgStorage.createFile = function(textData, path, success, error, isCreated) {
            var directory = path.substring(0, path.lastIndexOf('/'));

            LgStorage.createDirectory(directory);
            function successCb(msg){
                if (!!success) success(msg);
            }
            function errorCb(msg){
                if (!!error) {
                    msg = msg && !!msg.errorText ? msg.errorText : "";
                    error("cannot write file "+ path + " " + msg);
                }
            }
            if(textData.length <= 10240) {
                var options = {
                    data: textData,
                    path: 'file://internal' + removeSpaces(path),
                    position : 0,
                    mode :'append',
                    offset: 0,
                    length : textData.length,
                    encoding: 'utf8'
                };

                if(!isCreated) {
                    options.mode = 'truncate';
                }
                
                storage.writeFile(successCb, errorCb, options);
            } else {
                createLargeFile(textData.match(new RegExp('.{1,10240}', 'g')).reverse(), path, success, errorCb, false);
            }
        };

        /**
         * Appends given data to an already created file in local storage.
         * @memberOf LgStorage
         * @param  {string} data Data to be appended in file
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LgStorage.appendFile = function(textData, path, success, error) {
            var directory = path.substring(0, path.lastIndexOf('/'));

            LgStorage.createDirectory(directory);
            function successCb(msg){
                if (!!success) success(msg);
            }
            function errorCb(msg){
                if (!!error) {
                    msg = msg && !!msg.errorText ? msg.errorText : "";
                    error("Failed to write into file "+ path + " " + msg);
                }
            }
            var options = {
                data: textData + "\n",
                path: 'file://internal' + removeSpaces(path),
                position : 0,
                mode :'append',
                offset: 0,
                length : textData.length + 1,
                encoding: 'utf8'
            };
            
            storage.writeFile(successCb, errorCb, options);
        };

        /**
         * Deletes the specified folders
         * @param  {array} folders Names of the folders to delete
         * @param  {function} success success callback
         * @param  {function} error   error callback
         * @memberOf LgStorage
         */
        LgStorage.cleanFolders = function(folders, success, error){
            var errorMsg = "";
            var completedFolders = 0;
            var totalFolders = folders.length;

            if (totalFolders === 0) {
                if (!!success) success();
                return;
            }

            function checkCompletion() {
                completedFolders++;
                if (completedFolders >= totalFolders) {
                    if(errorMsg !== ""){
                        if(!!error) error(errorMsg);
                    } else {
                        if(!!success) success();
                    }
                }
            }

            function errorCb(msg, folderName){
                if(errorMsg !== "") errorMsg += "\n";
                msg = msg && !!msg.errorText ? msg.errorText : "";
                errorMsg += "Failed to delete contents of folder "+ folderName + " " + msg;
                checkCompletion();
            }

            for(var i = 0; i < folders.length; i++){
                var folderName = folders[i];
                var options = {
                    folder: folderName,
                    file: "file://internal" + removeSpaces(folderName),
                    recursive: true
                };

                storage.removeFile(function(){
                    checkCompletion();
                }, function(msg) {
                    errorCb(msg, folderName);
                }, options);
            }
        };
        return LgStorage;
    }

    //define globally if it doesn't already exist
    if(typeof(PlayerStorage) === 'undefined' && navigator.userAgent.search("Web0S") !== -1){
        window.PlayerStorage = define_lg_storage();
    }

    /* test-code    //*/

})(window);
