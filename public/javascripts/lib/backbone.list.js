// backbone.list.js
(function ($) {

	var List = Backbone.List = Backbone.View.extend({
		defaults: {
			tagName: 'ul',
			id: 'itemList',
			itemOptions: {
				ul: {tagName: 'li'},
				ol: {tagName: 'li'},
				div: {tagName: 'div'}
			}
		},
		initialize: function () {
			this.$el = $(this.el);
			
			this.itemType = this.options.itemType || Backbone.View;
			this.id = this.options.id || this.defaults.id;
			this.tagName = this.options.tagName || this.defaults.tagName;			
			this.itemOptions = this.options.itemOptions || this.defaults.itemOptions[this.tagName];
			
			_(this).bindAll('add', 'remove', 'updateViewArray');
			this.collection.bind("add", this.add);
			this.collection.bind("remove", this.remove);
			this.collection.bind("reset", this.updateViewArray);

			this.collection.bind("all", function (eventName, arg) {
				this.trigger(eventName, arg);
			}, this);

			this.views = [];
			this.updateViewArray();
		},
		render: function (event) {		
			return this;
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
		remove: function (model, n, o, p) {
			$(model.view.el).remove();
			
			if (model.get('selected')) {	
				model.set({selected: false});
				this.selected = undefined;
			}
			
			var rmModel = this.findView(model)
			this.views = _.reject(this.views, function (viewModel) {
				return viewModel === rmModel;
			});
		},
		add: function (newModel) {

			if (!this.findView(newModel)) {
				newModel.view = new this.itemType(_.extend({model: newModel}, this.itemOptions));
				this.views.push(newModel.view.render());

				newModel.view.bind("all", function(eventName, arg) {
					this.collection.trigger(eventName, arg);
				}, this);

				//From: https://github.com/documentcloud/backbone/issues/41
				var index = this.collection.indexOf(newModel);
				var previous = this.collection.at(index - 1);
				var previousView = previous && previous.view;
				if (index == 0 || !previous || !previousView) {
					$(this.el).prepend(newModel.view.el);
				} else {
					$(previousView.el).after(newModel.view.el);
				}
			}
		},
		updateViewArray: function () {
			$(this.el).empty();
			
			this.views = _.filter(this.views, function (view) {
				return _.include(this.collection.models, view.model);
			}, this);

			this.views = _.sortBy(this.views, function (view) {
				return this.collection.indexOf(view.model);
			}, this);	

			this.collection.each(this.add);
		},
		select: function (model) {
			model.set({selected: true});
			this.selected = this.findView(model);
			return this;
		}
	});

})(jQuery);
