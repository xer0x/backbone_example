// backbone.list.js
(function ($) {

	var List = Backbone.List = Backbone.View.extend({
		tagName: 'ul',
		itemType: Backbone.Model,
		render: function (event) {
			console.log('render');
			var elem = $(this.el);
			/*
			elem.empty();
			_.each(this.views, function (item) {
				elem.append(item.el);
			});
			*/
			this.collection.each(function (model) {
				elem.append(model.view.el);
			});
			return this;
		},
		initialize: function () {
			_(this).bindAll('add', 'remove');
			this.views = [];
			this.collection.bind("add", this.add);
			//this.collection.bind("remove", this.updateViewArray, this);
			this.collection.bind("change", this.updateViewArray, this);
			this.updateViewArray();
		},
		findView: function (needle) {
			// TODO make this properly
			if (typeof needle === 'object') {
				return _.find(this.views, function (view) {
					return view.model.cid === needle.cid;
				});
			}
			if (typeof needle === 'string' || typeof needle === 'number') {
				return _.find(this.views, function (view) {
					return _.include([view.model.get('id'), view.model.cid, view.cid], needle);
				}, this);
			}
			return false;
		},
		add: function (newModel) {
			if (!this.findView(newModel)) {
				newModel.view = new Backbone.View({tagName: 'li', model: newModel});
				this.views.push(newModel.view);
			}
		},
		updateViewArray: function () {
			this.collection.each(this.add);
			this.render();
		},
		//comparator: function (model) {
			//return model.get('id');
		//},
		events: {}

	});

})(jQuery);
