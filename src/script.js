(function () {
    const fs = require('fs');

    const app = nw.App;
    const win = nw.Window.get();
    const tray = new nw.Tray({ title: 'TweetDeckNW', icon: 'trayicon.png' });
    const menu = new nw.Menu();
    const filePath = app.dataPath + '\\config.json';
    var winIsVisible = true;
    var winIsMinimized = false;
    var toTray = true;
    var config = {};
    var preConfig = {};

    // Window Setting ---------------------------
    try {
        config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        win.width = config.width;
        win.height = config.height;
        win.x = config.x;
        win.y = config.y;
        toTray = config.toTray;
    } catch(e) {
        win.width = 800;
        win.height = 600;
    } finally {
        win.show();
        config = {
            width: win.width,
            height: win.height,
            x: win.x,
            y:win.y
        };
    }
    // ------------------------------------------

    // Tray Menu --------------------------------
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
    tray.menu = menu;
    // ------------------------------------------

    // Event ------------------------------------
    win.on('new-win-policy', function(frame, url, policy) {
        policy.ignore();
        nw.Shell.openExternal(url);
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
        if (winIsMinimized) {
            config = preConfig
        }
        config.toTray = toTray;
        try {
            fs.writeFileSync(filePath, JSON.stringify(config));
        } catch(e) {
            app.quit();
        }
        app.quit();
    });

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
    // ------------------------------------------
})();
