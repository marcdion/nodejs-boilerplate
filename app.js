"use strict";
/* jshint node: true */

//Importation des modules requis pour l'éxécution de notre application
var express             = require("express");
var path                = require("path");
var bodyparser          = require("body-parser");
var passport            = require("passport");
var mongoose            = require("mongoose");
var cors                = require("cors");
var bunyan              = require("bunyan");
var helmet              = require("helmet");
var exphbs              = require("express-handlebars");
var sslRedirect         = require("heroku-ssl-redirect");
var morgan              = require('morgan');
var fileupload          = require('express-fileupload');
var busboy              = require('connect-busboy');
var busboyBodyParser    = require('busboy-body-parser');
var Raven               = require('raven');

//Importation du fichier de configuration
var configuration       = require("./config/db");

//Création de l'application et définition de son port
var app                 = express();
var port                = process.env.PORT || 8082;

// Création du logger Bunyan en précisant qu"il faut utiliser les
// sérialiseurs par défaut pour les requêtes (req) et les réponses (res).
var log = bunyan.createLogger({
    name: "Bunyan Logger",
    src: true,
    serializers: {
        req: bunyan.stdSerializers.req,
        res: bunyan.stdSerializers.res,
        err: bunyan.stdSerializers.err
    }
});

//Création du view engine en utilisant express-handlebars
var handlebars = exphbs.create({
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, "/views/layouts"),
    partialsDir: path.join(__dirname, "/views/partials"),
});

if(process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

//View engine
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, "/views"));
app.use(express.static(path.join(__dirname, '/public')));

//Setting DB_URI depending on node environnement
if(process.env.NODE_ENV  === 'dev') {
    DB_URI = configuration.mongoDev;
}else if (process.env.NODE_ENV  === 'production'){
    DB_URI = configuration.mongoProd;
    Raven.config('https://b28fbeebbea845a8ba1cd51aed8f9e9b:4d45907d750e443784ffe1fde09afddc@sentry.io/303368').install();
}else{
    DB_URI = configuration.mongoTest;
}

//Connection to MongoDB Database
mongoose.connect(DB_URI, {});
mongoose.connection.on("connected", function () {
    console.log("Connected to database " + DB_URI);
});
mongoose.connection.on("error", function (err) {
    console.log("Mongo error " + err);
});

//CORS Middleware
app.use(cors());

//SSL Redirect for Heroku
app.use(sslRedirect());

//Helmet MiddleWare
app.use(helmet());

app.use(busboy());
app.use(busboyBodyParser());

//Body Parser Middleware
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended: true
}));

//Passport middleware
app.use(passport.initialize());
app.use(passport.session());

require("./config/passport")(passport);

app.use("/api/", routing_membres);

app.use("/", routing_app);

// error handler
app.get('*', function(req, res){
    res.render('404', {
        layout: 'error'
    });
});

//Start server
app.listen(port, function () {
    log.info("Server started on port %s ", port);
});