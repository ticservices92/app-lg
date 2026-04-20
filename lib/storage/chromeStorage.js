(function(window){
    'use strict';
    function define_chrome_storage(dbName){
        /**
         * @namespace ChromeStorage
         */
        var ChromeStorage = {};

        if(!dbName) dbName = 'totem';
        var db;
        var updating = false;

        /**
         * Opens an IndexedDB database.
         * @memberOf ChromeStorage
         * @protected
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        var openDb = function(success, error, version) {
            var request;
            if(version){
                request = window.indexedDB.open(dbName, version);
            }else{
                request = window.indexedDB.open(dbName);
            }

            request.onupgradeneeded = function(e){
                db = e.target.result;
                if(!db.objectStoreNames.contains("publicities")){
                    db.createObjectStore("publicities", { keyPath: "fileName" });
                }
                if(!db.objectStoreNames.contains("config")){
                    db.createObjectStore("config", { keyPath: "fileName" });
                }
                if(!db.objectStoreNames.contains("log")){
                    db.createObjectStore("log", { keyPath: "fileName" });
                }
                if(!db.objectStoreNames.contains("fonts")){
                    db.createObjectStore("fonts", { keyPath: "fileName" });
                }
            };

            request.onsuccess = function(e) {
                db = e.target.result;
                console.debug("Opened db at version", db.version);
                if(!db.objectStoreNames.contains("publicities") ||
                !db.objectStoreNames.contains("log")||
                !db.objectStoreNames.contains("fonts")||
                !db.objectStoreNames.contains("config")){
                    openDb(success, error, db.version + 1);
                }else{
                    if (success) success();
                    ChromeStorage.ready = true;
                }
            };

            request.onerror = function(ev){
                if( !!error && typeof(error) === "function" ){
                    var err = "request to DB failed";
                    if(!!ev.srcElement) err = ev.srcElement.error;
                    error("Couldn't open database "+err);
                }
            };

            request.onblocked = function(e){
                if(db.close) db.close();
            };
        };

        /**
         * Creates a new object store in current IndexedDB database.
         * @memberOf ChromeStorage
         * @protected
         * @param  {Object} objectStore   IndexedDB object store to be created
         * @param  {function} success Success function callback
         */
        var createObjectStore = function(objectStore, success) {
            var currentVersion = db.version;

            if(updating){
                // If an updating transaction is in progress retry in 70ms
                setTimeout(createObjectStore, 70, objectStore, success);
                return;
            }

            // Set updating to true so that another updating transaction
            // is not started simultaneously
            updating = true;
            db.close();

            var request = window.indexedDB.open(dbName, currentVersion + 1);

            request.onupgradeneeded = function (e) {
                db = e.target.result;
                if(!db.objectStoreNames.contains || !db.objectStoreNames.contains(objectStore)) db.createObjectStore(objectStore, { keyPath: "fileName" });
            };

            request.onsuccess = function (e) {
                var transaction = db.transaction(objectStore, "readwrite");
                // The updating has finished
                updating = false;
                success(transaction.objectStore(objectStore));
            };

            // This event is triggered if there are open connections to the database
            // at the time the upgrade transaction is to be created
            request.onblocked = function(e){
                console.error("ChromeStorage [createObjectStore]: Database upgrade blocked. Please close all connections to the database.");
                // The upgradeneeded event will not fire if there are open connections
                // to the database, so db is closed.
                db.close();
            };
        };

        /**
         * Gets an object store from current IndexedDB database.
         * @memberOf ChromeStorage
         * @protected
         * @param  {Object} objectStore   IndexedDB object store to be opened
         * @param  {function} success Success function callback
         */
        var getObjectStore = function(objectStore, success) {
            try {
                var transaction = db.transaction(objectStore, "readwrite");
                success(transaction.objectStore(objectStore));
            } catch(e) {
                createObjectStore(objectStore, success);
            }
        };

        /**
         * Chrome storage type name.
         * @type {string}
         * @memberOf ChromeStorage
         */
        ChromeStorage.type = "chrome";

        /**
         * Indicates whether the device has loaded or not
         * @type {Boolean}
         * @memberOf ChromeStorage
         */
        ChromeStorage.ready = false;

        /**
         * Downloads a file from url and return file data.
         * @memberOf ChromeStorage
         * @param  {string} url Remote url where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeStorage.downloadFile = function(url, success, error) {
            var xhr = new XMLHttpRequest();

            xhr.open("GET", url, true);
            xhr.responseType = "blob";
            xhr.addEventListener("load", function () {
                if (xhr.status === 200) {
                    var data = xhr.response;
                    success(data);
                } else {
                    console.log("error interno download");
                    console.log("chrome",xhr.response, xhr.status);
                    error(xhr.response, xhr.status);
                }
            }, false);
            xhr.send();
        };

        /**
         * Saves a file from url in given path.
         * @memberOf ChromeStorage
         * @param  {string} url Remote url where file is located
         * @param  {string} path Storage path where file has to be saved
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeStorage.saveFile = function(url, path, success, error) {
            var pathLst = path.split("/");

            var onDbOpened = function() {
                var newFile = {};
                newFile.fileName = pathLst[2];

                function errorCb(msg1,msg2){
                    var err2 = "";
                    if(!!msg2) err2 = "Error: " + msg2;
                    error("An error ocurred when trying to download the file "+ url + " " + err2);
                }
                //Bajo si pasé la URL
                ChromeStorage.downloadFile(url, function(e) {
                    newFile.file = e;

                    getObjectStore(pathLst[1], function(objectStore){
                        var request = objectStore.add(newFile);

                        if (success) request.onsuccess = success;
                        if (error) request.onerror = function(ev){
                                var err = "request to DB failed";
                                if(!!ev.srcElement) err = ev.srcElement.error;
                                error("Couldn't save file "+ path + " " + err);
                            };
                    });
                }, errorCb);
            };

            if(db === undefined) {
                openDb(onDbOpened,error);
            } else {
                onDbOpened();
            }
        };

        /**
         * Deletes a file from storage.
         * @memberOf ChromeStorage
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeStorage.deleteFile = function(path, success, error) {
            var pathLst = path.split("/");

            var onDbOpened = function() {
                var fileName = pathLst[2];
                getObjectStore(pathLst[1], function(objectStore){
                    var request = objectStore.delete(fileName);

                    if (success) request.onsuccess = success;
                    if (error) request.onerror = function(ev){
                            var err = "";
                            if(!!ev.srcElement) err = ev.srcElement.error;
                            error("Failed to delete file at "+ path + " " +err);
                        };
                });
            };
            if(db === undefined) {
                openDb(onDbOpened,error);
            } else {
                onDbOpened();
            }
        };

        /**
         * Gets a list of files in a given directory.
         * @memberOf ChromeStorage
         * @param  {string} path Folder path
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeStorage.getFileList = function(path, success, error) {
            var pathLst = path.split("/");
            var files = [];

            var onDbOpened = function() {
                getObjectStore(pathLst[1], function(objectStore) {
                    var request = objectStore.openCursor();
                    if (success) {
                        request.onsuccess = function(e) {
                            var cursor = e.target.result;
                            if (cursor) {
                                files.push(cursor.value.fileName);
                                cursor.continue();
                            } else {
                                success(files);
                            }
                        };
                    }
                    if (error) request.onerror = function(ev){
                            var err = "";
                            if(!!ev.srcElement) err = ev.srcElement.error;
                            error("Failed to retrieve files list at "+ path + " " +err);
                        };
                });
            };

            if(db === undefined) {
                openDb(onDbOpened,error);
            } else {
                onDbOpened();
            }
        };

        /**
         * Gets an url of a file in storage.
         * @memberOf ChromeStorage
         * @param  {string} path File path in local storage
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeStorage.getFileUrl = function(path, success, error) {

            if (typeof path !== "string" || path.indexOf("/") === -1) {
                if (error) error("Invalid path format: " + path);
                return;
            }

            var pathLst = path.split("/");
            if (pathLst.length < 3) {
                if (error) error("Invalid path structure: expected at least 3 segments in '" + path + "'");
                return;
            }

            var storeName = pathLst[1];
            var fileName = pathLst[2];

            var onDbOpened = function() {
                getObjectStore(storeName, function(objectStore) {
                    var request = objectStore.get(fileName);

                    if (success) {
                        request.onsuccess = function(e) {
                            var URL = window.URL || window.webkitURL;

                            if(e.target.result) {
                                var fileUrl = URL.createObjectURL(e.target.result.file);
                                success(fileUrl);
                            } else if (error) {
                                console.error("Media not found in local storge: "+path+" | If not expired, will download",e);
                                error("Media not found in local storge: "+ path +" | If not expired, will download");
                            }
                        };
                    }
                    request.onerror = function(ev){
                        var err = "";
                        if(!!ev.srcElement) err = ev.srcElement.error;
                        console.error("Request for file internal failed");
                        if (err) console.error(err);
                        if (error) error("Cannot get url for"+ path + " " + err);
                    };
                });
            };

            if(db === undefined) {
                openDb(onDbOpened,error);
            } else {
                onDbOpened();
            }
        };

        ChromeStorage.revokeURL = function (url) {
            URL.revokeObjectURL(url);
        };

        /**
         * Creates a file in local storage with given data.
         * @memberOf ChromeStorage
         * @param  {string} data Data to be saved in created file
         * @param  {string} path Storage path where file has to be created
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeStorage.createFile = function(data, path, success, error) {
            var pathLst = path.split("/");

            var onDbOpened = function() {
                var fileName = pathLst[2];
                getObjectStore(pathLst[1], function(objectStore) {
                    var file = {};
                    file.fileName = fileName;
                    file.file = new Blob([data], { type: "text/plain" });

                    var putRequest = objectStore.put(file);

                    if (success) putRequest.onsuccess = success;
                    if (error) putRequest.onerror = function(ev){
                            var err = "";
                            if(!!ev.srcElement) err = ev.srcElement.error;
                            error("Failed to write file at "+ path + " " +err);
                        };
                });
            };

            if(db === undefined) {
                openDb(onDbOpened,error);
            } else {
                onDbOpened();
            }
        };

        /**
         * Appends given data to an already created file in local storage.
         * @memberOf ChromeStorage
         * @param  {string} data Data to be appended in file
         * @param  {string} path Storage path where file is located
         * @param  {function} success Success function callback
         * @param  {function} error   Error function callback
         */
        ChromeStorage.appendFile = function(data, path, success, error) {
            var pathLst = path.split("/");

            var onDbOpened = function() {
                var fileName = pathLst[2];
                getObjectStore(pathLst[1], function(objectStore) {
                    var getRequest = objectStore.get(fileName);

                    getRequest.onsuccess = function(e) {
                        var file = e.target.result;

                        if(file) {
                            file.file = new Blob([file.file, data + "\n"], { type: "text/plain" });
                        } else {
                            file = {};
                            file.fileName = fileName;
                            file.file = new Blob([data + "\n"], { type: "text/plain" });
                        }

                        var putRequest = objectStore.put(file);

                        if (success) putRequest.onsuccess = success;
                        if (error) putRequest.onerror = function(ev){
                            var err = "";
                            if(!!ev.srcElement) err = ev.srcElement.error;
                            error("Cannot write into file "+ path + " " + err);
                        };
                    };
                    if (error) getRequest.onerror = function(ev){
                        var err = "";
                        if(!!ev.srcElement) err = ev.srcElement.error;
                        error("Cannot retrieve file "+ path + " " + err);
                    };
                });
            };

            if(db === undefined) {
                openDb(onDbOpened,error);
            } else {
                onDbOpened();
            }
        };

        /**
         * Deletes the contents of the specified folders
         * @param  {array} folders Names of the folders to clean up
         * @param  {function} success success callback
         * @param  {function} error   error callback
         * @memberOf ChromeStorage
         */
        ChromeStorage.cleanFolders = function(folders, success, error){

            folders.forEach(function(folder,j){
                if (folder[0] === "/") {
                    folders[j] = folder.slice(1);
                }
            });

            var i = 0;
            var errorLog = "";
            var onDbOpened = function() {
                try {
                    var transaction = db.transaction(folders, "readwrite");
                    var objectStore = transaction.objectStore(folders[i]);
                    var cursorCreate = objectStore.openCursor();

                    cursorCreate.onsuccess = function(event){
                        var cursor = event.target.result;

                        if(!!cursor){
                            var deleteEntry = cursor.delete();

                            deleteEntry.onerror = function(event){
                                if(errorLog === "") errorLog = "Failed to delete:\n";
                                errorLog += cursor.key + " at "+ folders[i] + "\n";
                            };

                            cursor.continue();
                        } else {
                            i++;

                            if(i === folders.length){

                                if(errorLog !== ""){
                                    if(!!error) error(errorLog);
                                } else {
                                    if(!!success) success();
                                }
                            }else{
                                onDbOpened();
                            }
                        }
                    };
                    cursorCreate.onerror = function(event){
                        if(!!error) error("Failed to read database");
                    };

                } catch(e) {
                    if(!!e && typeof(e.name) === "string" && e.name === "NotFoundError"){
                        i++;
                        if(i === folders.length){
                            success();
                        }else{
                            onDbOpened();
                        }
                    }else{
                        if(!!error) error(e.name);
                    }
                }
            };

            if(db === undefined) {
                openDb(onDbOpened,error);
            } else {
                onDbOpened();
            }
        };

        openDb();

        return ChromeStorage;
    }

    //En los casos de Tizen 4 o inferior se debe seguir usando el chromeStorage
    var defineStorageChromeOrTizen = function(){
        var isChromeStorage = true;
        try {
            if ((typeof (PlayerStorage) === "undefined" && navigator.userAgent.search("Tizen") !== -1) &&
                (window.tizen && tizen.systeminfo && tizen.systeminfo.getPropertyValue)) {
                var tizenMatch = navigator.userAgent.match(/Tizen (\d)\.\d/i);
                if (tizenMatch && !isNaN(parseInt(tizenMatch[1]))) {
                    if (parseInt(tizenMatch[1]) > 4) {
                        isChromeStorage = false;
                    }
                }
            }
        }catch (e) {
            console.error("Error inesperado mientras definiendo chrome storage",e);
        }
        if(isChromeStorage){
            window.PlayerStorage = define_chrome_storage();
        }
    };

    //define globally if it doesn't already exist
    // Safari and Firefox also work with IndexedDB, though they have a size limit of 50MB in desktop and 5MB on mobile
    // (Chrome has the same limitation unless it's a Chrome App or nw.js app)
    if (typeof (PlayerStorage) === 'undefined' && (
        (
            navigator.userAgent.search("Chrome") !== -1 ||
            navigator.userAgent.toUpperCase().search("MAC OS") !== -1 ||
            navigator.userAgent.indexOf('Firefox/') !== -1 ||
            navigator.userAgent.indexOf("Tizen") !== -1
        ) &&
        navigator.userAgent.search("Android") === -1
    )) {
        defineStorageChromeOrTizen();
    }

    /* test-code
    <!-- build:remove -->
    */
    window.define_chrome_storage = define_chrome_storage.bind(null, 'totemTest');
    /* end-test-code
    <!-- /build -->
    //*/

})(window);
