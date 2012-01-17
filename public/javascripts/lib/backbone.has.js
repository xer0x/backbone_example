(function($, undefined){

var Has = Backbone.Has = extend({

  constructor: function(model, name, options) {
    var has = model._has || (model._has = {});
    if (has[name]) return has[name];
    has[name] = this;
    this.model = model;
    this.options = _.extend(options || {}, {name: name});
    this.collection = (model._all || (model._all = new Collection()))
      .bind('has:initialize', this.initialize, this)
      .bind('has:change', this.change, this);
  },

  // initialize a model
  initialize: function(model) {},

  // handle change event for a model
  change: function(model) {},

  // find models based on name/options
  findModel: function() { },

  // find collections based on name/options
  findCollection: function() { },

  buildCollection: function(model) {
    var options = _.defaults(this.options, {
      scoped: true,
      where: function(){ return true; }
    });
    var collection = new options.collection([], {
      comparator: options.comparator
    });
    collection[options.inverseOf] = model;
    if (options.scoped) collection.scope = model;
    return collection;
  },

  associate: function(model, other) {
    this._notify('associate', model, other);
  },

  dissociate: function(model, other) {
    this._notify('dissociate', model, other);
  },

  _notify: function(event, model, other) {
    var options = this.options;
    if (!other._changing && other._initialized) return notify();
    other._queue[options.source] = notify;
    function notify() {
      model.trigger(event + ':' + options.inverseOf, model, other);
    }
  }

}, {

  _queue: [],

  initialize: function() {
    var callback;
    while (callback = Has._queue.shift()) callback();
  }

});

// initialize associations on page load
$(Has.initialize);

var HasProp = Backbone.HasProp = Has.extend({

  constructor: function() {
    var o = HasProp.__super__.constructor.apply(this, arguments);
    if (o) return o;
    var options = this.options;
    _.defaults(options, {attr: options.name, setter: _.identity});
    this.collection.bind('change:' + options.attr, this._change, this);
  },

  initialize: function(model) {
    this._change(model, model.get(this.options.attr));
  },

  _change: function(model, val) {
    var options = this.options;
    model[options.name] = val == null ? undefined : options.setter(val);
  }

});

var HasOne = Backbone.HasOne = Has.extend({

  constructor: function() {
    var o = HasOne.__super__.constructor.apply(this, arguments);
    if (o) return o;
    var options = this.options;
    _.defaults(options, {
      source: options.name,
      idAttr: options.name + '_id',
      inverseOf: funcName(this.model).toLowerCase(),
      model: this.findModel()
    });
    this._owners = {};
    this.collection
      .bind('associate:' + options.name, this._replace, this)
      .bind('dissociate:' + options.name, this._remove, this);
  },

  initialize: function(model) {
    var options = this.options;
    this._replace(model, model.get(options.name) || model.get(options.idAttr));
  },

  change: function(model) {
    var id, options = this.options, name = options.name, idAttr = options.idAttr;
    if (model.hasChanged(name)) {
      this._replace(model, model.get(name));
    } else if (model.hasChanged(idAttr)) {
      (id = model.get(idAttr)) ? this._replace(model, {id: id}) : this._remove(model);
    }
  },

  _destroy: function(model) {
    var owner = this._owners[model.cid];
    owner && owner.unset(this.options.source);
  },

  _remove: function(model) {
    this._replace(model, null);
  },

  _replace: function(model, now) {
    var valid, prev, options = this.options, name = options.name, idAttr = options.idAttr;
    var owners = this._owners;

    if (_.isNumber(now)) now = {id: now};
    if (model[name] && model[name].attributes === now) return;

    valid = _.isObject(now) && !_.isArray(now);
    if (valid && !(now instanceof Backbone.Model)) {
      now = new options.model(now);
    }

    if ((prev = model[name]) === now) return;

    // tear down previous association
    if (!valid) model.unset(name, idAttr);
    if (prev) {
      delete model[name];
      delete owners[prev.cid];
      this.dissociate(prev.unbind('destroy', this._destroy), model);
    }

    if (!valid) return;

    // set up new association
    model[name] = now;
    model.set(name, now.attributes, idAttr, now.id);
    owners[now.cid] = model;
    now.bind('destroy', this._destroy, this);
    this.associate(now, model);
  }

});

var HasMany = Backbone.HasMany = Has.extend({

  constructor: function() {
    var o = HasMany.__super__.constructor.apply(this, arguments);
    if (o) return o;
    var options = _.defaults(this.options, {
      inverseOf: funcName(this.model).toLowerCase(),
      source: this.options.name,
      collection: this.findCollection()
    });
    this.collection
      .bind('add', this._initialize, this)
      .bind('associate:' + options.source.singularize(), this._associate, this)
      .bind('dissociate:' + options.source.singularize(), this._dissociate, this);
  },

  initialize: function(model) {
    model[this.options.name].reset(this.parse(model));
  },

  change: function(model) {
    var options = this.options;
    if (model.hasChanged(options.source)) model[options.name].reset(this.parse(model));
  },

  parse: function(model) {
    var options = this.options, collection = model[options.name];
    var models = collection.parse(model.get(options.source));
    // Avoid modifying during iteration.
    return _.filter(_.map(_.toArray(models), function(attrs) {
      return new collection.model(attrs);
    }), options.where);
  },

  _initialize: function(model) {
    var collection = model[this.options.name] = this.buildCollection(model)
      .bind('add', this._add, this)
      .bind('remove', this._remove, this)
      .bind('reset', this._reset, this);
    collection._owner = model;
  },

  _add: function(model, collection) {
    var owner = collection._owner, a = owner.get(this.options.source);
    _.isArray(a) && a.splice(collection.indexOf(model), 0, model.attributes);
    this.associate(model, owner);
  },

  _remove: function(model, collection) {
    var owner = collection._owner, a = owner.get(this.options.source);
    _.isArray(a) && a.splice(_.indexOf(a, model.attributes), 1);
    this.dissociate(model, owner);
  },

  _reset: function(collection) {
    var self = this, owner = collection._owner;
    owner.set(this.options.source, _.pluck(collection.models || [], 'attributes'));
    collection.each(function(model){ self.associate(model, owner); });
  },

  _associate: function(model, other) {
    var options = this.options;
    if (options.where(model)) model[options.name].add(other);
  },

  _dissociate: function(model, other) {
    model[this.options.name].remove(other);
  }

});

var HasManyThrough = Backbone.HasManyThrough = Has.extend({

  constructor: function() {
    var o = HasManyThrough.__super__.constructor.apply(this, arguments);
    if (o) return o;
    this._associate = andThis(this._associate, this);
    this._dissociate = andThis(this._dissociate, this);
    var options = this.options;
    options.collection || (options.collection = this.findCollection());
    _.defaults(options, {
      source: funcName(options.collection.prototype.model).underscore(),
      inverseOf: funcName(options.through.collection.prototype.model).underscore()
    });
    this.collection.bind('add', this._initialize, this);
  },

  initialize: function(model) {
    this._reset(model[this.options.through.name]);
  },

  findThrough: function(model, other) {
    var options = this.options, inverseOf = options.through.inverseOf;
    return model[options.through.name].detect(function(m) {
      return m[inverseOf] === model && m[options.source] === other;
    });
  },

  _initialize: function(model) {
    var options = this.options;
    var collection = model[options.name] = this.buildCollection(model)
      .bind('add', this.__add, this)
      .bind('remove', this.__remove, this);
    collection._owner = model;
    collection['super'] = model[options.through.name]
      .bind('add', this._add, this)
      .bind('remove', this._remove, this)
      .bind('reset', this._reset, this)
      .bind('associate:' + options.source, this._associate)
      .bind('dissociate:' + options.source, this._dissociate);
  },

  _add: function(model, collection) {
    var owner = collection._owner, options = this.options;
    if (!(model = model[options.source]) || !options.where(model)) return;
    owner[options.name].add(model);
  },

  _remove: function(model, collection) {
    var owner = collection._owner, options = this.options, source = options.source;
    if (!(model = model[source])) return;
    if (collection.any(function(m){ return m[source] === model; })) return;
    owner[options.name].remove(model);
  },

  _reset: function(through) {
    var owner = through._owner, options = this.options;
    owner[options.name].reset(_.filter(_.compact(_.uniq(
      _.pluck(through.models, options.source))), options.where));
  },

  _associate: function(through, model, other) {
    var owner = through._owner, options = this.options;
    if (options.where(other)) owner[options.name].add(other);
  },

  _dissociate: function(through, model, other) {
    var owner = through._owner, options = this.options;
    if (through.any(function(m){ return m[options.source] === other; })) return;
    owner[options.name].remove(other);
  },

  __add: function(model, collection) {
    var owner = collection._owner;
    if (!!this.findThrough(owner, model)) return;
    var attrs = {}, options = this.options, through = owner[options.through.name];
    attrs[options.source] = model;
    attrs[options.through.inverseOf] = owner;
    if (model.isNew() || owner.isNew()) {
      through.add(attrs);
      return;
    }
    through.create(attrs, {
      error: function() { collection.remove(model); }
    });
  },

  __remove: function(model, collection) {
    var t = this.findThrough(collection._owner, model);
    t && t.destroy({
      error: function(){ collection.add(model); }
    });
  }

});

var Sub = Has.Sub = function(collection, options) {
  collection
    .bind('add', this._add, this)
    .bind('remove', this._remove, this)
    .bind('reset', this._reset, this);
  options = this.options = _.defaults(options || {}, {
    collection: collection.constructor
  });
  this.collection = new options.collection([], {
    'super': collection,
    comparator: options.comparator
  });
};

Sub.extend = Has.extend;

_.extend(Sub.prototype, {

  _add: function() {},
  _remove: function() {},
  _reset: function() {}

});


var Limit = Has.Limit = Sub.extend({

  constructor: function(collection) {
    Limit.__super__.constructor.apply(this, arguments);
    var options = this.options;
    this.collection.comparator = collection.comparator;
    this._reset(collection);
  },

  _add: function(model, collection) {
    if (collection.indexOf(model) >= this.options.limit) return;
    this.collection.add(model);
    if (this.collection.length > this.options.limit) {
      this.collection.remove(this.collection.last());
    }
  },

  _remove: function(model, collection) {
    var limit = this.options.limit;
    this.collection.remove(model);
    if (this.collection.length >= limit) return;
    if (collection.length < limit) return;
    this.collection.add(collection.at(limit - 1));
  },

  _reset: function(collection) {
    this.collection.reset(collection.first(this.options.limit), {soft: true});
  }

});


var Subset = Has.Subset = Sub.extend({

  constructor: function(collection) {
    Subset.__super__.constructor.apply(this, arguments);
    var options = this.options;
    _.defaults(options, {filter: function(){ return true; }});
    this.collection.reset(collection.filter(options.filter))
      .bind('filter', this._filter, this);
  },

  _add: function(model) {
    if (this.options.filter(model)) this.collection.add(model);
  },

  _remove: function(model) {
    this.collection.remove(model);
  },

  _reset: function(collection) {
    this.collection.reset(collection.filter(this.options.filter), {soft: true});
  },

  _filter: function(options) {
    options || (options = {});
    if (_.isFunction(options)) options = {filter: options};
    this.options.filter = options.filter;
    this._reset(this.collection['super']);
  }

});


var Subgroups = Has.Subgroups = Sub.extend({

  constructor: function(collection, options) {
    Subgroups.__super__.constructor.apply(this, arguments);
    this.collection.comparator = function(model){ return model.get('key'); };
    this.byKey = this.collection.byKey = {};
    this._reset(collection);
  },

  _add: function(model) {
    var key, group, byKey = this.byKey, options = this.options;
    if (group = byKey[key = options.groupBy(model)]) {
      group.collection.add(model);
      byKey[key].set({length: group.collection.length});
      return;
    }
    this.collection.add(byKey[key] = new Model({key: key, length: 1}, {
      collection: new options.collection([model], {
        'super': this.collection,
        comparator: options.comparator
      })
    }));
  },

  _remove: function(model) {
    var group, byKey = this.byKey, options = this.options;
    (group = this.collection.detect(function(_model){
      return _model.collection.include(model);
    }))
    .collection.remove(model);
    group.set({length: group.collection.length});
    if (!group.collection.length) {
      delete byKey[group.get('key')];
      group.destroy();
    }
  },

  _reset: function(collection) {
    collection.each(this._add, this);
    var models = _.flatten(this.collection.map(function(model){
      return model.collection.models;
    }));
    _.each(_.difference(models, collection.models), this._remove, this);
  }

});


var Collection = Has.Collection = Backbone.Collection.extend({

  constructor: function(models, options) {
    Collection.__super__.constructor.apply(this, arguments);
    this.cid = _.uniqueId('c');
    options || (options = {});
    if (options['super']) this['super'] = options['super'];
  },

  fetch: function() {
    var s = this['super'];
    if (s) return s.fetch.apply(s, arguments);
    return Collection.__super__.fetch.apply(this, arguments);
  },

  reset: function(models, options) {
    options || (options = {});
    if (!options.soft) return Collection.__super__.reset.apply(this, arguments);
    var self = this;
    models = _.map(models, function(model){ return self._add(model, options); });
    return this.remove(_.difference(this.models, models), options);
  },

  subset: function(options) {
    if (_.isFunction(options)) options = {filter: options};
    return new Subset(this, options).collection;
  },

  subgroups: function(options) {
    if (_.isFunction(options)) options = {groupBy: options};
    return new Subgroups(this, options).collection;
  },

  limit: function(options) {
    if (_.isNumber(options)) options = {limit: options};
    return new Limit(this, options).collection;
  },

  move: function(model, x) {
    var i;
    if (_.isNumber(model)) model = this.get(model);
    if (!~(i = this.indexOf(model))) return;
    return this.at(x + i);
  },

  next: function(model) { return this.move(model, 1); },

  prev: function(model) { return this.move(model, -1); },

  _add: function(model, options) {
    model = this._prepareModel(model);
    if (this.getByCid(model)) return model;
    return Collection.__super__._add.apply(this, arguments);
  }

});


var Model = Has.Model = Backbone.Model.extend({

  constructor: function(attrs, options) {
    this._queue = {};

    var id, cid, model, ctor = this.constructor;
    var all = ctor._all || (ctor._all = new Collection());

    // return subclass if appropriate
    var sub = this.findConstructor && this.findConstructor(attrs, options);
    if (sub && !(this instanceof sub)) return new sub(attrs, options);

    // return existing model if found
    if (attrs && (cid = attrs._cid)) return all.getByCid(cid);
    if (attrs && (id = attrs.id) && (model = all.get(id))) {
      model.set(attrs, options);
      return model;
    }

    Model.__super__.constructor.apply(this, arguments);
  },

  initialize: function() {
    var has, self = this;
    this.set({_cid: this.cid});
    var ctor = this.constructor;
    do {
      (ctor._all || (ctor._all = new Collection())).add(self);
    } while(ctor.__super__ && (ctor = ctor.__super__.constructor));
    this.trigger('has:initialize', this);
    this._initialized = true;
    this._dequeue();
    Model.__super__.initialize.apply(this, arguments);
  },

  change: function() {
    var has, self = this;
    this.trigger('has:change', this);
    if (this._initialized) this._dequeue();
    Model.__super__.change.apply(this, arguments);
  },

  _dequeue: function() {
    var queue = this._queue;
    this._queue = {};
    for (var key in queue) queue[key]();
  }

}, {

  has: function(callback) {
    Has._queue.push(_.bind(callback, this));
    return this;
  },

  hasProp: function(name, options) {
    if (_.isFunction(options)) options = {setter: options};
    new HasProp(this, name, options);
    return this;
  },

  hasOne: function(name, options) {
    new HasOne(this, name, options);
    return this;
  },

  hasMany: function(name, options) {
    var through = options && options.through;
    if (_.isString(through)) options.through = through = {name: through};
    if (through) {
      options.through = new HasMany(this, through.name, through).options;
      new HasManyThrough(this, name, options);
      return this;
    }
    new HasMany(this, name, options);
    return this;
  }

});

function funcName(f) {
  if (!_.isFunction(f)) return '';
  if (f.name) return f.name;
  var m = functionToString.call(f).match(/function (.{1,})\(/);
  return f.name = m && m.length > 1 ? m[1] : '';
}

function andThis(f, context) {
  return function() {
    return f.apply(context || this, [this].concat(_.toArray(arguments)));
  };
}

function extend(proto, _class) {
  proto.constructor || (proto.constructor = function(){});
  var ctor = proto.constructor;
  ctor.extend = Backbone.Model.extend;
  _.extend(ctor, _class);
  _.extend(ctor.prototype, proto);
  return ctor;
}

})(jQuery);
