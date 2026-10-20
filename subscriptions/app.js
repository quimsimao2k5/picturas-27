var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
const mongoose = require('mongoose');

var subscriptionsRouter = require('./routes/subscriptions');

const mongoDB = 'mongodb://subscriptions_mongoDB/subscription';

mongoose.connect(mongoDB);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Error connecting to MongoDB'));
db.once('open', () => {
  console.log('MongoDB connection successful');
});

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', subscriptionsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
