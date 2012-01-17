var Model = Backbone.Has.Model;
var Collection = Backbone.Has.Collection;
var List = Backbone.List;

var c = null, m = null;
var m1 = new Model({id: 1});
var m2 = new Model({id: 2});
var m3 = new Model({id: 3});

module('List', {
	setup: function() {
		m = new Model();
		c = new Collection([m1, m2]);
	}
});

test('create views from collection', function() {
	var list = new List({collection: c}).render();
	equal($(list.el).children().length, 2);
	equal(list.views.length, 2);
	ok(list.views[0].model === m1);
	ok(list.views[1].model === m2);
	ok(!!list.findView(m1));
	ok(!!list.findView(m2));
});

test('add model', function() {
	var list = new List({collection: c}).render();

	c.add(m);
	equal(list.views.length, 3);

	var view = list.findView(m.cid);
	ok(view.model === m);

	ok(list.findView(m.cid) === view);

	ok(list.findView(view.cid) === view);

	console.log('set to 50')
	m.set({id: 50});
	console.log(list.findView(50) );
	console.log(view)
	ok(list.findView(50) === view);
	console.log('done wtf')

	c.add(m);
	equal(list.views.length, 3);
});

test('insert elements in order', function() {
	console.log('sort sort sort')
	var list = new List({collection: c}).render();
	c.comparator = function(model) { return model.id; };
	c.add(m3);
	ok($(list.findView(3).el).is(':nth-child(3)'));
	c.add({id: -5});
	ok($(list.findView(-5).el).is(':nth-child(1)'));
	c.add({id: -1});
	ok($(list.findView(-1).el).is(':nth-child(2)'));
	console.log('length: %o', c.length);
	console.log('sort sort sort')
});

test('remove model', function() {
	var list = new List({collection: c}).render();
	var view = list.findView(m1);
	c.remove(m1);
	equal(list.views.length, 1);
	ok(!list.findView(1));
	ok(!list.findView(m1.cid));
	ok(!list.findView(view.cid));
});

test('reset', function() {
	var list = new List({collection: c}).render();
	equal(list.views.length, 2);
	c.reset([m2, m3]);
	equal(list.views.length, 2);
	ok(!list.findView(m1));
	ok(!!list.findView(m2));
	ok(!!list.findView(m3));
});

test('keep views through reset', function() {
	var list = new List({collection: c}).render();
	var view = list.findView(m2);
	c.reset([m2]);
	ok(list.findView(m2) === view);
});

test('selected is deleted on removal', function() {
	var list = new List({selectable: true, collection: c});
	list.render().select(m1);
	ok(list.selected === list.findView(m1));
	list.collection.remove(m1);
	ok(list.selected === undefined);
});

test('reorder views after reset', function() {
	var list = new List({collection: c}).render();
	c.reset([m2, m1]);
	ok(list.views[0].model === m2);
	ok(list.views[1].model === m1);
});

test('divs are made into lis for ul/ol', function() {
	var list = new List({collection: c}).render();
	var items = list.$el.children();
	ok(items.is('li'));
	ok(items.is(list.views[0].el));
});

test('divs are not made into lis for non-ul/ol', function() {
	var list = new List({collection: c, tagName: 'div'}).render();
	var items = list.$el.children();
	ok(items.is('div'));
	ok(items.is(list.views[0].el));
});

test('non-divs are not made into lis', function() {
	var list = new List({collection: c, itemOptions: {tagName: 'a'}}).render();
	var items = list.$el.children();
	ok(items.is('li'));
	ok(items.children().is('a'));
	ok(items.children().is(list.views[0].el));
});

test('lis are used without wrapper', function() {
	var list = new List({collection: c, itemOptions: {tagName: 'li'}}).render();
	var items = list.$el.children();
	ok(items.is('li'));
	ok(items.is(list.views[0].el));
});

test('proxy child events', function() {
	expect(1);
	var list = new List({collection: c}).render();
	var view = list.findView(m1);
	list.bind('test', function(_view) {
		ok(_view === view);
	});
	view.trigger('test', view);
});
