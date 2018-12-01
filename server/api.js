let USER_NOT_FOUND_ERROR = new Error('User not found');
USER_NOT_FOUND_ERROR.code = 10000;
let USER_NOT_LOGGED_IN_ERROR = new Error('User not found or not logged in');
USER_NOT_LOGGED_IN_ERROR.code = 10001;
let FIELD_REQUIRED_ERROR = new Error('Fields required where left blank');
FIELD_REQUIRED_ERROR.code = 10002;
let TOKEN_INVALID_ERROR = new Error('Token was invalid');
TOKEN_INVALID_ERROR.code = 10003;

const NULLCHAR = String.fromCharCode(0x0);
const SEPCHAR = String.fromCharCode(0x1);

module.exports = function(app, db, bcrypt, utils){

    app.post('/api/loadmessages', function (req, res) {
        db.checkLoggedInUser(req.body.uuid).then(ok => {
            if (ok) {
                db.getMessages().then(result => {
                    let data = '';
                    for(let i=0;i<result.length;i++){
                        data += result[i].username + SEPCHAR;
                        data += result[i].message + SEPCHAR;
                        data += result[i].timesent.getTime();
                        if(i!=result.length-1)
                        data += NULLCHAR;
                    }
                    res.send(data);
                }).catch(err => console.error('ERROR:', err));
            } else {
                res.sendStatus(401); // Unauthorized
            }
        }).catch(err => {
            console.error('ERROR:', err);
            res.sendStatus(500); // Internal Server Error
        });
    });

    app.get('/api/loadmessages', function (req, res) {
        res.sendStatus(401);
    });

    app.post('/api/sendmessage/:message', function (req, res) {
        db.getUserForUUID(req.body.uuid).then(user => {
            console.log('CHAT:', user+':', req.params.message);
            db.addMessage(user, req.params.message);
            res.sendStatus(200);
        }).catch(err => {
            console.error('ERROR:', err);
            res.sendStatus(500); // Internal Server Error
        });
    });

    app.get('/api/sendmessage/:message', function (req, res) {
        res.sendStatus(401);
    });

    app.post('/api/getusername', function (req, res) {
        db.getUserForUUID(req.body.uuid).then(user => {
            res.send(user);
        }).catch(err => {
            if(err == USER_NOT_FOUND_ERROR){
                res.sendStatus(401); // Unauthorized
            }else{
                console.error('ERROR:', err);
                res.sendStatus(500);
            }
        });
    });

    app.get('/api/getusername', function (req, res) {
        res.sendStatus(405); // Bad method (GET instead of POST)
    });

    app.post('/api/login', function (req, res) {
        username = req.body.username;
        password = req.body.password;
        if (username && password) {
            db.getPasswordHash(username).then(hash => {
                bcrypt.verifyPromise(password, hash).then(same => {
                    if (same) {
                        console.log(username, 'logged in through the API.')
                        db.loginUser(username).then(user_uuid => {
                            res.status(200).send(user_uuid);
                        }).catch(err => {
                            console.error('ERROR: ', err);
                            res.sendStatus(500); // Server error
                        });
                    } else {
                        res.sendStatus(400); // Bad request: either username and/or pasword are not present
                    }
                });
            }).catch(err => {
                if(err == USER_NOT_FOUND_ERROR){
                    res.sendStatus(400); // Bad request: either username and/or pasword are not present
                }else{
                    console.error('ERROR: ', err);
                    res.sendStatus(500); // Server error
                }
            });
        } else {
            res.sendStatus(400); // Bad request: either username and/or pasword are not present
        }
    });

    app.get('/api/login', function (req, res) {
        res.sendStatus(405); // Bad Method
    });

    app.post('/api/logout', function (req, res) {
        db.logoutUser(req.body.uuid);
    });

    app.get('/api/logout', function (req, res) {
        res.sendStatus(405); // Bad Method
    });

    app.post('/api/updatePassword', function(req, res){
        let old_password = req.body.old_password;
        let new_password = req.body.new_password;
        let new_password_repeat = req.body.new_password_repeat;
        let uuid = req.body.uuid;
        db.getUserForUUID(uuid).then(user => {
            if(new_password == new_password_repeat){
                db.getPasswordHash(user).then(hash => {
                    bcrypt.verifyPromise(old_password, hash).then(ok => {
                        if(ok){
                            bcrypt.update(user, new_password).then(()=>{
                                res.sendStatus(200); // Success
                            }).catch(err => {
                                if(err == USER_NOT_FOUND_ERROR){
                                    res.sendStatus(401); // Unauthorized
                                }else{
                                    console.error('ERROR:', err);
                                    res.sendStatus(500);
                                }
                            });
                        }else{
                            res.sendStatus(401); // Unauthorized
                        }
                    }).catch(err => {
                        if(err == USER_NOT_FOUND_ERROR){
                            res.sendStatus(401); // Unauthorized
                        }else{
                            console.error('ERROR:', err);
                            res.sendStatus(500);
                        }
                    });
                }).catch(err => {
                    if(err == USER_NOT_FOUND_ERROR){
                        res.sendStatus(401); // Unauthorized
                    }else{
                        console.error('ERROR:', err);
                        res.sendStatus(500);
                    }
                });
            }else{
                res.sendStatus(400); // Bad request
            }
        }).catch(err => {
            if(err == USER_NOT_FOUND_ERROR){
                res.sendStatus(401); // Unauthorized
            }else{
                console.error('ERROR:', err);
                res.sendStatus(500);
            }
        });
        
    });

    app.get('/api/teapot', function (req, res) {
        console.log('I\'m a teapot!');
        res.sendStatus(418); // I'm a teapot
    });

    app.get('/api/*', function (req, res) {
        console.log('Tried to access a not implemented part of the API: ' + req.url);
        res.sendStatus(404); // Not found
    });

};