WWDCNotifier = require('./wwdc_notifier');

// start an instance with a 10 second interval
var checker = new WWDCNotifier();
checker.start();