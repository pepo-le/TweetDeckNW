(function () {
    const fs = require('fs');

    const app = nw.App;
    const win = nw.Window.get();
    const CONFIG_PATH = app.dataPath + '\\config.json';
    let tdWebview;
    let winIsVisible = true;
    let winIsMinimized = false;
    let winIsMaximized = false;
    let toTray = false;
    let onTop = false;
    let mspgothic = false;
    let config = {};
    const DEFAULT_WIDTH = 800;
    const DEFAULT_HEIGHT = 600;
    const MINIMIZED_X = -32000;

    // Window Event -----------------------------
    win.on('new-win-policy', function(frame, url, policy) {
        policy.ignore();
        nw.Shell.openExternal(url);
    });

    win.on('focus', function (){
        if (!winIsVisible) {
            winIsVisible = true;
            win.setShowInTaskbar(winIsVisible);
        }
    });

    win.on('minimize', function () {
        if (toTray) {
            winIsVisible = false;
            win.setShowInTaskbar(winIsVisible);
        }
        winIsMinimized = true;
    });

    win.on('maximize', function () {
        winIsMaximized = true;
    });

    win.on('resize', function () {
        if (win.x !== MINIMIZED_X && !chrome.app.window.current().isMaximized()) {
            config.width = win.width;
            config.height = win.height;
        }
    });

    win.on('move', function () {
        if (win.x !== MINIMIZED_X && !chrome.app.window.current().isMaximized()) {
            config.x = win.x;
            config.y = win.y;
        }
    });

    win.on('restore', function () {
        winIsMaximized = false;
        winIsMinimized = false;
    });

    win.on('close', function () {
        config.maximized = winIsMaximized;
        config.toTray = toTray;
        config.onTop = onTop;
        config.mspgothic = mspgothic;

        try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
        } catch(e) {}

        app.clearCache();
        tdWebview.clearData({}, {cache: true});

        app.quit();
    });

    // Create Window ----------------------------
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        if (config.width) win.width = config.width;
        if (config.height) win.height = config.height;
        if (config.x) win.x = config.x;
        if (config.y) win.y = config.y;
        if (config.maximized) win.maximize();
        if (config.toTray != null) toTray = config.toTray;
        if (config.onTop != null) onTop = config.onTop;
        if (config.mspgothic != null) mspgothic = config.mspgothic;
    } catch(e) {
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

    // WebView Setting --------------------------
    win.window.addEventListener('DOMContentLoaded', function () {
        tdWebview = document.getElementById('tweetdeck_frame');

        tdWebview.focus();

        tdWebview.addEventListener('loadcommit', function () {
            if (mspgothic) {
                tdWebview.insertCSS({
                    code: `
                        html.os-windows { font-family: Arial,Verdana,"ms pgothic",sans-serif !important; }
                        .os-windows .column { font-family: Arial,Verdana,"ms pgothic",sans-serif; }
                    `
                });
            }
        });

        tdWebview.addEventListener('newwindow', function (e) {
            e.preventDefault();
            nw.Shell.openExternal(e.targetUrl);
        });

        tdWebview.addEventListener('permissionrequest', function(e) {
            if (e.permission === 'fullscreen') {
                e.request.allow();
            }
        });

        tdWebview.addEventListener('loadcommit', function () {
            tdWebview.executeScript({
                code: `
                    document.body.style.zoom = localStorage.getItem('zoom') + '%';
                `
            });
        });

        // Shortcut
        tdWebview.addEventListener('loadcommit', function () {
            tdWebview.executeScript({
                code: `
                    window.onkeydown = function (evt) {
                        if (evt.key == 'F5') {
                            location.reload();
                            return;
                        }

                        if (evt.ctrlKey) {
                            let zoom = +localStorage.getItem('zoom');

                            if (zoom == 0) {
                                zoom = 100;
                            }

                            console.log(zoom);

                            switch (evt.key) {
                                case '0':
                                    document.body.style.zoom = '100%';
                                    localStorage.setItem('zoom', 100);
                                    break;
                                case '1':
                                    document.body.style.zoom = (zoom - 10) + '%';
                                    localStorage.setItem('zoom', zoom - 10);
                                    break;
                                case '2':
                                    document.body.style.zoom = (zoom + 10) + '%';
                                    localStorage.setItem('zoom', zoom + 10);
                                    break;
                            }
                        }

                    }
                `
            });
        });
    });

    // Create TrayIcon --------------------------
    if (app.manifest.tray) {
        const menu = new nw.Menu();
        const tray = new nw.Tray({ title: 'TweetDeckNW', icon: 'trayicon.png' });

        // Open Window
        menu.append(new nw.MenuItem({
            label: 'Open',
            click: function () {
                if (!winIsVisible) {
                    win.show();
                }
                win.focus();
            }
        }));

        // Close Window
        menu.append(new nw.MenuItem({
            label: 'Close',
            click: function () {
                win.close();
            }
        }));

        // Minimize to tray
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

        // Always on Top
        menu.append(new nw.MenuItem({
            label: 'Always on Top',
            type: 'checkbox',
            checked: onTop,
            click: function () {
                if (this.checked) {
                    onTop = true;
                    win.setAlwaysOnTop(onTop);
                } else {
                    onTop = false;
                    win.setAlwaysOnTop(onTop);
                }
            }
        }));

        // Use MS PGotic
        menu.append(new nw.MenuItem({
            label: 'Use MS PGothic',
            type: 'checkbox',
            checked: mspgothic,
            click: function () {
                if (this.checked) {
                    mspgothic = true;
                    if (Object.keys(tdWebview).length !== 0) {
                        tdWebview.insertCSS({
                            code: `
                                html.os-windows { font-family: Arial,Verdana,"ms pgothic",sans-serif !important; }
                                .os-windows .column { font-family: Arial,Verdana,"ms pgothic",sans-serif; }
                            `
                        });
                    }
                } else {
                    mspgothic = false;
                    if (Object.keys(tdWebview).length !== 0) {
                        tdWebview.insertCSS({
                            code: `
                                html.os-windows { font-family: Arial,Verdana,sans-serif !important; }
                                .os-windows .column { font-family: Arial,Verdana,sans-serif; }
                            `
                        });
                    }
                }
            }
        }));

        // Append menu to the tray
        tray.menu = menu;

        // Tray event
        tray.on('click', function () {
            if (winIsMinimized) {
                if (!winIsVisible) {
                    winIsVisible = true;
                    win.setShowInTaskbar(winIsVisible);
                }
                win.focus();
            } else {
                win.minimize();
            }
        });
    } else {
        toTray = false;
    }
})();
