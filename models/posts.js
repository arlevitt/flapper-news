var mongoose = require('mongoose');
var logger = console;

var PostSchema = new mongoose.Schema({
    title: String,
    link: String,
    author: String,
    upvotes: {type: Number, default: 0},
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
});

PostSchema.methods.upvote = function(cb) {
    this.upvotes += 1;
    this.save(cb);
};

PostSchema.methods.downvote = function(cb) {
    this.upvotes -= 1;
    this.save(cb);
};

PostSchema.methods.updateTitle = function(db) {
    PostModel.update(this, db);
};

PostSchema.methods.comment = function(cb) {
    this.comments.push
    this.save(cb);
};

var PostModel = mongoose.model('Post', PostSchema);