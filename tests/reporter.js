'use strict';

var EmojiInfoService = {
  URL: '../node_modules/emoji-table/dist/emoji.json',
  map: null,

  _initPromise: null,
  init: function() {
    var p = new Promise(function(resolve) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', this.URL, true);
        xhr.responseType = 'json';
        xhr.send();
        xhr.onloadend = function() {
          resolve(xhr.response);
        };
      }.bind(this))
      .then(function(json) {
        this.map = new Map();

        if (!json) {
          console.warn('EmojiInfoService: Failed to load table.');
          return;
        }
        for (var info of json) {
          this.map.set(info.code, info);
        }
      }.bind(this));

    this._initPromise = p;
    return p;
  },

  getInfo: function(codePoints) {
    var p = Promise.resolve();
    if (!this.map) {
      p = this.init();
    }
    return p.then(function() {
      var codePointsStrArr = codePoints.map(function(cp) {
        var str = cp.toString(16).toUpperCase();
        while (str.length < 4) {
          str = '0' + str;
        }
        return 'U+' + str;
      });

      var i = codePoints.length;
      do {
        var str = codePointsStrArr.slice(0, i).join(' ');
        var info = this.map.get(str);
        if (info) {
          return info;
        }
      } while (--i);

      return null;
    }.bind(this));
  }
};

var TestRunReport = function() {
  this.summary = new TestSummary();
  this.startTime = Date.now();
  this.expendedReports = 0;
}
TestRunReport.prototype = {
  AUTOEXPEND_REPORTS_LIMIT: 30,

  render: function() {
    var div = this.element = document.createElement('div');
    div.appendChild(this.summary.render());

    return div;
  },
  appendResult: function(result) {
    var shouldExpend = this.expendedReports < this.AUTOEXPEND_REPORTS_LIMIT;

    var testReport = new TestReport(result);
    this.element.appendChild(testReport.render(shouldExpend));

    if (testReport.expended) {
      this.expendedReports++;
    }
    this.summary.update(testReport.getSummary());

    testReport.minimizeMemoryUsage();
  },
  reportFinish: function() {
    this.summary.reportFinish({
      time: (Date.now() - this.startTime)
    });
  }
};

var TestSummary = function() {
  this.summary = {};
  this.PROPS.forEach(function(prop) {
    this.summary[prop] = 0;
  }.bind(this));
}
TestSummary.prototype = {
  PROPS: Object.freeze(
    ['total', 'passed', 'failed',
      'mismatch', 'webfont', 'rendering', 'reference',
      'retested']),

  render: function() {
    this.element = document.createElement('p');
    this.element.className = 'summary';

    return this.element;
  },

  update: function(obj) {
    this.summary.total++;
    this.PROPS.forEach(function(prop) {
      if (obj[prop]) {
        this.summary[prop]++;
      }
    }.bind(this));

    this.element.textContent = this.PROPS.map(function(prop) {
        return prop + ': '  + this.summary[prop] }.bind(this)
      ).join(', ');
  },

  reportFinish: function(obj) {
    this.element.textContent += ', time: ' + obj.time + 'ms';
  }
};

var TestReport = function(result) {
  this.result = result;
  this.expended = false;
  this.detailRendered = false;
  this.passed = (result.diffData.rawMisMatchPercentage < this.MISMATCH_THRESHOLD) &&
    !result.isEqualToSystem &&
    !result.emojiRenderingEmpty &&
    !result.svgRenderingEmpty;
};

TestReport.prototype = {
  // In precentage
  MISMATCH_THRESHOLD: 1,

  // Set this to true to get rip of the canvases and other bits that would
  // cause out of memory error in Windows XP
  MINIMAL_REPORT: false,

  render: function(canExpend) {
    var result = this.result;
    var reportEl = this.element = document.createElement('p');

    var reportTitleEl = document.createElement('span');
    reportTitleEl.className = 'title';

    reportTitleEl.appendChild(document.createTextNode(
      result.codePoints.map(function(cp) {
        var str = cp.toString(16);
        while (str.length < 4) {
          str = '0' + str;
        }
        return 'U+' + str;
      }).join(' ') + ', '));

    var emojiEl = document.createElement('span');
    emojiEl.className = 'emoji';
    emojiEl.textContent = result.string;
    reportTitleEl.appendChild(emojiEl);

    reportTitleEl.appendChild(document.createTextNode(
      ', reference: ' + !result.svgRenderingEmpty +
      ', rendering: ' + !result.emojiRenderingEmpty +
      ', webfont: ' + !result.isEqualToSystem +
      ', mismatch: ' + result.diffData.rawMisMatchPercentage.toFixed(2) + '%' +
      ', retested: ' + result.retested +
      ', layers: ' + result.layerInfo.layers));

    reportEl.appendChild(reportTitleEl);

    var infoEl = document.createElement('span');
    infoEl.className = 'emoji-info';
    EmojiInfoService.getInfo(result.codePoints)
      .then(function(info) {
        if (!info) {
          infoEl.parentNode.removeChild(infoEl);
          return;
        }
        infoEl.textContent =
          info.name + '. tags: ' + info.tags.join(', ') + '.';
      })
      .catch(function(e) { console.error(e); });
    reportEl.appendChild(infoEl);

    if (this.passed) {
      reportEl.classList.add('passed');
    } else {
      reportEl.classList.add('failed');
    }

    if (!this.MINIMAL_REPORT) {
      reportTitleEl.addEventListener('click', this);
      reportTitleEl.classList.add('clickable');
      infoEl.addEventListener('click', this);
      infoEl.classList.add('clickable');

      if (!this.passed && canExpend) {
        this.element.classList.add('expended');
        this.expended = true;
        this.appendDetailReportDOM();
      }
    }

    return reportEl;
  },

  minimizeMemoryUsage: function() {
    if (this.MINIMAL_REPORT) {
      // Throw away the reference to the test result -- everything
      // we need is printed on the DOM already.
      this.result = null;
    }
  },

  handleEvent: function(evt) {
    if (evt.target.dataset.action === 'inspect-layers') {
      evt.target.parentNode.removeChild(evt.target);

      this.appendLayerReportDOM();
      return;
    }

    if (!this.detailRendered) {
      this.appendDetailReportDOM();
    }

    if (!this.expended) {
      this.element.classList.add('expended');
      this.expended = true;
    } else {
      this.element.classList.remove('expended');
      this.expended = false;
    }

  },

  getSummary: function() {
    var result = this.result;
    return {
      passed: this.passed, failed: !this.passed,
      mismatch: (result.diffData.rawMisMatchPercentage >= this.MISMATCH_THRESHOLD),
      webfont: result.isEqualToSystem,
      rendering: result.emojiRenderingEmpty,
      reference: result.svgRenderingEmpty,
      retested: result.retested
    };
  },

  appendDetailReportDOM: function() {
    this.detailRendered = true;

    var detailEl = document.createElement('span');
    detailEl.className = 'detail';

    var result = this.result;

    var ref = document.createElement('span');
    ref.className = 'dom-ref';
    ref.textContent = result.string;
    ref.title = 'EmojiOne HTML rendering.';
    detailEl.appendChild(ref);

    detailEl.appendChild(result.svgRenderingCanvas);
    result.svgRenderingCanvas.title = 'Source SVG rendering on canvas.';
    if (result.svgRenderingEmpty) {
      result.svgRenderingCanvas.className = 'report-failed';
    }

    detailEl.appendChild(result.emojiRenderingCanvas);
    result.emojiRenderingCanvas.title = 'EmojiOne font rendering on canvas.';
    if (result.emojiRenderingEmpty) {
      result.emojiRenderingCanvas.className = 'report-failed';
    }

    detailEl.appendChild(result.systemRenderingCanvas);
    result.systemRenderingCanvas.title = 'System font rendering on canvas.';
    if (result.isEqualToSystem) {
      result.systemRenderingCanvas.className = 'report-failed';
    }

    var img = new Image();
    img.src = result.diffData.getImageDataUrl();
    detailEl.appendChild(img);
    img.title =
      'Diff between source SVG and font rendering on canvas.';
    if (result.diffData.rawMisMatchPercentage >= this.MISMATCH_THRESHOLD) {
      img.className = 'report-failed';
    }

    var inspectLayersButton = document.createElement('button');
    inspectLayersButton.dataset.action = 'inspect-layers';
    inspectLayersButton.textContent = 'Inspect layers';
    inspectLayersButton.type = 'button';
    inspectLayersButton.addEventListener('click', this);
    detailEl.appendChild(inspectLayersButton);

    this.element.appendChild(detailEl);
  },

  appendLayerReportDOM: function() {
    var detailEl = document.createElement('span');
    detailEl.className = 'detail';

    this.result.layerInfo.fileNames.forEach(function(fileName) {
      var url = '../build/glyphs/' + fileName + '.svg';
      var a = document.createElement('a');
      a.target = '_blank';
      a.href = url;
      a.title = 'layer: ' + fileName + '.svg';

      var img = new Image();
      img.src = url;
      img.className = 'layer';
      a.appendChild(img);
      detailEl.appendChild(a);
    });

    var a = document.createElement('a');
    a.target = '_blank';
    a.href = this.result.svgUrl;
    a.title = 'color svg';

    var img = new Image();
    img.src = this.result.svgDataUrl;
    img.className = 'layer';
    a.appendChild(img);
    detailEl.appendChild(a);

    this.element.appendChild(detailEl);
  }
};
