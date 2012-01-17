(function($, undefined) {

  var ListItem = Backbone.View.extend({

    events: {
      'click button.remove': '_remove'
    },

    render: function() {
      $(this.el).html(
        this.model.get('text') +
        '&nbsp;<button class="remove">Remove</button>'
      );
      return this;
    },

    _remove: function() {
      list.collection.remove(this.model);
    }

  });

  var models = [
    {text: 'foo'},
    {text: 'bar'},
    {text: 'baz'},
    {text: 'bam'},
    {text: 'boom!'},
  ];

  var list = new Backbone.List({
    itemType: ListItem,
    collection: new Backbone.Has.Collection(models, {
      comparator: function(model) { return model.get('text'); }
    })
  });

  $(function() {
    list.render();
    $('body').append(list.el);
    $('form.add').on('submit', function(e) {
      list.collection.add({text: $('input.add').val()});
      $('input.add').val('');
      return false;
    });
    $('.reset').on('click', function() {
      list.collection.reset(models);
    });
  });

})(jQuery);
