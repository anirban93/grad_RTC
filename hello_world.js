var http= require('http');
var https = require('https');
var express = require('express');
var io      = require("socket.io");         // web socket external module
var easyrtc = require("easyrtc");           // EasyRTC external module
var bodyParser =  require('body-parser');
var path = require('path');
//var hash = require('./pass').hash;
var password_algo = require('pwd');
var cookieParser = require('cookie-parser');
// var session = require("client-sessions");
var session = require("express-session");
var uuid = require('node-uuid');
var pem = require('pem');

// pem.createCertificate({days:1, selfSigned:true}, function(err, keys){
//             console.log(keys);

            var app = express();

            //app.use(cookieParser('shhhh, very secret'));
            // app.use(session({
            //   cookieName: 'mySession', // cookie name dictates the key name added to the request object
            //   secret: 'blargadeeblargblarg', // should be a large unguessable string
            //   duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
            //   activeDuration: 1000 * 60 * 5,
            //   cookie: {
            //     path: '/*', // cookie will only be sent to requests under '/api'
            //     maxAge: 600000, // duration of the cookie in milliseconds, defaults to duration above
            //     ephemeral: false, // when true, cookie expires when the browser closes
            //     httpOnly: true, // when true, cookie is not accessible from javascript
            //     secure: false // when true, cookie will only be sent over SSL. use key 'secureProxy' instead if you handle SSL not in your node process
            //   }
            // }));
            app.use(session({
              genid: function(req) {
                return uuid.v4(); // use UUIDs for session IDs
              },
              secret: 'veryyyyy',
              name: 'mooha',
              cookie : {
                path: '/',
                httpOnly: true,
                secureProxy: true
              }
            }));
            app.use(bodyParser.urlencoded({ extended: false }));
            app.use(express.static(__dirname+"/"));

            app.use(function(req, res, next) {
              res.header("Access-Control-Allow-Origin", "*");
              res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
              next();
            });



            var sess;



            //Handling root request
            app.get('/',function(req,res){
            	console.log('server hit');
            	res.sendFile(path.join(__dirname + '/public/index.html'));
            });

            //SQL PART
            var mysql = require('mysql');
            var dbconn = null;
            var user_hash = {};

            var pool = mysql.createPool({
              //connectionLimit: 25,
              host     : 'localhost',
              user     : 'root',
              password : '',//'ANKAN1993',
              database : 'nodesql'
            });

            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log(err);
                    console.log("Unable to get connection from pool");
                }
                else {
                    connection.query("USE nodesql;", [], function(error) {
                        if (error) {
                            console.log("didn't find db nodesql, have you created it?");
                        }
                    });
                }
                dbconn = connection;
            });

            function addUser(userName, mail, password, Id, Dept, successCB, failureCB) {
                password_algo.hash(password, function(err, salt, hash) {
                    if (err) {
                        failureCB(err, 0);
                    }
                    else {
                        var query = "insert into cuetrtc(username,email,salt,hash,id,dept) values(?,?,?,?,?,?)";
                        dbconn.query(query, [userName, mail,salt, hash,Id,Dept], function(err, result) {
                            if (err) {
                                failureCB(err);
                            }
                            else {
                                successCB();
                            }
                        });
                    }
                });
                    // password_algo.hash(password, function(err, salt, hash){
                    //     user_hash.salt = salt;
                    //     user_hash.hash = hash;


                    //     var query = "insert into cuetrtc(username,email,salt,hash,id,dept) values(?,?,?,?,?,?)";
                    //     dbconn.query(query, [userName, mail,user_hash.salt, user_hash.hash,Id,Dept], function(err, result) {
                    //         if (err) {
                    //             failureCB(err);
                    //         }
                    //         else {
                    //           console.log(user_hash);
                    //             successCB();
                    //         }
                    //     });
                    // });

            }

            function get_userdetails (userName, successCB, failureCB) {

              var query = "select username as user ,email as mail,id as id,dept as dept from cuetrtc where username = ?";
                dbconn.query(query, [userName], function(err, result) {
                    if (err) {
                        errorCB(err);
                    }
                    else if (result.length === 0) {
                        successCB(null);
                    }
                    else {
                        console.log(result[0]);
                        successCB(result[0]);
                    }
                });

            }

            // var connection = mysql.createConnection({
            //   host     : 'localhost',
            //   user     : 'root',
            //   password : '',//'ANKAN1993',
            //   database : 'nodesql'
            // });

            //	connection.connect();

            //	connection.end();
            function getPasswordEntry(userName, successCB, errorCB) {
                var query = "select salt as salt, hash as hash from cuetrtc where username = ?";
                dbconn.query(query, [userName], function(err, result) {
                    if (err) {
                        errorCB(err);
                    }
                    else if (result.length === 0) {
                        successCB(null);
                    }
                    else {
                        // console.log(result[0]);
                        successCB(result[0]);
                    }
                });
            }

            //SQL PART ENDED



            function checkPassword(userName, password, successCB, failCB) {
                getPasswordEntry(userName,
                        function(entry) {
                            if (!entry) {
                                failCB("No such user", 0);
                            }
                            else {

                                password_algo.hash(password, entry.salt, function(err, hash) {
                                    if (err) {
                                        failCB("hash failure:" + err, 1);
                                    }
                                    else if (hash !== entry.hash) {
                                        failCB("password doesn't match", 2);
                                    }
                                    else {
                                        successCB(userName);
                                    }
                                });

                            }
                        },
                        function(message, code) {
                            failCB("database error:" + message, code);
                        }
                );
            }

            // this function is used to check if you are authenticated
            // when trying to enter a demo page.
            //
            function restrict(req, res, next) {
                if (req.session.user) {
                  console.log('user is at');
                    next();
                } else {
                    console.log("denying access");
                    req.session.error = 'Access denied!';
                    res.redirect('/login_data');
                }
            }

            app.get('/login_data', function(req, res) {
                res.sendFile('index.html', {root: './public'});
            });


            app.post('/createaccount', function(req, res) {
                function loginSuccess() {
                    console.log("added user " + req.body.user);
                    res.send("added user " + req.body.user);

                res.redirect('/login_data');
                }

                function loginFail(errText, errCode) {
                  console.log("failed to add " + errText);
                    res.send("failed to add user" + errText);
                }

                function gotEntry(entry) {
                    if (!entry) {
                        addUser(req.body.user, req.body.mail, req.body.pw, req.body.id, req.body.dept, loginSuccess, loginFail);
                        console.log(req.body.user+" signed up");
                    }
                    else {
                        console.log('user already assigned');
                        //res.send("user " + req.body.user + " already existed");
                    }
                }

                function failedEntry(errorMessage, errorCode) {
                    res.send("attempt to get password entry failed " + errorMessage);
                }

                getPasswordEntry(req.body.user, gotEntry, failedEntry);
            });


            ////new login
            app.post('/login_data', function (req,res) {


                console.log('post hit');

                function loginSuccess() {
                        req.session.regenerate(function(err) {
                          sess = req.session;
                        // Store the user's primary key
                        // in the session store to be retrieved,
                        // or in this case the entire user object
                        if(err)
                        console.log('generation error' + err);
                        sess.user = req.body.user;
                        //res.locals.user=req.session.user;
                        //res.redirect('/app');
                        console.log(sess.user + ' joined');
                        console.log(sess);
                        //res.sendFile('app.html', {root: 'login'});
                        //res.session.user=user;
                        //res.sendFile('app.html',{root: './'});
                        res.json(sess);

                    });

                        //res.redirect('/app');

                }

                function loginFailure(errText, errCode) {
                    console.log("failed to login");
                    res.redirect('/login_data');
                }
                checkPassword(req.body.user, req.body.pw, loginSuccess, loginFailure);

            });

            ///old login

            // var id,row_data;
            // var user_name,password;

            //handling post request for app
                          // app.post('/login_data',function(req,res,next){

                          // 	 user_name , password = null;
                          //   console.log('post hit');
                          //   user_name=req.body.user;
                          //   password=req.body.pw;
                          //   console.log("post data below");
                          //   console.log(req.body);
                          //             //res.sendFile(path.join(__dirname+'/login/app.html'));
                          //             //res.json(user_name,id);
                          //             //console.log("User name = "+user_name+", Id is "+id);
                          //   res.redirect('/app');

                          // });

            app.get('/app',function (req,res) {
                      var json_data = {};
                      console.log('app hit');
                      sess = req.session;
                      // res.json(json_data);
                      //   console.log(json_data);
                      //   //res.sendFile(path.join(__dirname + '/app.html'));
                      ////sending query
                      function success_details (entry) {
                        // body...
                        console.log('json Found!');
                        json_data = entry;

                        res.json(json_data);

                        console.log(entry);
                      }

                      function fail_details (err) {
                        // body...
                        console.log('collecting details has failed'+err);
                      }

                      if(sess && sess.user){
                        get_userdetails(req.session.user,success_details,fail_details);
                        console.log('session ok!');
                        //sess.destroy();
                        //res.sendFile(path.join(__dirname + '/app.html'));
                        //res.json(json_data);
                      }
                      else{
                         console.log("nothing");
                        res.redirect('/login_data');
                      }
                      // if(req.mySession.user){
                      //   console.log('appsu hit');
                      //   res.json(json_data);
                      //   console.log(json_data);
                      //   req.session.reset();
                      //   //res.json(json_data);
                      // }

              // body...
            });


            // app.get('/app_data',function(req,res,next){

            //           var json_data = {};

            //           function success_details (entry) {
            //             // body...
            //             json_data = entry;
            //           }

            //           function fail_details (err) {
            //             // body...
            //             console.log('collecting details has failed'+err);
            //           }

            //           if(req.session && req.session.user){
            //             get_userdetails(req.session.user,success_details,fail_details);
            //             console.log(json_data);
            //             res.sendFile(path.join(__dirname + '/app.html'));
            //             //res.json(json_data);
            //           }
            //           else{
            //              console.log("nothing");
            //             res.redirect('/login_data');
            //           }
            //             //res.sendFile('app.html',{root: './'});


            //           	// pool.getConnection(function (err, connection) {

            //            //    if(err){
            //            //      console.log("Error in connection");
            //            //      //connection.release();
            //            //      res.json({"code":100, "status":"Error in connection"});
            //           	// 		return;
            //           	// 	}

            //           	// 	console.log("connection is id: "+connection.thredId);


            //           	// 	connection.query('SELECT name,id,state,dept,phone FROM cuetrtc WHERE pass=?',[password],function(err, rows, fields) {
            //           	// 		console.log(rows[0]);
            //            //      connection.release();
            //           	// 		if (err){
            //           	// 				throw err;
            //           	// 				return;
            //           	// 			}
            //           	// 		else{
            //           	// 				row_data = rows[0];
            //           	// 				console.log(row_data);
            //           	// 			}
            //           	// 	});

            //           	// });


            // 	// console.log('app hit');
            // 	// console.log("User name = "+user_name+", Id is "+password);
            // 	// json_data = row_data;


            // 	// res.json(json_data);
            // });



            // var multi_data = {};
            // app.post('/multi',function(req,res,next){
            //   multi_data = req.body;
            //   res.redirect('/multiparty');
            // });
            // //sending app page
            // app.get('/multiparty',function (req,res) {
            //   res.json(multi_data);
            //   // body...
            // })



            //end of app


            //listening server  https.createServer({key: keys.serviceKey, cert: keys.certificate}, app)
            var serv=http.createServer(app).listen(8888);

            serv.on('listening',function(){
                console.log('ok, server is running');
            });

            var socketServer = io.listen(serv, {"log level":1});
            var rtc = easyrtc.listen(app, socketServer);

// });
