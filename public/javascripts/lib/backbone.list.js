// backbone.list.js
(function ($) {

	var List = Backbone.List = Backbone.View.extend({
		tagName: 'ul',
		itemType: Backbone.Model,
		render: function (event) {
			var elem = $(this.el);
			elem.empty();
			_.each(this.views, function (item) {
				elem.append(item.el);
			});
			return this;
		},
		initialize: function () {
			_(this).bindAll('add', 'remove');
			this.views = [];
			this.collection.bind("add", this.add);
			//this.collection.bind("remove", this.updateViewArray, this);
			//this.collection.bind("change", this.updateViewArray, this);
			this.updateViewArray();
		},
		findView: function (needle) {
			return _.find(this.views, function (view) {
				//return _.include([view.model.cid, view.model, view.model.get('id')], needle);
				return _.include([view.model.cid, view.cid, view.model.get('id')], needle);
			});
		},
		add: function (newModel) {
			var newView = new Backbone.View({tagName: 'li', model: newModel});
			this.views.push(newView);

			//if (this._rendered) {
			//$(this.el).append(newView.render());
			//}
		},
		updateViewArray: function () {
			//this.views = this.collection.map(function (item) {
			//	return new Backbone.View({model: item});
			//});
			this.collection.each(this.add);
			this.render();
		},
		events: {}

	});

})(jQuery);
