PostRepository = function(db) {
	this.db = db;
};

PostRepository.prototype.getPublishedPosts = function(callback) {

	// Published on or before the current day = ok
	var publishedBefore = new Date(); // today
	publishedBefore.setHours(23,59,59,999);
	
	// Format the date so the query system can understand it
	var publishedBeforeFormatted = publishedBefore.toJSON();

	console.log('Showing all posts published before ' + publishedBeforeFormatted);

    // Find posts published before or on current date in DB + sort on date
	this.db.find({publishDate : { $lte: publishedBeforeFormatted }}).sort({ publishDate: -1 }).exec(function (err, docs) {
		callback(docs);
	});
};

PostRepository.prototype.createPost = function(title, content, publishdate, callback) {

	var doc = { 
		title: title, 
		content: content, 
		publishDate: publishdate,
		comments: []
	};

	this.db.insert(doc, function (err, newDoc) {
	  console.log('entry posted, will be published at: ' + publishdate);
	  callback();
	});
};

PostRepository.prototype.createComment = function(postId, name, content, callback) {
	console.log('trying to find post with id ' + postId);

    this.db.update({ _id: postId }, { $push: { comments: { name: name, content: content } } }, {}, function(err, numReplaced) {
       console.log("Comment succesfully added!");
       callback();
    });

};

exports.PostRepository = PostRepository;