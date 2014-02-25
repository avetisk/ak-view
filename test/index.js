/*global describe, it*/

'use strict';

var View = process.env.AK_VIEW_TEST_COVERAGE ? require('../lib-cov/view') : require('../');
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
  it('initialize', function () {
    var view = new View();

    assert(view.el === undefined);
  });

  it('initialize with an element', function (done) {
    var dom = document.createElement('div');
    var view = new View({'el': dom});

    assert(view.el === dom);

    done();
  });

  it('#render() without template', function (done) {
    var view = new View();
    view.render();

    assert(view.el === undefined);

    done();
  });

  it('#render() with instance template', function (done) {
    var tpl = template('<div class="just-a-template"><%= locals.hari %></div><div class="never">Bad</div>');
    var view = new View({'template': tpl});
    view.render({'hari': 'Hari Bol !'});

    assert.equal(view.el.className, 'just-a-template');
    assert.equal(view.el.nextSibling, null);

    done();
  });

  it('#render() with class template', function (done) {
    var tpl = template('<div class="just-a-template"><%= locals.hari %></div><div class="never">Bad</div>');
    View.defaultOptions.template = tpl;
    var view = new View();
    view.render({'hari': 'Hari Bol !'});

    assert.equal(view.el.className, 'just-a-template');
    assert.equal(view.el.nextSibling, null);

    delete View.template;

    done();
  });

  it('view#el = dom, view#el = dom2', function (done) {
    var el = createElement('bolo');
    var dom = createElement('hari');
    var dom2 = createElement('haribol');
    var parents = [el, dom, dom2];
    var counterElement = 0;
    var counterDelegate = 0;
    var counterUndelegate = 0;

    var view = new View({
      'el': el,
      'domEvents': {
        'span': {
          'click': function (e) {
            assert.equal(e.target.parentElement, parents.shift());

            if (! parents.length && counterElement === 2 && counterDelegate === 2 && counterUndelegate === 2) {
              done();
            }
          }
        }
      }
    });
    view.on('element.change', function (ns, oldElement, newElement) {
      counterElement += 1;

      assert(oldElement !== newElement);
      assert(newElement === view.el);
    });
    view.on('events.bind', function () {
      counterDelegate += 1;
    });
    view.on('events.unbind', function () {
      counterUndelegate += 1;
    });

    assert.throws(function () {
      view.el = '';
    }, '`el` must be a HTMLElement.');

    view.el.querySelector('span').click();

    view.el = dom;
    view.el.querySelector('span').click();

    assert.equal(view.el.className, 'hari');
    assert.equal(view.el, dom);

    view.el = dom2;
    view.el.querySelector('span').click();

    assert.equal(view.el.className, 'haribol');
    assert.equal(view.el, dom2);
  });

  it('should delegate dom events', function (done) {
    var counter = {
      'click': 0,
      'focus': 0,
      'bis': 0,
      'self': 0
    };
    var tpl = template('<div class="just-a-template"><div class="l-1"><input class="l-2" value="focus" /></div><div class="l-1-bis"><input class="l-2" value="click" /></div></div>');
    var view = new View({
      'template': tpl,
      'eventsContext': {'x': 1},
      'domEvents': {
        '': {
          'click': function (e) {
            e.type === 'click' && e.target === view.el && (counter.self += 1);
            counter.click === 1 &&
            counter.focus === 1 &&
            counter.bis === 1 &&
            counter.self === 1 &&
            this.x === 1 &&
            done();
          }
        },
        '.l-2': {
          'click, focus': function (e) {
            if (e.type === 'click' && e.target.value === 'click') {
              counter.click += 1;
            } else if (e.type === 'focus' && e.target.value === 'focus') {
              counter.focus += 1;
            } else {
              throw new Error('Delegate does not work properly.');
            }
          }
        },
        '.l-1-bis': {
          'click': function (e) {
            if (e.type === 'click' && e.target.className === 'l-2') {
              counter.bis += 1;
            }
          }
        }
      }
    });
    view.render();

    // NOTE DOM events work only in document tree
    document.body.appendChild(view.el);

    view.el.querySelector('.l-1-bis .l-2').click();

    // TODO use `input.focus();` when retarded Firefox & IE will handle it properly)
    var e = document.createEvent('HTMLEvents');
    e.initEvent('focus', true, true);
    view.el.querySelector('.l-1 .l-2').dispatchEvent(e);

    // click view.el
    view.el.click();
  });

  it('should be properly destroyed', function () {
    var counter = 0;
    var tpl = template('<div class="just-a-template kill-me"><span class="lool"><%= locals.hari %></span></div><div class="never">Bad</div>');
    var view = new View({
      'template': tpl,
      'domEvents': {
        '.lool': {
          'click, focus': function () {
            throw new Error('Undelegating DOM events not done.');
          }
        }
      }
    });
    view.render({'hari': 'Hari Bol !'});
    view.on('destroy', function () {
      counter += 1;
    });

    // NOTE DOM events work only in document tree
    document.body.appendChild(view.el);

    var span = document.querySelector('.just-a-template.kill-me span');

    view.destroy();
    span.click();

    assert.equal(document.querySelector('.just-a-template.kill-me span'), null);
    assert(view.el === undefined);

    var view2 = new View({'template': tpl});
    view2.render({'hari': 'Hari Bol !'});

    assert(view2.el instanceof HTMLElement);
    view2.destroy();
    assert(view2.el === undefined);

    assert(counter === 1);
  });
});
