﻿var compareUtil = (function() {

  var blobFromDataURI = function(dataURI, type) {
    var parts = dataURI.split(',');
    type = type || parts[0].match(/:(.*?);/)[1];
    var str = atob(parts[1]);
    var n = str.length;
    var buffer = new Uint8Array(n);
    while(n--) {
      buffer[n] = str.charCodeAt(n);
    }
    return new Blob([buffer], {type: type});
  };

  var createObjectURL = function(blob) {
    if (window.URL) {
      return window.URL.createObjectURL(blob);
    } else {
      return window.webkitURL.createObjectURL(blob);
    }
  };
  var revokeObjectURL = function(url) {
    if (window.URL) {
      return window.URL.revokeObjectURL(url);
    } else {
      return window.webkitURL.revokeObjectURL(blob);
    }
  };

  var newWorker = function(relativePath) {
    try {
      return new Worker(relativePath);
    } catch (e) {
      var baseURL = window.location.href.
                        replace(/\\/g, '/').replace(/\/[^\/]*$/, '/');
      var array = ['importScripts("' + baseURL + relativePath + '");'];
      var blob = new Blob(array, {type: 'text/javascript'});
      return new Worker(createObjectURL(blob));
    }
  };

  var toggleFullscreen = function(element) {
    var fullscreen = document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement;
    if (!fullscreen) {
      var view = element;
      if (view.webkitRequestFullscreen) {
        view.webkitRequestFullscreen();
      } else if (view.mozRequestFullScreen) {
        view.mozRequestFullScreen();
      } else if (view.msRequestFullscreen) {
        view.msRequestFullscreen();
      } else {
        view.requestFullscreen();
      }
    } else {
      if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  var clamp = function(num, lower, upper) {
    return Math.max(lower, Math.min(upper, num));
  };

  var calcGCD = function(a, b) {
    var m = Math.max(a, b), n = Math.min(a, b);
    while (n > 0) {
      var r = m % n;
      m = n;
      n = r;
    }
    return m;
  };

  var addComma = function(num) {
    return String(num).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
  };

  var toPercent = function(num) {
    if (num === 0) return '0%';
    if (num === 1) return '100%';
    var digits =
            num < 0.000001 ? 7 :
            num < 0.00001 ? 6 :
            num < 0.0001 ? 5 :
            num < 0.001 ? 4 :
            num < 0.01 ? 3 :
            num < 0.1 ? 2 :
            num < 0.9 ? 1 :
            num < 0.99 ? 2 :
            num < 0.999 ? 3 :
            num < 0.9999 ? 4 :
            num < 0.99999 ? 5 :
            num < 0.999999 ? 6 : 7;
    return (num * 100).toFixed(digits) + '%';
  };

  //
  // Make a binary view of a DataURI string
  //
  // Applying atob() to a Base64 string from a very large image file
  // such as > 10MBytes takes unnecessary long execution time.
  // This binary view object provides O(1) random access of dataURI.
  //
  var binaryFromDataURI = function(dataURI) {
    var offset = dataURI.indexOf(',') + 1;
    var isBase64 = 0 <= dataURI.slice(0, offset - 1).indexOf(';base64');
    var binary = null;
    var len;

    if (isBase64) {
      len = (dataURI.length - offset) / 4 * 3;
      if (3 <= len) {
        len = len - 3 +
            atob(dataURI.slice(dataURI.length - 4, dataURI.length)).length;
      }
    } else {
      binary = decodeURIComponent(dataURI.slice(offset));
      len = binary.length;
    }

    var read = function(addr) {
      if (addr >= len) {
        return null;
      }
      if (isBase64) {
        var mod = addr % 3;
        var pos = (addr - mod) / 3 * 4;
        var bytes = atob(dataURI.slice(offset + pos, offset + pos + 4));
        var ret = bytes.charCodeAt(mod);
        return ret;
      } else {
        return binary.charCodeAt(addr);
      }
    };
    var readBig16 = function(addr) {
      return read(addr) * 256 + read(addr + 1);
    };
    var readLittle16 = function(addr) {
      return read(addr) + read(addr + 1) * 256;
    };
    var readBig32 = function(addr) {
      return readBig16(addr) * 65536 + readBig16(addr + 2);
    };

    return {
      length:   len,
      at:       read,
      big16:    readBig16,
      little16: readLittle16,
      big32:    readBig32
    };
  };

  var detectPNGChunk = function(binary, target, before) {
    for (var p = 8; p + 8 <= binary.length; ) {
      var len = binary.big32(p);
      var chunk = binary.big32(p + 4);
      if (chunk === target) { return p; }
      if (chunk === before) { break; }
      p += len + 12;
    }
    return null;
  };

  var detectMPFIdentifier = function(binary) {
    for (var p = 0; p + 4 <= binary.length; ) {
      var m = binary.big16(p);
      if (m === 0xffda /* SOS */) { break; }
      if (m === 0xffe2 /* APP2 */) {
        if (binary.big32(p + 4) === 0x4d504600 /* 'MPF\0' */) {
          return p;
        }
      }
      p += 2 + (m === 0xffd8 /* SOI */ ? 0 : binary.big16(p + 2));
    }
    return null;
  };

  var detectExifOrientation = function(binary) {
    for (var p = 0; p + 4 <= binary.length; ) {
      var m = binary.big16(p);
      if (m === 0xffda /* SOS */) { break; }
      if (m === 0xffe1 /* APP1 */) {
        if (p + 20 > binary.length) { break; }
        var big = binary.big16(p + 10) === 0x4d4d; /* MM */
        var read16 = big ? binary.big16 : binary.little16;
        var fields = read16(p + 18);
        if (p + 20 + fields * 12 > binary.length) { break; }
        for (var i = 0, f = p + 20; i < fields; i++, f += 12) {
          if (read16(f) === 0x0112 /* ORIENTATION */) {
            return read16(f + 8);
          }
        }
        break;
      }
      p += 2 + (m === 0xffd8 /* SOI */ ? 0 : binary.big16(p + 2));
    }
    return null;
  };

  var detectImageFormat = function(binary) {
    var magic = binary.length < 4 ? 0 : binary.big32(0);
    var magic2 = binary.length < 8 ? 0 : binary.big32(4);

    if (magic === 0x89504e47) {
      // PNG
      if (detectPNGChunk(
                binary, 0x6163544c /* acTL */, 0x49444154 /* IDAT */)) {
        return 'PNG (APNG)';
      }
      return 'PNG';
    }
    if (magic === 0x47494638) { return 'GIF'; }
    if ((magic & 0xffff0000) === 0x424d0000) { return 'BMP'; }
    if ((magic - (magic & 255)) === 0xffd8ff00) {
      if (detectMPFIdentifier(binary)) {
        return 'JPEG (MPF)';
      }
      return 'JPEG';
    }
    if (magic === 0x4d4d002a || magic === 0x49492a00) { return 'TIFF'; }
    if ((magic === 0xefbbbf3c /* BOM + '<' */ &&
            magic2 === 0x3f786d6c /* '?xml' */) ||
        (magic === 0x3c3f786d /* '<?xm' */ &&
            (magic2 & 0xff000000) === 0x6c000000 /* 'l' */)) {
        // XML
        var i = 4;
        for (var x; x = binary.at(i); ++i) {
          if (x === 0x3c /* '<' */) {
            var y = binary.at(i + 1);
            if (y !== 0x3f /* '?' */ && y !== 0x21 /* '!' */) { break; }
          }
        }
        var sig1 = binary.length < i + 4 ? 0 : binary.big32(i);
        if (sig1 === 0x3c737667 /* <svg */) {
          return 'SVG';
        }
    }
    //alert(magic);
    return null;
  };

  var cursorKeyCodeToXY = function(keyCode, step) {
    step = step !== undefined ? step : 1;
    var x = keyCode === 37 ? -step : keyCode === 39 ? step : 0;
    var y = keyCode === 38 ? -step : keyCode === 40 ? step : 0;
    return { x: x, y: y };
  };
  var calcInscribedRect = function(outerW, outerH, innerW, innerH) {
    var rect = {};
    var isLetterBox = outerW * innerH < outerH * innerW;
    rect.width = isLetterBox ? outerW : outerH * innerW / innerH;
    rect.height = isLetterBox ? outerW * innerH / innerW : outerH;
    return rect;
  };
  var processKeyDownEvent = function(e, callback) {
    // '+;' (59, 187 or 107 for numpad) / PageUp (33)
    if (e.keyCode === 59 || e.keyCode === 187 || e.keyCode === 107 ||
        (e.keyCode === 33 && !e.shiftKey)) {
      if (callback.zoomIn) {
        return callback.zoomIn();
      }
    }
    // '-' (173, 189 or 109 for numpad) / PageDown (34)
    if (e.keyCode === 173 || e.keyCode === 189 || e.keyCode === 109 ||
        (e.keyCode === 34 && !e.shiftKey)) {
      if (callback.zoomOut) {
        return callback.zoomOut();
      }
    }
    // cursor key
    if (37 <= e.keyCode && e.keyCode <= 40) {
      if (callback.cursor) {
        return callback.cursor();
      }
    }
  };
  var processWheelEvent = function(e, callback) {
    var event = e.originalEvent;
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
      return true;
    }
    var deltaScale = event.deltaMode === 0 ? /* PIXEL */ 0.1 : /* LINE */ 1.0;
    var steps = clamp(event.deltaY * deltaScale, -3, 3);
    if (steps !== 0) {
      if (callback.zoom) {
        callback.zoom(steps);
      }
      return false;
    }
  };
  var makeTouchEventFilter = function() {
    var touchState = null;
    var tapPoint = null;
    var resetState = function() {
      touchState = null;
      tapPoint = null;
    };
    var updateState = function(e, callback) {
      var event = e.originalEvent;
      if (event.touches.length === 1 || event.touches.length === 2) {
        var touches = Array.prototype.slice.call(event.touches);
        touches.sort(function(a, b) {
          return (
              a.identifier < b.identifier ? -1 :
              a.identifier > b.identifier ? 1 : 0
          );
        });
        if (!touchState || touchState.length !== touches.length) {
          touchState = [];
        }
        for (var i = 0; i < touches.length; ++i) {
          if (!touchState[i] ||
                touchState[i].identifier !== touches[i].identifier) {
            touchState[i] = {
              x: touches[i].clientX,
              y: touches[i].clientY,
              identifier: touches[i].identifier
            };
          }
        }
        if (callback) {
          callback(touchState, touches);
        }
        for (var i = 0; i < touches.length; ++i) {
          touchState[i].x = touches[i].clientX;
          touchState[i].y = touches[i].clientY;
          touchState[i].pageX = touches[i].pageX;
          touchState[i].pageY = touches[i].pageY;
        }
        return false;
      }
    };
    var onTouchStart = function(e) {
      return updateState(e, function(lastTouches, touches) {
        if (touches.length === 1) {
          tapPoint = touches[0];
        }
      });
    };
    var onTouchMove = function(e, callback) {
      return updateState(e, function(lastTouches, touches) {
        if (tapPoint) {
          if (touches.length !== 1 ||
              3 <= Math.abs(touches[0].clientX - tapPoint.clientX) ||
              3 <= Math.abs(touches[0].clientY - tapPoint.clientY)) {
            tapPoint = null;
          }
        }
        var dx = 0, dy = 0;
        for (var i = 0; i < touches.length; ++i) {
          dx += touches[i].clientX - lastTouches[i].x;
          dy += touches[i].clientY - lastTouches[i].y;
        }
        dx = dx / touches.length;
        dy = dy / touches.length;
        if (touches.length === 1) {
          if (callback.move) {
            callback.move(dx, dy);
          }
        } else if (touches.length === 2) {
          var x0 = lastTouches[0].x - lastTouches[1].x;
          var y0 = lastTouches[0].y - lastTouches[1].y;
          var x1 = touches[0].clientX - touches[1].clientX;
          var y1 = touches[0].clientY - touches[1].clientY;
          var s0 = Math.sqrt(x0 * x0 + y0 * y0);
          var s1 = Math.sqrt(x1 * x1 + y1 * y1);
          if (0 < s0 * s1) {
            var r = Math.log(s1 / s0) / Math.LN2;
            r = clamp(r, -2, 2);
            var center = {
              pageX: (touches[0].pageX + touches[1].pageX) * 0.5,
              pageY: (touches[0].pageY + touches[1].pageY) * 0.5
            };
            if (callback.zoom) {
              callback.zoom(dx, dy, r, center);
            }
          }
        }
      });
    };
    var onTouchEnd = function(e, callback) {
      if (touchState) {
        updateState(e);
        if (tapPoint && e.originalEvent.touches.length === 0) {
          if (callback.pointClick) {
            callback.pointClick(tapPoint);
          }
          resetState();
        }
        return false;
      }
    };
    return {
      resetState: resetState,
      onTouchStart: onTouchStart,
      onTouchMove: onTouchMove,
      onTouchEnd: onTouchEnd
    };
  };

  var makeZoomController = function(update, options) {
    options = options !== undefined ? options : {};
    var MAX_ZOOM_LEVEL    = 6.0;
    var ZOOM_STEP_KEY     = 0.25;
    var ZOOM_STEP_WHEEL   = 0.0625;
    var ZOOM_STEP_DBLCLK  = 2.00;
    var cursorMoveDelta = options.cursorMoveDelta || 0.3;
    var getBaseSize = options.getBaseSize || function(index) {};
    var zoomXOnly = false;
    var o = {
      zoom: 0,
      scale: 1,
      offset: { x: 0.5, y: 0.5 }
    };
    var enabled = true;
    var pointCallback = null;
    var clickPoint = null;
    var dragStartPoint = null;
    var dragLastPoint = null;
    var touchFilter = makeTouchEventFilter();
    o.enable = function(options) {
      options = options !== undefined ? options : {};
      enabled = true;
      zoomXOnly = options.zoomXOnly !== undefined ? options.zoomXOnly : zoomXOnly;
      getBaseSize = options.getBaseSize || getBaseSize;
    };
    o.disable = function() { enabled = false; };
    var setZoom = function(z) {
      o.zoom = z;
      o.scale = Math.round(Math.pow(2.0, z) * 100) / 100;
    };
    var zoomRelative = function(delta) {
      if (enabled) {
        setZoom(clamp(o.zoom + delta, 0, MAX_ZOOM_LEVEL));
        update();
        return true;
      }
    };
    var zoomIn = function() { return zoomRelative(+ZOOM_STEP_KEY); };
    var zoomOut = function() { return zoomRelative(-ZOOM_STEP_KEY); };
    var setOffset = function(x, y) {
      x = clamp(x, 0, 1);
      y = zoomXOnly ? 0.5 : clamp(y, 0, 1);
      if (o.offset.x !== x || o.offset.y !== y) {
        o.offset.x = x;
        o.offset.y = y;
        return true;
      }
    };
    var getCenter = function() {
      return {
        x: (o.offset.x - 0.5) * (1 - 1 / o.scale),
        y: (o.offset.y - 0.5) * (1 - 1 / o.scale)
      };
    };
    var moveRelativeWithoutUpdate = function(dx, dy) {
      if (1 < o.scale && enabled) {
        return setOffset(
                        o.offset.x + dx / (o.scale - 1),
                        o.offset.y + dy / (o.scale - 1));
      }
    };
    var moveRelative = function(dx, dy) {
      var result = moveRelativeWithoutUpdate(dx, dy);
      if (result) {
        update();
        return result;
      }
    };
    var moveRelativePx = function(index, dx, dy) {
      var base = getBaseSize(index);
      if (base) {
        moveRelative(-dx / base.w, -dy / base.h);
      }
    };
    var zoomRelativeToPoint = function(dx, dy, delta, pos) {
      if (enabled && pos) {
        if (dx !== 0 || dy !== 0) {
          moveRelativeWithoutUpdate(dx, dy);
        }
        var c1 = getCenter();
        var s1 = o.scale;
        setZoom(clamp(o.zoom + delta, 0, MAX_ZOOM_LEVEL));
        if (1 < o.scale) {
          var x = clamp(pos.x, 0, 1);
          var y = clamp(pos.y, 0, 1);
          var s2 = o.scale;
          var px = x - 0.5;
          var py = y - 0.5;
          var c2x = px - s1 * pos.baseW * (px - c1.x) / (s2 * pos.baseW);
          var c2y = py - s1 * pos.baseH * (py - c1.y) / (s2 * pos.baseH);
          var o2x = c2x / (1 - 1 / o.scale) + 0.5;
          var o2y = c2y / (1 - 1 / o.scale) + 0.5;
          setOffset(o2x, o2y);
        }
        update();
        return true;
      }
    };
    var zoomTo = function(x, y) {
      if (!enabled) {
      } else if (o.zoom + ZOOM_STEP_DBLCLK < MAX_ZOOM_LEVEL) {
        setOffset(x, y);
        zoomRelative(+ZOOM_STEP_DBLCLK);
      } else {
        setZoom(0);
        update();
      }
    };
    var processKeyDown = function(e) {
      return processKeyDownEvent(e, {
        zoomIn: function() { if (zoomIn()) return false; },
        zoomOut: function() { if (zoomOut()) return false; },
        cursor: function() {
          var d = cursorKeyCodeToXY(e.keyCode, cursorMoveDelta);
          if (moveRelative(d.x, d.y)) {
            return false;
          }
        }
      });
    };
    var setPointCallback = function(callback) {
      pointCallback = callback;
    };
    var resetDragState = function() {
      clickPoint = null;
      dragStartPoint = null;
      dragLastPoint = null;
    };
    var positionFromMouseEvent = function(e, target, index) {
      var base = getBaseSize(index);
      return base ? {
        index: index,
        x: (e.pageX - $(target).offset().left) / (o.scale * base.w),
        y: (e.pageY - $(target).offset().top) / (o.scale * base.h),
        baseW: base.w,
        baseH: base.h
      } : null;
    };
    var processPointMouseDown = function(e, selector, target) {
      var index = selector ? $(selector).index($(target).parent()) : null;
      if (e.which === 1) {
        clickPoint = positionFromMouseEvent(e, target, index);
      }
    };
    var processMouseDown = function(e, selector, target) {
      var index = selector ? $(selector).index(target) : null;
      if (getBaseSize(index) && e.which === 1) {
        dragStartPoint = dragLastPoint = { x: e.clientX, y: e.clientY };
        return false;
      }
    };
    var processMouseMove = function(e, selector, target) {
      if (dragLastPoint) {
        if (e.buttons !== 1) {
          clickPoint = null;
          dragStartPoint = null;
          dragLastPoint = null;
        } else {
          var index = selector ? $(selector).index(target) : null;
          if (clickPoint) {
            var ax = Math.abs(e.clientX - dragStartPoint.x);
            var ay = Math.abs(e.clientY - dragStartPoint.y);
            if (3 <= Math.max(ax, ay)) {
              clickPoint = null;
            }
          }
          var dx = e.clientX - dragLastPoint.x;
          var dy = e.clientY - dragLastPoint.y;
          dragLastPoint = { x: e.clientX, y: e.clientY };
          moveRelativePx(index, dx, dy);
          return false;
        }
      }
    };
    var processMouseUp = function(e, selector, target) {
      if (clickPoint && pointCallback) {
        pointCallback(clickPoint);
      }
      resetDragState();
    };
    var processDblclick = function(e, selector, target) {
      var index = selector ? $(selector).index($(target).parent()) : null;
      var pos = positionFromMouseEvent(e, target, index);
      if (pos) {
        zoomTo(pos.x, pos.y);
        return false;
      }
      return true;
    };
    var processWheel = function(e, selector, relSelector, target) {
      return processWheelEvent(e, {
        zoom: function(steps) {
          if (selector && relSelector) {
            var index = $(selector).index(target);
            target = $(target).find(relSelector);
            var pos = positionFromMouseEvent(e, target, index);
            zoomRelativeToPoint(0, 0, -steps * ZOOM_STEP_WHEEL, pos);
          } else {
            zoomRelative(-steps * ZOOM_STEP_WHEEL);
          }
        }
      });
    };
    var resetTouchState = function() { touchFilter.resetState(); };
    var processTouchStart = function(e) {
      return touchFilter.onTouchStart(e);
    };
    var processTouchMove = function(e, selector, relSelector, target) {
      var index = selector ? $(selector).index(target) : null;
      var ret = touchFilter.onTouchMove(e, {
        move: function(dx, dy) {
          moveRelativePx(index, dx, dy);
        },
        zoom: function(dx, dy, r, center) {
          if (center && selector && relSelector) {
            target = $(target).find(relSelector);
            var base = getBaseSize(index);
            dx = -dx / base.w;
            dy = -dy / base.h;
            var pos = positionFromMouseEvent(center, target, index);
            zoomRelativeToPoint(dx, dy, r, pos);
          } else {
            zoomRelative(r);
          }
        }
      });
    };
    var processTouchEnd = function(e, selector, relSelector, target) {
      return touchFilter.onTouchEnd(e, {
        pointClick: function(lastTouch) {
          if (pointCallback && relSelector) {
            var index = selector ? $(selector).index(target) : null;
            target = $(target).find(relSelector);
            var pos = positionFromMouseEvent(lastTouch, target, index);
            pointCallback(pos);
          }
        }
      });
    };
    var enableMouseAndTouch = function(root, filter, deepFilter, selector, relSelector) {
      $(root).on('mousedown', deepFilter, function(e) {
        return processPointMouseDown(e, selector, this);
      });
      $(root).on('mousedown', filter, function(e) {
        return processMouseDown(e, selector, this);
      });
      $(root).on('mousemove', filter, function(e) {
        return processMouseMove(e, selector, this);
      });
      $(root).on('mouseup', filter, function(e) {
        return processMouseUp(e, selector, this);
      });
      $(root).on('dblclick', deepFilter, function(e) {
        return processDblclick(e, selector, this);
      });
      $(root).on('wheel', filter, function(e) {
        return processWheel(e, selector, relSelector, this);
      });
      $(root).on('touchstart', filter, function(e) {
        return processTouchStart(e);
      });
      $(root).on('touchmove', filter, function(e) {
        return processTouchMove(e, selector, relSelector, this);
      });
      $(root).on('touchend', filter, function(e) {
        return processTouchEnd(e, selector, relSelector, this);
      });
    };
    var makeTransform = function(index) {
      var base = getBaseSize(index);
      var center = getCenter();
      return (
        'scale(' + o.scale + (zoomXOnly ? ', 1) ' : ') ') +
        'translate(' + (-center.x * base.w) + 'px,' + (zoomXOnly ? 0 : -center.y * base.h) + 'px)'
      );
    };
    o.setZoom = setZoom;
    o.zoomRelative = zoomRelative;
    o.zoomIn = zoomIn;
    o.zoomOut = zoomOut;
    o.setOffset = setOffset;
    o.getCenter = getCenter;
    o.moveRelative = moveRelative;
    //o.moveRelativePx = moveRelativePx;
    //o.zoomTo = zoomTo;
    o.processKeyDown = processKeyDown;
    o.setPointCallback = setPointCallback;
    o.positionFromMouseEvent = positionFromMouseEvent;
    o.resetDragState = resetDragState;
    //o.processMouseDown = processMouseDown;
    //o.processMouseMove = processMouseMove;
    //o.processDblclick = processDblclick;
    //o.processWheel = processWheel;
    //o.resetTouchState = resetTouchState;
    //o.processTouchMove = processTouchMove;
    o.enableMouseAndTouch = enableMouseAndTouch;
    o.makeTransform = makeTransform;
    return o;
  };
  var makeTaskQueue = function(workerPath, processResult) {
    var worker = newWorker(workerPath);
    var taskCount = 0;
    var taskQueue = [];
    var kickNextTask = function() {
      if (taskCount === 0 && 0 < taskQueue.length) {
        var task = taskQueue.shift();
        if (task.prepare && false === task.prepare(task.data)) {
          return;
        }
        worker.postMessage(task.data);
        ++taskCount;
      }
    };
    var addTask = function(data, prepare) {
      var task = { data: data, prepare: prepare };
      taskQueue.push(task);
      window.setTimeout(kickNextTask, 0);
    };
    var discardTasksOf = function(pred) {
      taskQueue = taskQueue.filter(function(task,i,a) { return !pred(task); });
    };
    worker.addEventListener('message', function(e) {
      processResult(e.data);
      --taskCount;
      window.setTimeout(kickNextTask, 0);
    }, false);
    return {
      addTask: addTask,
      discardTasksOf: discardTasksOf
    };
  };
  return {
    blobFromDataURI:        blobFromDataURI,
    createObjectURL:        createObjectURL,
    revokeObjectURL:        revokeObjectURL,
    newWorker:              newWorker,
    toggleFullscreen:       toggleFullscreen,
    clamp:                  clamp,
    calcGCD:                calcGCD,
    addComma:               addComma,
    toPercent:              toPercent,
    binaryFromDataURI:      binaryFromDataURI,
    detectPNGChunk:         detectPNGChunk,
    detectMPFIdentifier:    detectMPFIdentifier,
    detectExifOrientation:  detectExifOrientation,
    detectImageFormat:      detectImageFormat,
    cursorKeyCodeToXY:      cursorKeyCodeToXY,
    calcInscribedRect:      calcInscribedRect,
    processKeyDownEvent:    processKeyDownEvent,
    processWheelEvent:      processWheelEvent,
    makeTouchEventFilter:   makeTouchEventFilter,
    makeZoomController:     makeZoomController,
    makeTaskQueue:          makeTaskQueue
  };
})();
