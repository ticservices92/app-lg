(function(window){
    'use strict';
    function define_samsung_storage(){
        /**
         * @namespace SamsungStorage
         */
        var SamsungStorage = {};

        /**
         * Samsung SEF plugin.
         * @type {Object}
         * @protected
         * @memberOf SamsungStorage
         */
        var sefPlugin = document.createElement('object');
        sefPlugin.setAttribute('classid', 'clsid:SAMSUNG-INFOLINK-SEF');

        /**
         * Samsung File Download plugin.
         * @type {Object}
         * @protected
         * @memberOf SamsungStorage
         */
        var fileDownloadPlugin = document.createElement('object');
        fileDownloadPlugin.setAttribute('classid', 'clsid:SAMSUNG-INFOLINK-DOWNLOAD');

        /**
         * Samsung File System plugin.
         * @type {Object}
         * @protected
         * @memberOf SamsungStorage
         */
        var fileSystemPlugin = document.createElement('object');
        fileSystemPlugin.setAttribute('classid', 'clsid:SAMSUNG-INFOLINK-FILESYSTEM');

        $(document).ready(function() {
            document.body.appendChild(sefPlugin);
            document.body.appendChild(fileDownloadPlugin);
            document.body.appendChild(fileSystemPlugin);
        });

        var fileSystem = new FileSystem();

        var removeSpaces = function(file) {
            return file.replace(/\s/g, '_-_');
        };

        var addSpaces = function(file) {
            return file.replace(/_-_/g, ' ');
        };

        /**
         * Samsung storage type name.
         * @type {string}
         * @memberOf SamsungStorage
         */
        SamsungStorage.type = "samsung";

        /**
         * Indicates whether the device has loaded or not
         * @type {Boolean}
         * @memberOf SamsungStorage
         */
        SamsungStorage.ready = true;

        /**
         * Downloads a file from url and return file data.
         * @memberOf SamsungStorage
         * @param  {string} url Remote url where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungStorage.downloadFile = function(url, path, callback) {
            fileDownloadPlugin.OnComplete = callback;
            fileDownloadPlugin.StartDownFile(url, path);
        };

        /**
         * Saves a file from url in given path.
         * @memberOf SamsungStorage
         * @param  {string} url Remote url where file is located
         * @param  {string} path Storage path where file has to be saved
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungStorage.createDirectory = function(path) {
            var subDirs = path.split("/");

            if (!fileSystem.isValidCommonPath(curWidget.id)) {
                // create the common directory
                fileSystem.createCommonDir(curWidget.id);
            }

            var currentPath = curWidget.id;

            for (var i = 0; i < subDirs.length; i++) {
                var subDir = subDirs[i];
                currentPath += "/" + subDir;

                if (!fileSystem.isValidCommonPath(currentPath)) {
                    fileSystem.createCommonDir(currentPath);
                }
            }
        };

        /**
         * Deletes a file from storage.
         * @memberOf SamsungStorage
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungStorage.saveFile = function(url, path, success, error) {
            try {
                path = removeSpaces(path);
                var directory = path.substring(0, path.lastIndexOf('/'));

                SamsungStorage.createDirectory(directory);

                //Bajo el archivo
                SamsungStorage.downloadFile(url, "/mtd_down/common/" + curWidget.id + path, function(msg) {
                    var arr = msg.split("?");

                    if(arr[0] == 1000) {
                        if(arr[1] == 1) {
                            if(success) success();
                        } else {
                            if(error) error("Failed while downloading file "+ url);
                        }
                    }
                });
            } catch(e) {
                addDebugInfo("Download last error", path);
                if(error) error("Cannot save file "+ url + " " + e);
            }
        };

        /**
         * Deletes a file from storage.
         * @memberOf SamsungStorage
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungStorage.deleteFile = function(path, success, error){
            try {
                path = removeSpaces(path);
                fileSystemPlugin.Delete("/mtd_down/common/" + curWidget.id + path);

                if(success) success();
            } catch(e) {
                if(error) error("Cannot delete file "+ path + " " + e);
            }
        };

        /**
         * Gets a list of files in a given directory.
         * @memberOf SamsungStorage
         * @param  {string} path Folder path
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungStorage.getFileList = function(path, success, error) {
            try {
                path = removeSpaces(path);
                var files = [];
                var directory = path.substring(0, path.lastIndexOf('/'));

                SamsungStorage.createDirectory(directory);

                sefPlugin.Open('FileSystem', '1.000', 'FileSystem');
                sefPlugin.Execute('SetWidgetInfo', 2, "/mtd_down/common/" + curWidget.id);
                var fileSystemDataArr = sefPlugin.Execute('GetListFiles', "/mtd_down/common/" + curWidget.id + path);
                sefPlugin.Close();

                $(JSON.parse(fileSystemDataArr)).each(function(index, fileSystemEntry) {
                    if (fileSystemEntry !== 0 && fileSystemEntry.indexOf(".") !== -1) {
                        files.push(addSpaces(fileSystemEntry));
                    }
                });

                if (success) success(files);
            } catch(e) {
                if (error) error("Cannot retrieve file list at "+ path + " " + e);
            }
        };

        /**
         * Gets an url of a file in storage.
         * @memberOf SamsungStorage
         * @param  {string} path File path in local storage
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungStorage.getFileUrl = function(path, success, error) {
            try {
                path = removeSpaces(path);

                var isValid = false;
                var directory = path.substring(0, path.lastIndexOf('/'));
                var fileName = path.substring(path.lastIndexOf('/')+1, path.length);

                SamsungStorage.createDirectory(directory);

                sefPlugin.Open('FileSystem', '1.000', 'FileSystem');
                sefPlugin.Execute('SetWidgetInfo', 2, "/mtd_down/common/" + curWidget.id);
                var fileSystemDataArr = sefPlugin.Execute('GetListFiles', "/mtd_down/common/" + curWidget.id + directory);
                sefPlugin.Close();

                $(JSON.parse(fileSystemDataArr)).each(function(index, fileSystemEntry) {
                    if (fileSystemEntry == fileName) {
                        isValid = true;
                        if (success) success("file:///mtd_down/common/" + curWidget.id + path);
                    }
                });

                if (!isValid && error) error("File not found");
            } catch(e) {
                if (error) error("Cannot get URL of "+ path +" "+ e);
            }
        };

        SamsungStorage.revokeURL = function (_url) {
            // no-op
        };

        /**
         * Creates a file in local storage with given data.
         * @memberOf SamsungStorage
         * @param  {string} data Data to be saved in created file
         * @param  {string} path Storage path where file has to be created
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungStorage.createFile = function(data, path, success, error) {
            try {
                path = removeSpaces(path);
                var directory = path.substring(0, path.lastIndexOf('/'));

                SamsungStorage.createDirectory(directory);

                var fileObj = fileSystem.openCommonFile(curWidget.id + path, 'w');

                fileObj.writeAll(data);
                fileSystem.closeCommonFile(fileObj);

                if (success) success();
            } catch(e) {
                if (error) error("Cannot create file "+ path + " " + e);
            }
        };

        /**
         * Appends given data to an already created file in local storage.
         * @memberOf SamsungStorage
         * @param  {string} data Data to be appended in file
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        SamsungStorage.appendFile = function(data, path, success, error) {
            try {
                path = removeSpaces(path);
                var directory = path.substring(0, path.lastIndexOf('/'));

                SamsungStorage.createDirectory(directory);

                var fileObj = fileSystem.openCommonFile(curWidget.id + path, 'w');

                fileObj.writeLine(data);
                fileSystem.closeCommonFile(fileObj);

                if (success) success();
            } catch(e) {
                if (error) error("Couldn't write file "+ path + " " + e);
            }
        };

        /**
         * Deletes the specified folders
         * @param  {array} folders Names of the folders to delete
         * @param  {function} success Success callback
         * @param  {function} error   Error callback
         * @memberOf SamsungStorage
         */
        SamsungStorage.cleanFolders = function(folders, success, error){
            var errorLog = "";
            for (var i = 0; i < folders.length; i++) {
                try {
                    var directory = "/mtd_down/common/" + curWidget.id + folders[i];
                    fileSystemPlugin.Delete(directory);

                } catch(e) {
                    if(errorLog !== "") errorLog += "\n";
                    errorLog += "Couldn't delete folder "+ folders[i] + e;
                }
            }
            if(errorLog !== ""){
                if(!!error) error(errorLog);
            } else {
                if(!!success) success();
            }
        };

        return SamsungStorage;
    }

    //define globally if it doesn't already exist
    if(typeof(PlayerStorage) === 'undefined' && navigator.userAgent.search("SMART-TV") !== -1){
        window.PlayerStorage = define_samsung_storage();
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_samsung_storage = define_samsung_storage;
    /* end-test-code
    <!-- /build -->
    //*/

})(window);
