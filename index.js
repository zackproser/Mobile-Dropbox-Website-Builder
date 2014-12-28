var Dropbox = require('dropbox'),
    path = require('path'),
    fs = require('fs'),
    helpers = require('./lib/helpers'),
    bodyParser = require('body-parser'),
    nodemailer = require('nodemailer'),
    express = require('express'),
    hbs = require('express-hbs'),
    app = express();

var settings = {
    image_folder: "/website images",
    build_folder: "build/img",
}

var smtpTransport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
        user: "YOUR-GMAIL-USERNAME",
        pass: "YOUR-GMAIL-PASSWORD"
    }
});


var client = new Dropbox.Client({
    key: "YOUR-DROPBOX-CLIENT-KEY",
    secret: "YOUR-DROPBOX-CLIENT-SECRET",
    sandbox: false,
    token: "YOUR-DROPBOX-CLIENT-TOKEN"

});

var showError = function(error) {
    switch (error.status) {
        case Dropbox.ApiError.INVALID_TOKEN:
            // If you're using dropbox.js, the only cause behind this error is that
            // the user token expired.
            // Get the user through the authentication flow again.
            break;

        case Dropbox.ApiError.NOT_FOUND:
            // The file or folder you tried to access is not in the user's Dropbox.
            // Handling this error is specific to your application.
            break;

        case Dropbox.ApiError.OVER_QUOTA:
            // The user is over their Dropbox quota.
            // Tell them their Dropbox is full. Refreshing the page won't help.
            break;

        case Dropbox.ApiError.RATE_LIMITED:
            // Too many API requests. Tell the user to try again later.
            // Long-term, optimize your code to use fewer API calls.
            break;

        case Dropbox.ApiError.NETWORK_ERROR:
            // An error occurred at the XMLHttpRequest layer.
            // Most likely, the user's network connection is down.
            // API calls will not succeed until the user gets back online.
            break;

        case Dropbox.ApiError.INVALID_PARAM:
        case Dropbox.ApiError.OAUTH_ERROR:
        case Dropbox.ApiError.INVALID_METHOD:
        default:
            // Caused by a bug in dropbox.js, in your application, or in Dropbox.
            // Tell the user an error occurred, ask them to refresh the page.
    }
};

client.onError.addListener(function(error) {
    console.error(error);
});

function setupMiddleware() {

    app.use(bodyParser());

    app.engine('hbs', hbs.express3({
        defaultLayout: path.join(__dirname, 'build/views/layouts/default.hbs')
    }));
    app.set('views', __dirname + '/build/views');
    app.set('view engine', 'hbs');
    app.set('view cache', false);

    if (process.env.NODE_ENV == 'development') {
        console.log('Development environment detected...');
        app.set('port', 3000);
    } else if (process.env.NODE_ENV == 'production') {
        console.log('Production environment detected...');
        app.set('port', 80);
    }
    app.use(express.static(__dirname + '/build'));
}

function start() {
    app.listen(app.get('port'), function() {
        console.log('Listening on : ' + app.get('port'));
    });
}

function cleanUpDeleted() {
    console.log('Cleaning up deleted items...');
    fs.readdir(settings.build_folder, function(err, entries) {
        entries.forEach(function(filename) {
            fs.stat(localPath(filename), function(err, stat) {
                if (stat.isFile() && isValidFile(filename)) {
                    client.stat(dropboxPath(filename), function(err, stat) {
                        if (err) console.error(err);
                        if (stat && stat.isRemoved == true) {
                            fs.unlinkSync(localPath(filename));
                        }
                    });
                }
                if (stat.isDirectory()) {
                    client.stat(dropboxPath(filename), function(err, stat) {
                        if (err) console.error(err);
                        if (stat && stat.isRemoved == true) {
                            deleteFolderRecursive(localPath(filename));
                        } else if (stat && stat.isRemoved == false) {
                            fs.readdir(localPath(filename), function(err, dirFiles) {
                                dirFiles.forEach(function(dirfile) {
                                    client.stat(path.join(settings.image_folder, filename, dirfile), function(err, stat) {
                                        if (err) console.error(err);
                                        if (stat && stat.isRemoved == true) {
                                            fs.unlinkSync(path.join(settings.build_folder, filename, dirfile));
                                        } else if (!stat) {
                                            deleteFolderRecursive(localPath(filename));
                                        }
                                    });
                                });
                            });
                        }
                    });
                }
            });
        });
    });
}

function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function(file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

function readDropboxStructure() {
    client.readdir(settings.image_folder, function(err, entries) {
        entries.forEach(function(entry) {
            client.stat(dropboxPath(entry), {
                readDir: true,
                removed: true
            }, function(err, stat, dirFiles) {
                if (err) console.error(err);
                if (stat.isFolder == true) {
                    if (!fs.existsSync(localPath(entry))) {
                        buildNewDirectory(entry);
                    } else if (fs.existsSync(localPath(entry))) {
                        syncPresentDirectory(entry);
                    }
                } else if (stat.isFile == true) {
                    if (!fs.existsSync(localPath(entry))) {
                        writeFileToRoot(entry);
                    }
                }
            });
        });
    });
    cleanUpDeleted();
}

function writeFileToRoot(filename) {
    client.readFile(path.join(settings.image_folder, filename), {
        buffer: true
    }, function(err, data) {
        if (err) return showError(err);
        fs.writeFile(localPath(filename), data, 'binary', function(err) {
            if (err) console.error(err);
        });
    });
}

function syncPresentDirectory(dirname) {
    client.readdir(dropboxPath(dirname), function(error, entries) {
        if (error) return showError(error);
        entries.forEach(function(filename) {
            if (!fs.existsSync(path.join(settings.build_folder, dirname, filename))) {
                client.readFile(path.join(settings.image_folder, dirname, filename), {
                    buffer: true
                }, function(err, data) {
                    if (error) return showError(error);
                    fs.writeFile(path.join(settings.build_folder, dirname, filename), data, 'binary', function(err) {
                        if (err) console.error(err);
                    });
                });
            }
        });
    });
}

function buildNewDirectory(dirname) {
    fs.mkdir(localPath(dirname), function(err) {
        if (err) {
            console.error(err);
        } else if (!err) {
            client.readdir(dropboxPath(dirname), function(error, entries) {
                if (error) return showError(error);
                entries.forEach(function(filename) {
                    client.readFile(path.join(settings.image_folder, dirname, filename), {
                        buffer: true
                    }, function(error, data) {
                        if (error) return showError(error);
                        fs.writeFile(path.join(settings.build_folder, dirname, filename), data, 'binary', function(err) {
                            if (err) console.error(err);
                        });

                    });
                });

            });
        }
    });
}

dropboxPath = function(filename) {
    return path.join(settings.image_folder, filename);
}

localPath = function(filename) {
    return path.join(settings.build_folder, filename);
}

isValidFile = function(file) {
    var valid = (file !== '.DS_Store') ? true : false;
    return valid;
}

//Get local directory names to create Nav programmatically
function gatherImageNames(callback) {
    var valid_files = [];
    fs.readdir('build/img/', function(err, files) {
        files.forEach(function(file) {
            if (isValidFile(file)) {
                fs.stat(localPath(file), function(err, stat) {
                    if (stat && stat.isFile()) {
                        valid_files.push(file);
                    };
                });
            }
        });
        callback(null, valid_files);
    });
}

function getNavCategories() {
    var dirs = [];
    var files = fs.readdirSync('build/img/');
    files.forEach(function(file) {
        var stat = fs.statSync(localPath(file));
        if (stat.isDirectory()) {
            dirs.push(file);
        }
    });
    return dirs;
}

function getCategoryImages(dirname, callback) {
    fs.readdir(path.join('build/img', dirname), function(err, files) {
        if (err) callback(err);
        console.log(files);
        callback(null, files);
    });
}

setupMiddleware();
start();
readDropboxStructure();


/////////////
// ROUTES
/////////////

app.get('/', function(req, res) {
    var categories = getNavCategories();
    gatherImageNames(function(err, files) {
        if (err) console.error(err);
        console.log('Main route received files: ' + files);
        res.status(200);
        res.render('index', {
            title: 'YOUR-HOMEPAGE-TITLE',
            files: files,
            categories: categories
        });
    });
});

app.get('/category/:category', function(req, res) {
    var category = req.params.category;
    var categories = getNavCategories();
    console.log("category is " + category);
    getCategoryImages(req.params.category, function(err, files) {
        var title = req.params.category + ' Photos';
        res.status(200);
        res.render('category', {
            title: title,
            categories: categories,
            category: category,
            files: files
        });
    });

});

app.post('/webhook', function(req, res) {
    console.log('received webhook');
    console.dir(req.body);
    readDropboxStructure();
    res.status(200);
});

app.get('/about', function(req, res) {
    var categories = getNavCategories();
    res.status(200);
    res.render('about', {
        title: 'YOUR-ABOUT-PAGE-TITLE',
        categories: categories
    });
});

app.post('/inbound', function(req, res) {

    var sender_email = req.body.email,
        sender_message = req.body.message;

    var mailOptions = {
        from: sender_email,
        to: "YOUR-GMAIL-ADDRESS",
        subject: "YOUR-SITE-INQUIRY-SUBJECT",
        text: "from: " + sender_email + " message: " + sender_message
    };

    smtpTransport.sendMail(mailOptions, function(err, response) {
        if (err) {
            console.error(err);
        } else {
            console.log("Message sent: " + response.message);
            res.send('asd762etwefg836752');
        }
    });

});

app.get('/contact', function(req, res) {
    var categories = getNavCategories();
    res.status(200);
    res.render('contact', {
        title: 'Contact Me',
        categories: categories
    });
});





