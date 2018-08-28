(function () {
    const fs = require('fs');

    const app = nw.App;
    const win = nw.Window.get();
    const CONFIG_PATH = app.dataPath + '\\config.json';
    let tdWebview;
    let winIsVisible = true;
    let winIsMinimized = false;
    let toTray = false;
    let mspgothic = false;
    let config = {};
    let preConfig = {};
    const DEFAULT_WIDTH = 800;
    const DEFAULT_HEIGHT = 600;

    // Shortcut ---------------------------------
    const scZoomReset = new nw.Shortcut({
        key : "Ctrl+0",
        active : function() {
            win.zoomLevel = 0;
        },
    });

    const scZoomOut = new nw.Shortcut({
        key : "Ctrl+1",
        active : function() {
            const minZoom = -8;
            if (win.zoomLevel > minZoom) {
                win.zoomLevel = win.zoomLevel - 1;
            }
        },
    });

    const scZoomIn = new nw.Shortcut({
        key : "Ctrl+2",
        active : function() {
            const maxZoom = 8;
            if (win.zoomLevel < maxZoom) {
                win.zoomLevel = win.zoomLevel + 1;
            }
        },
    });

    const scReload = new nw.Shortcut({
        key : "F5",
        active : function() {
            tdWebview.reload();
        },
    });

    let scIsActive = false;
    const scRegister = function() {
        if (!scIsActive) {
            app.registerGlobalHotKey(scZoomReset);
            app.registerGlobalHotKey(scZoomOut);
            app.registerGlobalHotKey(scZoomIn);
            app.registerGlobalHotKey(scReload);
            scIsActive = true;
        }
    }

    const scUnregister = function() {
        if (scIsActive) {
            app.unregisterGlobalHotKey(scZoomReset);
            app.unregisterGlobalHotKey(scZoomOut);
            app.unregisterGlobalHotKey(scZoomIn);
            app.unregisterGlobalHotKey(scReload);
            scIsActive = false;
        }
    }

    // Tray -------------------------------------
    const createTray = function () {
        const menu = new nw.Menu();
        const tray = new nw.Tray({ title: 'TweetDeckNW', icon: 'trayicon.png' });

        menu.append(new nw.MenuItem({
            label: 'Open',
            click: function () {
                if (!winIsVisible) {
                    win.show();
                }
                win.focus();
            }
        }));

        menu.append(new nw.MenuItem({
            label: 'Close',
            click: function () {
                win.close();
            }
        }));

        menu.append(new nw.MenuItem({
            label: 'Minimize to Tray',
            type: 'checkbox',
            checked: toTray,
            click: function () {
                if (this.checked) {
                    toTray = true;
                    if (winIsMinimized) {
                        win.hide();
                        winIsVisible = false;
                    }
                } else {
                    toTray = false;
                    if (!winIsVisible) {
                        win.show();
                        winIsVisible = true;
                    }
                }
            }
        }));

        menu.append(new nw.MenuItem({
            label: 'Use MS PGothic',
            type: 'checkbox',
            checked: mspgothic,
            click: function () {
                if (this.checked) {
                    mspgothic = true;
                    if (Object.keys(tdWebview).length !== 0) {
                        tdWebview.insertCSS({
                            code: '.os-windows .column { font-family: Arial,Verdana,"ms pgothic",sans-serif; }'
                        });
                    }
                } else {
                    mspgothic = false;
                    if (Object.keys(tdWebview).length !== 0) {
                        tdWebview.insertCSS({
                          code: '.os-windows .column { font-family: Arial,Verdana,sans-serif; }'
                        });
                    }
                }
            }
        }));

        tray.menu = menu;

        tray.on('click', function () {
            if (winIsMinimized) {
                if (!winIsVisible) {
                    win.show();
                    winIsVisible = true;
                }
                win.focus();
            } else {
                win.minimize();
            }
        });
    };

    // Window Event -----------------------------
    win.on('new-win-policy', function(frame, url, policy) {
        policy.ignore();
        nw.Shell.openExternal(url);
    });

    win.on('focus', function (){
        if (!winIsVisible) {
            win.show();
            winIsVisible = true;
        }
        scRegister();
    });

    win.on('blur', function (){
        scUnregister();
    });

    win.on('minimize', function () {
        if (toTray) {
            win.hide();
            winIsVisible = false;
        }
        winIsMinimized = true;
    });

    win.on('resize', function () {
        preConfig.width = config.width;
        preConfig.height = config.height;
        config.width = win.width;
        config.height = win.height;
    });

    win.on('move', function () {
        preConfig.x = config.x;
        preConfig.y = config.y;
        config.x = win.x;
        config.y = win.y;
    });

    win.on('restore', function () {
        winIsMinimized = false;
    });

    win.on('close', function () {
        scUnregister();

        if (winIsMinimized) {
            config = preConfig
        }
        config.toTray = toTray;
        config.mspgothic = mspgothic;
        config.zoomLevel = win.zoomLevel;

        try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
        } catch(e) {}

        app.clearCache();
        tdWebview.clearData({}, {cache: true});

        app.quit();
    });

    // Window Create ----------------------------
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        if (config.width) win.width = config.width;
        if (config.height) win.height = config.height;
        if (config.x) win.x = config.x;
        if (config.y) win.y = config.y;
        if (config.toTray != null) toTray = config.toTray;
        if (config.mspgothic != null) mspgothic = config.mspgothic;
        if (config.zoomLevel == null) {
            throw "zoomException";
        }
    } catch(e) {
        config.zoomLevel = 0;
        win.width = DEFAULT_WIDTH;
        win.height = DEFAULT_HEIGHT;
        win.x = window.parent.screen.width / 2 - DEFAULT_WIDTH / 2;
        win.y = window.parent.screen.height / 2 - DEFAULT_HEIGHT / 2;
    }

    config.width = win.width;
    config.height = win.height;
    config.x = win.x;
    config.y = win.y;

    win.show();

    // WebView
    win.window.addEventListener('DOMContentLoaded', function () {
        tdWebview = document.getElementById('tweetdeck_frame');

        tdWebview.addEventListener('loadcommit', function setZoom() {
            win.zoomLevel = config.zoomLevel;
            tdWebview.removeEventListener('loadcommit', setZoom);
        });

        tdWebview.addEventListener('loadcommit', function () {
            if (mspgothic) {
                tdWebview.insertCSS(
                    { code: '.os-windows .column { font-family: Arial,Verdana,"ms pgothic",sans-serif; }'
                });
            }
        });

        tdWebview.addEventListener('newwindow', function (e) {
            e.preventDefault();
            nw.Shell.openExternal(e.targetUrl);
        });
    });

    // Init -------------------------------------
    if (app.manifest.tray) {
        createTray();
    } else {
        toTray = false;
    }

    scRegister();
})();
