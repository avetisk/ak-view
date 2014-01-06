/*global describe, it*/

'use strict';

var View = require('../');
var assert = require('assert');
var template = require('ak-template');
var createElement = function (className) {
  var el = document.createElement('div');
  el.className = className;
  el.appendChild(document.createElement('span'));
  document.body.appendChild(el);

  return el;
};

describe('View', function () {
  it('initialize', function (done) {
    var view = new View();

    assert.throws(function () {
      view.getElement();
    }, 'Empty view.');

    done();
  });

  it('initialize with an element', function (done) {
    var dom = document.createElement('div');
    var view = new View({'el': dom});

    assert(view.getElement() === dom);

    done();
  });

  it('#render() without template', function (done) {
    var view = new View();
    view.render();

    assert.throws(function () {
      view.getElement();
    }, 'Empty view.');

    done();
  });

  it('#render() with instance template', function (done) {
    var tpl = template('<div class="just-a-template"><%= locals.hari %></div><div class="never">Bad</div>');
    var view = new View({'template': tpl});
    view.render({'hari': 'Hari Bol !'});

    assert.equal(view.getElement().className, 'just-a-template');
    assert.equal(view.getElement().nextSibling, null);

    done();
  });

  it('#render() with class template', function (done) {
    var tpl = template('<div class="just-a-template"><%= locals.hari %></div><div class="never">Bad</div>');
    View.defaultOptions.template = tpl;
    var view = new View();
    view.render({'hari': 'Hari Bol !'});

    assert.equal(view.getElement().className, 'just-a-template');
    assert.equal(view.getElement().nextSibling, null);

    delete View.template;

    done();
  });

  it('#setElement(el), #setElement(el2, noDelegate), #setElement(el3)', function (done) {
    var dom = createElement('hari');
    var dom2 = createElement('haribol');
    var dom3 = createElement('harihari');
    var parents = [dom, dom3];
    var counterElement = 0;
    var counterDelegate = 0;
    var counterUndelegate = 0;

    var view = new View({
      'delegates': {
        'span': {
          'click': function (e) {
            assert.equal(e.target.parentElement, parents.shift());

            if (! parents.length && counterElement === 3 && counterDelegate === 2 && counterUndelegate === 2) {
              done();
            }
          }
        }
      }
    });
    view.eventEmitter.on('change.element', function (ns, oldElement, newElement) {
      counterElement += 1;

      assert(oldElement !== newElement);
      assert(newElement === view.getElement());
    });
    view.eventEmitter.on('change.delegate', function () {
      counterDelegate += 1;
    });
    view.eventEmitter.on('change.undelegate', function () {
      counterUndelegate += 1;
    });

    assert.throws(function () {
      view.setElement();
    }, '`el` must be a HTMLElement.');

    view.setElement(dom);
    view.getElement().querySelector('span').click();

    assert.equal(view.getElement().className, 'hari');
    assert.equal(view.getElement(), dom);

    view.setElement(dom2, true);
    view.getElement().querySelector('span').click();

    assert.equal(view.getElement().className, 'haribol');
    assert.equal(view.getElement(), dom2);

    view.setElement(dom3);
    view.getElement().querySelector('span').click();

    assert.equal(view.getElement().className, 'harihari');
    assert.equal(view.getElement(), dom3);
  });

  it('should delegate dom events', function (done) {
    var counter = {
      'click': 0,
      'focus': 0
    };
    var tpl = template('<div class="just-a-template"><div class="l-1"><input class="l-2" value="click" /></div><div class="l-1-bis"><input class="l-2" value="focus" /></div></div>');
    var view = new View({
      'template': tpl,
      'delegates': {
        '.l-2': {
          'click, focus': function (e) {
            if (e.type === 'click' && e.target.value === 'click') {
              counter.click += 1;
            } else if (e.type === 'focus' && e.target.value === 'focus') {
              counter.focus += 1;
            } else {
              throw new Error('Delegate does not work properly.');
            }

            if (counter.click === 1 && counter.focus === 1) {
              done();
            }
          }
        }
      }
    });
    view.render();

    // NOTE DOM events work only in document tree
    document.body.appendChild(view.getElement());

    view.getElement().querySelector('.l-1 .l-2').click();

    // TODO use `input.focus();` when retarded Firefox & IE will handle it properly)
    var e = document.createEvent('HTMLEvents');
    e.initEvent('focus', true, true);
    view.getElement().querySelector('.l-1-bis .l-2').dispatchEvent(e);
  });

  it('should be properly destroyed', function () {
    var counter = 0;
    var tpl = template('<div class="just-a-template kill-me"><span class="lool"><%= locals.hari %></span></div><div class="never">Bad</div>');
    var view = new View({
      'template': tpl,
      'delegates': {
        '.lool': {
          'click, focus': function () {
            throw new Error('Undelegating DOM events not done.');
          }
        }
      }
    });
    view.render({'hari': 'Hari Bol !'});
    view.eventEmitter.on('change.destroy', function () {
      counter += 1;
    });

    // NOTE DOM events work only in document tree
    document.body.appendChild(view.getElement());

    var span = document.querySelector('.just-a-template.kill-me span');

    view.destroy();
    span.click();

    assert.equal(document.querySelector('.just-a-template.kill-me span'), null);
    assert.throws(function () {
      view.getElement();
    }, 'Empty view.');

    var view2 = new View({'template': tpl});
    view2.render({'hari': 'Hari Bol !'});

    assert(view2.getElement() instanceof HTMLElement);
    view2.destroy();
    assert.throws(function () {
      view2.getElement();
    });

    assert(counter === 1);
  });
});
