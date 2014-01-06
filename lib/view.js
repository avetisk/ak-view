'use strict';

/**
 * Dependencies
 */
var EventEmitter = require('ak-eventemitter');
var delegate = require('ak-delegate');
var defaults = require('stluafed');
var dom = document.createElement('div');

/**
 * Export `View`
 *
 * @param {Object} options (optional)
 * @return {View}
 */
var View = module.exports = function (options) {
  this.options = defaults(options || {}, View.defaultOptions);
  this.eventEmitter = new EventEmitter();
  this._delegates = [];
  this._el = null;

  if (this.options.el) {
    this.setElement(this.options.el);
  }
};

/**
 * View default options
 */
View.defaultOptions = {};

/**
 * Get main element
 */
View.prototype.getElement = function () {
  if (! this._el) {
    throw new Error('No element.');
  }

  return this._el;
};

/**
 * Render view using template engine (if given)
 *
 * @param {*} arguments given to template engine
 * @return {View}
 */
View.prototype.renderTemplate = function () {
  if (! this.options.template) {
    return this;
  }

  dom.innerHTML = this.options.template.apply(null, arguments);

  var el = dom.firstChild;
  // TODO replace with `el.remove()` when retarded IE will implement it
  el.parentElement.removeChild(el);

  this.setElement(el);

  return this;
};

/**
 * Default to #renderTemplate (may/should be overridden)
 */
View.prototype.render = View.prototype.renderTemplate;

/**
 * Set manually view's main container
 *
 * @param {HTMLElement} el
 * @param {Boolean} noDelegate
 * @return {View}
 */
View.prototype.setElement = function (el, noDelegate) {
  if (this._el) {
    this._undelegateDomEvents();
  }

  if (! el || ! (el instanceof HTMLElement)) {
    throw new Error('`el` must be a HTMLElement.');
  }

  var old = this._el;
  this._el = el;

  if (! noDelegate) {
    this._delegateDomEvents();
  }

  this.eventEmitter.emit('change.element', old, el, this);

  return this;
};

/**
 * Delegate DOM events
 *
 * @return {View}
 */
View.prototype._delegateDomEvents = function () {
  if (! this.options.delegates) {
    return this;
  }

  var delegates = this.options.delegates;
  var selectorsKeys = Object.keys(delegates);
  var selectors;
  var eventsList;
  var events;
  var event;
  var callbacks;
  var callback;

  for (var i = 0, len = selectorsKeys.length; i < len; i += 1) {
    selectors = selectorsKeys[i];
    callbacks = delegates[selectors];
    eventsList = Object.keys(callbacks);
    selectors = selectors.split(',');

    for (var i2 = 0, len2 = eventsList.length; i2 < len2; i2 += 1) {
      events = eventsList[i];
      callback = callbacks[events];
      events = events.split(',');

      for (var i3 = 0, len3 = selectors.length; i3 < len3; i3 += 1) {
        for (var i4 = 0, len4 = events.length; i4 < len4; i4 += 1) {
          event = events[i4].trim();

          this._delegates.push([
            event,
            delegate.on(this._el, selectors[i3], event, callback)
          ]);
        }
      }
    }
  }

  this.eventEmitter.emit('change.delegate', this);

  return this;
};

/**
 * Undelegate DOM events
 *
 * @return {View}
 */
View.prototype._undelegateDomEvents = function () {
  var binding;

  for (var i = 0, len = this._delegates.length; i < len; i += 1) {
    binding = this._delegates[i];

    delegate.off(this._el, binding[0], binding[1]);
  }

  this._delegates = [];

  this.eventEmitter.emit('change.undelegate', this);

  return this;
};

/**
 * Destructor
 *
 * @return {View}
 */
View.prototype.destroy = function () {
  this._undelegateDomEvents();

  this.eventEmitter.emit('change.destroy', this);
  this.eventEmitter.off();

  if (this._el.parentElement) {
    // TODO replace with `this._el.remove()` when retarded IE will implement it
    this._el.parentElement.removeChild(this._el);
  }

  this._el = null;

  return this;
};
