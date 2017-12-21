﻿var jsTestUtil = (function() {
  var makeSequentialTest = function(tests) {
    return function(done) {
      var runRest = done;
      for (var i = tests.length; i-- > 0; ) {
        runRest = (function(func, runRest) {
          return function() {
            if (func.length === 0) {
              func();
              runRest();
            } else {
              func(runRest);
            }
          };
        })(tests[i], runRest);
      }
      runRest();
    };
  };
  var readFileUnavailable = false;
  var readFile = function(url, callbacks) {
    var onsuccess = callbacks.onsuccess || function() {};
    var onfail = callbacks.onfail || function() {};
    try {
      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        if (xhr.status === 200) {
          onsuccess(xhr.response);
        } else {
          onfail('XHR failed: ' + xhr.statusText);
        }
      };
      xhr.onerror = function() {
        onfail('XHR error occurred');
      };
      xhr.onabort = function() {
        onfail('XHR aborted');
      };
      xhr.open('GET', url);
      xhr.responseType = 'arraybuffer';
      xhr.send();
    } catch (e) {
      onfail('XHR failed to start');
    }
  };
  var dataURIFromArrayBuffer = function(ab) {
    var array = new Uint8Array(ab);
    var str = Array.from(
        array,
        function(code) { return String.fromCharCode(code); }
    ).join('');
    return 'data:application/octet-stream;base64,' + btoa(str);
  };
  var makeSelfTest = function() {
    var readFileTest = function(done) {
      readFile('data/hello.txt', {
        onsuccess: function(response) {
          var view = new Uint8Array(response);
          EXPECT_EQ( 14, view.length );
          EXPECT_EQ( 72 /* H */, view[0] );
          EXPECT_EQ( 33 /* ! */, view[12] );
          EXPECT_EQ( 10 /* \n */, view[13] );
          done();
        },
        onfail: function(message) {
          WARN(message);
          WARN('Since XHR seems to be unavailable, all tests using data files will be skipped.');
          readFileUnavailable = true;
          done();
        }
      });
    };
    var dataURIFromArrayBufferTest = function() {
      var ab = new ArrayBuffer(14);
      var u8 = new Uint8Array(ab);
      // 'Hello, world!\n'
      u8[0] = 72;
      u8[1] = 101;
      u8[2] = 108;
      u8[3] = 108;
      u8[4] = 111;
      u8[5] = 44;
      u8[6] = 32;
      u8[7] = 119;
      u8[8] = 111;
      u8[9] = 114;
      u8[10] = 108;
      u8[11] = 100;
      u8[12] = 33;
      u8[13] = 10;
      var datauri = dataURIFromArrayBuffer(ab);
      EXPECT_EQ( 'data:application/octet-stream;base64,SGVsbG8sIHdvcmxkIQo=', datauri );
    };
    var run = makeSequentialTest([
      readFileTest,
      dataURIFromArrayBufferTest,
    ]);
    return { run: run };
  };
  var makeFileBasedTestRunner = function() {
    var doneXHR = 0;
    var failXHR = 0;
    var tests = [];
    var readFileAndTest = function(url, callback) {
      var test = function(done) {
        readFile(url, {
          onsuccess : function(response) {
            callback(response, function() {
              done();
            });
          },
          onfail: function(message) {
            ERROR('File cannot be read (' + message + '): "' + url + '" ');
            failXHR += 1;
            done();
          }
        });
      };
      tests.push(test);
    };
    var run = function(done) {
      if (readFileUnavailable) {
        WARN('skipped');
        done();
        return;
      }
      for (var i = 0; i < tests.length; i++) {
        tests[i](function() {
          doneXHR += 1;
          if (tests.length === doneXHR) {
            done();
          }
        });
      }
    };
    return {
      readFileAndTest: readFileAndTest,
      run: run
    };
  };
  return {
    makeSequentialTest: makeSequentialTest,
    readFile: readFile,
    dataURIFromArrayBuffer: dataURIFromArrayBuffer,
    makeSelfTest: makeSelfTest,
    makeFileBasedTestRunner: makeFileBasedTestRunner
  };
})();
