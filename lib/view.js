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
  EventEmitter.call(this);

  this.options = defaults(options || {}, View.defaultOptions);
  this._bindings = [];

  this.options.el && (this.el = this.options.el);
};

var prototype = View.prototype = Object.create(EventEmitter.prototype);

/**
 * View default options
 */
View.defaultOptions = {};

/**
 * Element getter/setter
 */
Object.defineProperty(prototype, 'el', {
  'get': function () {
    return this._el;
  },
  'set': function (el) {
    if (! el || ! (el instanceof HTMLElement)) {
      throw new Error('`el` must be a HTMLElement.');
    }

    this._el && this._unbindDomEvents();

    var old = this._el;
    this._el = el;

    this._bindDomEvents();
    this.emit('element.change', old, el, this);
  }
});

/**
 * Bind DOM events
 *
 * @return {View}
 */
prototype._bindDomEvents = function () {
  if (! this.options.domEvents) {
    return this;
  }

  var domEvents = this.options.domEvents;
  var context = this.options.eventsContext;
  var selectorsKeys = Object.keys(domEvents);
  var selectors;
  var selector;
  var eventsList;
  var events;
  var event;
  var callbacks;
  var callback;

  for (var i = 0, len = selectorsKeys.length; i < len; i += 1) {
    selectors = selectorsKeys[i];
    callbacks = domEvents[selectors];
    eventsList = Object.keys(callbacks);
    selectors = selectors.split(',');

    for (var i2 = 0, len2 = eventsList.length; i2 < len2; i2 += 1) {
      events = eventsList[i2];
      callback = context ? callbacks[events].bind(context) : callbacks[events];
      events = events.split(',');

      for (var i3 = 0, len3 = selectors.length; i3 < len3; i3 += 1) {
        selector = selectors[i3].trim();

        for (var i4 = 0, len4 = events.length; i4 < len4; i4 += 1) {
          event = events[i4].trim();

          if (! selector) {
            this._bindings.push([
              event,
              callback
            ]);
            this._el.addEventListener(event, callback);

            continue;
          }

          this._bindings.push([
            event,
            delegate.on(this._el, selector, event, callback, true)
          ]);
        }
      }
    }
  }

  this.emit('events.bind', this);

  return this;
};

/**
 * Unbind DOM events
 *
 * @return {View}
 */
prototype._unbindDomEvents = function () {
  var binding;

  for (var i = 0, len = this._bindings.length; i < len; i += 1) {
    binding = this._bindings[i];

    delegate.off(this._el, binding[0], binding[1], true);
  }

  this._bindings = [];

  this.emit('events.unbind', this);

  return this;
};

/**
 * Render view using template engine (if given)
 *
 * @param {*} arguments given to template engine
 * @return {View}
 */
prototype.renderTemplate = function () {
  if (! this.options.template) {
    return this;
  }

  dom.innerHTML = this.options.template.apply(null, arguments);

  var el = dom.firstChild;
  // TODO replace with `el.remove()` when retarded IE will implement it
  el.parentElement.removeChild(el);

  this.el = el;

  return this;
};

/**
 * Default to #renderTemplate (may/should be overridden)
 */
prototype.render = prototype.renderTemplate;

/**
 * Destructor
 *
 * @return {View}
 */
prototype.destroy = function () {
  this._unbindDomEvents();

  this.emit('destroy', this);
  this.off();

  if (this._el.parentElement) {
    // TODO replace with `this._el.remove()` when retarded IE will implement it
    this._el.parentElement.removeChild(this._el);
  }

  this._el = undefined;

  return this;
};
