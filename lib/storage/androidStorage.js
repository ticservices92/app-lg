(function(window){
    'use strict';

    var basePath;
    var androidFS;
    var cordovaFile;
    var fileTransfer;

    function define_android_storage(androidFS, fileTransfer){
        var AndroidStorage = {};

        document.addEventListener("deviceready", function() {

                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {

                    fileTransfer = new FileTransfer();
                    androidFS = fs;
                    cordovaFile = cordova.file;
                    basePath = androidFS.root.fullPath;

                    AndroidStorage.ready = true;

                }, function(){});

        }, false);

        /**
         * Android storage type name.
         * @type {string}
         * @memberOf AndroidStorage
         */
        AndroidStorage.type = "android";

        /**
         * Indicates whether the device has loaded or not
         * @type {Boolean}
         * @memberOf AndroidStorage
         */
        AndroidStorage.ready = false;

        /**
         * Saves a file from url in given path.
         * @memberOf AndroidStorage
         * @param  {string} url Remote url where file is located
         * @param  {string} path Storage path where file has to be saved
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidStorage.saveFile = function(url, path, success, error) {
            var j = path[0] === "/" ? 1 : 0;
            var uri = encodeURI(url);
            var absolutePath = androidFS.root.nativeURL + path.slice(j);

            //The directory where the file is going to be saved must exist
            // so I first create an empty file (to ensure it does exist).
            AndroidStorage.createFile("", path, function(){
                fileTransfer.download(uri, absolutePath,
                    function(fileEntry) {
                        success();
                    },
                    function(err) {
                        if(typeof(error) === "function" ) error("Error downloading file" + ((!!err.code)? ", error code: " + err.code : "" ));
                    },true,{}
                );
            },function(err){
                if(typeof(error) === "function" ) error("Cannot write file" + ((!!err.code)? ", error code: " + err.code : "" ));
            });

        };

        /**
         * Deletes a file from storage.
         * @memberOf AndroidStorage
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidStorage.deleteFile = function(path, success, error) {
            androidFS.root.getFile(path, {create: false, exclusive: false}, function(file){
                file.remove(function(){
                    success("File " + path + " deleted successfully");
                }, function(err){
                    if(typeof(error) === "function") error("Couldn't delete file" + ((!!err.code)? ", error code: " + err.code : "" ));
                });
            }, function(err){
                if(!!err && err.code === 1){
                    success("File " + path + " deleted successfully");
                }else{
                    if(typeof(error) === "function") error("Cannot find file" + ((!!err.code)? ", error code: " + err.code : "" ));
                }
            });

        };

        /**
         * Gets a list of files in a given directory.
         * @memberOf AndroidStorage
         * @param  {string} path Folder path
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidStorage.getFileList = function(path, success, error) {
            var j = path[0] === "/" ? 1 : 0;

            var absolutePath = basePath + path.substr(j);

            androidFS.root.getDirectory(absolutePath, {create: false, exclusive: false}, function(dir){
                dir.createReader().readEntries(function(entries){
                    var ans = [];

                    for (var i = 0; i < entries.length; i++) {
                        ans.push( entries[i].name );
                    }

                    success(ans);
                },function(err){
                    if(typeof(error) === "function") error("Failed to read entries" + ((!!err.code)? ", error code: " + err.code : "" ));
                });
            }, function(err){
                if(!!err && err.code === 1){
                    success([]);
                }else{
                    if(typeof(error) === "function") error("Failed to get directory" + ((!!err.code)? ", error code: " + err.code : "" ));
                }
            });

        };

        /**
         * Gets an url of a file in storage.
         * @memberOf AndroidStorage
         * @param  {string} path File path in local storage
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidStorage.getFileUrl = function(path, success, error) {
            var j = path[0] === "/" ? 1 : 0;
            var absolutePath = basePath + path.substr(j);

            androidFS.root.getFile( path, {create: false, exclusive: false}, function(file){
                success(file.toURL());
            }, function(err){
                if(typeof(error) === "function") error("Failed to get file " + path + ((!!err.code)? ", error code: " + err.code : "" ));
            });

        };

        AndroidStorage.revokeURL = function (_url) {
            // no-op
        };

        /**
         * Creates a file in local storage with given data.
         * @memberOf AndroidStorage
         * @param  {string} data Data to be saved in created file
         * @param  {string} path Storage path where file has to be created
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidStorage.createFile = function(data, path, success, error) {
            var pathLst = path.split("/");
            var i = pathLst[0] === "" ? 1 : 0;

            var absolutePath = basePath;
            var j = i;

            (function getDir(){
                androidFS.root.getDirectory( absolutePath,
                 {create:true, exclusive: false}, function(dir){

                    absolutePath += "/" + pathLst[j];

                    if( j >= pathLst.length - 1){

                        androidFS.root.getFile( absolutePath, {create:true, exclusive:false}, function(file){
                            writeFile(file, data, false, success, error);
                        },function(err){
                            if(typeof(error) === "function") error("Failed to get file"+ ((!!err.code)? ", error code: " + err.code : "" ));
                        });

                    }else{
                        j++;
                        getDir();
                    }

                 }, function(err){
                    if(typeof(error) === "function") error("Failed to get directory " + absolutePath + ((!!err.code)? ", error code: " + err.code : "" ));
                 });

            })();

        };

        /**
         * Appends given data to an already created file in local storage.
         * @memberOf AndroidStorage
         * @param  {string} data Data to be appended in file
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        AndroidStorage.appendFile = function(data, path, success, error) {
            var j = path[0] === "/" ? 1 : 0;
            var absolutePath = basePath + path.substr(j);

            androidFS.root.getFile( path, {create: false, exclusive: false}, function(file){
                writeFile(file, data + "\n", true, success, error);
            }, function(err){
                if(!!err && err.code === 1){
                    AndroidStorage.createFile(data, path, success, error);
                }
                if(typeof(error) === "function") error("Failed to get file " + path + ((!!err.code)? ", error code: " + err.code : "" ));
            });

        };

        /**
         * Deletes the contents of the specified folders
         * @param  {array} folders Names of the folders to clean up
         * @param  {function} success success callback
         * @param  {function} error   error callback
         * @memberOf AndroidStorage
         */
        AndroidStorage.cleanFolders = function(folders, success, error){
            function gotDir(dir){
                var pathDir = dir.fullPath;
                dir.removeRecursively(function(){
                    if(typeof(success) === "function") success();
                }, function(err){
                    if(typeof(error) === "function") error("Couldn't delete folder" + ((!!err.code)? ", error code: " + err.code : "" ));
                });
            }
            function errGetDir(err){
                if(typeof(error) === "function") error("Failed to get directory" + ((!!err.code)? ", error code: " + err.code : "" ));
            }
            for (var i = 0; i < folders.length; i++) {
                var j = folders[i][0] === "/" ? 1 : 0;
                var path = basePath + folders[i].substr(j);

                androidFS.root.getDirectory( path, {create:false, exclusive: false},gotDir,errGetDir);
            }

        };

        var writeFile = function(fileEntry, dataObj, append, success, error) {
            var i = 0;
            var wholeData = dataObj;
            var maximumBytes = 2 * 1024 * 1024;

            if( typeof(dataObj) === "string" ){
                wholeData = new Blob([dataObj], { type: 'text/plain' });
            }

            dataObj = wholeData.slice(i, i+maximumBytes);
            i += maximumBytes;

            fileEntry.createWriter(function (fileWriter) {

                fileWriter.onwriteend = function() {
                    if(i < wholeData.size){

                        dataObj = wholeData.slice(i, i+maximumBytes);
                        i += maximumBytes;
                        fileWriter.write(dataObj);
                    }else{
                        if(typeof(success) === "function") success();
                    }

                };

                fileWriter.onerror = function (e) {
                    if(typeof(error) === "function") error();
                };

                if (!!append) {
                    fileWriter.seek(fileWriter.length);
                }

                try{
                    fileWriter.write(dataObj);
                }catch(err){
                    error(err);
                }

            });

        };


        return AndroidStorage;
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_android_storage = define_android_storage;
    /* end-test-code
    <!-- /build -->
    //*/

    //define globally if it doesn't already exist
    if(typeof(PlayerStorage) === 'undefined' && navigator.userAgent.search("Android") !== -1){

        window.PlayerStorage = define_android_storage(androidFS, fileTransfer);
    }


})(window);
