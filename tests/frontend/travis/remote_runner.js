var srcFolder = "../../../src/node_modules/";
var wd = require(srcFolder + "wd");
var async = require(srcFolder + "async");

var config = {
    host: "ondemand.saucelabs.com"
  , port: 80
  , username: process.env.SAUCE_USER
  , accessKey: process.env.SAUCE_ACCESS_KEY
}

var allTestsPassed = true;

var sauceTestWorker = async.queue(function (testSettings, callback) {
  var browser = wd.promiseChainRemote(config.host, config.port, config.username, config.accessKey);
  var name = process.env.GIT_HASH + " - " + testSettings.browserName + " " + testSettings.version + ", " + testSettings.platform;
  testSettings.name = name;
  testSettings["public"] = true;
  testSettings["build"] = process.env.GIT_HASH;

  console.log('browser', browser)

  browser.init(testSettings).get("http://localhost:9001/tests/frontend/", function(){
    var url = "https://saucelabs.com/jobs/" + browser.sessionID;
    console.log("Remote sauce test '" + name + "' started! " + url);

    //tear down the test excecution
    var stopSauce = function(success){
      getStatusInterval && clearInterval(getStatusInterval);
      clearTimeout(timeout);

      browser.quit();

      if(!success){
        allTestsPassed = false;
      }

      var testResult = knownConsoleText.replace(/\[red\]/g,'\x1B[31m').replace(/\[yellow\]/g,'\x1B[33m')
                       .replace(/\[green\]/g,'\x1B[32m').replace(/\[clear\]/g, '\x1B[39m');
      testResult = testResult.split("\\n").map(function(line){
        return "[" + testSettings.browserName + (testSettings.version === "" ? '' : (" " + testSettings.version)) + "] " + line;
      }).join("\n");

      console.log(testResult);
      console.log("Remote sauce test '" + name + "' finished! " + url);

      callback();
    }

    //timeout for the case the test hangs
    var timeout = setTimeout(function(){
      stopSauce(false);
    }, 60000 * 10);

    var knownConsoleText = "";
    var getStatusInterval = setInterval(function(){
      var testResultFormatedScript = "function customReportFromHTML(){var globalResult='';var report=$('#report').clone();report.find('pre').remove();report.find('> li').each(function(index,element){var titleText=$(element).find('> h1').text();var testResultTitle=$(element).find('> ul > li > h1').text();var result='';$(element).find('> ul > li > ul > li').each(function(index,element){if($(element).hasClass('pass'))result+='[green]PASSED[clear] : ';if($(element).hasClass('fail'))result+='[red]FAILED[clear] : ';if($(element).hasClass('pending'))result+='[yellow]PENDING[clear] : ';result+=$(element).text()});globalResult+=titleText+''+testResultTitle+'  -> '+result+'  '});return globalResult;};customReportFromHTML();";
      browser.eval(testResultFormatedScript, function(err, consoleText){
        if(!consoleText || err){
          return;
        }
        knownConsoleText = consoleText;

        if(knownConsoleText.indexOf("FINISHED") > 0){
          var success = knownConsoleText.indexOf("FAILED") === -1;
          stopSauce(success);
        }
      });
    }, 5000);
  });
}, 5); //run 5 tests in parrallel

// Firefox
sauceTestWorker.push({
    'platform'       : 'Linux'
  , 'browserName'    : 'firefox'
  , 'version'        : ''
});

// Chrome
sauceTestWorker.push({
    'platform'       : 'Linux'
  , 'browserName'    : 'googlechrome'
  , 'version'        : ''
});

/*
// IE 8
sauceTestWorker.push({
    'platform'       : 'Windows 2003'
  , 'browserName'    : 'iexplore'
  , 'version'        : '8'
});
*/

// IE 9
sauceTestWorker.push({
    'platform'       : 'Windows XP'
  , 'browserName'    : 'iexplore'
  , 'version'        : '9'
});

// IE 10
sauceTestWorker.push({
    'platform'       : 'Windows 2012'
  , 'browserName'    : 'iexplore'
  , 'version'        : '10'
});

sauceTestWorker.drain = function() {
  setTimeout(function(){
    process.exit(allTestsPassed ? 0 : 1);
  }, 3000);
}
