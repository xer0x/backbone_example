(function(){

var slice = Array.prototype.slice;

_.extend(Backbone.Model.prototype, {

  // Until #565 is fixed, patch clear so that it removes id and does not
  // replace attributes.
  // https://github.com/documentcloud/backbone/pull/565
  //
  // Until #570 (or similar) is merged, allow a key value pair as an
  // alternative to an object.
  // https://github.com/documentcloud/backbone/pull/570
  //
  // Until #736 is fixed, do not set _changing to false unless
  // !alreadyChanging.
  // https://github.com/documentcloud/backbone/pull/736
  //
  // Until #739 is fixed, implement unset/clear in terms of set
  // https://github.com/documentcloud/backbone/pull/739
  //
  // Pull request forthcoming:
  // Set attribute to new value regardless of equality test.

  set : function(attrs, options) {
    if (attrs != null && !_.isObject(attrs)) {
      var args = slice.call(arguments), attrs = {};
      while ((options = args.shift()) != null && !_.isObject(options)) attrs[options] = args.shift();
    }

    // Extract attributes and options.
    options || (options = {});
    if (!attrs) return this;
    if (attrs.attributes) attrs = attrs.attributes;
    if (options.unset) for (var attr in attrs) attrs[attr] = void 0;
    var now = this.attributes, escaped = this._escapedAttributes;

    // Run validation.
    if (!options.silent && this.validate && !this._performValidation(attrs, options)) return false;

    // Check for changes of `id`.
    if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

    // We're about to start triggering change events.
    var alreadyChanging = this._changing;
    this._changing = true;

    // Update attributes.
    for (var attr in attrs) {
      var val = attrs[attr], prev = now[attr], unset = attr in now;
      options.unset ? delete now[attr] : now[attr] = val;
      if (!_.isEqual(prev, val) || options.unset && unset) {
        delete escaped[attr];
        this._changed = true;
        if (!options.silent) this.trigger('change:' + attr, this, val, options);
      }
    }

    // Fire the `"change"` event, if the model has been changed.
    if (!alreadyChanging) {
      if (!options.silent && this._changed) this.change(options);
      this._changing = false;
    }
    return this;
  },

  // Remove an attribute from the model, firing `"change"` unless you choose
  // to silence it. `unset` is a noop if the attribute doesn't exist.
  unset : function(attrs, options) {
    if (_.isString(attrs)) {
      var key, args = _.toArray(arguments), attrs = {};
      while (_.isString(key = args.shift())) attrs[key] = void 0;
      options = key;
    }
    (options || (options = {})).unset = true;
    return this.set(attrs, options);
  },

  // Clear all attributes on the model, firing `"change"` unless you choose
  // to silence it.
  clear : function(options) {
    var keys = _.without(_.keys(this.attributes), 'id');
    return this.unset.apply(this, keys.concat([options]));
  },

  changedAttributes : function(now) {
    if (!this._changed) return false;
    now || (now = this.attributes);
    var changed = false, old = this._previousAttributes;
    for (var attr in now) {
      if (_.isEqual(old[attr], now[attr])) continue;
      (changed || (changed = {}))[attr] = now[attr];
    }
    for (var attr in old) {
      if (!(attr in now)) (changed || (changed = {}))[attr] = void 0;
    }
    return changed;
  }

});

// Until #683 is fixed, patch events so that nested calls to trigger will not
// drop calls.
// https://github.com/documentcloud/backbone/pull/683
Backbone.Events = {

  // Bind an event, specified by a string name, `ev`, to a `callback` function.
  // Passing `"all"` will bind the callback to all events fired.
  bind : function(ev, callback, context) {
    var calls = this._callbacks || (this._callbacks = {});
    var list  = calls[ev] || (calls[ev] = {});
    var tail = list.tail || (list.tail = list.next = {});
    tail.callback = callback;
    tail.context = context;
    list.tail = tail.next = {};
    return this;
  },

  // Remove one or many callbacks. If `callback` is null, removes all
  // callbacks for the event. If `ev` is null, removes all bound callbacks
  // for all events.
  unbind : function(ev, callback) {
    var calls, node, prev;
    if (!ev) {
      this._callbacks = {};
    } else if (calls = this._callbacks) {
      if (!callback) {
        calls[ev] = {};
      } else if (node = calls[ev]) {
        while ((prev = node) && (node = node.next)) {
          if (node.callback !== callback) continue;
          prev.next = node.next;
          node.context = node.callback = null;
          break;
        }
      }
    }
    return this;
  },

  // Trigger an event, firing all bound callbacks. Callbacks are passed the
  // same arguments as `trigger` is, apart from the event name.
  // Listening for `"all"` passes the true event name as the first argument.
  trigger : function(eventName) {
    var node, calls, callback, args, ev, events = ['all', eventName];
    if (!(calls = this._callbacks)) return this;
    while (ev = events.pop()) {
      if (!(node = calls[ev])) continue;
      args = ev == 'all' ? arguments : slice.call(arguments, 1);
      while (node = node.next) if (callback = node.callback) callback.apply(node.context || this, args);
    }
    return this;
  }

};

_.extend(Backbone.View.prototype, {

  // view.$() should return $el
  $: function(selector) {
    if (selector == null) return this.$el || (this.$el = $(this.el));
    return $(selector, this.el);
  }

});

_.each([
  Backbone.Model.prototype,
  Backbone.Collection.prototype,
  Backbone.Router.prototype,
  Backbone.View.prototype
], function(proto){ _.extend(proto, Backbone.Events); });

var sync = Backbone.sync;

Backbone.sync = function(method, model, options) {
  return sync.apply(this, arguments).done(function() {
    model.fetched_at = new Date();
  });
};

})();
