(function(window){
    'use strict';
    function define_local_storage(dbName){
        /**
         * @namespace LocalStorage
         */
        var LocalStorage = {};

        if(!dbName) dbName = 'totem';
        var fs = require('fs');
        var path = require('path');
        var https = require('https');
        var http = require('http');
        var os = require('os');

        // Base storage directory in user's home
        const baseStoragePath = path.join(process.cwd(), 'media', dbName);

        // Validate media folder
        const mediaDir = path.dirname(baseStoragePath);
        if (!fs.existsSync(mediaDir)) {
            fs.mkdirSync(mediaDir, { recursive: true });
        }

        // Ensure base directory exists
        var ensureBaseDir = function() {
            if (!fs.existsSync(baseStoragePath)) {
                fs.mkdirSync(baseStoragePath, { recursive: true });
            }
        };

        // Ensure directory exists for given store
        var ensureStoreDir = function(storeName) {
            var storePath = path.join(baseStoragePath, storeName);
            if (!fs.existsSync(storePath)) {
                fs.mkdirSync(storePath, { recursive: true });
            }
            return storePath;
        };

        /**
         * Local storage type name.
         * @type {string}
         * @memberOf LocalStorage
         */
        LocalStorage.type = "local";

        /**
         * Indicates whether the device has loaded or not
         * @type {Boolean}
         * @memberOf LocalStorage
         */
        LocalStorage.ready = true;

        // Initialize base directory
        ensureBaseDir();

        /**
         * Downloads a file from url and return file data.
         * @memberOf LocalStorage
         * @param  {string} url Remote url where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LocalStorage.downloadFile = function(url, success, error) {
            var protocol = url.startsWith('https:') ? https : http;

            protocol.get(url, function(response) {
                if (response.statusCode === 200) {
                    var data = [];
                    response.on('data', function(chunk) {
                        data.push(chunk);
                    });
                    response.on('end', function() {
                        var buffer = Buffer.concat(data);
                        success(buffer);
                    });
                } else {
                    console.log("error interno download");
                    console.log("local", response.statusCode);
                    error(response.statusMessage, response.statusCode);
                }
            }).on('error', function(err) {
                error(err.message);
            });
        };

        /**
         * Saves a file from url in given path.
         * @memberOf LocalStorage
         * @param  {string} url Remote url where file is located
         * @param  {string} path Storage path where file has to be saved
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LocalStorage.saveFile = function(url, filePath, success, error) {
            var pathLst = filePath.split("/");
            var storeName = pathLst[1];
            var fileName = pathLst[2];

            var storePath = ensureStoreDir(storeName);
            var fullPath = path.join(storePath, fileName);

            LocalStorage.downloadFile(url, function(data) {
                try {
                    fs.writeFileSync(fullPath, data);
                    if (success) success();
                } catch (err) {
                    if (error) error("Couldn't save file " + filePath + " " + err.message);
                }
            }, function(msg1, msg2) {
                var err2 = "";
                if (!!msg2) err2 = "Error: " + msg2;
                if (error) error("An error ocurred when trying to download the file " + url + " " + err2);
            });
        };

        /**
         * Deletes a file from storage.
         * @memberOf LocalStorage
         * @param  {string} filePath Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LocalStorage.deleteFile = function(filePath, success, error) {
            var pathLst = filePath.split("/");
            var storeName = pathLst[1];
            var fileName = pathLst[2];

            var storePath = path.join(baseStoragePath, storeName);
            var fullPath = path.join(storePath, fileName);

            try {
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
                if (success) success();
            } catch (err) {
                if (error) error("Failed to delete file at " + filePath + " " + err.message);
            }
        };

        /**
         * Gets a list of files in a given directory.
         * @memberOf LocalStorage
         * @param  {string} dirPath Folder path
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LocalStorage.getFileList = function(dirPath, success, error) {
            var pathLst = dirPath.split("/");
            var storeName = pathLst[1];

            var storePath = path.join(baseStoragePath, storeName);

            try {
                if (!fs.existsSync(storePath)) {
                    if (success) success([]);
                    return;
                }

                var files = fs.readdirSync(storePath).filter(function(file) {
                    return fs.statSync(path.join(storePath, file)).isFile();
                });

                if (success) success(files);
            } catch (err) {
                if (error) error("Failed to retrieve files list at " + dirPath + " " + err.message);
            }
        };

        /**
         * Gets an url of a file in storage.
         * @memberOf LocalStorage
         * @param  {string} filePath File path in local storage
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LocalStorage.getFileUrl = function(filePath, success, error) {
            if (typeof filePath !== "string" || filePath.indexOf("/") === -1) {
                if (error) error("Invalid path format: " + filePath);
                return;
            }

            var pathLst = filePath.split("/");
            if (pathLst.length < 3) {
                if (error) error("Invalid path structure: expected at least 3 segments in '" + filePath + "'");
                return;
            }

            var storeName = pathLst[1];
            var fileName = pathLst[2];

            var storePath = path.join(baseStoragePath, storeName);
            var fullPath = path.join(storePath, fileName);

            try {
                if (fs.existsSync(fullPath)) {
                    // Return file:// URL for direct access
                    var fileUrl = 'file://' + fullPath.replace(/\\/g, '/');
                    if (success) success(fileUrl);
                } else {
                    console.error("Media not found in local storage (MEDIA FOLDER): " + filePath + " | If not expired, will download");
                    if (error) error("Media not found in local storage (MEDIA FOLDER): " + filePath + " | If not expired, will download");
                }
            } catch (err) {
                console.error("Request for file internal failed");
                console.error(err);
                if (error) error("Cannot get url for " + filePath + " " + err.message);
            }
        };

        LocalStorage.revokeURL = function (url) {
            // No need to revoke file:// URLs
        };

        /**
         * Migrates config from IndexedDB and merges with config template
         * @memberOf LocalStorage
         * @param  {Object} newTemplate The config template with current structure
         * @param  {function} callback Callback with merged config
         */
        LocalStorage.migrateConfig = function(newTemplate, callback) {
            // Check if IndexedDB is available
            if (!window.indexedDB) {
                console.log("IndexedDB not available, using default config");
                if (callback) callback(newTemplate);
                return;
            }

            var request = window.indexedDB.open(dbName);

            request.onerror = function(event) {
                console.error("Could not open IndexedDB for migration:", event);
                if (callback) callback(newTemplate);
            };

            request.onsuccess = function(event) {
                var db = event.target.result;

                // Check if config store exists
                if (!db.objectStoreNames.contains("config")) {
                    console.log("No config store found in IndexedDB");
                    db.close();
                    if (callback) callback(newTemplate);
                    return;
                }

                var transaction = db.transaction(["config"], "readonly");
                var objectStore = transaction.objectStore("config");
                var getRequest = objectStore.get("config.json");

                getRequest.onsuccess = function(event) {
                    var result = event.target.result;

                    if (result && result.file) {
                        console.log("Found config in IndexedDB, migrating...");

                        // Read the blob data
                        var reader = new FileReader();
                        reader.onload = function(e) {
                            try {
                                var configData = e.target.result;
                                var oldConfig = {};

                                // Parse old config from IndexedDB
                                try {
                                    oldConfig = JSON.parse(configData);
                                    // Remove version from old config to use new one
                                    delete oldConfig.version;
                                } catch (parseErr) {
                                    console.error("Config data is not valid JSON:", parseErr);
                                }

                                // Merge: template provides structure, old config provides values (except version)
                                var mergedConfig = Object.assign({}, newTemplate, oldConfig);
                                // Force new version
                                mergedConfig.version = newTemplate.version;
                                // Add migration flag
                                mergedConfig._migrationCompleted = true;

                                LocalStorage.cleanSpecificIndexedDBStores(['publicities', 'log', 'fonts'], function() {
                                    console.log("Cleaned specific IndexedDB stores, config preserved for rollback");
                                    db.close();
                                    if (callback) callback(mergedConfig);
                                }, function(error) {
                                    console.error("Error cleaning specific IndexedDB stores:", error);
                                    db.close();
                                    // Continue even if cleanup fails
                                    if (callback) callback(mergedConfig);
                                });

                            } catch (err) {
                                console.error("Error during config migration:", err);
                                db.close();
                                if (callback) callback(newTemplate);
                            }
                        };

                        reader.onerror = function(err) {
                            console.error("Error reading config blob:", err);
                            db.close();
                            if (callback) callback(newTemplate);
                        };

                        reader.readAsText(result.file);

                    } else {
                        console.info("No config.json found in IndexedDB - no migration needed");
                        db.close();
                        if (callback) callback(newTemplate);
                    }
                };

                getRequest.onerror = function(event) {
                    console.error("Error getting config from IndexedDB:", event);
                    db.close();
                    if (callback) callback(newTemplate);
                };
            };
        };

        /**
         * Clean specific Stores
         * @memberOf LocalStorage
         * @param  {Array} storeNames Nombres de stores a limpiar
         * @param  {function} success Success callback
         * @param  {function} error Error callback
         */
        LocalStorage.cleanSpecificIndexedDBStores = function(storeNames, success, error) {
            if (!window.indexedDB || !storeNames || storeNames.length === 0) {
                if (success) success();
                return;
            }

            var request = window.indexedDB.open(dbName);

            request.onerror = function(event) {
                console.error("Could not open IndexedDB for store cleanup:", event);
                if (error) error(event);
            };

            request.onsuccess = function(event) {
                var db = event.target.result;
                var storesToClean = [];

                // Check which stores actually exist
                storeNames.forEach(function(storeName) {
                    if (db.objectStoreNames.contains(storeName)) {
                        storesToClean.push(storeName);
                    }
                });

                if (storesToClean.length === 0) {
                    console.log("No stores found to clean");
                    db.close();
                    if (success) success();
                    return;
                }

                try {
                    var transaction = db.transaction(storesToClean, "readwrite");

                    storesToClean.forEach(function(storeName) {
                        var objectStore = transaction.objectStore(storeName);
                        var clearRequest = objectStore.clear();

                        clearRequest.onsuccess = function() {
                            console.log("Cleared IndexedDB store:", storeName);
                        };

                        clearRequest.onerror = function(event) {
                            console.error("Error clearing store " + storeName + ":", event);
                        };
                    });

                    transaction.oncomplete = function() {
                        console.log("Successfully cleaned IndexedDB stores:", storesToClean);
                        console.log("Config store preserved for potential rollback");
                        db.close();
                        if (success) success();
                    };

                    transaction.onerror = function(event) {
                        console.error("Transaction error during store cleanup:", event);
                        db.close();
                        if (error) error(event);
                    };

                } catch (err) {
                    console.error("Error creating transaction for store cleanup:", err);
                    db.close();
                    if (error) error(err);
                }
            };
        };

        /**
         * Creates a file in local storage with given data.
         * @memberOf LocalStorage
         * @param  {string} data Data to be saved in created file
         * @param  {string} filePath Storage path where file has to be created
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LocalStorage.createFile = function(data, filePath, success, error) {
            var pathLst = filePath.split("/");
            var storeName = pathLst[1];
            var fileName = pathLst[2];

            var storePath = ensureStoreDir(storeName);
            var fullPath = path.join(storePath, fileName);

            // Valido si los players tienen datos en indexedDB para migrarlos al nuevo sistema de almacenamiento
            if (storeName === "config" && fileName === "config.json") {
                if (fs.existsSync(fullPath)) {
                    console.debug("Config file already exists - using simple write (no migration)");
                    try {
                        fs.writeFileSync(fullPath, data, 'utf8');
                        if (success) success();
                    } catch (writeErr) {
                        if (error) error("Failed to write existing config file at " + filePath + " " + writeErr.message);
                    }
                    return;
                }
                // Parse the new config template from data parameter
                var newConfig = {};
                try {
                    newConfig = JSON.parse(data);
                } catch (err) {
                    console.error("Invalid JSON in data parameter:", err);
                    // Even if parse fails, try to write the data as-is
                    try {
                        fs.writeFileSync(fullPath, data, 'utf8');
                        if (success) success();
                    } catch (writeErr) {
                        if (error) error("Failed to write file at " + filePath + " " + writeErr.message);
                    }
                    return;
                }

                // Check if we need to migrate from IndexedDB
                LocalStorage.migrateConfig(newConfig, function(mergedConfig) {
                    // Write the final merged config to file system
                    try {
                        // Force the version from the new template
                        mergedConfig.version = newConfig.version;

                        fs.writeFileSync(fullPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
                        if (success) success();
                    } catch (err) {
                        console.error("Failed to write config file:", err);
                        if (error) error("Failed to write file at " + filePath + " " + err.message);
                    } finally {
                        setTimeout(function() {
                            console.log("Restarting application...");
                            if (typeof PlayerScreen !== 'undefined' && PlayerScreen.restartApplication) {
                                PlayerScreen.restartApplication();
                            } else {
                                // Fallback: reload the page
                                window.location.reload();
                            }
                        }, 1000);
                    }
                });
            } else {
                // Metodo tradicional para el resto de archivos que no necesiten migracion
                try {
                    fs.writeFileSync(fullPath, data, 'utf8');
                    if (success) success();
                } catch (err) {
                    if (error) error("Failed to write file at" + filePath + " " + err.message);
                }
            }
        };

        /**
         * Appends given data to an already created file in local storage.
         * @memberOf LocalStorage
         * @param  {string} data Data to be appended in file
         * @param  {string} filePath Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        LocalStorage.appendFile = function(data, filePath, success, error) {
            var pathLst = filePath.split("/");
            var storeName = pathLst[1];
            var fileName = pathLst[2];

            var storePath = ensureStoreDir(storeName);
            var fullPath = path.join(storePath, fileName);

            try {
                fs.appendFileSync(fullPath, data + "\n", 'utf8');
                if (success) success();
            } catch (err) {
                if (error) error("Cannot write into file " + filePath + " " + err.message);
            }
        };

        /**
         * Deletes the contents of the specified folders
         * @param  {array} folders Names of the folders to clean up
         * @param  {function} success success callback
         * @param  {function} error   error callback
         * @memberOf LocalStorage
         */
        LocalStorage.cleanFolders = function(folders, success, error) {
            var errorLog = "";

            folders.forEach(function(folder) {
                if (folder[0] === "/") {
                    folder = folder.slice(1);
                }

                var folderPath = path.join(baseStoragePath, folder);

                try {
                    if (fs.existsSync(folderPath)) {
                        var files = fs.readdirSync(folderPath);
                        files.forEach(function(file) {
                            try {
                                fs.unlinkSync(path.join(folderPath, file));
                            } catch (err) {
                                if (errorLog === "") errorLog = "Failed to delete:\n";
                                errorLog += file + " at " + folder + "\n";
                            }
                        });
                    }
                } catch (err) {
                    if (errorLog === "") errorLog = "Failed to delete:\n";
                    errorLog += "folder " + folder + ": " + err.message + "\n";
                }
            });

            if (errorLog !== "") {
                if (error) error(errorLog);
            } else {
                if (success) success();
            }
        };

        return LocalStorage;
    }

    // Define globally for Windows and Linux (non-Android)
    if (typeof (PlayerStorage) === 'undefined' && (
        (process.platform === 'win32' || process.platform === 'linux') &&
        navigator.userAgent.search("Android") === -1
    )) {
        window.PlayerStorage = define_local_storage();
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_local_storage = define_local_storage.bind(null, 'totemTest');
    /* end-test-code
    <!-- /build -->
    //*/

})(window);