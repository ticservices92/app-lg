(function (window) {
    'use strict';

    function define_tizen_storage() {
        /**
         * @namespace tizenStorage
         * @see https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/filesystem-api.html
         */
        var tizenStorage = {};

        var db;

        /**
         * tizen storage type name.
         * @type {string}
         * @memberOf tizenStorage
         */
        tizenStorage.type = "tizen";

        /**
         * Indicates whether the device has loaded or not
         * @type {Boolean}
         * @memberOf tizenStorage
         */
        tizenStorage.ready = false;

        var checkStorageTry = 1;
        var oldFileFound = false;

        /**
         * tizen storage folder name.
         * @type {string}
         * @memberOf tizenStorage
         * @see https://docs.tizen.org/application/web/guides/data/file-system/#:~:text=Filesystem%20virtual%20roots-,Virtual%20root,-Description
         * @protected
         */
        tizenStorage.folder = "downloads";

        var localConfigFilePath = '/config/config.json';
        var localConfigFolderPath = '/config';


        tizen.filesystem.createDirectory(tizenStorage.folder + localConfigFolderPath);

        /**
         * From a file path removes the file name and returns folder path.
         * @memberOf tizenStorage
         * @param  {string} pathAndFile Complete route with folders and file name
         * @protected
         */
        var removeFilenameFromPath = function (pathAndFile) {
            var path = pathAndFile;
            if (pathAndFile.indexOf(".") > -1) {
                path = pathAndFile.substring(0, pathAndFile.lastIndexOf("/"));
            }
            return path;
        }

        /**
         * Creates a folder if it does not exists.
         * @memberOf tizenStorage
         * @param  {string} tizenPath valid tizen path.
         * @protected
         */
        var createFolderIfNotExists = function (tizenPath) {
            var successCallback = function () {
                console.debug("[createFolderIfNotExists] success:" + tizenPath);
            }
            var errorCallback = function () {
                console.error("[createFolderIfNotExists] error:" + tizenPath);
            }
            var folderPath = removeFilenameFromPath(tizenPath);
            if (!tizen.filesystem.pathExists(folderPath)) {
                tizen.filesystem.createDirectory(folderPath, true, successCallback, errorCallback);
            }
        }

        /**
         * Return the path managed by the player for the one managed by samsung.
         * Samsung only allows a few root folders.
         * @memberOf tizenStorage
         * @protected
         * @param  {string} path Complete path with name or only name of file
         * @protected
         */
        var getValidTizenPath = function (path) {
            if (!path.startsWith(tizenStorage.folder)) {
                if (path.startsWith("/")) {
                    path = tizenStorage.folder + path;
                } else {
                    path = tizenStorage.folder + "/" + path;
                }
            }
            createFolderIfNotExists(path);
            return path;
        }

        /**
         * Downloads a file from url and return file data.
         * @memberOf tizenStorage
         * @param  {string} url Remote url where file is located
         * @param  {function} success   Success function callback
         * @param  {function} error   Error function callback
         */
        tizenStorage.downloadFile = function (url, success, error) {
            tizenStorage.downloadFileTizen(url, success, error, "", "");
        };

        /**
         * Downloads a file from url and return file data.
         * @memberOf tizenStorage
         * @param  {string} url Remote url where file is located
         * @param  {function} success   Success function callback
         * @param  {function} error   Error function callback
         * @param  {string} folder Local path of file
         * @param  {string} fileName   Name of file
         * @protected
         */
        tizenStorage.downloadFileTizen = function (url, success, error, folder, fileName) {
            var downloadRequest;
            var listener = {
                oncompleted: function (id, path) {
                    console.debug("[downloadFile] completed: " + fileName + " | id:" + id + "|path:" + path);
                    if (success) success();
                },
                onfailed: function (id, errorMsg) {
                    if (error) {
                        error(errorMsg);
                    } else {
                        console.error("[downloadFile] Failed with file: " + fileName + ", error name: " + errorMsg.name);
                    }
                }
            };

            if (folder && fileName) {
                downloadRequest = new tizen.DownloadRequest(url, getValidTizenPath(folder), fileName);
            } else {
                downloadRequest = new tizen.DownloadRequest(url);
            }
            tizen.download.start(downloadRequest, listener);
        };

        /**
         * Saves a file from url in given path.
         * @memberOf tizenStorage
         * @param  {string} url Remote url where file is located
         * @param  {string} path Storage path where file has to be saved
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        tizenStorage.saveFile = function (url, path, success, error) {
            var pathLst = path.split("/");
            tizenStorage.downloadFileTizen(url, function () {
                if (success) success();
            }, function (msg) {
                addDebugInfo("Download last error", path);
                var errorMsg = msg || "[saveFile] Ocurrió un error";
                if (error) {
                    error(errorMsg);
                } else {
                    console.error(errorMsg);
                }
            }, pathLst[1], pathLst[2]);
        };

        /**
         * Deletes a file from storage.
         * @memberOf tizenStorage
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        tizenStorage.deleteFile = function (path, success, error) {
            if (path.endsWith("none")) {
                // Forgive me Father, for I have sinned
                console.error("Attemted to delete a none file", path);
                if(success) success();
                return;
            }
            if (tizen.filesystem.isFile(getValidTizenPath(path))) {
                tizen.filesystem.deleteFile(getValidTizenPath(path), function () {
                    if (success) success();
                }, function () {
                    if (error) error();
                });
            } else {
                if (error) {
                    error("[Delete] No existe el archivo: " + getValidTizenPath(path));
                } else {
                    console.error("[Delete] No existe el archivo: " + getValidTizenPath(path));
                }
            }
        };

        /**
         * Gets a list of files in a given directory.
         * @memberOf tizenStorage
         * @param  {string} path Folder path
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        tizenStorage.getFileList = function (path, success, error) {
            tizen.filesystem.listDirectory(getValidTizenPath(path), function (files) {
                files = files.filter(function(file) {
                    if (file === "none") {
                        console.log("[getFileList] Found none file wth");
                        return false;
                    }
                    return true;
                });
                if (success) success(files);
            }, function () {
                if (error) {
                    error("[getFileList] error: " + path);
                } else {
                    console.error("[getFileList] no pudo listarse el directorio: " + path);
                }
            });
        };

        /**
         * Gets an url of a file in storage.
         * @memberOf tizenStorage
         * @param  {string} path File path in local storage
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        tizenStorage.getFileUrl = function (path, success, error) {
            var newpath = getValidTizenPath(path);
            if (tizen.filesystem.pathExists(newpath)) {
                if (success) success(tizen.filesystem.toURI(newpath));
            } else {
                if (error) error("No se encuentra el archivo: " + newpath);
            }
        };

        tizenStorage.revokeURL = function (_url) {
            // no-op
        };

        /**
         * Creates a file in local storage with given data.
         * @memberOf tizenStorage
         * @param  {string} data Data to be saved in created file
         * @param  {string} path Storage path where file has to be created
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        tizenStorage.createFile = function (data, path, success, error) {
            var fileHandleWrite = tizen.filesystem.openFile(getValidTizenPath(path), "w");
            fileHandleWrite.writeStringNonBlocking(data, function () {
                fileHandleWrite.close();
                if (success) success();
            }, function () {
                if (error) {
                    error("No pudo crearse el archivo: " + getValidTizenPath(path))
                } else {
                    console.error("No pudo crearse el archivo: " + getValidTizenPath(path));
                }
            });
        };

        /**
         * Appends given data to an already created file in local storage.
         * @memberOf tizenStorage
         * @param  {string} data Data to be appended in file
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        tizenStorage.appendFile = function (data, path, success, error) {
            var fileHandleAppend = tizen.filesystem.openFile(getValidTizenPath(path), "a");
            fileHandleAppend.writeStringNonBlocking(data + '\n', function () {
                fileHandleAppend.close();
                if (success) success();
            }, function () {
                if (error) {
                    error("No pudo escribirse sobre el archivo: " + getValidTizenPath(path));
                } else {
                    console.error("No pudo escribirse sobre el archivo: " + getValidTizenPath(path));
                }
            });
        };

        /**
         * Deletes the contents of the specified folders
         * @param  {array} folders Names of the folders to clean up
         * @param  {function} success success callback
         * @param  {function} error   error callback
         * @memberOf tizenStorage
         */
        tizenStorage.cleanFolders = function (folders, success, error) {
            folders.forEach(function (folder, j) {
                var internalSuccess = function () {
                    if (success) success();
                }
                var internalError = function () {
                    if (error) {
                        error("No pudo eliminarse la carpeta: " + folder);
                    } else {
                        console.error("No pudieron eliminarse la carpeta[" + j + "]: " + folder);
                    }
                }
                if (tizen.filesystem.pathExists(getValidTizenPath(folder))) {
                    tizen.filesystem.deleteDirectory(getValidTizenPath(folder), true, internalSuccess, internalError);
                }
            });
        };

        /**
         * Waits some time and then try to check storage again
         * @protected
         * @memberOf tizenStorage
         */
        var recheckStorage = function () {
            console.debug("will retry checking storage in 1s")
            setTimeout(function () {
                if (tizenStorage.ready === false) {
                    if (checkStorageTry < 4 && !oldFileFound) {
                        checkStorageTry = checkStorageTry + 1;
                        checkStorage();
                    } else {
                        //The system will create a new config file
                        tizenStorage.ready = true;
                    }
                }
            }, 1500);
        }

        /**
         * Takes the old config file content and creates a new in the tizen storage
         * @param  fileUrl url for old local config file
         * @protected
         * @memberOf tizenStorage
         */
        var copyOldConfigFile = function (fileUrl) {

            var success = function () {
                console.debug("SUCCESS creating new config file");
                tizenStorage.ready = true;
            }

            var error = function () {
                console.error("ERROR creating new config file");
                recheckStorage();
            }

            var configRequest = new XMLHttpRequest();
            configRequest.open('GET', fileUrl);
            configRequest.onreadystatechange = function () {
                if (configRequest.readyState === 4) {
                    if (configRequest.responseText && "" !== configRequest.responseText) {
                        console.debug("Found old config");
                        tizenStorage.createFile(configRequest.responseText, localConfigFilePath, success, error);
                    } else {
                        recheckStorage();
                    }
                }
            }
            configRequest.send();

        }

        /**
         * Having the old db open, looks for the config old storage, then copyOldConfigFile
         * @protected
         * @memberOf tizenStorage
         */
        var getOldConfigFile = function () {
            var path = localConfigFilePath;
            var pathLst = path.split("/");
            var fileName = pathLst[2];

            var getObjectStore = function (objectStore, success) {
                try {
                    var transaction = db.transaction(objectStore, "readonly");
                    success(transaction.objectStore(objectStore));
                } catch (e) {
                    console.error("No se pudo obtener el objeto de configuración");
                    recheckStorage();
                }
            };
            getObjectStore(pathLst[1], function (objectStore) {
                var request = objectStore.get(fileName);
                console.debug("Looking for:" + fileName);
                request.onsuccess = function (e) {
                    var URL = window.URL || window.webkitURL;
                    console.debug("Success looking object");
                    if (e.target.result) {
                        oldFileFound = true;
                        var fileUrl = URL.createObjectURL(e.target.result.file);
                        copyOldConfigFile(fileUrl);
                    } else {
                        console.error("Cannot get url for " + fileName + ", file not found");
                        recheckStorage();
                    }
                };
                request.onerror = function (ev) {
                    console.error("Cannot get url for" + path);
                    recheckStorage();
                };
            });
        }

        /**
         * Tries to open the old DB in order to search the old config file. Then getOldConfigFile
         * @protected
         * @memberOf tizenStorage
         */
        var openOldDB = function () {
            if (db === undefined) {
                var dbName = 'totem';
                var request = window.indexedDB.open(dbName);
                request.onsuccess = function (e) {
                    db = e.target.result;
                    if (db.objectStoreNames.contains("config")) {
                        setTimeout(function () {
                            getOldConfigFile();
                        }, 500);
                    } else {
                        console.debug("Hay db pero no config folder");
                        recheckStorage();
                    }
                };

                request.onerror = function (ev) {
                    console.error("Error al abrir la db para buscar la configuración anterior");
                    recheckStorage();
                };

                request.onblocked = function (e) {
                    console.error("db blocked");
                    db.close();
                    recheckStorage();
                };
            } else {
                console.debug("db open");
                getOldConfigFile();
            }
        }

        /**
         * Returns if there is a config file in the tizen storage
         * @protected
         * @memberOf tizenStorage
         */
        var localConfigExists = function () {
            return tizen.filesystem.pathExists(tizenStorage.folder + localConfigFilePath);
        }

        /**
         * Checks for the configuration files. If not new, tries to copy a old one.
         * @protected
         * @memberOf tizenStorage
         */
        var checkStorage = function () {
            if (!tizenStorage.ready) {
                if (localConfigExists()) {
                    console.debug("Already tizen config here");
                    tizenStorage.ready = true;
                } else {
                    console.debug("There is no tizen config - will search");
                    openOldDB();
                }
            }
        }

        setTimeout(function () {
            checkStorage();
        }, 500);
        return tizenStorage;
    }

    var defineStorageByTizenVersion = function (){
        try {
            if ((typeof (PlayerStorage) === "undefined" && navigator.userAgent.search("Tizen") !== -1) &&
                (window.tizen && tizen.systeminfo && tizen.systeminfo.getPropertyValue)) {
                var tizenMatch = navigator.userAgent.match(/Tizen (\d)\.\d/i);
                if (tizenMatch && !isNaN(parseInt(tizenMatch[1]))){
                    if(parseInt(tizenMatch[1]) >= 5) {
                        window.PlayerStorage = define_tizen_storage();
                    }
                }
            }
        }catch (e) {
            console.debug("No se puede parsear user Agent info: "+navigator.userAgent.toString(),e);
        }
    };

    //define globally if it doesn't already exist
    if (typeof (PlayerStorage) === "undefined" && navigator.userAgent.search("Tizen") !== -1) {
        defineStorageByTizenVersion();
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_tizen_storage = define_tizen_storage;
    /* end-test-code
    <!-- /build -->
    //*/
})(window);
