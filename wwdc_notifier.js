/* The MIT License
 
 Copyright (c) 2011 Paul Crawford
 
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE. */

/*
  WWDCNotifier.js
*/

var http = require('http'),
    rest = require('restler'),
    sys = require('sys'),
    fs = require('fs');

process.on('uncaughtException', function(err) {
  console.log("EXCEPTION: " + err);
});

function WWDCNotifier() {
  // force the return of a new object
  if (! (this instanceof arguments.callee)) {
    return new arguments.callee(arguments);
  }
  
  var self = this;    
  self.init();
};

WWDCNotifier.prototype.init = function() {
  var self = this;
  
  self.loadConfig("./config.json");
  self.loadNumbers("./numbers.json");
  console.log("Initializing WWDC Notifier");  
};

WWDCNotifier.prototype.loadConfig = function (configPath) {
  var self = this;
  self.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
};

WWDCNotifier.prototype.loadNumbers = function (numbersPath) {
  var self = this;
  self.numbers = JSON.parse(fs.readFileSync(numbersPath, 'utf8'));
};

WWDCNotifier.prototype.writeNumbers = function (numbersPath) {
  var self = this;
  fs.writeFileSync(numbersPath, JSON.stringify(self.numbers), 'utf8');
};

WWDCNotifier.prototype.addNumber = function (numberStr) {
  var self = this;
  self.numbers.concat(numberStr);
  self.writeNumbers('./numbers.json');
};

WWDCNotifier.prototype.sendSMS = function (opt, callback) {
  var self = this;
  var accountSid = self.config.accountSid,
      authToken = self.config.authToken,
      apiVersion = '2010-04-01',
      uri = '/'+apiVersion+'/Accounts/'+accountSid+'/SMS/Messages',
      host = 'api.twilio.com',
      fullURL = 'https://'+accountSid+':'+authToken+'@'+host+uri,
      from = opt.from || self.config.from,
      statusCallback = opt.statusCallback
      to = opt.to,
      body = opt.body;

  rest.post(fullURL, {
      data: { From:from, To:to, Body:body, StatusCallback: statusCallback}
  }).addListener('complete', function(data, response) {
     callback();
     console.log("Sent");
  });
};

WWDCNotifier.prototype.newWWDCAnnounced = function () {
  var self = this;
  var options = {
    host: 'developer.apple.com',
    port: 80,
    path: '/wwdc/',
    method: 'GET'
  };

  var matched = false;
  var req = http.request(options, function(res) {    
    res.setEncoding('utf8');
    res.on('data', function (chunk) {      
      match = chunk.match(/<title>Apple Worldwide Developers Conference 2010<\/title>/);
      if(match && match.length > 0) {
        matched = true;
      }
    });
  });
  req.end();

  return matched;
};

WWDCNotifier.prototype.start = function() {
  var self = this;
  console.log("Starting WWDC Notifier");
  setInterval(function() {
    if(self.newWWDCAnnounced()) {          
      self.numbers.forEach(function(numberStr){
        self.sendSMS({to:numberStr, body:"WWDC Announced! Check it out: http://developer.apple.com/wwdc/", statusCallback: "http://bexler.com:8002/smsin"}, function() {
          console.log("Send SMS!");
          
          if(numberStr == self.numbers[self.numbers.length-1]) {
            console.log("All messages sent, exiting...");
            process.exit();
          }          
        });
      });
    }
  }, 1000*self.config.intervalSeconds);
};

module.exports = WWDCNotifier;