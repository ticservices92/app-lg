(function(window){
    'use strict';
    function define_fileSystemApi_storage(dbName){
        /**
         * @namespace FileSystemApiStorage
         */
        var FileSystemApiStorage = {};

        if(!dbName) dbName = 'totem';
        var db;
        var updating = false;

        var openDb = function (success, error) {
            // Specify desired capacity in bytes
            var desiredCapacity = 500 * 1024 * 1024; // 500 MB

            var storage = new LargeLocalStorage({size: desiredCapacity, name: dbName});

            storage.initialized.then(function() {
                // Check to see how much space the user authorized us to actually use.
                // Some browsers don't indicate how much space was granted in which case
                // grantedCapacity will be 1.
                if (storage.getCapacity() <= 0) {
                    if(error) error("Can't open db");
                } else {
                    db = storage;
                    if(success) success(storage);
                    FileSystemApiStorage.ready = true;
                }
            });

        };

        /**
         * Chrome storage type name.
         * @type {string}
         * @memberOf FileSystemApiStorage
         */
        FileSystemApiStorage.type = "fileSystemApi";

        /**
         * Indicates whether the device has loaded or not
         * @type {Boolean}
         * @memberOf FileSystemApiStorage
         */
        FileSystemApiStorage.ready = false;

        /**
         * Downloads a file from url and return file data.
         * @memberOf FileSystemApiStorage
         * @param  {string} url Remote url where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        FileSystemApiStorage.downloadFile = function(url, success, error) {
            var xhr = new XMLHttpRequest();

            xhr.open("GET", url, true);
            xhr.responseType = "blob";
            xhr.addEventListener("load", function () {
                if (xhr.status === 200) {
                    var data = xhr.response;
                    success(data);
                } else {
                    error(xhr.response, xhr.status);
                }
            }, false);
            xhr.send();
        };

        /**
         * Saves a file from url in given path.
         * @memberOf FileSystemApiStorage
         * @param  {string} url Remote url where file is located
         * @param  {string} path Storage path where file has to be saved
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        FileSystemApiStorage.saveFile = function(url, path, success, error) {

            var onDbOpened = function () {
                var dirName = path.split('/')[1];
                var file = path.split('/')[2];

                var onError = function (msg1,msg2){
                    var err2 = "";
                    if(!!msg2) err2 = "Error: " + msg2;
                    error("An error ocurred when trying to download the file "+ url + " " + err2);
                };

                FileSystemApiStorage.downloadFile(url, function (f) {
                    db.setAttachment(dirName, file, f).then(success).catch(onError);
                }, onError);
            };

            if(db === undefined) {
                openDb(onDbOpened, error);
            } else {
                onDbOpened();
            }
        };

        /**
         * Deletes a file from storage.
         * @memberOf FileSystemApiStorage
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        FileSystemApiStorage.deleteFile = function(path, success, error) {

            var onDbOpened = function () {
                var dirName = path.split('/')[1];
                var file = path.split('/')[2];

                var onError = function (err){
                    var err2 = "";
                    if(err && err.name) err2 = "Error: " + err.name;
                    error("Failed to delete the file "+ path + " " + err2);
                };

                db.rmAttachment(dirName, file).then(success).catch(onError);
            };

            if(db === undefined) {
                openDb(onDbOpened, error);
            } else {
                onDbOpened();
            }

        };

        /**
         * Gets a list of files in a given directory.
         * @memberOf FileSystemApiStorage
         * @param  {string} path Folder path
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        FileSystemApiStorage.getFileList = function(path, success, error) {

            var onDbOpened = function () {
                var dirName = path.split('/')[1];

                var onError = function (err){
                    var err2 = "";
                    if(err) err2 = "Error: " + err;
                    error("Failed to delete the file "+ path + " " + err2);
                };

                db.getAllAttachments(dirName).then(function (attatchments) {
                    var res = [];
                    attatchments.forEach(function (i) {
                        res.push(i.attachKey);
                    });
                    success(res);
                }).catch(onError);
            };

            if(db === undefined) {
                openDb(onDbOpened, error);
            } else {
                onDbOpened();
            }

        };

        /**
         * Gets an url of a file in storage.
         * @memberOf FileSystemApiStorage
         * @param  {string} path File path in local storage
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        FileSystemApiStorage.getFileUrl = function(path, success, error) {

            var onDbOpened = function () {
                var dirName = path.split('/')[1];
                var file = path.split('/')[2];

                var onError = function (err){
                    var err2 = "";
                    if(err && err.name) err2 = "Error: " + err.name;
                    error("Cannot get url for "+ path + " " + err2);
                };

                db.ls(dirName).then(function (contents) {
                    if(contents.indexOf(file) !== -1)
                        db.getAttachmentURL(dirName, file).then(success).catch(onError);
                    else
                        onError({name: "NotFoundError"});
                }).catch(onError);
            };

            if(db === undefined) {
                openDb(onDbOpened, error);
            } else {
                onDbOpened();
            }
        };

        FileSystemApiStorage.revokeURL = function (_url) {
            // no-op
        };

        /**
         * Creates a file in local storage with given data.
         * @memberOf FileSystemApiStorage
         * @param  {string} data Data to be saved in created file
         * @param  {string} path Storage path where file has to be created
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        FileSystemApiStorage.createFile = function(data, path, success, error) {

            var onDbOpened =function () {
                var dirName = path.split('/')[1];
                var file = path.split('/')[2];

                var onError = function (err){
                    var err2 = "";
                    if(err && err.name) err2 = "Error: " + err.name;
                    error("Cannot create "+ path + " " + err2);
                };
                db.setAttachment(dirName, file, data).then(success).catch(onError);

            };

            if(db === undefined) {
                openDb(onDbOpened, error);
            } else {
                onDbOpened();
            }
        };

        /**
         * Appends given data to an already created file in local storage.
         * @memberOf FileSystemApiStorage
         * @param  {string} data Data to be appended in file
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        FileSystemApiStorage.appendFile = function(data, path, success, error) {

            var onDbOpened = function () {
                var dirName = path.split('/')[1];
                var file = path.split('/')[2];

                var onError = function (err){
                    var err2 = "";
                    if(err && err.name) err2 = "Error: " + err.name;
                    error("Cannot create "+ path + " " + err2);
                };
                db.getAttachment(dirName, file).then(function (f) {
                    var reader = new FileReader();
                    reader.readAsText(f);
                    reader.onloadend = function (ev) {
                        var text = reader.result + data + '\n';

                        db.setAttachment(dirName, file, text).then(success).catch(onError);
                    };

                }).catch(onError);

            };

            if(db === undefined) {
                openDb(onDbOpened, error);
            } else {
                onDbOpened();
            }

        };

        /**
         * Deletes the contents of the specified folders
         * @param  {array} folders Names of the folders to clean up
         * @param  {function} success success callback
         * @param  {function} error   error callback
         * @memberOf FileSystemApiStorage
         */
        FileSystemApiStorage.cleanFolders = function(folders, success, error){

            var i = 0;
            var errorLog = "";

            var onDbOpened = function () {

                var onError = function (err, dirName){
                    if(errorLog === "") errorLog = "Failed to delete folders:\n";
                    errorLog += dirName + " " + (err.name || "") +"\n";

                    i++;
                    if(i === folders.length)
                        error(errorLog);
                };
                folders.forEach(function(dirName){
                    if (dirName[0] === "/") {
                        dirName = dirName.slice(1);
                    }
                    db.rm(dirName, true).then(function () {
                        i++;
                       if(i === folders.length){
                           if(errorLog === "")
                               success();
                           else
                               error(errorLog);
                       }
                    }).catch(function (err) {
                        onError(err, dirName);
                    });
                });

            };

            if(db === undefined) {
                openDb(onDbOpened, error);
            } else {
                onDbOpened();
            }
        };

        openDb();

        return FileSystemApiStorage;
    }
    //define globally if it doesn't already exist
    if(typeof(PlayerStorage) === 'undefined' && (navigator.userAgent.search("Chrome") !== -1 || navigator.userAgent.indexOf('OPR/') !== -1)){
        window.PlayerStorage = define_fileSystemApi_storage();
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_fileSystemApi_storage = define_fileSystemApi_storage.bind(null, 'totemTest');
    /* end-test-code
    <!-- /build -->
    //*/

})(window);
