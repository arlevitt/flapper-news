// app code
var app = angular.module('flapperNews', ['ui.router']);

// ui.router config
app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: '/home.html',
                controller: 'MainCtrl',
                resolve: {
                    postPromise: ['posts', function(posts){
                        return posts.getAll();
                    }]
                }
            })
            .state('posts', {
                url: '/posts/{id}',
                templateUrl: '/posts.html',
                controller: 'PostsCtrl',
                resolve: {
                    post: ['$stateParams', 'posts', function($stateParams, posts) {
                        return posts.get($stateParams.id);
                    }]
                }
            })
            .state('login', {
                url: '/login',
                templateUrl: '/login.html',
                controller: 'AuthCtrl',
                onEnter: ['$state', 'auth', function($state, auth){
                    if(auth.isLoggedIn()){
                        $state.go('home');
                    }
                }]
            })
            .state('register', {
                url: '/register',
                templateUrl: '/register.html',
                controller: 'AuthCtrl',
                onEnter: ['$state', 'auth', function($state, auth){
                    if(auth.isLoggedIn()){
                        $state.go('home');
                    }
                }]
            });

        $urlRouterProvider.otherwise('home');
    }])

.factory('auth', ['$http', '$window', function($http, $window){
    var auth = {};

    auth.saveToken = function (token){
        $window.localStorage['flapper-news-token'] = token;
    };

    auth.getToken = function (){
        return $window.localStorage['flapper-news-token'];
    }

    auth.isLoggedIn = function(){
        var token = auth.getToken();

        if(token){
            var payload = JSON.parse($window.atob(token.split('.')[1]));

            return payload.exp > Date.now() / 1000;
        } else {
            return false;
        }
    };

    auth.currentUser = function(){
        if(auth.isLoggedIn()){
            var token = auth.getToken();
            var payload = JSON.parse($window.atob(token.split('.')[1]));

            return payload.username;
        }
    };

    auth.register = function(user){
        return $http.post('/register', user).then(function(res){
            auth.saveToken(res.data.token);
        });
    };

    auth.logIn = function(user){
        return $http.post('/login', user).then(function(res){
            auth.saveToken(res.data.token);
        });
    };

    auth.logOut = function(){
        $window.localStorage.removeItem('flapper-news-token');
    };

    return auth;
}])

app.factory('posts', ['$http', 'auth', function($http, auth){
    var o = {
        posts: []
    };

    o.getAll = function() {
        return $http.get('/posts').then(function(res){
            angular.copy(res.data, o.posts);
        });
    };

    o.get = function(id) {
        return $http.get('/posts/' + id).then(function(res){
            return res.data;
        });
    };

    o.findByAuthor = function(author) {
        return $http.get('/posts?author=' + author).then(function(res){
            angular.copy(res.data, o.posts);
            return res.data;
        });
    };

    o.create = function(post) {
        return $http.post('/posts', post, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).then(function(res){
            o.posts.push(res.data);
        });
    };

    o.delete = function(post) {
        return $http.delete('/posts/' + post._id , {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).then(function(res){
            var index = o.posts.indexOf(post);
            o.posts.splice(index, 1);
        });
    };

    o.updateTitle = function(post) {
        return $http.put('/posts/' + post._id + '/updateTitle', post, {
            headers: { Authorization: 'Bearer ' + auth.getToken()}
        });
    }

    o.upvote = function(post) {
        return $http.put('/posts/' + post._id + '/upvote', null, {
            headers: { Authorization: 'Bearer ' + auth.getToken()}
        })
        .then(function(data){
            post.upvotes += 1;
        });
    };

    o.downvote = function(post) {
        return $http.put('/posts/' + post._id + '/downvote', null, {
            headers: { Authorization: 'Bearer ' + auth.getToken()}
        })
            .then(function(data){
                post.upvotes -= 1;
            });
    };

    o.addComment = function(id, comment) {
        return $http.post('/posts/' + id + '/comments', comment, {
            headers: { Authorization: 'Bearer ' + auth.getToken() }
        });
    };

    o.upvoteComment = function(post, comment) {
        return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/upvote', null, {
            headers: { Authorization: 'Bearer ' + auth.getToken() }
        })
            .then(function(data){
                comment.upvotes += 1;
            });
    };

    o.downvoteComment = function(post, comment) {
        return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/downvote', null, {
            headers: { Authorization: 'Bearer ' + auth.getToken() }
        })
            .then(function(data){
                comment.upvotes -= 1;
            });
    };

    return o;
}])

// controllers
app.controller('AuthCtrl', [
    '$scope',
    '$state',
    'auth',
    function($scope, $state, auth) {
        $scope.user = {};

        $scope.register = function () {
            auth.register($scope.user).then(function () {
                $state.go('home');
            }).catch(function (error) {
                $scope.error = error.data;
            });
        };

        $scope.logIn = function () {
            auth.logIn($scope.user).then(function () {
                $state.go('home');
            }).catch(function (error) {
                $scope.error = error.data;
            });
        };
    }]);

app.controller('NavCtrl', [
    '$scope',
    'auth',
    function($scope, auth){
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.currentUser = auth.currentUser;
        $scope.logOut = auth.logOut;
    }]);

app.controller('MainCtrl', [
    '$scope', 'posts', 'auth',
    function($scope, posts, auth){
        $scope.test = 'Hello world3!';
        $scope.posts = posts.posts;
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.query = null;

        $scope.findPostsByAuthor = function() {
            posts.findByAuthor($scope.query).then(function(data) {
                $scope.posts = data;
            });
        };

        $scope.addPost = function(){
          if(!$scope.title || $scope.title === '') { return; }
          posts.create({
              title: $scope.title,
              link: $scope.link,
          });
          $scope.title = '';
          $scope.link = '';
      };

        $scope.deletePost = function(post) {
            posts.delete(post);
        };

        $scope.incrementUpvotes = function(post) {
          posts.upvote(post);
      };

        $scope.dencrementUpvotes = function(post) {
        posts.downvote(post);
    };
}]);

app.controller('PostsCtrl', [
    '$scope',
    'posts',
    'post',
    'auth',
    function($scope, posts, post, auth){
        $scope.post = post;
        $scope.isLoggedIn = auth.isLoggedIn;

        $scope.addComment = function() {
            if($scope.body === '') { return; }
            posts.addComment(post._id, {
                body: $scope.body,
                author: 'user',
            }).then(function(comment) {
                $scope.post.comments.push(comment.data);
            });
            $scope.body = '';
        };

        $scope.incrementUpvotes = function(comment) {
            posts.upvoteComment(post, comment);
        };

        $scope.dencrementUpvotes = function(comment) {
            posts.downvoteComment(post, comment);
        };

        $scope.updateTitle = function() {
           posts.updateTitle(post);
        }
    }]);